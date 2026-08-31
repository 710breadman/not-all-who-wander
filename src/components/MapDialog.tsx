import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { externalNavigationUrl, mapProvider, tripMapMarkers, type MapMarker } from "../application/mapService";
import { getCurrentCoordinates, listWaypoints } from "../application/waypointService";
import { listRouteTracks } from "../application/routeTrackService";
import type { RouteTrack, Site, Trip, Waypoint } from "../domain/models";

export function MapDialog({ trip, sites, onClose }: { trip: Trip; sites: Site[]; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routes, setRoutes] = useState<RouteTrack[]>([]);
  const [current, setCurrent] = useState<MapMarker>();
  const [selected, setSelected] = useState<MapMarker>();
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([listWaypoints(trip.id), listRouteTracks(trip.id)]).then(([saved, savedRoutes]) => { if (active) { setWaypoints(saved); setRoutes(savedRoutes); } });
    return () => { active = false; };
  }, [trip.id]);
  const markers = useMemo(() => [...tripMapMarkers(trip, sites, waypoints), ...(current ? [current] : [])], [trip, sites, waypoints, current]);
  useEffect(() => {
    const center = markers[0] ?? routes[0]?.points[0];
    if (!container.current || !center) return;
    let disposed = false;
    const map = new maplibregl.Map({ container: container.current, style: mapProvider.styleUrl, center: [center.longitude, center.latitude], zoom: 9, attributionControl: { compact: true, customAttribution: mapProvider.attribution } });
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
    map.on("load", () => { if (disposed) return; for (const route of routes) { const source = `route-${route.id}`; map.addSource(source, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.points.map((point) => [point.longitude, point.latitude]) } } }); map.addLayer({ id: source, type: "line", source, paint: { "line-color": route.kind === "track" ? "#2c638d" : "#dba83a", "line-width": 4 } }); } if (markers.length > 1) map.fitBounds(markers.reduce((bounds, marker) => bounds.extend([marker.longitude, marker.latitude]), new maplibregl.LngLatBounds([markers[0]!.longitude, markers[0]!.latitude], [markers[0]!.longitude, markers[0]!.latitude])), { padding: 48, maxZoom: 12 }); });
    map.on("error", () => setMessage("Map tiles are unavailable. Your saved markers remain below."));
    return () => { disposed = true; map.remove(); };
  }, [markers, routes]);
  async function showCurrent() {
    try {
      const location = await getCurrentCoordinates();
      setCurrent({ id: "current", kind: "current", name: "Current location", latitude: location.latitude, longitude: location.longitude, detail: `±${Math.round(location.accuracy)} m` });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Current location is unavailable."); }
  }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog map-dialog" role="dialog" aria-modal="true" aria-label="Trip map"><div className="dialog-heading"><h2>Trip map</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><p className="empty-state">Map tiles need a connection. The marker list and {routes.length} saved route/track lines remain local and usable offline.</p><button className="secondary-action" type="button" onClick={() => void showCurrent()}>Show my location</button>{markers.length || routes.length ? <div ref={container} className="trip-map" aria-label="Interactive trip map" /> : <p className="empty-state">Add destination, site, waypoint, or GPX coordinates to show them on the map.</p>}{message && <p className="error-message" role="status">{message}</p>}<ul className="item-list">{markers.map((marker) => <li className="inventory-item" key={marker.id}><div><strong>{marker.name}</strong><small>{marker.detail || marker.kind} · {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</small></div><button className="promote" type="button" onClick={() => setSelected(marker)}>Details</button></li>)}</ul>{selected && <section className="category-guide" aria-label="Marker details"><strong>{selected.name}</strong><p>{selected.detail || selected.kind} · {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p><div className="data-actions"><button className="promote" type="button" onClick={() => void navigator.clipboard?.writeText(`${selected.latitude}, ${selected.longitude}`)}>Copy coordinates</button><a className="promote" href={externalNavigationUrl(selected)} target="_blank" rel="noreferrer">Open navigation</a></div></section>}</section></div>;
}
