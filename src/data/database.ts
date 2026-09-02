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
  OfflineMapRegion,
  OfflineTripPack,
  Trip,
  TripItem,
  TripItemStatus,
  SyncConflict,
  SyncMetadata,
  SyncQueueEntry,
  SavedMeal,
  MealPlanEntry,
  TripGroceryItem,
  UserProfile,
} from "../domain/models";
import { loadChecklistSeed } from "./seedLoader";

export const DATABASE_NAME = "camping-checklist";
export const DATABASE_VERSION = 9;

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
  offlineMapRegions: {
    key: string;
    value: OfflineMapRegion;
    indexes: { "by-trip-id": string; "by-status": OfflineMapRegion["status"] };
  };
  offlineTripPacks: {
    key: string;
    value: OfflineTripPack;
    indexes: { "by-trip-id": string; "by-updated-at": string };
  };
  profiles: {
    key: string;
    value: UserProfile;
    indexes: { "by-updated-at": string };
  };
  syncMetadata: {
    key: string;
    value: SyncMetadata;
    indexes: { "by-entity": [string, string]; "by-user-state": [string, string] };
  };
  syncQueue: {
    key: string;
    value: SyncQueueEntry;
    indexes: { "by-entity": [string, string]; "by-user-created-at": [string, string] };
  };
  syncConflicts: {
    key: string;
    value: SyncConflict;
    indexes: { "by-entity": [string, string] };
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
  savedMeals: {
    key: string;
    value: SavedMeal;
    indexes: {
      "by-category": SavedMeal["category"];
      "by-favorite": SavedMeal["favoriteIndex"];
      "by-archived": SavedMeal["archivedIndex"];
      "by-last-used": string;
    };
  };
  mealPlanEntries: {
    key: string;
    value: MealPlanEntry;
    indexes: { "by-trip-id": string; "by-trip-day": [string, number] };
  };
  tripGroceryItems: {
    key: string;
    value: TripGroceryItem;
    indexes: { "by-trip-id": string; "by-trip-status": [string, TripGroceryItem["status"]] };
  };
}

export type CampingDatabase = IDBPDatabase<CampingDatabaseSchema>;
type UpgradeTransaction = IDBPTransaction<
  CampingDatabaseSchema,
  ["meta", "masterItems", "trips", "sites", "waypoints", "weatherSnapshots", "routeTracks", "offlineMapRegions", "offlineTripPacks", "profiles", "syncMetadata", "syncQueue", "syncConflicts", "tripItems", "savedMeals", "mealPlanEntries", "tripGroceryItems"],
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
  {
    version: 6,
    migrate(database) {
      const regions = database.createObjectStore("offlineMapRegions", { keyPath: "id" });
      regions.createIndex("by-trip-id", "tripId");
      regions.createIndex("by-status", "status");
    },
  },
  {
    version: 7,
    migrate(database) {
      const packs = database.createObjectStore("offlineTripPacks", { keyPath: "id" });
      packs.createIndex("by-trip-id", "tripId");
      packs.createIndex("by-updated-at", "updatedAt");
    },
  },
  {
    version: 8,
    migrate(database) {
      const profiles = database.createObjectStore("profiles", { keyPath: "id" });
      profiles.createIndex("by-updated-at", "updatedAt");
      const metadata = database.createObjectStore("syncMetadata", { keyPath: "key" });
      metadata.createIndex("by-entity", ["entityType", "entityId"]);
      metadata.createIndex("by-user-state", ["userId", "syncState"]);
      const queue = database.createObjectStore("syncQueue", { keyPath: "id" });
      queue.createIndex("by-entity", ["entityType", "entityId"]);
      queue.createIndex("by-user-created-at", ["userId", "createdAt"]);
      const conflicts = database.createObjectStore("syncConflicts", { keyPath: "id" });
      conflicts.createIndex("by-entity", ["entityType", "entityId"]);
    },
  },
  {
    version: 9,
    migrate(database) {
      const meals = database.createObjectStore("savedMeals", { keyPath: "id" });
      meals.createIndex("by-category", "category");
      meals.createIndex("by-favorite", "favoriteIndex");
      meals.createIndex("by-archived", "archivedIndex");
      meals.createIndex("by-last-used", "lastUsedAt");

      const plans = database.createObjectStore("mealPlanEntries", { keyPath: "id" });
      plans.createIndex("by-trip-id", "tripId");
      plans.createIndex("by-trip-day", ["tripId", "dayIndex"]);

      const groceries = database.createObjectStore("tripGroceryItems", { keyPath: "id" });
      groceries.createIndex("by-trip-id", "tripId");
      groceries.createIndex("by-trip-status", ["tripId", "status"]);
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

async function migrateProfilesFromMeta(database: CampingDatabase): Promise<void> {
  const transaction = database.transaction(["meta", "profiles"], "readwrite");
  const meta = transaction.objectStore("meta");
  const profiles = transaction.objectStore("profiles");
  if ((await meta.get("profilesStoreMigrated")) !== true) {
    const legacy = await meta.get("userProfiles");
    if (Array.isArray(legacy)) {
      for (const profile of legacy) {
        if (isUserProfile(profile)) await profiles.put(profile);
      }
    }
    await meta.put(true, "profilesStoreMigrated");
  }
  await transaction.done;
}

function isUserProfile(value: unknown): value is UserProfile {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";
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
    await migrateProfilesFromMeta(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export async function deleteCampingDatabase(databaseName = DATABASE_NAME): Promise<void> {
  await deleteDB(databaseName);
}
