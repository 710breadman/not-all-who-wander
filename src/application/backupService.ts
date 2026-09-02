import type {
  AppSettings,
  MasterItem,
  Site,
  Waypoint,
  WeatherSnapshot,
  RouteTrack,
  SavedMeal,
  MealPlanEntry,
  TripGroceryItem,
  Trip,
  TripItem,
  UserProfile,
} from "../domain/models";
import { openCampingDatabase } from "../data/database";

export const BACKUP_VERSION = 7;
export interface CampingBackup {
  backupVersion: number;
  exportedAt: string;
  appSettings?: AppSettings;
  masterItems: MasterItem[];
  trips: Trip[];
  tripItems: TripItem[];
  sites: Site[];
  waypoints: Waypoint[];
  weatherSnapshots: WeatherSnapshot[];
  routeTracks: RouteTrack[];
  profiles: UserProfile[];
  savedMeals: SavedMeal[];
  mealPlanEntries: MealPlanEntry[];
  tripGroceryItems: TripGroceryItem[];
}

export async function createBackup(
  databaseName?: string,
): Promise<CampingBackup> {
  const database = await openCampingDatabase(
    databaseName === undefined ? {} : { databaseName },
  );
  try {
    const appSettings = (await database.get("meta", "appSettings")) as
      AppSettings | undefined;
    return {
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      ...(appSettings === undefined ? {} : { appSettings }),
      masterItems: await database.getAll("masterItems"),
      trips: await database.getAll("trips"),
      tripItems: await database.getAll("tripItems"),
      sites: await database.getAll("sites"),
      waypoints: await database.getAll("waypoints"),
      weatherSnapshots: await database.getAll("weatherSnapshots"),
      routeTracks: await database.getAll("routeTracks"),
      profiles: await database.getAll("profiles"),
      savedMeals: await database.getAll("savedMeals"),
      mealPlanEntries: await database.getAll("mealPlanEntries"),
      tripGroceryItems: await database.getAll("tripGroceryItems"),
    };
  } finally {
    database.close();
  }
}

export function parseBackup(text: string): CampingBackup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (
    !isRecord(value) ||
    (typeof value.backupVersion !== "number" || !Number.isInteger(value.backupVersion) || value.backupVersion < 1 || value.backupVersion > BACKUP_VERSION) ||
    !isString(value.exportedAt) ||
    !Array.isArray(value.masterItems) ||
    !Array.isArray(value.trips) ||
    !Array.isArray(value.tripItems) ||
    (value.backupVersion >= 2 && !Array.isArray(value.sites)) ||
    (value.backupVersion >= 3 && !Array.isArray(value.waypoints)) ||
    (value.backupVersion >= 4 && !Array.isArray(value.weatherSnapshots)) ||
    (value.backupVersion >= 5 && !Array.isArray(value.routeTracks)) ||
    (value.backupVersion >= 6 && !Array.isArray(value.profiles)) ||
    (value.backupVersion >= 7 && (!Array.isArray(value.savedMeals) || !Array.isArray(value.mealPlanEntries) || !Array.isArray(value.tripGroceryItems)))
  )
    throw new Error("That file is not a compatible camping checklist backup.");
  if (
    !value.masterItems.every(isMasterItem) ||
    !value.trips.every(isTrip) ||
    !value.tripItems.every(isTripItem) ||
    (value.sites !== undefined && (!Array.isArray(value.sites) || !value.sites.every(isSite))) ||
    (value.waypoints !== undefined && (!Array.isArray(value.waypoints) || !value.waypoints.every(isWaypoint))) ||
    (value.weatherSnapshots !== undefined && (!Array.isArray(value.weatherSnapshots) || !value.weatherSnapshots.every(isWeatherSnapshot))) ||
    (value.routeTracks !== undefined && (!Array.isArray(value.routeTracks) || !value.routeTracks.every(isRouteTrack))) ||
    (value.profiles !== undefined && (!Array.isArray(value.profiles) || !value.profiles.every(isUserProfile))) ||
    (value.savedMeals !== undefined && (!Array.isArray(value.savedMeals) || !value.savedMeals.every(isSavedMeal))) ||
    (value.mealPlanEntries !== undefined && (!Array.isArray(value.mealPlanEntries) || !value.mealPlanEntries.every(isMealPlanEntry))) ||
    (value.tripGroceryItems !== undefined && (!Array.isArray(value.tripGroceryItems) || !value.tripGroceryItems.every(isTripGroceryItem)))
  )
    throw new Error("That backup contains invalid checklist data.");
  if (value.appSettings !== undefined && !isSettings(value.appSettings))
    throw new Error("That backup contains invalid settings.");
  return { ...value, backupVersion: BACKUP_VERSION, sites: value.sites ?? [], waypoints: value.waypoints ?? [], weatherSnapshots: value.weatherSnapshots ?? [], routeTracks: value.routeTracks ?? [], profiles: value.profiles ?? [], savedMeals: value.savedMeals ?? [], mealPlanEntries: value.mealPlanEntries ?? [], tripGroceryItems: value.tripGroceryItems ?? [] } as unknown as CampingBackup;
}

export async function restoreBackup(
  backup: CampingBackup,
  databaseName?: string,
): Promise<void> {
  const database = await openCampingDatabase(
    databaseName === undefined ? {} : { databaseName },
  );
  try {
    const transaction = database.transaction(
      ["meta", "masterItems", "trips", "sites", "waypoints", "weatherSnapshots", "routeTracks", "profiles", "syncMetadata", "syncQueue", "syncConflicts", "tripItems", "savedMeals", "mealPlanEntries", "tripGroceryItems"],
      "readwrite",
    );
    await Promise.all([
      transaction.objectStore("masterItems").clear(),
      transaction.objectStore("trips").clear(),
      transaction.objectStore("sites").clear(),
      transaction.objectStore("waypoints").clear(),
      transaction.objectStore("weatherSnapshots").clear(),
      transaction.objectStore("routeTracks").clear(),
      transaction.objectStore("profiles").clear(),
      transaction.objectStore("syncMetadata").clear(),
      transaction.objectStore("syncQueue").clear(),
      transaction.objectStore("syncConflicts").clear(),
      transaction.objectStore("tripItems").clear(),
      transaction.objectStore("savedMeals").clear(),
      transaction.objectStore("mealPlanEntries").clear(),
      transaction.objectStore("tripGroceryItems").clear(),
      transaction.objectStore("meta").delete("syncSettings"),
      transaction.objectStore("meta").put(true, "profilesStoreMigrated"),
      ...(backup.appSettings === undefined
        ? []
        : [
            transaction
              .objectStore("meta")
              .put(backup.appSettings, "appSettings"),
          ]),
      ...backup.masterItems.map((item) =>
        transaction.objectStore("masterItems").put(item),
      ),
      ...backup.trips.map((trip) => transaction.objectStore("trips").put(trip)),
      ...backup.sites.map((site) => transaction.objectStore("sites").put(site)),
      ...backup.waypoints.map((waypoint) => transaction.objectStore("waypoints").put(waypoint)),
      ...backup.weatherSnapshots.map((snapshot) => transaction.objectStore("weatherSnapshots").put(snapshot)),
      ...backup.routeTracks.map((route) => transaction.objectStore("routeTracks").put(route)),
      ...backup.profiles.map((profile) => transaction.objectStore("profiles").put(profile)),
      ...backup.tripItems.map((item) =>
        transaction.objectStore("tripItems").put(item),
      ),
      ...backup.savedMeals.map((meal) => transaction.objectStore("savedMeals").put(meal)),
      ...backup.mealPlanEntries.map((entry) => transaction.objectStore("mealPlanEntries").put(entry)),
      ...backup.tripGroceryItems.map((item) => transaction.objectStore("tripGroceryItems").put(item)),
    ]);
    await transaction.done;
  } finally {
    database.close();
  }
}

export function tripItemsToCsv(trip: Trip, items: TripItem[]): string {
  const row = (values: string[]) =>
    values.map((value) => `"${value.replaceAll('"', '""')}"`).join(",");
  return [
    row(["Trip", trip.name]),
    row(["Item", "Category", "Section", "Quantity", "Unit", "Status", "Notes"]),
    ...items.map((item) =>
      row([
        item.name,
        item.category,
        item.section,
        String(item.quantity),
        item.unit,
        item.status,
        item.notes ?? "",
      ]),
    ),
  ].join("\r\n");
}

export interface SharedTripPackage {
  format: "camping-trip-v1";
  trip: Trip;
  items: TripItem[];
  profiles: UserProfile[];
}

export function tripToShareFile(
  trip: Trip,
  items: TripItem[],
  profiles: UserProfile[],
): string {
  return JSON.stringify(
    {
      format: "camping-trip-v1",
      trip,
      items,
      profiles,
    } satisfies SharedTripPackage,
    null,
    2,
  );
}

export function readSharedTripFile(text: string): SharedTripPackage {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (
    !isRecord(value) ||
    value.format !== "camping-trip-v1" ||
    !isTrip(value.trip) ||
    !Array.isArray(value.items) ||
    !value.items.every(isTripItem) ||
    !Array.isArray(value.profiles)
  )
    throw new Error("This is not a shared camping trip file.");
  return {
    format: "camping-trip-v1",
    trip: value.trip,
    items: value.items,
    profiles: value.profiles.filter(isUserProfile),
  };
}

export function downloadText(
  filename: string,
  text: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isString(value: unknown): value is string {
  return typeof value === "string";
}
function isMasterItem(value: unknown): value is MasterItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.category) &&
    isString(value.section) &&
    typeof value.defaultQuantity === "number" &&
    isString(value.unit) &&
    Array.isArray(value.tripStyles) &&
    Array.isArray(value.tags) &&
    typeof value.archived === "boolean" &&
    isString(value.source)
  );
}
function isTrip(value: unknown): value is Trip {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    typeof value.camperCount === "number" &&
    isString(value.style) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    typeof value.archived === "boolean"
  );
}
function isSite(value: unknown): value is Site {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    Array.isArray(value.tags) &&
    isString(value.visitState) &&
    isRecord(value.amenities) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    typeof value.archived === "boolean"
  );
}
function isWaypoint(value: unknown): value is Waypoint {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.tripId) &&
    isString(value.type) &&
    isString(value.name) &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}
function isWeatherSnapshot(value: unknown): value is WeatherSnapshot {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.tripId) &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    isString(value.provider) &&
    isString(value.fetchedAt) &&
    Array.isArray(value.hourly) &&
    Array.isArray(value.daily) &&
    Array.isArray(value.alerts)
  );
}
function isRouteTrack(value: unknown): value is RouteTrack { return isRecord(value) && isString(value.id) && isString(value.tripId) && (value.kind === "route" || value.kind === "track") && isString(value.name) && Array.isArray(value.points) && typeof value.distanceMeters === "number" && isString(value.createdAt) && isString(value.updatedAt); }
function isTripItem(value: unknown): value is TripItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.tripId) &&
    isString(value.name) &&
    isString(value.category) &&
    isString(value.section) &&
    typeof value.quantity === "number" &&
    isString(value.unit) &&
    isString(value.status) &&
    Array.isArray(value.tags) &&
    typeof value.custom === "boolean" &&
    typeof value.sortOrder === "number"
  );
}
function isUserProfile(value: unknown): value is UserProfile {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    Array.isArray(value.personalItems) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}
function isMealIngredient(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name) && typeof value.scalable === "boolean" && (value.quantity === undefined || typeof value.quantity === "number") && (value.unit === undefined || isString(value.unit));
}
function isSavedMeal(value: unknown): value is SavedMeal {
  return isRecord(value) && isString(value.id) && isString(value.name) && isString(value.category) && typeof value.favorite === "boolean" && (value.favoriteIndex === "0" || value.favoriteIndex === "1") && (value.archivedIndex === "0" || value.archivedIndex === "1") && Array.isArray(value.ingredients) && value.ingredients.every(isMealIngredient) && Array.isArray(value.cookingMethods) && Array.isArray(value.storageNeeds) && Array.isArray(value.equipment) && value.equipment.every((item) => isRecord(item) && isString(item.name)) && isString(value.createdAt) && isString(value.updatedAt) && typeof value.archived === "boolean";
}
function isMealPlanEntry(value: unknown): value is MealPlanEntry {
  return isRecord(value) && isString(value.id) && isString(value.tripId) && Number.isInteger(value.dayIndex) && typeof value.dayIndex === "number" && value.dayIndex >= 0 && isString(value.slot) && isString(value.title) && isString(value.createdAt) && isString(value.updatedAt) && (value.mealSnapshot === undefined || isSavedMeal(value.mealSnapshot));
}
function isTripGroceryItem(value: unknown): value is TripGroceryItem {
  return isRecord(value) && isString(value.id) && isString(value.tripId) && isString(value.matchKey) && isString(value.name) && Array.isArray(value.sourceMealEntryIds) && value.sourceMealEntryIds.every(isString) && typeof value.manual === "boolean" && (value.status === "need-to-buy" || value.status === "already-have" || value.status === "packed") && isString(value.updatedAt);
}
function isSettings(value: unknown): value is AppSettings {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === "number" &&
    isString(value.defaultTripStyle) &&
    typeof value.compactPackingMode === "boolean"
  );
}
