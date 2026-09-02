import {
  Timestamp,
  collection,
  connectFirestoreEmulator,
  doc,
  documentId,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  memoryLocalCache,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { SyncClient, CloudPayload, RemoteSyncPage } from "../application/syncService";
import type { SyncCursor } from "../domain/models";
import { getFirebaseApp } from "./firebase";

const batchLimit = 450;
let firestoreInstance: Firestore | undefined;
let emulatorConnected = false;

export function createFirestoreSyncClient(): SyncClient {
  const firestore = firestoreForApp();
  return {
    async push(userId, _entityType, entries) {
      for (let start = 0; start < entries.length; start += batchLimit) {
        const batch = writeBatch(firestore);
        for (const entry of entries.slice(start, start + batchLimit)) {
          batch.set(doc(firestore, "users", userId, "masterItems", entry.id), {
            id: entry.id,
            revision: entry.revision,
            updatedAt: entry.updatedAt,
            data: entry.data,
            serverUpdatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    },
    async pull(userId, cursor) {
      const base = collection(firestore, "users", userId, "masterItems");
      const constraints = [orderBy("serverUpdatedAt"), orderBy(documentId()), limit(batchLimit)];
      const page = cursor
        ? await getDocs(query(base, ...constraints, startAfter(Timestamp.fromMillis(cursor.updatedAtMs), cursor.id)))
        : await getDocs(query(base, ...constraints));
      const entries = page.docs.flatMap((snapshot) => cloudPayloadFromDocument(snapshot.id, snapshot.data()));
      const last = page.docs.at(-1);
      const timestamp = last?.get("serverUpdatedAt");
      const nextCursor = timestamp instanceof Timestamp && last ? { updatedAtMs: timestamp.toMillis(), id: last.id } satisfies SyncCursor : cursor;
      return { entries, ...(nextCursor ? { nextCursor } : {}) } satisfies RemoteSyncPage;
    },
  };
}

function firestoreForApp(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseApp();
  try {
    firestoreInstance = initializeFirestore(app, { localCache: memoryLocalCache() });
  } catch {
    firestoreInstance = getFirestore(app);
  }
  if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === "true" && !emulatorConnected) {
    connectFirestoreEmulator(firestoreInstance, import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1", Number(import.meta.env.VITE_FIREBASE_EMULATOR_PORT || "8080"));
    emulatorConnected = true;
  }
  return firestoreInstance;
}

function cloudPayloadFromDocument(id: string, value: unknown): CloudPayload[] {
  if (!isRecord(value) || value.id !== id || typeof value.revision !== "number" || typeof value.updatedAt !== "string" || !isMasterItem(value.data)) return [];
  return [{ id, revision: value.revision, updatedAt: value.updatedAt, data: value.data }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMasterItem(value: unknown): value is CloudPayload["data"] {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.category === "string"
    && typeof value.section === "string"
    && typeof value.defaultQuantity === "number"
    && typeof value.unit === "string"
    && Array.isArray(value.tripStyles)
    && Array.isArray(value.tags)
    && typeof value.archived === "boolean"
    && typeof value.source === "string";
}
