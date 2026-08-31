import { openCampingDatabase } from "../data/database";
import { RouteTrackRepository, WaypointRepository } from "../data/repositories";
import type { RouteTrack, Waypoint } from "../domain/models";

export async function listRouteTracks(tripId: string): Promise<RouteTrack[]> { const database = await openCampingDatabase(); try { return await new RouteTrackRepository(database).listByTrip(tripId); } finally { database.close(); } }
export async function saveImportedGpx(waypoints: Waypoint[], routes: RouteTrack[]): Promise<void> { const database = await openCampingDatabase(); try { const waypointRepository = new WaypointRepository(database); const routeRepository = new RouteTrackRepository(database); const existingWaypoints = await waypointRepository.listByTrip(waypoints[0]?.tripId ?? routes[0]?.tripId ?? ""); for (const waypoint of waypoints) if (!existingWaypoints.some((entry) => entry.name === waypoint.name && entry.latitude === waypoint.latitude && entry.longitude === waypoint.longitude)) await waypointRepository.save(waypoint); for (const route of routes) await routeRepository.save(route); } finally { database.close(); } }
export async function deleteRouteTrack(id: string): Promise<void> { const database = await openCampingDatabase(); try { await new RouteTrackRepository(database).delete(id); } finally { database.close(); } }
