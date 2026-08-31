import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { openCampingDatabase } from "../data/database";
import { WaypointRepository } from "../data/repositories";
import type { Waypoint, WaypointType } from "../domain/models";

export type Coordinates = { latitude: number; longitude: number; accuracy: number; capturedAt: string };
export type LocationProvider = {
  getCurrentPosition: (success: PositionCallback, failure?: PositionErrorCallback, options?: PositionOptions) => void;
};

const id = () => `waypoint-${crypto.randomUUID()}`;

function coordinatesFromBrowser(provider: LocationProvider): Promise<Coordinates> {
  return new Promise((resolve, reject) => provider.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() }),
    (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? "Location permission was not granted." : "Current location is unavailable.")),
    { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
  ));
}

async function coordinatesFromNative(): Promise<Coordinates> {
  const permissions = await Geolocation.requestPermissions({ permissions: ["coarseLocation"] });
  if (permissions.coarseLocation !== "granted") throw new Error("Location permission was not granted.");
  const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    capturedAt: new Date(position.timestamp).toISOString(),
  };
}

export function getCurrentCoordinates(provider?: LocationProvider): Promise<Coordinates> {
  if (provider) return coordinatesFromBrowser(provider);
  if (Capacitor.isNativePlatform()) return coordinatesFromNative();
  return coordinatesFromBrowser(navigator.geolocation);
}

export async function listWaypoints(tripId: string): Promise<Waypoint[]> {
  const database = await openCampingDatabase();
  try {
    return await new WaypointRepository(database).listByTrip(tripId);
  } finally {
    database.close();
  }
}

export async function saveWaypoint(input: Omit<Waypoint, "id" | "createdAt" | "updatedAt"> & Partial<Pick<Waypoint, "id" | "createdAt">>): Promise<Waypoint> {
  const database = await openCampingDatabase();
  try {
    const now = new Date().toISOString();
    const current = input.id ? await new WaypointRepository(database).get(input.id) : undefined;
    const waypoint: Waypoint = {
      ...input,
      id: current?.id ?? input.id ?? id(),
      name: input.name.trim(),
      createdAt: current?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
    };
    await new WaypointRepository(database).save(waypoint);
    return waypoint;
  } finally {
    database.close();
  }
}

export function distanceAndBearing(from: Pick<Coordinates, "latitude" | "longitude">, to: Pick<Waypoint, "latitude" | "longitude">): { meters: number; bearing: number } {
  const radians = Math.PI / 180;
  const latitudeDelta = (to.latitude - from.latitude) * radians;
  const longitudeDelta = (to.longitude - from.longitude) * radians;
  const left = from.latitude * radians;
  const right = to.latitude * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(left) * Math.cos(right) * Math.sin(longitudeDelta / 2) ** 2;
  const meters = 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const bearing = (Math.atan2(Math.sin(longitudeDelta) * Math.cos(right), Math.cos(left) * Math.sin(right) - Math.sin(left) * Math.cos(right) * Math.cos(longitudeDelta)) / radians + 360) % 360;
  return { meters, bearing: Math.round(bearing) };
}

export function waypointTypeLabel(type: WaypointType): string {
  return type[0]!.toUpperCase() + type.slice(1);
}
