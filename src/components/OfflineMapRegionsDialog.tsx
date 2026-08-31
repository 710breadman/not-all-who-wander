import { FormEvent, useEffect, useRef, useState } from "react";
import { createOfflineMapRegion, deleteOfflineMapRegion, downloadOfflineMapRegion, estimateMapRegionBytes, isMapRegionStale, listOfflineMapRegions } from "../application/offlineMapService";
import type { OfflineMapRegion, Trip } from "../domain/models";

const detailLevels = { low: [8, 12], standard: [8, 14], detailed: [8, 16] } as const;
const bytes = (value: number) => value < 1_000_000 ? `${Math.round(value / 1_000)} KB` : `${(value / 1_000_000).toFixed(1)} MB`;
function boundsFor(latitude: number, longitude: number, radiusKm: number) { const lat = radiusKm / 111; const lon = radiusKm / (111 * Math.max(0.1, Math.cos(latitude * Math.PI / 180))); return { west: longitude - lon, south: latitude - lat, east: longitude + lon, north: latitude + lat }; }

export function OfflineMapRegionsDialog({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [regions, setRegions] = useState<OfflineMapRegion[]>([]);
  const [message, setMessage] = useState("");
  const [activeId, setActiveId] = useState<string>();
  const [latitude, setLatitude] = useState(trip.destinationLatitude ?? 0);
  const [longitude, setLongitude] = useState(trip.destinationLongitude ?? 0);
  const [radiusKm, setRadiusKm] = useState(15);
  const [detail, setDetail] = useState<keyof typeof detailLevels>("standard");
  const controllers = useRef(new Map<string, AbortController>());
  const cancelled = useRef(new Set<string>());
  const refresh = async () => setRegions(await listOfflineMapRegions(trip.id));
  useEffect(() => { let active = true; void listOfflineMapRegions(trip.id).then((saved) => { if (active) setRegions(saved); }); return () => { active = false; }; }, [trip.id]);
  async function run(region: OfflineMapRegion) {
    const controller = new AbortController();
    controllers.current.set(region.id, controller);
    setActiveId(region.id);
    try {
      const next = await downloadOfflineMapRegion(region.id, { signal: controller.signal, onProgress: (saved) => setRegions((entries) => [saved, ...entries.filter((entry) => entry.id !== saved.id)]) });
      if (cancelled.current.delete(region.id)) { await deleteOfflineMapRegion(region.id); await refresh(); setMessage("Offline region cancelled and removed; trip data was kept."); }
      else setMessage(next.status === "complete" ? `${next.name} is ready for airplane-mode use.` : `${next.name} download paused.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Map download failed safely."); await refresh(); }
    finally { controllers.current.delete(region.id); setActiveId(undefined); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const latitude = Number(values.get("latitude")); const longitude = Number(values.get("longitude")); const radiusKm = Number(values.get("radius"));
    const detail = String(values.get("detail")) as keyof typeof detailLevels;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusKm) || radiusKm <= 0) { setMessage("Enter a valid center and radius for the region."); return; }
    try {
      const [minZoom, maxZoom] = detailLevels[detail];
      const region = await createOfflineMapRegion({ tripId: trip.id, name: String(values.get("name") ?? ""), bounds: boundsFor(latitude, longitude, radiusKm), minZoom, maxZoom, sourceUrl: String(values.get("sourceUrl") ?? "").trim(), licenseConfirmed: values.get("licenseConfirmed") === "on" });
      setRegions((entries) => [region, ...entries]);
      void run(region);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare the offline map region."); }
  }
  function pause(id: string) { controllers.current.get(id)?.abort(); }
  function cancel(id: string) { cancelled.current.add(id); const controller = controllers.current.get(id); if (controller) controller.abort(); else void deleteOfflineMapRegion(id).then(refresh); }
  const [previewMinZoom, previewMaxZoom] = detailLevels[detail];
  const estimate = estimateMapRegionBytes(boundsFor(latitude, longitude, radiusKm), previewMinZoom, previewMaxZoom);
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="Offline map regions"><div className="dialog-heading"><h2>Offline map regions</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><p className="empty-state">Download only a PMTiles archive you own or whose license expressly permits offline use. Public OSM tile servers are never bulk-downloaded.</p><form onSubmit={(event) => void submit(event)}><label>Region name<input name="name" defaultValue={trip.destination ? `${trip.destination} offline map` : "Offline map region"} required /></label><label>Licensed raster PMTiles HTTPS URL<input name="sourceUrl" type="url" placeholder="https://maps.example/region.pmtiles" required /></label><div className="field-row"><label>Latitude<input name="latitude" type="number" step="any" value={latitude} onChange={(event) => setLatitude(Number(event.currentTarget.value))} required /></label><label>Longitude<input name="longitude" type="number" step="any" value={longitude} onChange={(event) => setLongitude(Number(event.currentTarget.value))} required /></label></div><div className="field-row"><label>Radius (km)<input name="radius" type="number" min="1" max="500" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.currentTarget.value))} required /></label><label>Detail<select name="detail" value={detail} onChange={(event) => setDetail(event.currentTarget.value as keyof typeof detailLevels)}><option value="low">Low (8–12)</option><option value="standard">Standard (8–14)</option><option value="detailed">Detailed (8–16)</option></select></label></div><p className="empty-state">Estimated archive capacity: about {bytes(estimate)}. Actual archive size is verified before it is marked complete.</p><label className="sort-control"><input name="licenseConfirmed" type="checkbox" required /> I confirm the archive’s license permits offline downloading and use.</label><button className="primary-action" type="submit">Download region</button></form>{message && <p className="error-message" role="status">{message}</p>}{regions.length ? <ul className="item-list">{regions.map((region) => <li className="inventory-item" key={region.id}><div><strong>{region.name}</strong><small>{region.status} · {bytes(region.bytesDownloaded)}{region.bytesTotal ? ` / ${bytes(region.bytesTotal)}` : ""} · z{region.minZoom}–{region.maxZoom}{region.status === "complete" && isMapRegionStale(region) ? " · update recommended" : ""}{region.error ? ` · ${region.error}` : ""}</small></div><div className="data-actions">{region.status !== "complete" && region.id !== activeId && <button className="promote" type="button" onClick={() => void run(region)}>Resume</button>}{region.id === activeId && <button className="promote" type="button" onClick={() => pause(region.id)}>Pause</button>}<button className="promote danger" type="button" onClick={() => cancel(region.id)}>Delete</button></div></li>)}</ul> : <p className="empty-state">No offline map regions yet.</p>}</section></div>;
}
