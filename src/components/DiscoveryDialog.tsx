import { useState } from "react";
import { discoverSites, duplicateCandidates, saveDiscoveredSite, type DiscoveredSite } from "../application/discoveryService";

export function DiscoveryDialog({ coordinates, onClose, onSaved }: { coordinates?: { latitude: number; longitude: number }; onClose: () => void; onSaved: () => Promise<void> }) {
  const [results, setResults] = useState<DiscoveredSite[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function search() {
    if (!coordinates) return;
    setLoading(true); setMessage("");
    try { const found = await discoverSites(coordinates); setResults(found.sites); if (found.failedSources.length) setMessage(`${found.failedSources.map((source) => source.toUpperCase()).join(" and ")} is unavailable; showing results from other sources.`); }
    catch { setMessage("Official discovery is unavailable. Your local sites and trip remain available."); }
    finally { setLoading(false); }
  }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="Official campsite discovery"><div className="dialog-heading"><h2>Official campsite discovery</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div><p className="empty-state">Searches current USFS and BLM records near your trip. Missing details stay unknown; each result keeps its original source.</p>{coordinates ? <button className="primary-action" type="button" disabled={loading} onClick={() => void search()}>{loading ? "Searching…" : "Search official sites"}</button> : <p className="empty-state">Add trip or saved-site coordinates before searching.</p>}{message && <p className="error-message" role="status">{message}</p>}{results.length > 0 && <ul className="item-list">{results.map((site) => { const duplicates = duplicateCandidates(site, results); return <li className="inventory-item" key={site.id}><div><strong>{site.name}</strong><small>{site.source.toUpperCase()} · {site.classification ?? "type unknown"} · fetched {new Date(site.fetchedAt).toLocaleString()}{duplicates.length ? ` · ${duplicates.length} possible duplicate${duplicates.length === 1 ? "" : "s"}` : ""}</small></div><a className="promote" href={site.sourceUrl} target="_blank" rel="noreferrer">Source</a><button className="promote" type="button" onClick={() => void saveDiscoveredSite(site).then(onSaved)}>Save idea</button></li>; })}</ul>}</section></div>;
}
