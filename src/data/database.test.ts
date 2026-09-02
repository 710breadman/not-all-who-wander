import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OfflineMapRegion, OfflineTripPack, SavedMeal, Site, Trip, TripItem, Waypoint } from "../domain/models";
import {
  DATABASE_VERSION,
  databaseMigrations,
  deleteCampingDatabase,
  openCampingDatabase,
  type CampingDatabase,
} from "./database";
import { MasterItemRepository, MealPlanEntryRepository, OfflineMapRegionRepository, OfflineTripPackRepository, SavedMealRepository, SiteRepository, TripGroceryItemRepository, TripItemRepository, TripRepository, UserProfileRepository, WaypointRepository } from "./repositories";
import { loadChecklistSeed } from "./seedLoader";

describe("IndexedDB persistence", () => {
  let databaseName: string;
  let database: CampingDatabase | undefined;

  beforeEach(() => {
    databaseName = `camping-test-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    database?.close();
    await deleteCampingDatabase(databaseName);
  });

  it("uses an explicit migration version", () => {
    expect(DATABASE_VERSION).toBe(9);
    expect(databaseMigrations.map((migration) => migration.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("upgrades the prior production schema without losing existing records", async () => {
    const trip: Trip = { id: "trip-before-meals", name: "Existing trip", camperCount: 1, style: "car", createdAt: "2026-08-31", updatedAt: "2026-08-31", archived: false };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 8);
      request.onupgradeneeded = () => {
        const legacyDatabase = request.result as unknown as CampingDatabase;
        for (const migration of databaseMigrations.filter((item) => item.version <= 8)) migration.migrate(legacyDatabase, request.transaction as never);
        request.transaction?.objectStore("trips").put(trip);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    database = await openCampingDatabase({ databaseName });
    expect((await new TripRepository(database).get(trip.id))?.name).toBe("Existing trip");
    expect([...database.objectStoreNames]).toEqual(expect.arrayContaining(["savedMeals", "mealPlanEntries", "tripGroceryItems"]));
  });

  it("imports the canonical seed once without duplicates", async () => {
    const expectedCount = loadChecklistSeed().items.length;
    database = await openCampingDatabase({ databaseName });
    expect(await new MasterItemRepository(database).count()).toBe(expectedCount);
    database.close();

    database = await openCampingDatabase({ databaseName });
    expect(await new MasterItemRepository(database).count()).toBe(expectedCount);
  });

  it("does not overwrite an edited seed item during a later seed import", async () => {
    const seed = loadChecklistSeed();
    database = await openCampingDatabase({ databaseName, seed });
    const repository = new MasterItemRepository(database);
    const original = seed.items[0];
    expect(original).toBeDefined();
    if (!original) return;
    await repository.save({ ...original, name: "My edited item" });
    database.close();

    database = await openCampingDatabase({
      databaseName,
      seed: { ...seed, seedVersion: `${seed.seedVersion}.next` },
    });
    expect((await new MasterItemRepository(database).get(original.id))?.name).toBe("My edited item");
  });

  it("moves legacy meta profiles into individual records without losing them", async () => {
    database = await openCampingDatabase({ databaseName });
    const profile = { id: "profile-legacy", name: "Legacy camper", personalItems: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    await database.put("meta", [profile], "userProfiles");
    await database.put("meta", false, "profilesStoreMigrated");
    await database.clear("profiles");
    database.close();

    database = await openCampingDatabase({ databaseName });
    expect(await new UserProfileRepository(database).list()).toEqual([profile]);
  });

  it("persists trips and trip items across connections", async () => {
    const now = "2026-08-28T12:00:00.000Z";
    const trip: Trip = {
      id: "trip-redwoods",
      name: "Redwoods",
      camperCount: 2,
      style: "car",
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    const tripItem: TripItem = {
      id: "trip-redwoods-tent",
      tripId: trip.id,
      masterItemId: "gear-tent",
      name: "Tent",
      category: "gear",
      section: "Shelter & Sleep",
      quantity: 1,
      unit: "item",
      status: "not-packed",
      tags: ["shelter"],
      custom: false,
      sortOrder: 10,
    };

    database = await openCampingDatabase({ databaseName });
    await new TripRepository(database).save(trip);
    await new TripItemRepository(database).save(tripItem);
    database.close();

    database = await openCampingDatabase({ databaseName });
    expect(await new TripRepository(database).get(trip.id)).toEqual(trip);
    expect(await new TripItemRepository(database).listByTrip(trip.id)).toEqual([tripItem]);
  });

  it("queries master data and trip data independently", async () => {
    database = await openCampingDatabase({ databaseName });
    const masters = new MasterItemRepository(database);
    const trips = new TripRepository(database);

    expect((await masters.listByCategory("food")).length).toBeGreaterThan(0);
    expect(await trips.list()).toEqual([]);
  });

  it("supports archive filtering and trip ordering", async () => {
    database = await openCampingDatabase({ databaseName });
    const masters = new MasterItemRepository(database);
    const trips = new TripRepository(database);
    const food = (await masters.listByCategory("food"))[0];
    expect(food).toBeDefined();
    if (!food) return;
    await masters.archive(food.id);
    expect((await masters.listByCategory("food")).some((item) => item.id === food.id)).toBe(false);
    expect((await masters.listByCategory("food", true)).find((item) => item.id === food.id)?.archived).toBe(true);

    const older: Trip = {
      id: "trip-older",
      name: "Older",
      camperCount: 1,
      style: "car",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archived: false,
    };
    const newer: Trip = {
      ...older,
      id: "trip-newer",
      name: "Newer",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    };
    await trips.save(older);
    await trips.save(newer);
    expect((await trips.list()).map((trip) => trip.id)).toEqual([newer.id, older.id]);
    await trips.archive(newer.id);
    expect((await trips.list()).map((trip) => trip.id)).toEqual([older.id]);
    expect((await trips.list(true)).some((trip) => trip.id === newer.id)).toBe(true);
  });

  it("supports compound trip-item queries, batch saves, and deletion", async () => {
    database = await openCampingDatabase({ databaseName });
    const repository = new TripItemRepository(database);
    const base: TripItem = {
      id: "item-gear",
      tripId: "trip-query",
      name: "Tent",
      category: "gear",
      section: "Shelter & Sleep",
      quantity: 1,
      unit: "item",
      status: "not-packed",
      tags: [],
      custom: false,
      sortOrder: 20,
    };
    const food: TripItem = {
      ...base,
      id: "item-food",
      name: "Ketchup",
      category: "food",
      section: "Condiments",
      status: "need-to-buy",
      sortOrder: 10,
    };
    await repository.saveMany([base, food]);

    expect((await repository.listByTrip("trip-query")).map((item) => item.id)).toEqual([food.id, base.id]);
    expect((await repository.listByTripAndCategory("trip-query", "gear")).map((item) => item.id)).toEqual([base.id]);
    expect((await repository.listByTripAndStatus("trip-query", "need-to-buy")).map((item) => item.id)).toEqual([food.id]);
    await repository.delete(food.id);
    expect(await repository.get(food.id)).toBeUndefined();
  });

  it("keeps archived sites available to historical trip references", async () => {
    database = await openCampingDatabase({ databaseName });
    const sites = new SiteRepository(database);
    const site: Site = {
      id: "site-redwoods",
      name: "Redwoods Camp",
      tags: ["coast"],
      visitState: "want-to-visit",
      amenities: { toilets: true },
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
      archived: false,
    };
    await sites.save(site);
    await new TripRepository(database).save({
      id: "trip-site",
      name: "Redwoods",
      siteId: site.id,
      camperCount: 1,
      style: "car",
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      archived: false,
    });
    await sites.archive(site.id);
    expect(await sites.list()).toEqual([]);
    expect((await sites.list(true))[0]?.archived).toBe(true);
    expect((await new TripRepository(database).get("trip-site"))?.siteId).toBe(site.id);
  });

  it("persists local waypoints by trip", async () => {
    database = await openCampingDatabase({ databaseName });
    const waypoints = new WaypointRepository(database);
    const waypoint: Waypoint = { id: "waypoint-start", tripId: "trip-waypoint", type: "trailhead", name: "Fern Canyon trailhead", latitude: 41.4, longitude: -124.1, createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z" };
    await waypoints.save(waypoint);
    expect(await waypoints.listByTrip(waypoint.tripId)).toEqual([waypoint]);
  });

  it("persists and indexes saved meals, plan snapshots, and grocery status", async () => {
    database = await openCampingDatabase({ databaseName });
    const savedMeals = new SavedMealRepository(database);
    const plans = new MealPlanEntryRepository(database);
    const groceries = new TripGroceryItemRepository(database);
    const saved: SavedMeal = { id: "meal-favorite", name: "Foil dinner", category: "dinner", favorite: true, favoriteIndex: "1", archivedIndex: "0", ingredients: [], cookingMethods: ["campfire"], storageNeeds: ["cooler"], equipment: [], createdAt: "2026-09-01", updatedAt: "2026-09-01", archived: false };
    await savedMeals.save(saved);
    await plans.save({ id: "plan-dinner", tripId: "trip-meals", dayIndex: 1, slot: "dinner", title: saved.name, savedMealId: saved.id, mealSnapshot: structuredClone(saved), createdAt: "2026-09-01", updatedAt: "2026-09-01" });
    await groceries.save({ id: "grocery-potato", tripId: "trip-meals", matchKey: "potato|count", name: "Potato", unit: "count", derivedQuantity: 2, sourceMealEntryIds: ["plan-dinner"], manual: false, status: "already-have", updatedAt: "2026-09-01" });
    expect((await savedMeals.listFavorites())[0]?.id).toBe(saved.id);
    expect((await plans.listByTripDay("trip-meals", 1))[0]?.mealSnapshot?.name).toBe("Foil dinner");
    expect((await groceries.listByStatus("trip-meals", "already-have"))[0]?.name).toBe("Potato");
  });

  it("keeps offline map archives in their own removable store", async () => {
    database = await openCampingDatabase({ databaseName });
    const regions = new OfflineMapRegionRepository(database);
    const region: OfflineMapRegion = { id: "region-redwoods", tripId: "trip-map", name: "Redwoods", bounds: { west: -124.2, south: 41.2, east: -123.8, north: 41.5 }, minZoom: 8, maxZoom: 14, sourceUrl: "https://maps.example/redwoods.pmtiles", provider: "user-supplied-pmtiles", licenseConfirmed: true, status: "complete", bytesDownloaded: 3, archive: new Blob(["map"]), downloadedAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };
    await regions.save(region);
    expect((await regions.listByTrip(region.tripId))[0]?.name).toBe(region.name);
    await regions.delete(region.id);
    expect(await regions.get(region.id)).toBeUndefined();
  });

  it("keeps offline trip packs separate from the source trip", async () => {
    database = await openCampingDatabase({ databaseName });
    const trip: Trip = { id: "trip-pack", name: "Pack source", camperCount: 1, style: "car", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z", archived: false };
    await new TripRepository(database).save(trip);
    const pack: OfflineTripPack = { id: "pack-1", tripId: trip.id, name: "Pack source offline pack", components: { mapRegion: false, officialSites: false, siteIdeas: true, waypointsRoutes: false, weather: false, contextLayers: false, permits: false, emergency: true }, officialSites: [], siteIdeas: [], waypoints: [], routes: [], contextLayers: [], permits: [], sizeEstimateBytes: 0, downloadedAt: trip.createdAt, updatedAt: trip.updatedAt };
    const packs = new OfflineTripPackRepository(database);
    await packs.save(pack);
    await packs.delete(pack.id);
    expect(await new TripRepository(database).get(trip.id)).toEqual(trip);
  });
});
