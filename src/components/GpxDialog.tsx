import { useEffect, useState } from "react";
import { deleteRouteTrack, listRouteTracks, saveImportedGpx } from "../application/routeTrackService";
import { downloadText } from "../application/backupService";
import { exportGpx, parseGpx } from "../application/gpxService";
import { listWaypoints } from "../application/waypointService";
import type { RouteTrack, Waypoint } from "../domain/models";

export function GpxDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routes, setRoutes] = useState<RouteTrack[]>([]);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    const [nextWaypoints, nextRoutes] = await Promise.all([listWaypoints(tripId), listRouteTracks(tripId)]);
    setWaypoints(nextWaypoints);
    setRoutes(nextRoutes);
  };
  useEffect(() => {
    let active = true;
    void Promise.all([listWaypoints(tripId), listRouteTracks(tripId)]).then(([nextWaypoints, nextRoutes]) => {
      if (active) { setWaypoints(nextWaypoints); setRoutes(nextRoutes); }
    });
    return () => { active = false; };
  }, [tripId]);
  async function importFile(file?: File) {
    if (!file) return;
    try {
      const parsed = parseGpx(await file.text(), tripId);
      await saveImportedGpx(parsed.waypoints, parsed.routes);
      await refresh();
      setMessage("GPX imported locally.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import GPX.");
    }
  }
  function exportFile() {
    if (routes.some((route) => route.kind === "track") && !window.confirm("Recorded tracks may reveal your route, home, or routine. Review the GPX contents before sharing. Export now?")) {
      setMessage("Export cancelled. Recorded tracks stay on this device.");
      return;
    }
    downloadText("trip.gpx", exportGpx(waypoints, routes), "application/gpx+xml");
    setMessage("GPX downloaded. Private trip notes and medical details were not included.");
  }
  async function removeRoute(route: RouteTrack) {
    if (!window.confirm(`Delete the locally saved ${route.kind} “${route.name}”? This cannot be undone.`)) return;
    await deleteRouteTrack(route.id);
    await refresh();
    setMessage(`${route.name} deleted locally.`);
  }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="GPX routes and tracks"><div className="dialog-heading"><h2>GPX routes & tracks</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><div className="data-actions"><label className="secondary-action">Import GPX<input type="file" accept=".gpx,application/gpx+xml" onChange={(event) => void importFile(event.currentTarget.files?.[0])} /></label><button className="primary-action" type="button" onClick={exportFile}>Export GPX</button></div>{message && <p className="error-message" role="status">{message}</p>}{routes.length ? <ul className="item-list">{routes.map((route) => <li className="inventory-item" key={route.id}><div><strong>{route.name}</strong><small>{route.kind} · {(route.distanceMeters / 1000).toFixed(1)} km · {route.points.length} points</small></div><button className="promote" type="button" onClick={() => void removeRoute(route)}>Delete</button></li>)}</ul> : <p className="empty-state">No saved routes or tracks for this trip.</p>}<p className="empty-state">{waypoints.length} local waypoints · {routes.length} routes/tracks. Export excludes private trip notes and medical details; recorded tracks require a privacy confirmation.</p></section></div>;
}
