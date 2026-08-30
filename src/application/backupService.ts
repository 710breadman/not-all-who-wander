import type {
  AppSettings,
  MasterItem,
  Trip,
  TripItem,
  UserProfile,
} from "../domain/models";
import { openCampingDatabase } from "../data/database";

export const BACKUP_VERSION = 1;
export interface CampingBackup {
  backupVersion: number;
  exportedAt: string;
  appSettings?: AppSettings;
  masterItems: MasterItem[];
  trips: Trip[];
  tripItems: TripItem[];
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
    value.backupVersion !== BACKUP_VERSION ||
    !isString(value.exportedAt) ||
    !Array.isArray(value.masterItems) ||
    !Array.isArray(value.trips) ||
    !Array.isArray(value.tripItems)
  )
    throw new Error("That file is not a compatible camping checklist backup.");
  if (
    !value.masterItems.every(isMasterItem) ||
    !value.trips.every(isTrip) ||
    !value.tripItems.every(isTripItem)
  )
    throw new Error("That backup contains invalid checklist data.");
  if (value.appSettings !== undefined && !isSettings(value.appSettings))
    throw new Error("That backup contains invalid settings.");
  return value as unknown as CampingBackup;
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
      ["meta", "masterItems", "trips", "tripItems"],
      "readwrite",
    );
    await Promise.all([
      transaction.objectStore("masterItems").clear(),
      transaction.objectStore("trips").clear(),
      transaction.objectStore("tripItems").clear(),
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
      ...backup.tripItems.map((item) =>
        transaction.objectStore("tripItems").put(item),
      ),
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
function isSettings(value: unknown): value is AppSettings {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === "number" &&
    isString(value.defaultTripStyle) &&
    typeof value.compactPackingMode === "boolean"
  );
}
