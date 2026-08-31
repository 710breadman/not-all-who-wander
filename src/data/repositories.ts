import type {
  ChecklistCategory,
  MasterItem,
  Site,
  Waypoint,
  WeatherSnapshot,
  RouteTrack,
  Trip,
  TripItem,
  TripItemStatus,
  UserProfile,
} from "../domain/models";
import type { CampingDatabase } from "./database";

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
    await this.database.put("masterItems", item);
  }

  async archive(id: string): Promise<void> {
    const transaction = this.database.transaction("masterItems", "readwrite");
    const item = await transaction.store.get(id);
    if (item) await transaction.store.put({ ...item, archived: true });
    await transaction.done;
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
    await this.database.put("trips", trip);
  }

  async archive(id: string): Promise<void> {
    const transaction = this.database.transaction("trips", "readwrite");
    const trip = await transaction.store.get(id);
    if (trip) {
      await transaction.store.put({
        ...trip,
        archived: true,
        updatedAt: new Date().toISOString(),
      });
    }
    await transaction.done;
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
    await this.database.put("sites", site);
  }

  async archive(id: string): Promise<void> {
    const transaction = this.database.transaction("sites", "readwrite");
    const site = await transaction.store.get(id);
    if (site)
      await transaction.store.put({
        ...site,
        archived: true,
        updatedAt: new Date().toISOString(),
      });
    await transaction.done;
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
    await this.database.put("waypoints", waypoint);
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
  async save(route: RouteTrack): Promise<void> { await this.database.put("routeTracks", route); }
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
    await this.database.put("tripItems", item);
  }

  async saveMany(items: TripItem[]): Promise<void> {
    const transaction = this.database.transaction("tripItems", "readwrite");
    await Promise.all([
      ...items.map((item) => transaction.store.put(item)),
      transaction.done,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.database.delete("tripItems", id);
  }
}

export class UserProfileRepository {
  private static readonly key = "userProfiles";

  constructor(private readonly database: CampingDatabase) {}

  async list(): Promise<UserProfile[]> {
    return (
      ((await this.database.get("meta", UserProfileRepository.key)) as
        UserProfile[] | undefined) ?? []
    ).sort((left, right) => left.name.localeCompare(right.name));
  }

  async save(profile: UserProfile): Promise<void> {
    const profiles = await this.list();
    const index = profiles.findIndex((entry) => entry.id === profile.id);
    if (index === -1) profiles.push(profile);
    else profiles[index] = profile;
    await this.database.put("meta", profiles, UserProfileRepository.key);
  }
}

function sortTripItems(items: TripItem[]): TripItem[] {
  return items.sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}
