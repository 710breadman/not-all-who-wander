import { useEffect, useState } from "react";
import { isWeatherStale, readWeatherSnapshot, refreshWeatherSnapshot, weatherSuggestions, type ForecastCoordinates } from "../application/weatherService";
import type { WeatherSnapshot } from "../domain/models";

export function WeatherDialog({ tripId, coordinates, onClose }: { tripId: string; coordinates?: ForecastCoordinates; onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot>();
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let active = true;
    void readWeatherSnapshot(tripId).then((saved) => { if (active) setSnapshot(saved); });
    return () => { active = false; };
  }, [tripId]);
  async function refresh() {
    if (!coordinates) return;
    setRefreshing(true);
    setMessage("");
    try {
      const result = await refreshWeatherSnapshot(tripId, coordinates);
      setSnapshot(result.snapshot);
      if (result.fromCache) setMessage("Could not refresh. Showing the last saved forecast.");
    } catch {
      setMessage("Weather could not be reached. Your trip and checklist are still available offline.");
    } finally {
      setRefreshing(false);
    }
  }
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-label="Weather forecast"><div className="dialog-heading"><h2>Weather forecast</h2><button className="text-button" aria-label="Close dialog" type="button" onClick={onClose}>×</button></div>{!coordinates && <p className="empty-state">Add destination coordinates in Trip safety or save a site with coordinates to fetch weather. This never prevents using your trip offline.</p>}{coordinates && <button className="primary-action" type="button" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : snapshot ? "Refresh forecast" : "Fetch forecast"}</button>}{message && <p className="error-message" role="status">{message}</p>}{snapshot && <WeatherSummary snapshot={snapshot} />}</section></div>;
}

function WeatherSummary({ snapshot }: { snapshot: WeatherSnapshot }) {
  const stale = isWeatherStale(snapshot);
  return <><p className="empty-state">NWS forecast fetched {new Date(snapshot.fetchedAt).toLocaleString()}{stale ? " · stale" : ""}. {stale && "Refresh when online before relying on it."}</p>{snapshot.alerts.length > 0 && <section className="category-guide"><strong>Active alerts</strong>{snapshot.alerts.map((alert) => <p key={alert.id}><strong>{alert.event}</strong>{alert.severity ? ` · ${alert.severity}` : ""}<br />{alert.headline || alert.description}</p>)}</section>}{weatherSuggestions(snapshot).length > 0 && <section className="category-guide"><strong>Checklist suggestions</strong>{weatherSuggestions(snapshot).map((suggestion) => <p key={suggestion}>{suggestion}</p>)}<small>Suggestions do not change your checklist.</small></section>}<section className="inventory-card"><h3>Next periods</h3><ul className="item-list">{snapshot.daily.slice(0, 5).map((period) => <li className="inventory-item" key={period.startTime}><div><strong>{period.name}</strong><small>{period.shortForecast}{period.temperature === undefined ? "" : ` · ${period.temperature}°${period.temperatureUnit ?? ""}`}{period.windSpeed ? ` · ${period.windSpeed} ${period.windDirection ?? ""}` : ""}</small></div></li>)}</ul></section></>;
}
