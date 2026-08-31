import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { FileSource, PMTiles, Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { externalNavigationUrl, mapProvider, tripMapMarkers, type MapMarker } from "../application/mapService";
import { deleteRouteTrack, listRouteTracks } from "../application/routeTrackService";
import { loadRecording, offRouteDistanceMeters, type TrackRecording } from "../application/trackRecordingService";
import { listOfflineMapRegions } from "../application/offlineMapService";
import { distanceAndBearing, getCurrentCoordinates, listWaypoints, type Coordinates } from "../application/waypointService";
import type { OfflineMapRegion, RouteTrack, Site, Trip, Waypoint } from "../domain/models";

let pmtilesProtocol: Protocol | undefined;

export function MapDialog({ trip, sites, onClose }: { trip: Trip; sites: Site[]; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routes, setRoutes] = useState<RouteTrack[]>([]);
  const [recording, setRecording] = useState<TrackRecording>();
  const [offlineRegion, setOfflineRegion] = useState<OfflineMapRegion>();
  const [current, setCurrent] = useState<MapMarker>();
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates>();
  const [selected, setSelected] = useState<MapMarker>();
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([listWaypoints(trip.id), listRouteTracks(trip.id), loadRecording(trip.id), listOfflineMapRegions(trip.id)]).then(([saved, savedRoutes, savedRecording, savedRegions]) => {
      if (active) { setWaypoints(saved); setRoutes(savedRoutes); setRecording(savedRecording); setOfflineRegion(savedRegions.find((region) => region.status === "complete" && region.archive)); }
    });
    return () => { active = false; };
  }, [trip.id]);
  const markers = useMemo(() => [...tripMapMarkers(trip, sites, waypoints), ...(current ? [current] : [])], [trip, sites, waypoints, current]);
  const activeTrail = useMemo(() => recording && recording.points.length > 1 ? { id: "active-recording", tripId: trip.id, kind: "track" as const, name: "Active breadcrumb trail", points: recording.points, distanceMeters: 0, createdAt: "", updatedAt: "" } : undefined, [recording, trip.id]);
  const visibleRoutes = useMemo(() => [...routes, ...(activeTrail ? [activeTrail] : [])], [routes, activeTrail]);
  const destination = trip.destinationLatitude === undefined || trip.destinationLongitude === undefined ? waypoints[0] : { name: trip.destination || "Trip destination", latitude: trip.destinationLatitude, longitude: trip.destinationLongitude };
  const distanceToDestination = currentCoordinates && destination ? distanceAndBearing(currentCoordinates, destination) : undefined;
  const route = routes.find((entry) => entry.kind === "route") ?? routes[0];
  const offRoute = currentCoordinates && route ? offRouteDistanceMeters(currentCoordinates, route) : undefined;
  useEffect(() => {
    const center = markers[0] ?? visibleRoutes[0]?.points[0] ?? (offlineRegion ? { longitude: (offlineRegion.bounds.east + offlineRegion.bounds.west) / 2, latitude: (offlineRegion.bounds.north + offlineRegion.bounds.south) / 2 } : undefined);
    if (!container.current || !center) return;
    let disposed = false;
    const style = offlineRegion?.archive ? { version: 8, sources: {}, layers: [{ id: "offline-background", type: "background", paint: { "background-color": "#dce8d2" } }] } as maplibregl.StyleSpecification : mapProvider.styleUrl;
    const map = new maplibregl.Map({ container: container.current, style, center: [center.longitude, center.latitude], zoom: 9, attributionControl: { compact: true, customAttribution: offlineRegion ? "Offline PMTiles archive" : mapProvider.attribution } });
    map.addControl(new maplibregl.NavigationControl());
    for (const marker of markers) {
      const element = document.createElement("button");
      element.className = `map-marker ${marker.kind}`;
      element.type = "button";
      element.title = marker.name;
      element.textContent = marker.kind === "waypoint" ? "•" : "●";
      element.addEventListener("click", () => setSelected(marker));
      new maplibregl.Marker({ element }).setLngLat([marker.longitude, marker.latitude]).addTo(map);
    }
    map.on("load", () => {
      if (disposed) return;
      if (offlineRegion?.archive) {
        if (!pmtilesProtocol) { pmtilesProtocol = new Protocol(); maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile); }
        pmtilesProtocol.add(new PMTiles(new FileSource(new File([offlineRegion.archive], offlineRegion.id))));
        map.addSource("offline-region", { type: "raster", url: `pmtiles://${offlineRegion.id}`, tileSize: 256 });
        map.addLayer({ id: "offline-region", type: "raster", source: "offline-region" });
      }
      for (const entry of visibleRoutes) {
        const source = `route-${entry.id}`;
        map.addSource(source, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: entry.points.map((point) => [point.longitude, point.latitude]) } } });
        map.addLayer({ id: source, type: "line", source, paint: { "line-color": entry.kind === "track" ? "#2c638d" : "#dba83a", "line-width": 4 } });
      }
      if (markers.length > 1) map.fitBounds(markers.reduce((bounds, marker) => bounds.extend([marker.longitude, marker.latitude]), new maplibregl.LngLatBounds([markers[0]!.longitude, markers[0]!.latitude], [markers[0]!.longitude, markers[0]!.latitude])), { padding: 48, maxZoom: 12 });
    });
    map.on("error", () => setMessage("Map tiles are unavailable. Your saved markers remain below."));
    return () => { disposed = true; map.remove(); };
  }, [markers, offlineRegion, visibleRoutes]);
  async function showCurrent() {
    try {
      const location = await getCurrentCoordinates();
      setCurrentCoordinates(location);
      setCurrent({ id: "current", kind: "current", name: "Current location", latitude: location.latitude, longitude: location.longitude, detail: `±${Math.round(location.accuracy)} m` });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Current location is unavailable.");
    }
  }
  async function removeRoute(entry: RouteTrack) {
    if (!window.confirm(`Delete the locally saved ${entry.kind} “${entry.name}”? This cannot be undone.`)) return;
    await deleteRouteTrack(entry.id);
    setRoutes((saved) => saved.filter((candidate) => candidate.id !== entry.id));
  }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog map-dialog" role="dialog" aria-modal="true" aria-label="Trip map"><div className="dialog-heading"><h2>Trip map</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><p className="empty-state">{offlineRegion ? `${offlineRegion.name} is rendering from its local PMTiles archive.` : "Map tiles need a connection."} The marker list and {routes.length} saved route/track lines remain local.{activeTrail ? ` Current breadcrumb trail: ${activeTrail.points.length} local points.` : ""}</p><button className="secondary-action" type="button" onClick={() => void showCurrent()}>Show my location</button>{currentCoordinates && <p className="empty-state">{destination && distanceToDestination ? `${destination.name}: ${(distanceToDestination.meters / 1000).toFixed(1)} km at ${distanceToDestination.bearing}°.` : "Add a destination or waypoint for distance and bearing."}{offRoute === undefined ? "" : ` Nearest saved route: ${(offRoute / 1000).toFixed(2)} km away.`}</p>}{markers.length || visibleRoutes.length || offlineRegion ? <div ref={container} className="trip-map" aria-label="Interactive trip map" /> : <p className="empty-state">Add destination, site, waypoint, GPX coordinates, or an offline region to show them on the map.</p>}{message && <p className="error-message" role="status">{message}</p>}<ul className="item-list">{markers.map((marker) => <li className="inventory-item" key={marker.id}><div><strong>{marker.name}</strong><small>{marker.detail || marker.kind} · {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</small></div><button className="promote" type="button" onClick={() => setSelected(marker)}>Details</button></li>)}{routes.map((entry) => <li className="inventory-item" key={entry.id}><div><strong>{entry.name}</strong><small>{entry.kind} · {(entry.distanceMeters / 1000).toFixed(1)} km · {entry.points.length} points</small></div><button className="promote" type="button" onClick={() => void removeRoute(entry)}>Delete</button></li>)}</ul>{selected && <section className="category-guide" aria-label="Marker details"><strong>{selected.name}</strong><p>{selected.detail || selected.kind} · {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p><div className="data-actions"><button className="promote" type="button" onClick={() => void navigator.clipboard?.writeText(`${selected.latitude}, ${selected.longitude}`)}>Copy coordinates</button><a className="promote" href={externalNavigationUrl(selected)} target="_blank" rel="noreferrer">Open navigation</a></div></section>}</section></div>;
}
