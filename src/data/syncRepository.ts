import type {
  SyncConflict,
  SyncEntityType,
  SyncMetadata,
  SyncOperation,
  SyncQueueEntry,
  SyncSettings,
} from "../domain/models";
import type { CampingDatabase } from "./database";

const settingsKey = "syncSettings";
const metadataKey = (entityType: SyncEntityType, entityId: string) => `${entityType}:${entityId}`;

export function createSyncSettings(userId: string, allowedEntityTypes: SyncEntityType[] = []): SyncSettings {
  return { userId, deviceId: crypto.randomUUID(), enabled: true, allowedEntityTypes: [...allowedEntityTypes] };
}

/**
 * The only local write path that creates cloud work. The record and its queue
 * entry share an IndexedDB transaction, so an immediate UI update can never
 * leave a half-written queue entry behind.
 */
export async function saveSyncableRecord<T extends { id: string }>(
  database: CampingDatabase,
  store: "masterItems" | "trips" | "tripItems" | "sites" | "waypoints" | "routeTracks" | "profiles",
  entityType: SyncEntityType,
  entity: T,
): Promise<void> {
  await saveSyncableRecords(database, store, entityType, [entity]);
}

export async function saveSyncableRecords<T extends { id: string }>(
  database: CampingDatabase,
  store: "masterItems" | "trips" | "tripItems" | "sites" | "waypoints" | "routeTracks" | "profiles",
  entityType: SyncEntityType,
  entities: T[],
): Promise<void> {
  if (!entities.length) return;
  const transaction = database.transaction([store, "meta", "syncMetadata", "syncQueue"], "readwrite");
  for (const entity of entities) {
    await transaction.objectStore(store).put(entity as never);
    await queueChange(transaction.objectStore("meta"), transaction.objectStore("syncMetadata"), transaction.objectStore("syncQueue"), entityType, entity.id, "UPSERT");
  }
  await transaction.done;
}

export async function queueExistingRecord(
  database: CampingDatabase,
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation = "UPSERT",
): Promise<void> {
  const transaction = database.transaction(["meta", "syncMetadata", "syncQueue"], "readwrite");
  await queueChange(transaction.objectStore("meta"), transaction.objectStore("syncMetadata"), transaction.objectStore("syncQueue"), entityType, entityId, operation);
  await transaction.done;
}

export async function configureSync(
  database: CampingDatabase,
  settings: SyncSettings,
): Promise<void> {
  if (settings.allowedEntityTypes.some((entityType) => entityType !== "masterItems")) {
    throw new Error("Only master inventory has an approved cloud privacy scope.");
  }
  await database.put("meta", settings, settingsKey);
}

/** Explicitly stages existing approved data after the user confirms upload. */
export async function stageApprovedRecords(database: CampingDatabase, userId: string): Promise<number> {
  const settings = await readSyncSettings(database);
  if (!settings?.enabled || settings.userId !== userId || !settings.allowedEntityTypes.includes("masterItems")) return 0;
  const items = await database.getAll("masterItems");
  for (const item of items) await queueExistingRecord(database, "masterItems", item.id);
  return items.length;
}

export async function readSyncSettings(database: CampingDatabase): Promise<SyncSettings | undefined> {
  return (await database.get("meta", settingsKey)) as SyncSettings | undefined;
}

export async function listSyncQueue(database: CampingDatabase, userId: string): Promise<SyncQueueEntry[]> {
  return await database.getAllFromIndex("syncQueue", "by-user-created-at", IDBKeyRange.bound([userId, ""], [userId, "\uffff"]));
}

export async function listSyncConflicts(database: CampingDatabase): Promise<SyncConflict[]> {
  return await database.getAll("syncConflicts");
}

export async function retainConflict(database: CampingDatabase, conflict: Omit<SyncConflict, "id" | "detectedAt">): Promise<void> {
  await database.put("syncConflicts", { ...conflict, id: `conflict-${crypto.randomUUID()}`, detectedAt: new Date().toISOString() });
}

async function queueChange(
  meta: { get: (key: string) => Promise<unknown> },
  metadataStore: { get: (key: string) => Promise<SyncMetadata | undefined>; put: (value: SyncMetadata) => Promise<unknown> },
  queueStore: { get: (key: string) => Promise<SyncQueueEntry | undefined>; put: (value: SyncQueueEntry) => Promise<unknown> },
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
): Promise<void> {
  const settings = (await meta.get(settingsKey)) as SyncSettings | undefined;
  if (!settings?.enabled || !settings.allowedEntityTypes.includes(entityType)) return;

  const now = new Date().toISOString();
  const key = metadataKey(entityType, entityId);
  const existing = await metadataStore.get(key);
  const existingQueue = await queueStore.get(key);
  const metadata: SyncMetadata = {
    key,
    entityType,
    entityId,
    revision: (existing?.revision ?? 0) + 1,
    deviceId: settings.deviceId,
    syncState: operation === "DELETE" ? "pending_delete" : "dirty",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(operation === "DELETE" ? { deletedAt: now } : {}),
    userId: settings.userId,
  };
  const queue: SyncQueueEntry = {
    id: key,
    entityType,
    entityId,
    operation,
    createdAt: existingQueue?.createdAt ?? now,
    attemptCount: 0,
    userId: settings.userId,
  };
  await metadataStore.put(metadata);
  await queueStore.put(queue);
}
