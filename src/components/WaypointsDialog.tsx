import { FormEvent, useEffect, useState } from "react";
import { distanceAndBearing, getCurrentCoordinates, listWaypoints, saveWaypoint, waypointTypeLabel, type Coordinates } from "../application/waypointService";
import type { Waypoint, WaypointType } from "../domain/models";

export function WaypointsDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [current, setCurrent] = useState<Coordinates>();
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const refresh = async () => setWaypoints(await listWaypoints(tripId));
  useEffect(() => {
    let active = true;
    void listWaypoints(tripId).then((saved) => {
      if (active) setWaypoints(saved);
    });
    return () => { active = false; };
  }, [tripId]);
  async function locate() {
    setMessage("Finding your location…");
    try {
      const location = await getCurrentCoordinates();
      setCurrent(location);
      setMessage(`Current location accurate to about ${Math.round(location.accuracy)} m.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Current location is unavailable.");
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const latitude = String(values.get("latitude") ?? "").trim();
    const longitude = String(values.get("longitude") ?? "").trim();
    const location = latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : current;
    const name = String(values.get("name") ?? "").trim();
    if (!name || !location) {
      setMessage("Add a name and coordinates, or get your current location first.");
      return;
    }
    const notes = String(values.get("notes") ?? "").trim();
    await saveWaypoint({
      tripId,
      name,
      type: String(values.get("type")) as WaypointType,
      latitude: location.latitude,
      longitude: location.longitude,
      ...(notes ? { notes } : {}),
    });
    await refresh();
    setShowAdd(false);
    setMessage("Waypoint saved locally.");
  }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="Local waypoints"><div className="dialog-heading"><h2>Local waypoints</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><p className="empty-state">Location is requested only when you choose it. Nothing records in the background.</p><div className="data-actions"><button className="secondary-action" type="button" onClick={() => void locate()}>Use current location</button><button className="primary-action" type="button" onClick={() => setShowAdd(true)}>+ Save a spot</button></div>{current && <p className="empty-state">{current.latitude.toFixed(5)}, {current.longitude.toFixed(5)} · ±{Math.round(current.accuracy)} m <button className="promote" type="button" onClick={() => void navigator.clipboard?.writeText(`${current.latitude}, ${current.longitude}`)}>Copy</button></p>}{message && <p className="error-message" role="status">{message}</p>}{showAdd && <form onSubmit={(event) => void save(event)}><label>Name<input name="name" autoFocus required placeholder="Trailhead" /></label><label>Waypoint type<select name="type" defaultValue="custom">{["campsite", "parking", "trailhead", "water", "hazard", "custom"].map((type) => <option key={type} value={type}>{waypointTypeLabel(type as WaypointType)}</option>)}</select></label><div className="field-row"><label>Latitude<input name="latitude" type="number" step="any" /></label><label>Longitude<input name="longitude" type="number" step="any" /></label></div><label>Notes<textarea name="notes" rows={2} /></label><button className="primary-action" type="submit">Save waypoint</button></form>}{waypoints.length ? <ul className="item-list">{waypoints.map((waypoint) => { const relative = current ? distanceAndBearing(current, waypoint) : undefined; return <li className="inventory-item" key={waypoint.id}><div><strong>{waypoint.name}</strong><small>{waypointTypeLabel(waypoint.type)} · {waypoint.latitude.toFixed(5)}, {waypoint.longitude.toFixed(5)}{relative ? ` · ${(relative.meters / 1000).toFixed(1)} km at ${relative.bearing}°` : ""}</small></div><button className="promote" type="button" onClick={() => void navigator.clipboard?.writeText(`${waypoint.latitude}, ${waypoint.longitude}`)}>Copy</button></li>; })}</ul> : <p className="empty-state">No saved waypoints for this trip.</p>}</section></div>;
}
