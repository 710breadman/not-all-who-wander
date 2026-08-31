import type { Site, Trip, Waypoint } from "../domain/models";

export const mapProvider = {
  styleUrl: "https://demotiles.maplibre.org/style.json",
  attribution: "Map data provider configured separately from trip data.",
} as const;

export interface MapMarker {
  id: string;
  kind: "trip" | "site" | "waypoint" | "current";
  name: string;
  latitude: number;
  longitude: number;
  detail?: string;
}

export function tripMapMarkers(trip: Trip, sites: Site[], waypoints: Waypoint[]): MapMarker[] {
  return [
    ...(trip.destinationLatitude === undefined || trip.destinationLongitude === undefined
      ? []
      : [{ id: `trip-${trip.id}`, kind: "trip" as const, name: trip.destination || trip.name, latitude: trip.destinationLatitude, longitude: trip.destinationLongitude, detail: "Trip destination" }]),
    ...sites.flatMap((site) => site.latitude === undefined || site.longitude === undefined ? [] : [{ id: `site-${site.id}`, kind: "site" as const, name: site.name, latitude: site.latitude, longitude: site.longitude, detail: site.archived ? "Archived site" : "Saved site" }]),
    ...waypoints.map((waypoint) => ({ id: `waypoint-${waypoint.id}`, kind: "waypoint" as const, name: waypoint.name, latitude: waypoint.latitude, longitude: waypoint.longitude, detail: waypoint.type })),
  ];
}

export function externalNavigationUrl(marker: Pick<MapMarker, "latitude" | "longitude" | "name">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${marker.latitude},${marker.longitude}`)}&destination_place_id=${encodeURIComponent(marker.name)}`;
}
