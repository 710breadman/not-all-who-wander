import { openCampingDatabase } from "../data/database";
import { OfflineMapRegionRepository, OfflineTripPackRepository, RouteTrackRepository, SiteRepository, TripRepository, WaypointRepository, WeatherSnapshotRepository } from "../data/repositories";
import type { OfflineContextLayerSnapshot, OfflineTripPack, OfflineTripPackComponent, OfflineTripPackSelection, Site, Trip } from "../domain/models";
import { isMapRegionStale } from "./offlineMapService";
import { isWeatherStale } from "./weatherService";

export const defaultOfflineTripPackSelection: OfflineTripPackSelection = { mapRegion: true, officialSites: true, siteIdeas: true, waypointsRoutes: true, weather: true, contextLayers: true, permits: true, emergency: true };
export type TripPackOptions = { components?: Partial<OfflineTripPackSelection>; mapRegionId?: string; name?: string; databaseName?: string };

export async function createOfflineTripPack(tripId: string, options: TripPackOptions = {}): Promise<OfflineTripPack> {
  return snapshotTripPack(tripId, { ...options, id: `trip-pack-${crypto.randomUUID()}` });
}

export async function previewOfflineTripPack(tripId: string, options: TripPackOptions = {}): Promise<OfflineTripPack> {
  return snapshotTripPack(tripId, { ...options, id: "trip-pack-preview", save: false });
}

export async function refreshOfflineTripPack(id: string, components?: Partial<OfflineTripPackSelection>, databaseName?: string): Promise<OfflineTripPack> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try {
    const existing = await new OfflineTripPackRepository(database).get(id);
    if (!existing) throw new Error("That offline trip pack no longer exists.");
    return await snapshotTripPack(existing.tripId, { id, name: existing.name, ...(existing.mapRegionId ? { mapRegionId: existing.mapRegionId } : {}), components: { ...existing.components, ...components }, ...(databaseName === undefined ? {} : { databaseName }) });
  } finally { database.close(); }
}

export async function listOfflineTripPacks(tripId: string, databaseName?: string): Promise<OfflineTripPack[]> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try { return (await new OfflineTripPackRepository(database).listByTrip(tripId)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)); } finally { database.close(); }
}

export async function deleteOfflineTripPack(id: string, databaseName?: string): Promise<void> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try { await new OfflineTripPackRepository(database).delete(id); } finally { database.close(); }
}

export async function stalePackComponents(pack: OfflineTripPack, databaseName?: string, now = Date.now()): Promise<OfflineTripPackComponent[]> {
  const stale: OfflineTripPackComponent[] = [];
  if (pack.components.weather && (!pack.weatherSnapshot || isWeatherStale(pack.weatherSnapshot, new Date(now)))) stale.push("weather");
  if (pack.components.contextLayers && (!pack.contextLayers.length || pack.contextLayers.some((layer) => now - new Date(layer.fetchedAt).getTime() > 24 * 60 * 60 * 1_000))) stale.push("contextLayers");
  if (pack.components.mapRegion) {
    const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
    try {
      const region = pack.mapRegionId ? await new OfflineMapRegionRepository(database).get(pack.mapRegionId) : undefined;
      if (!region || region.status !== "complete" || isMapRegionStale(region, now)) stale.push("mapRegion");
    } finally { database.close(); }
  }
  return stale;
}

async function snapshotTripPack(tripId: string, options: TripPackOptions & { id: string; save?: boolean }): Promise<OfflineTripPack> {
  const database = await openCampingDatabase(options.databaseName === undefined ? {} : { databaseName: options.databaseName });
  try {
    const trip = await new TripRepository(database).get(tripId);
    if (!trip) throw new Error("That trip no longer exists.");
    const components = { ...defaultOfflineTripPackSelection, ...options.components };
    const regions = await new OfflineMapRegionRepository(database).listByTrip(tripId);
    const region = components.mapRegion ? (options.mapRegionId ? regions.find((entry) => entry.id === options.mapRegionId) : regions.find((entry) => entry.status === "complete")) : undefined;
    if (region && region.status !== "complete") throw new Error("Select a fully downloaded map region before including it in a pack.");
    const sites = await new SiteRepository(database).list(true);
    const relevantSites = sites.filter((site) => site.id === trip.siteId || (region && siteInBounds(site, region.bounds)));
    const officialSites = components.officialSites ? relevantSites.filter((site) => Boolean(site.sourceUrl)) : [];
    const siteIdeas = components.siteIdeas ? relevantSites.filter((site) => !site.sourceUrl) : [];
    const waypoints = components.waypointsRoutes ? await new WaypointRepository(database).listByTrip(tripId) : [];
    const routes = components.waypointsRoutes ? await new RouteTrackRepository(database).listByTrip(tripId) : [];
    const weatherSnapshot = components.weather ? await new WeatherSnapshotRepository(database).getByTrip(tripId) : undefined;
    const contextKeyForTrip = contextKey(trip);
    const contextLayers = components.contextLayers && contextKeyForTrip ? readContextSummary(await database.get("meta", contextKeyForTrip)) : [];
    const permits = components.permits ? relevantSites.flatMap((site) => site.costReservationPermitNotes?.trim() ? [site.costReservationPermitNotes.trim()] : []) : [];
    const emergencyReference = components.emergency ? emergencyForTrip(trip) : undefined;
    const now = new Date().toISOString();
    const pack: OfflineTripPack = { id: options.id, tripId, name: options.name?.trim() || `${trip.name} offline pack`, components, ...(region ? { mapRegionId: region.id } : {}), officialSites, siteIdeas, waypoints, routes, ...(weatherSnapshot ? { weatherSnapshot } : {}), contextLayers, permits, ...(emergencyReference ? { emergencyReference } : {}), sizeEstimateBytes: estimatePackBytes({ officialSites, siteIdeas, waypoints, routes, weatherSnapshot, contextLayers, permits, emergencyReference }, region?.bytesTotal), downloadedAt: now, updatedAt: now };
    if (options.save !== false) await new OfflineTripPackRepository(database).save(pack);
    return pack;
  } finally { database.close(); }
}

function contextKey(trip: Trip): string | undefined { return trip.destinationLatitude === undefined || trip.destinationLongitude === undefined ? undefined : `context:${trip.destinationLatitude.toFixed(2)},${trip.destinationLongitude.toFixed(2)}`; }
function readContextSummary(value: unknown): OfflineContextLayerSnapshot[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { layers?: unknown }).layers)) return [];
  return ((value as { layers: Array<{ id?: unknown; title?: unknown; sourceUrl?: unknown; fetchedAt?: unknown; features?: unknown }> }).layers).flatMap((layer) => typeof layer.id === "string" && typeof layer.title === "string" && typeof layer.sourceUrl === "string" && typeof layer.fetchedAt === "string" ? [{ id: layer.id, title: layer.title, sourceUrl: layer.sourceUrl, fetchedAt: layer.fetchedAt, featureCount: Array.isArray(layer.features) ? layer.features.length : 0 }] : []);
}
function siteInBounds(site: Site, bounds: { west: number; south: number; east: number; north: number }): boolean { return site.latitude !== undefined && site.longitude !== undefined && site.longitude >= bounds.west && site.longitude <= bounds.east && site.latitude >= bounds.south && site.latitude <= bounds.north; }
function emergencyForTrip(trip: Trip): OfflineTripPack["emergencyReference"] { const reference = { ...(trip.expectedDeparture ? { expectedDeparture: trip.expectedDeparture } : {}), ...(trip.expectedReturn ? { expectedReturn: trip.expectedReturn } : {}), ...(trip.emergencyContactName ? { contactName: trip.emergencyContactName } : {}), ...(trip.emergencyContactPhone ? { contactPhone: trip.emergencyContactPhone } : {}), ...(trip.vehicleDescription ? { vehicle: trip.vehicleDescription } : {}), ...(trip.destination ? { destination: trip.destination } : {}) }; return Object.keys(reference).length ? reference : undefined; }
function estimatePackBytes(value: object, mapBytes = 0): number { return new TextEncoder().encode(JSON.stringify(value)).byteLength + mapBytes; }
