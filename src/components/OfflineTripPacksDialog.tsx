import { useEffect, useState } from "react";
import { createOfflineTripPack, defaultOfflineTripPackSelection, deleteOfflineTripPack, listOfflineTripPacks, previewOfflineTripPack, refreshOfflineTripPack, stalePackComponents } from "../application/offlineTripPackService";
import { listOfflineMapRegions } from "../application/offlineMapService";
import { offlineTripPackComponents, type OfflineTripPack, type OfflineTripPackSelection, type Trip } from "../domain/models";

const labels: Record<keyof OfflineTripPackSelection, string> = { mapRegion: "Downloaded map region", officialSites: "Official campsite records", siteIdeas: "Saved Site Ideas", waypointsRoutes: "Waypoints and routes", weather: "Latest weather snapshot", contextLayers: "Fire, access, and closure layers", permits: "Permit and reservation references", emergency: "Emergency reference information" };
const bytes = (value: number) => value < 1_000_000 ? `${Math.round(value / 1_000)} KB` : `${(value / 1_000_000).toFixed(1)} MB`;

export function OfflineTripPacksDialog({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [components, setComponents] = useState<OfflineTripPackSelection>(defaultOfflineTripPackSelection);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [mapRegionId, setMapRegionId] = useState("");
  const [packs, setPacks] = useState<OfflineTripPack[]>([]);
  const [stale, setStale] = useState<Record<string, string[]>>({});
  const [estimate, setEstimate] = useState<number>();
  const [message, setMessage] = useState("");
  async function load() {
    const [savedPacks, savedRegions] = await Promise.all([listOfflineTripPacks(trip.id), listOfflineMapRegions(trip.id)]);
    const statuses = await Promise.all(savedPacks.map(async (pack) => [pack.id, await stalePackComponents(pack)] as const));
    setPacks(savedPacks);
    setRegions(savedRegions.filter((region) => region.status === "complete").map(({ id, name }) => ({ id, name })));
    setStale(Object.fromEntries(statuses));
  }
  useEffect(() => {
    let active = true;
    void Promise.all([listOfflineTripPacks(trip.id), listOfflineMapRegions(trip.id)]).then(async ([savedPacks, savedRegions]) => {
      const statuses = await Promise.all(savedPacks.map(async (pack) => [pack.id, await stalePackComponents(pack)] as const));
      if (active) {
        setPacks(savedPacks);
        setRegions(savedRegions.filter((region) => region.status === "complete").map(({ id, name }) => ({ id, name })));
        setStale(Object.fromEntries(statuses));
      }
    });
    return () => { active = false; };
  }, [trip.id]);
  const options = { components, ...(mapRegionId ? { mapRegionId } : {}) };
  async function estimatePack() { try { setEstimate((await previewOfflineTripPack(trip.id, options)).sizeEstimateBytes); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not estimate this pack."); } }
  async function prepare() { try { const pack = await createOfflineTripPack(trip.id, options); setMessage(`${pack.name} is ready for offline use.`); setEstimate(pack.sizeEstimateBytes); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare the offline pack."); } }
  async function updateStale(pack: OfflineTripPack) { try { await refreshOfflineTripPack(pack.id, Object.fromEntries((stale[pack.id] ?? []).map((entry) => [entry, true])) as Partial<OfflineTripPackSelection>); setMessage(`Updated stale components in ${pack.name}.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update the stale components."); } }
  async function remove(pack: OfflineTripPack) { if (!window.confirm(`Delete “${pack.name}”? The original trip and all source data stay on this device.`)) return; await deleteOfflineTripPack(pack.id); await load(); setMessage("Offline pack deleted; source data was kept."); }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="Offline trip packs"><div className="dialog-heading"><h2>Offline trip packs</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><p className="empty-state">Prepare this trip’s local data in one place. Weather and field layers retain their fetched time; private medical notes are never included.</p><label>Map region<select value={mapRegionId} onChange={(event) => setMapRegionId(event.currentTarget.value)} disabled={!components.mapRegion}><option value="">Use the newest complete map region</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>{offlineTripPackComponents.map((component) => <label className="sort-control" key={component}><input type="checkbox" checked={components[component]} onChange={(event) => setComponents((current) => ({ ...current, [component]: event.currentTarget.checked }))} /> {labels[component]}</label>)}<div className="data-actions"><button className="secondary-action" type="button" onClick={() => void estimatePack()}>Estimate pack</button><button className="primary-action" type="button" onClick={() => void prepare()}>Prepare offline pack</button></div>{estimate !== undefined && <p className="empty-state">Estimated pack size: {bytes(estimate)}. Map archive capacity is included when selected.</p>}{message && <p className="error-message" role="status">{message}</p>}{packs.length ? <ul className="item-list">{packs.map((pack) => { const staleComponents = stale[pack.id] ?? []; return <li className="inventory-item" key={pack.id}><div><strong>{pack.name}</strong><small>{bytes(pack.sizeEstimateBytes)} · downloaded {new Date(pack.downloadedAt).toLocaleString()}{staleComponents.length ? ` · stale: ${staleComponents.map((component) => labels[component as keyof OfflineTripPackSelection]).join(", ")}` : " · current"}</small></div><div className="data-actions">{staleComponents.length ? <button className="promote" type="button" onClick={() => void updateStale(pack)}>Update stale data</button> : null}<button className="promote danger" type="button" onClick={() => void remove(pack)}>Delete</button></div></li>; })}</ul> : <p className="empty-state">No prepared trip packs yet.</p>}</section></div>;
}
