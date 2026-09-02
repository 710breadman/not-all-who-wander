import type { MasterItem, SyncCursor, SyncEntityType, SyncMetadata, SyncQueueEntry } from "../domain/models";
import type { CampingDatabase } from "../data/database";
import { listSyncQueue, readSyncSettings, retainConflict } from "../data/syncRepository";

/**
 * A narrow allowlist prevents an account sign-in from becoming consent to copy
 * location, medical, emergency, vehicle, route, or free-form trip data.
 * Additional entity serializers are added only with a product privacy review.
 */
export const cloudPayloadEntityTypes = ["masterItems"] as const;
type CloudPayloadEntityType = (typeof cloudPayloadEntityTypes)[number];

export interface CloudPayload {
  id: string;
  revision: number;
  updatedAt: string;
  data: MasterItem;
}

export interface SyncClient {
  push(userId: string, entityType: CloudPayloadEntityType, entries: CloudPayload[]): Promise<void>;
  pull(userId: string, cursor?: SyncCursor): Promise<RemoteSyncPage>;
}

export interface RemoteSyncPage {
  entries: CloudPayload[];
  nextCursor?: SyncCursor;
}

export interface SyncRunResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  skipped: number;
  error?: string;
}

interface PreparedSyncEntry {
  entry: SyncQueueEntry;
  payload: CloudPayload;
  revision: number;
}

export function toCloudPayload(
  entityType: SyncEntityType,
  value: unknown,
  revision: number,
  updatedAt: string,
): CloudPayload {
  if (entityType !== "masterItems" || !isMasterItem(value)) {
    throw new Error(`${entityType} is local-only until its cloud privacy scope is approved.`);
  }
  return { id: value.id, revision, updatedAt, data: value };
}

/** Deterministic, testable V1 merge rule. The losing value is retained by the caller. */
export function chooseNewerVersion<T extends { revision: number; updatedAt: string }>(
  local: T,
  remote: T,
): "local" | "remote" {
  if (local.revision !== remote.revision) return local.revision > remote.revision ? "local" : "remote";
  return local.updatedAt >= remote.updatedAt ? "local" : "remote";
}

export async function syncNow(
  database: CampingDatabase,
  client: SyncClient,
  userId: string,
): Promise<SyncRunResult> {
  const settings = await readSyncSettings(database);
  if (!settings?.enabled || settings.userId !== userId) {
    return { pulled: 0, pushed: 0, conflicts: 0, skipped: 0, error: "Cloud sync is not enabled for this account on this device." };
  }
  try {
    const remote = await client.pull(userId, settings.lastRemoteCursor);
    const merged = await mergeRemoteInventory(database, userId, remote.entries);
    const queue = await listSyncQueue(database, userId);
    const safeEntries = queue.filter((entry) => cloudPayloadEntityTypes.includes(entry.entityType as CloudPayloadEntityType));
    const skipped = queue.length - safeEntries.length;
    const preparedEntries = await Promise.all(
      safeEntries.map((entry) => prepareEntry(database, entry)),
    );
    const payloads = preparedEntries.map(({ payload }) => payload);
    if (payloads.length) {
      await client.push(userId, "masterItems", payloads);
    }
    await markSuccessful(database, preparedEntries, remote.nextCursor);
    return { pulled: merged.pulled, pushed: payloads.length, conflicts: merged.conflicts, skipped };
  } catch (reason) {
    const error = reason instanceof Error ? reason.message : "Cloud sync failed.";
    const queue = await listSyncQueue(database, userId);
    const safeEntries = queue.filter((entry) => cloudPayloadEntityTypes.includes(entry.entityType as CloudPayloadEntityType));
    await markFailed(database, safeEntries, error);
    return { pulled: 0, pushed: 0, conflicts: 0, skipped: queue.length - safeEntries.length, error };
  }
}

async function prepareEntry(
  database: CampingDatabase,
  entry: SyncQueueEntry,
): Promise<PreparedSyncEntry> {
  if (entry.operation === "DELETE") {
    throw new Error("Cloud deletion is not available yet; the local change was kept for retry.");
  }
  const metadata = await database.get("syncMetadata", entry.id);
  const record = await database.get("masterItems", entry.entityId);
  if (!metadata || !record) {
    throw new Error(`Queued ${entry.entityType} record ${entry.entityId} is missing locally; the change was kept for recovery.`);
  }
  return {
    entry,
    payload: toCloudPayload(entry.entityType, record, metadata.revision, metadata.updatedAt),
    revision: metadata.revision,
  };
}

async function markSuccessful(
  database: CampingDatabase,
  entries: PreparedSyncEntry[],
  cursor?: SyncCursor,
): Promise<void> {
  const transaction = database.transaction(["meta", "syncMetadata", "syncQueue"], "readwrite");
  const now = new Date().toISOString();
  for (const { entry, revision } of entries) {
    const metadata = await transaction.objectStore("syncMetadata").get(entry.id);
    // A local edit may land while the network request is in flight. Only
    // acknowledge the exact revision that was uploaded; a newer revision must
    // remain dirty and queued for the next run.
    if (metadata?.revision === revision) {
      await transaction.objectStore("syncMetadata").put({ ...metadata, syncState: "clean" });
      await transaction.objectStore("syncQueue").delete(entry.id);
    }
  }
  const settings = (await transaction.objectStore("meta").get("syncSettings")) as { lastSuccessfulSync?: string; lastRemoteCursor?: SyncCursor; lastError?: string } | undefined;
  if (settings) {
    const { lastError, ...withoutError } = settings;
    void lastError;
    await transaction.objectStore("meta").put({ ...withoutError, lastSuccessfulSync: now, ...(cursor ? { lastRemoteCursor: cursor } : {}) }, "syncSettings");
  }
  await transaction.done;
}

async function mergeRemoteInventory(
  database: CampingDatabase,
  userId: string,
  remoteEntries: CloudPayload[],
): Promise<{ pulled: number; conflicts: number }> {
  let conflicts = 0;
  for (const remote of remoteEntries) {
    const key = `masterItems:${remote.id}`;
    const local = await database.get("masterItems", remote.id);
    const metadata = await database.get("syncMetadata", key);
    if (!local || !metadata) {
      await storeRemoteInventory(database, userId, remote, key);
      continue;
    }
    const winner = chooseNewerVersion(
      { revision: metadata.revision, updatedAt: metadata.updatedAt },
      { revision: remote.revision, updatedAt: remote.updatedAt },
    );
    if (winner === "remote" && (metadata.syncState === "dirty" || metadata.syncState === "conflict")) {
      await retainConflict(database, { entityType: "masterItems", entityId: remote.id, local, remote, reason: "Remote revision won deterministic merge." });
      conflicts += 1;
    }
    if (winner === "remote") await storeRemoteInventory(database, userId, remote, key);
  }
  return { pulled: remoteEntries.length, conflicts };
}

async function storeRemoteInventory(
  database: CampingDatabase,
  userId: string,
  remote: CloudPayload,
  key: string,
): Promise<void> {
  const transaction = database.transaction(["masterItems", "syncMetadata", "syncQueue"], "readwrite");
  const current = await transaction.objectStore("syncMetadata").get(key);
  const metadata: SyncMetadata = {
    key,
    entityType: "masterItems",
    entityId: remote.id,
    revision: remote.revision,
    deviceId: current?.deviceId ?? "remote",
    syncState: "clean",
    createdAt: current?.createdAt ?? remote.updatedAt,
    updatedAt: remote.updatedAt,
    userId,
  };
  await transaction.objectStore("masterItems").put(remote.data);
  await transaction.objectStore("syncMetadata").put(metadata);
  await transaction.objectStore("syncQueue").delete(key);
  await transaction.done;
}

async function markFailed(database: CampingDatabase, entries: SyncQueueEntry[], error: string): Promise<void> {
  const transaction = database.transaction(["meta", "syncQueue"], "readwrite");
  const now = new Date().toISOString();
  for (const entry of entries) {
    const current = await transaction.objectStore("syncQueue").get(entry.id);
    if (current) await transaction.objectStore("syncQueue").put({ ...current, attemptCount: current.attemptCount + 1, lastAttemptAt: now, error });
  }
  const settings = await transaction.objectStore("meta").get("syncSettings");
  if (settings && typeof settings === "object") await transaction.objectStore("meta").put({ ...(settings as object), lastError: error }, "syncSettings");
  await transaction.done;
}

function isMasterItem(value: unknown): value is MasterItem {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" && "name" in value && typeof value.name === "string";
}
