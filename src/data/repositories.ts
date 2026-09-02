import type {
  ChecklistCategory,
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
  SavedMeal,
  MealPlanEntry,
  TripGroceryItem,
  GroceryStatus,
  MealCategory,
  UserProfile,
} from "../domain/models";
import type { CampingDatabase } from "./database";
import { saveSyncableRecord, saveSyncableRecords } from "./syncRepository";

export class MasterItemRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<MasterItem | undefined> {
    return this.database.get("masterItems", id);
  }

  async list(includeArchived = false): Promise<MasterItem[]> {
    const items = await this.database.getAll("masterItems");
    return items.filter((item) => includeArchived || !item.archived);
  }

  async listByCategory(
    category: ChecklistCategory,
    includeArchived = false,
  ): Promise<MasterItem[]> {
    const items = await this.database.getAllFromIndex(
      "masterItems",
      "by-category",
      category,
    );
    return items.filter((item) => includeArchived || !item.archived);
  }

  count(): Promise<number> {
    return this.database.count("masterItems");
  }

  async save(item: MasterItem): Promise<void> {
    await saveSyncableRecord(this.database, "masterItems", "masterItems", item);
  }

  async archive(id: string): Promise<void> {
    const item = await this.database.get("masterItems", id);
    if (item) await saveSyncableRecord(this.database, "masterItems", "masterItems", { ...item, archived: true });
  }
}

export class TripRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<Trip | undefined> {
    return this.database.get("trips", id);
  }

  async list(includeArchived = false): Promise<Trip[]> {
    const trips = await this.database.getAllFromIndex("trips", "by-updated-at");
    return trips.filter((trip) => includeArchived || !trip.archived).reverse();
  }

  async save(trip: Trip): Promise<void> {
    await saveSyncableRecord(this.database, "trips", "trips", trip);
  }

  async archive(id: string): Promise<void> {
    const trip = await this.database.get("trips", id);
    if (trip) {
      await saveSyncableRecord(this.database, "trips", "trips", {
        ...trip,
        archived: true,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

export class SiteRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<Site | undefined> {
    return this.database.get("sites", id);
  }

  async list(includeArchived = false): Promise<Site[]> {
    const sites = await this.database.getAllFromIndex("sites", "by-updated-at");
    return sites.filter((site) => includeArchived || !site.archived).reverse();
  }

  async save(site: Site): Promise<void> {
    await saveSyncableRecord(this.database, "sites", "sites", site);
  }

  async archive(id: string): Promise<void> {
    const site = await this.database.get("sites", id);
    if (site)
      await saveSyncableRecord(this.database, "sites", "sites", {
        ...site,
        archived: true,
        updatedAt: new Date().toISOString(),
      });
  }
}

export class WaypointRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<Waypoint | undefined> {
    return this.database.get("waypoints", id);
  }

  async listByTrip(tripId: string): Promise<Waypoint[]> {
    const waypoints = await this.database.getAllFromIndex("waypoints", "by-trip-id", tripId);
    return waypoints.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async save(waypoint: Waypoint): Promise<void> {
    await saveSyncableRecord(this.database, "waypoints", "waypoints", waypoint);
  }

  delete(id: string): Promise<void> {
    return this.database.delete("waypoints", id);
  }
}

export class WeatherSnapshotRepository {
  constructor(private readonly database: CampingDatabase) {}

  getByTrip(tripId: string): Promise<WeatherSnapshot | undefined> {
    return this.database.get("weatherSnapshots", `weather-${tripId}`);
  }

  async save(snapshot: WeatherSnapshot): Promise<void> {
    await this.database.put("weatherSnapshots", snapshot);
  }
}

export class RouteTrackRepository {
  constructor(private readonly database: CampingDatabase) {}
  async listByTrip(tripId: string): Promise<RouteTrack[]> {
    return await this.database.getAllFromIndex("routeTracks", "by-trip-id", tripId);
  }
  async save(route: RouteTrack): Promise<void> { await saveSyncableRecord(this.database, "routeTracks", "routeTracks", route); }
  async delete(id: string): Promise<void> { await this.database.delete("routeTracks", id); }
}

export class OfflineMapRegionRepository {
  constructor(private readonly database: CampingDatabase) {}
  async listByTrip(tripId: string): Promise<OfflineMapRegion[]> {
    return await this.database.getAllFromIndex("offlineMapRegions", "by-trip-id", tripId);
  }
  get(id: string): Promise<OfflineMapRegion | undefined> { return this.database.get("offlineMapRegions", id); }
  save(region: OfflineMapRegion): Promise<IDBValidKey> { return this.database.put("offlineMapRegions", region); }
  delete(id: string): Promise<void> { return this.database.delete("offlineMapRegions", id); }
}

export class OfflineTripPackRepository {
  constructor(private readonly database: CampingDatabase) {}
  async listByTrip(tripId: string): Promise<OfflineTripPack[]> { return await this.database.getAllFromIndex("offlineTripPacks", "by-trip-id", tripId); }
  get(id: string): Promise<OfflineTripPack | undefined> { return this.database.get("offlineTripPacks", id); }
  save(pack: OfflineTripPack): Promise<IDBValidKey> { return this.database.put("offlineTripPacks", pack); }
  delete(id: string): Promise<void> { return this.database.delete("offlineTripPacks", id); }
}

export class TripItemRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<TripItem | undefined> {
    return this.database.get("tripItems", id);
  }

  async listByTrip(tripId: string): Promise<TripItem[]> {
    const items = await this.database.getAllFromIndex(
      "tripItems",
      "by-trip-id",
      tripId,
    );
    return sortTripItems(items);
  }

  async listByTripAndCategory(
    tripId: string,
    category: ChecklistCategory,
  ): Promise<TripItem[]> {
    const items = await this.database.getAllFromIndex(
      "tripItems",
      "by-trip-category",
      IDBKeyRange.only([tripId, category]),
    );
    return sortTripItems(items);
  }

  async listByTripAndStatus(
    tripId: string,
    status: TripItemStatus,
  ): Promise<TripItem[]> {
    const items = await this.database.getAllFromIndex(
      "tripItems",
      "by-trip-status",
      IDBKeyRange.only([tripId, status]),
    );
    return sortTripItems(items);
  }

  async save(item: TripItem): Promise<void> {
    await saveSyncableRecord(this.database, "tripItems", "tripItems", item);
  }

  async saveMany(items: TripItem[]): Promise<void> {
    await saveSyncableRecords(this.database, "tripItems", "tripItems", items);
  }

  async delete(id: string): Promise<void> {
    await this.database.delete("tripItems", id);
  }
}

export class UserProfileRepository {
  constructor(private readonly database: CampingDatabase) {}

  async list(): Promise<UserProfile[]> {
    return (await this.database.getAllFromIndex("profiles", "by-updated-at"))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async save(profile: UserProfile): Promise<void> {
    await saveSyncableRecord(this.database, "profiles", "userProfiles", profile);
  }
}

export class SavedMealRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<SavedMeal | undefined> { return this.database.get("savedMeals", id); }
  async list(includeArchived = false): Promise<SavedMeal[]> {
    const meals = includeArchived
      ? await this.database.getAll("savedMeals")
      : await this.database.getAllFromIndex("savedMeals", "by-archived", "0");
    return sortMeals(meals);
  }
  async listByCategory(category: MealCategory): Promise<SavedMeal[]> {
    return sortMeals((await this.database.getAllFromIndex("savedMeals", "by-category", category)).filter((meal) => !meal.archived));
  }
  async listFavorites(): Promise<SavedMeal[]> {
    return sortMeals((await this.database.getAllFromIndex("savedMeals", "by-favorite", "1")).filter((meal) => !meal.archived));
  }
  async save(meal: SavedMeal): Promise<void> { await this.database.put("savedMeals", meal); }
  async archive(id: string): Promise<void> {
    const meal = await this.get(id);
    if (meal) await this.save({ ...meal, archived: true, archivedIndex: "1", updatedAt: new Date().toISOString() });
  }
}

export class MealPlanEntryRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<MealPlanEntry | undefined> { return this.database.get("mealPlanEntries", id); }
  async listByTrip(tripId: string): Promise<MealPlanEntry[]> {
    return (await this.database.getAllFromIndex("mealPlanEntries", "by-trip-id", tripId))
      .sort((left, right) => left.dayIndex - right.dayIndex || left.slot.localeCompare(right.slot));
  }
  async listByTripDay(tripId: string, dayIndex: number): Promise<MealPlanEntry[]> {
    return await this.database.getAllFromIndex("mealPlanEntries", "by-trip-day", IDBKeyRange.only([tripId, dayIndex]));
  }
  async save(entry: MealPlanEntry): Promise<void> { await this.database.put("mealPlanEntries", entry); }
  async delete(id: string): Promise<void> { await this.database.delete("mealPlanEntries", id); }
}

export class TripGroceryItemRepository {
  constructor(private readonly database: CampingDatabase) {}

  get(id: string): Promise<TripGroceryItem | undefined> { return this.database.get("tripGroceryItems", id); }
  async listByTrip(tripId: string): Promise<TripGroceryItem[]> {
    return (await this.database.getAllFromIndex("tripGroceryItems", "by-trip-id", tripId))
      .sort((left, right) => (left.grocerySection ?? "Other").localeCompare(right.grocerySection ?? "Other") || left.name.localeCompare(right.name) || (left.unit ?? "").localeCompare(right.unit ?? ""));
  }
  async listByStatus(tripId: string, status: GroceryStatus): Promise<TripGroceryItem[]> {
    return await this.database.getAllFromIndex("tripGroceryItems", "by-trip-status", IDBKeyRange.only([tripId, status]));
  }
  async save(item: TripGroceryItem): Promise<void> { await this.database.put("tripGroceryItems", item); }
  async saveMany(items: TripGroceryItem[]): Promise<void> {
    const transaction = this.database.transaction("tripGroceryItems", "readwrite");
    await Promise.all(items.map((item) => transaction.store.put(item)));
    await transaction.done;
  }
  async delete(id: string): Promise<void> { await this.database.delete("tripGroceryItems", id); }
}

function sortTripItems(items: TripItem[]): TripItem[] {
  return items.sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}

function sortMeals(meals: SavedMeal[]): SavedMeal[] {
  return meals.sort((left, right) =>
    (right.lastUsedAt ?? "").localeCompare(left.lastUsedAt ?? "") ||
    left.name.localeCompare(right.name),
  );
}
