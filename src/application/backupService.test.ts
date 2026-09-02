import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase, openCampingDatabase } from "../data/database";
import {
  MasterItemRepository,
  SavedMealRepository,
  MealPlanEntryRepository,
  TripGroceryItemRepository,
  SiteRepository,
  WaypointRepository,
  RouteTrackRepository,
  TripItemRepository,
  TripRepository,
  UserProfileRepository,
} from "../data/repositories";
import { configureSync, createSyncSettings, listSyncQueue } from "../data/syncRepository";
import {
  BACKUP_VERSION,
  createBackup,
  parseBackup,
  readSharedTripFile,
  restoreBackup,
  tripItemsToCsv,
  tripToShareFile,
} from "./backupService";

describe("backup service", () => {
  const names: string[] = [];
  afterEach(async () => {
    await Promise.all(
      names.splice(0).map((name) => deleteCampingDatabase(name)),
    );
  });
  it("rejects malformed backup files", () =>
    expect(() => parseBackup("not-json")).toThrow(/valid JSON/i));
  it("rejects malformed meal planner data", () => {
    const invalid = { backupVersion: 7, exportedAt: "2026-09-01", masterItems: [], trips: [], tripItems: [], sites: [], waypoints: [], weatherSnapshots: [], routeTracks: [], profiles: [], savedMeals: [{ id: "broken" }], mealPlanEntries: [], tripGroceryItems: [] };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow(/invalid checklist data/i);
  });
  it("creates escaped, spreadsheet-readable CSV", () => {
    const csv = tripItemsToCsv(
      {
        id: "trip",
        name: "Camp, trip",
        camperCount: 1,
        style: "car",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        archived: false,
      },
      [
        {
          id: "item",
          tripId: "trip",
          name: 'Bob\'s "Burgers"',
          category: "food",
          section: "Dinner",
          quantity: 2,
          unit: "item",
          status: "not-packed",
          tags: [],
          custom: false,
          sortOrder: 1,
        },
      ],
    );
    expect(csv).toContain('"Bob\'s ""Burgers"""');
    expect(BACKUP_VERSION).toBe(7);
  });
  it("creates and reads a portable shared trip file", () => {
    const trip = {
      id: "shared-trip",
      name: "Shared camp",
      camperCount: 2,
      style: "car" as const,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archived: false,
    };
    const items = [
      {
        id: "shared-item",
        tripId: trip.id,
        name: "Pillow",
        category: "gear" as const,
        section: "Shelter & Sleep",
        quantity: 1,
        unit: "item",
        status: "not-packed" as const,
        tags: [],
        custom: true,
        assigneeId: "profile-sam",
        sortOrder: 1,
      },
    ];
    const profiles = [
      {
        id: "profile-sam",
        name: "Sam",
        personalItems: [],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];
    expect(
      readSharedTripFile(tripToShareFile(trip, items, profiles)),
    ).toMatchObject({ format: "camping-trip-v1", trip, items, profiles });
  });
  it("round-trips representative inventory, trip, and item data", async () => {
    const source = `backup-source-${crypto.randomUUID()}`;
    const destination = `backup-destination-${crypto.randomUUID()}`;
    names.push(source, destination);
    const database = await openCampingDatabase({ databaseName: source });
    const trip = {
      id: "trip-backup",
      name: "Backup trip",
      camperCount: 2,
      style: "car" as const,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archived: false,
    };
    await new TripRepository(database).save(trip);
    await new SiteRepository(database).save({
      id: "site-backup",
      name: "Backup site",
      tags: ["test"],
      visitState: "want-to-visit",
      amenities: { fireRing: true },
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archived: false,
    });
    await new WaypointRepository(database).save({
      id: "waypoint-backup",
      tripId: trip.id,
      type: "trailhead",
      name: "Backup trailhead",
      latitude: 40.1,
      longitude: -124.2,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    await new RouteTrackRepository(database).save({
      id: "route-backup",
      tripId: trip.id,
      kind: "route",
      name: "Backup route",
      points: [{ latitude: 40, longitude: -124 }, { latitude: 40.01, longitude: -124 }],
      distanceMeters: 1112,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    await new TripItemRepository(database).save({
      id: "item-backup",
      tripId: trip.id,
      name: "Custom lamp",
      category: "gear",
      section: "Power & Electronics",
      quantity: 2,
      unit: "item",
      status: "need-to-buy",
      tags: ["custom"],
      custom: true,
      sortOrder: 1,
    });
    await new MasterItemRepository(database).save({
      id: "user-backup",
      name: "Custom lamp",
      category: "gear",
      section: "Power & Electronics",
      defaultQuantity: 2,
      unit: "item",
      tripStyles: ["car"],
      tags: [],
      archived: false,
      source: "user",
    });
    await new UserProfileRepository(database).save({
      id: "profile-backup",
      name: "Backup camper",
      email: "camper@example.com",
      personalItems: [],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    const savedMeal = { id: "meal-backup", name: "Tacos", category: "dinner" as const, favorite: true, favoriteIndex: "1" as const, archivedIndex: "0" as const, ingredients: [{ id: "tortilla", name: "Tortillas", quantity: 8, unit: "count", scalable: true }], cookingMethods: ["stove" as const], storageNeeds: ["cooler" as const], equipment: [], createdAt: "2026-01-01", updatedAt: "2026-01-01", archived: false };
    await new SavedMealRepository(database).save(savedMeal);
    await new MealPlanEntryRepository(database).save({ id: "plan-backup", tripId: trip.id, dayIndex: 0, slot: "dinner", title: savedMeal.name, savedMealId: savedMeal.id, mealSnapshot: savedMeal, createdAt: "2026-01-01", updatedAt: "2026-01-01" });
    await new TripGroceryItemRepository(database).save({ id: "grocery-backup", tripId: trip.id, matchKey: "tortillas|count", name: "Tortillas", unit: "count", derivedQuantity: 8, quantityOverride: 10, sourceMealEntryIds: ["plan-backup"], manual: false, status: "packed", notes: "extra", updatedAt: "2026-01-01" });
    database.close();
    const backup = await createBackup(source);
    await restoreBackup(backup, destination);
    const restored = await openCampingDatabase({ databaseName: destination });
    expect((await new TripRepository(restored).get(trip.id))?.name).toBe(
      "Backup trip",
    );
    expect(
      (await new TripItemRepository(restored).get("item-backup"))?.status,
    ).toBe("need-to-buy");
    expect(
      (await new MasterItemRepository(restored).get("user-backup"))?.name,
    ).toBe("Custom lamp");
    expect((await new SiteRepository(restored).get("site-backup"))?.name).toBe("Backup site");
    expect((await new WaypointRepository(restored).get("waypoint-backup"))?.name).toBe("Backup trailhead");
    expect((await new RouteTrackRepository(restored).listByTrip(trip.id))[0]?.name).toBe("Backup route");
    expect((await new UserProfileRepository(restored).list())[0]?.email).toBe("camper@example.com");
    expect((await new SavedMealRepository(restored).get("meal-backup"))?.favorite).toBe(true);
    expect((await new MealPlanEntryRepository(restored).get("plan-backup"))?.mealSnapshot?.name).toBe("Tacos");
    expect((await new TripGroceryItemRepository(restored).get("grocery-backup"))).toMatchObject({ status: "packed", quantityOverride: 10, notes: "extra" });
    restored.close();
  });

  it("clears stale cloud state during a destructive restore", async () => {
    const source = `backup-source-${crypto.randomUUID()}`;
    const destination = `backup-destination-${crypto.randomUUID()}`;
    names.push(source, destination);
    const backup = await createBackup(source);
    const database = await openCampingDatabase({ databaseName: destination });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const item = (await new MasterItemRepository(database).list())[0]!;
    await new MasterItemRepository(database).save({ ...item, name: "Stale queued edit" });
    expect(await listSyncQueue(database, "user-a")).toHaveLength(1);
    database.close();

    await restoreBackup(backup, destination);
    const restored = await openCampingDatabase({ databaseName: destination });
    expect(await restored.get("meta", "syncSettings")).toBeUndefined();
    expect(await restored.getAll("syncMetadata")).toEqual([]);
    expect(await restored.getAll("syncQueue")).toEqual([]);
    expect(await restored.getAll("syncConflicts")).toEqual([]);
    restored.close();
  });
});
