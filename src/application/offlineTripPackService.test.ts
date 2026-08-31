import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase, openCampingDatabase } from "../data/database";
import { OfflineMapRegionRepository, SiteRepository, TripRepository, WeatherSnapshotRepository } from "../data/repositories";
import { createOfflineTripPack, deleteOfflineTripPack, listOfflineTripPacks, stalePackComponents } from "./offlineTripPackService";

describe("offline trip packs", () => {
  const names: string[] = [];
  afterEach(async () => { await Promise.all(names.splice(0).map((name) => deleteCampingDatabase(name))); });
  it("snapshots selected local data without changing or deleting the trip", async () => {
    const databaseName = `trip-pack-${crypto.randomUUID()}`; names.push(databaseName);
    const database = await openCampingDatabase({ databaseName });
    const trip = { id: "trip", name: "Redwoods", destination: "Fern Canyon", destinationLatitude: 41.4, destinationLongitude: -124.1, emergencyContactName: "Sam", camperCount: 2, style: "car" as const, createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z", archived: false };
    await new TripRepository(database).save(trip);
    await new SiteRepository(database).save({ id: "site", name: "Official camp", latitude: 41.4, longitude: -124.1, sourceUrl: "https://www.fs.usda.gov/", tags: [], visitState: "want-to-visit", amenities: {}, createdAt: trip.createdAt, updatedAt: trip.updatedAt, archived: false });
    await new WeatherSnapshotRepository(database).save({ id: "weather-trip", tripId: trip.id, latitude: 41.4, longitude: -124.1, provider: "nws", fetchedAt: trip.createdAt, hourly: [], daily: [], alerts: [] });
    await new OfflineMapRegionRepository(database).save({ id: "region", tripId: trip.id, name: "Region", bounds: { west: -125, south: 41, east: -123, north: 42 }, minZoom: 8, maxZoom: 14, sourceUrl: "https://maps.example/region.pmtiles", provider: "user-supplied-pmtiles", licenseConfirmed: true, status: "complete", bytesDownloaded: 12, bytesTotal: 12, archive: new Blob(["map"]), downloadedAt: trip.createdAt, updatedAt: trip.updatedAt });
    database.close();
    const pack = await createOfflineTripPack(trip.id, { databaseName });
    expect(pack.officialSites.map((site) => site.id)).toEqual(["site"]);
    expect(pack.mapRegionId).toBe("region");
    expect(pack.emergencyReference?.contactName).toBe("Sam");
    expect(await stalePackComponents(pack, databaseName, new Date(pack.downloadedAt).getTime())).toEqual(["weather", "contextLayers"]);
    await deleteOfflineTripPack(pack.id, databaseName);
    expect(await listOfflineTripPacks(trip.id, databaseName)).toEqual([]);
    const reopened = await openCampingDatabase({ databaseName });
    expect(await new TripRepository(reopened).get(trip.id)).toMatchObject({ name: "Redwoods" });
    reopened.close();
  });
});
