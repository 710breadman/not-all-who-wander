import { deleteDB, openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";
import type {
  AppSettings,
  ChecklistCategory,
  ChecklistSeed,
  MasterItem,
  Trip,
  TripItem,
  TripItemStatus,
} from "../domain/models";
import { loadChecklistSeed } from "./seedLoader";

export const DATABASE_NAME = "camping-checklist";
export const DATABASE_VERSION = 1;

interface CampingDatabaseSchema extends DBSchema {
  meta: {
    key: string;
    value: unknown;
  };
  masterItems: {
    key: string;
    value: MasterItem;
    indexes: { "by-category": ChecklistCategory };
  };
  trips: {
    key: string;
    value: Trip;
    indexes: { "by-updated-at": string };
  };
  tripItems: {
    key: string;
    value: TripItem;
    indexes: {
      "by-trip-id": string;
      "by-trip-category": [string, ChecklistCategory];
      "by-trip-status": [string, TripItemStatus];
    };
  };
}

export type CampingDatabase = IDBPDatabase<CampingDatabaseSchema>;
type UpgradeTransaction = IDBPTransaction<
  CampingDatabaseSchema,
  ["meta", "masterItems", "trips", "tripItems"],
  "versionchange"
>;

interface DatabaseMigration {
  version: number;
  migrate: (database: CampingDatabase, transaction: UpgradeTransaction) => void;
}

export const databaseMigrations: readonly DatabaseMigration[] = [
  {
    version: 1,
    migrate(database) {
      database.createObjectStore("meta");

      const masterItems = database.createObjectStore("masterItems", { keyPath: "id" });
      masterItems.createIndex("by-category", "category");

      const trips = database.createObjectStore("trips", { keyPath: "id" });
      trips.createIndex("by-updated-at", "updatedAt");

      const tripItems = database.createObjectStore("tripItems", { keyPath: "id" });
      tripItems.createIndex("by-trip-id", "tripId");
      tripItems.createIndex("by-trip-category", ["tripId", "category"]);
      tripItems.createIndex("by-trip-status", ["tripId", "status"]);
    },
  },
];

function runMigrations(
  database: CampingDatabase,
  transaction: UpgradeTransaction,
  oldVersion: number,
  newVersion: number,
): void {
  for (const migration of databaseMigrations) {
    if (migration.version > oldVersion && migration.version <= newVersion) {
      migration.migrate(database, transaction);
    }
  }
}

async function ensureSeedData(database: CampingDatabase, seed: ChecklistSeed): Promise<void> {
  const transaction = database.transaction(["meta", "masterItems"], "readwrite");
  const meta = transaction.objectStore("meta");
  const masterItems = transaction.objectStore("masterItems");
  const importedVersion = await meta.get("seedVersion");

  if (importedVersion === seed.seedVersion) {
    await transaction.done;
    return;
  }

  const existingIds = new Set(await masterItems.getAllKeys());
  for (const item of seed.items) {
    if (!existingIds.has(item.id)) await masterItems.add(item);
  }

  const defaultSettings: AppSettings = {
    schemaVersion: DATABASE_VERSION,
    defaultTripStyle: "car",
    compactPackingMode: false,
  };
  if ((await meta.get("appSettings")) === undefined) await meta.put(defaultSettings, "appSettings");
  await meta.put(seed.seedVersion, "seedVersion");
  await transaction.done;
}

interface OpenDatabaseOptions {
  databaseName?: string;
  seed?: ChecklistSeed;
}

export async function openCampingDatabase(options: OpenDatabaseOptions = {}): Promise<CampingDatabase> {
  const databaseName = options.databaseName ?? DATABASE_NAME;
  const seed = options.seed ?? loadChecklistSeed();
  const database = await openDB<CampingDatabaseSchema>(databaseName, DATABASE_VERSION, {
    upgrade(database, oldVersion, newVersion, transaction) {
      runMigrations(database, transaction, oldVersion, newVersion ?? DATABASE_VERSION);
    },
  });

  try {
    await ensureSeedData(database, seed);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export async function deleteCampingDatabase(databaseName = DATABASE_NAME): Promise<void> {
  await deleteDB(databaseName);
}
