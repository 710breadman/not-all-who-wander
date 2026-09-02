import { openCampingDatabase } from "../data/database";
import { configureSync, createSyncSettings, listSyncQueue, readSyncSettings, stageApprovedRecords } from "../data/syncRepository";
import { createFirestoreSyncClient } from "../infrastructure/firestoreSyncClient";
import { syncNow, type SyncRunResult } from "./syncService";

export interface CloudBackupStatus {
  enabled: boolean;
  accountMatches: boolean;
  pendingChanges: number;
  lastSuccessfulSync?: string;
  lastError?: string;
}

export async function getCloudBackupStatus(userId: string): Promise<CloudBackupStatus> {
  const database = await openCampingDatabase();
  try {
    const settings = await readSyncSettings(database);
    const accountMatches = settings?.userId === userId;
    return {
      enabled: Boolean(accountMatches && settings?.enabled),
      accountMatches,
      pendingChanges: accountMatches ? (await listSyncQueue(database, userId)).length : 0,
      ...(settings?.lastSuccessfulSync ? { lastSuccessfulSync: settings.lastSuccessfulSync } : {}),
      ...(settings?.lastError ? { lastError: settings.lastError } : {}),
    };
  } finally {
    database.close();
  }
}

export async function enableInventoryCloudBackup(userId: string): Promise<SyncRunResult> {
  const database = await openCampingDatabase();
  try {
    const existing = await readSyncSettings(database);
    if (existing && existing.userId !== userId) {
      throw new Error("Cloud backup is already linked to another account on this device. Keep local data separate or clear that account's pending backup before switching.");
    }
    await configureSync(database, existing ? { ...existing, enabled: true, allowedEntityTypes: ["masterItems"] } : createSyncSettings(userId, ["masterItems"]));
    await stageApprovedRecords(database, userId);
    return await syncNow(database, createFirestoreSyncClient(), userId);
  } finally {
    database.close();
  }
}

export async function syncInventoryCloudBackup(userId: string): Promise<SyncRunResult> {
  const database = await openCampingDatabase();
  try {
    return await syncNow(database, createFirestoreSyncClient(), userId);
  } finally {
    database.close();
  }
}

/** Background-friendly retry: it is a no-op until the user explicitly enabled backup. */
export async function retryEnabledInventoryCloudBackup(userId: string): Promise<SyncRunResult | undefined> {
  const status = await getCloudBackupStatus(userId);
  if (!status.enabled || (typeof navigator !== "undefined" && navigator.onLine === false)) return undefined;
  return await syncInventoryCloudBackup(userId);
}

export async function disableCloudBackup(userId: string): Promise<void> {
  const database = await openCampingDatabase();
  try {
    const settings = await readSyncSettings(database);
    if (settings?.userId === userId) await configureSync(database, { ...settings, enabled: false });
  } finally {
    database.close();
  }
}
