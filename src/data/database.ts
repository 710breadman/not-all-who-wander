import { deleteDB, openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";
import type {
  AppSettings,
  ChecklistCategory,
  ChecklistSeed,
  MasterItem,
  Site,
  Waypoint,
  WeatherSnapshot,
  RouteTrack,
  Trip,
  TripItem,
  TripItemStatus,
} from "../domain/models";
import { loadChecklistSeed } from "./seedLoader";

export const DATABASE_NAME = "camping-checklist";
export const DATABASE_VERSION = 5;

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
  sites: {
    key: string;
    value: Site;
    indexes: { "by-updated-at": string; "by-visit-state": Site["visitState"] };
  };
  waypoints: {
    key: string;
    value: Waypoint;
    indexes: { "by-trip-id": string; "by-updated-at": string };
  };
  weatherSnapshots: {
    key: string;
    value: WeatherSnapshot;
    indexes: { "by-trip-id": string; "by-fetched-at": string };
  };
  routeTracks: {
    key: string;
    value: RouteTrack;
    indexes: { "by-trip-id": string; "by-kind": RouteTrack["kind"] };
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
  ["meta", "masterItems", "trips", "sites", "waypoints", "weatherSnapshots", "routeTracks", "tripItems"],
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
  {
    version: 2,
    migrate(database) {
      const sites = database.createObjectStore("sites", { keyPath: "id" });
      sites.createIndex("by-updated-at", "updatedAt");
      sites.createIndex("by-visit-state", "visitState");
    },
  },
  {
    version: 3,
    migrate(database) {
      const waypoints = database.createObjectStore("waypoints", { keyPath: "id" });
      waypoints.createIndex("by-trip-id", "tripId");
      waypoints.createIndex("by-updated-at", "updatedAt");
    },
  },
  {
    version: 4,
    migrate(database) {
      const weather = database.createObjectStore("weatherSnapshots", { keyPath: "id" });
      weather.createIndex("by-trip-id", "tripId");
      weather.createIndex("by-fetched-at", "fetchedAt");
    },
  },
  {
    version: 5,
    migrate(database) {
      const routes = database.createObjectStore("routeTracks", { keyPath: "id" });
      routes.createIndex("by-trip-id", "tripId");
      routes.createIndex("by-kind", "kind");
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
