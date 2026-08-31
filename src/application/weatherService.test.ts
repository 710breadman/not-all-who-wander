import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase } from "../data/database";
import { NwsWeatherProvider, isWeatherStale, refreshWeatherSnapshot, weatherSuggestions } from "./weatherService";

describe("weather service", () => {
  const databases: string[] = [];
  afterEach(async () => { await Promise.all(databases.splice(0).map(deleteCampingDatabase)); });

  it("discovers NWS endpoints and normalizes forecast periods and alerts", async () => {
    const calls: string[] = [];
    const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
    const provider = new NwsWeatherProvider(async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/points/")) return response({ properties: { forecast: "https://example.test/daily", forecastHourly: "https://example.test/hourly" } });
      if (url.includes("daily")) return response({ properties: { periods: [{ name: "Tonight", startTime: "2026-08-31T20:00:00Z", temperature: 48, temperatureUnit: "F", shortForecast: "Rain", windSpeed: "15 mph" }] } });
      if (url.includes("hourly")) return response({ properties: { periods: [{ name: "Now", startTime: "2026-08-31T12:00:00Z", temperature: 50, temperatureUnit: "F", shortForecast: "Windy" }] } });
      return response({ features: [{ id: "alert-1", properties: { event: "Wind Advisory", severity: "Moderate", headline: "Strong winds" } }] });
    });
    const snapshot = await provider.fetchSnapshot("trip-weather", { latitude: 40, longitude: -124 });
    expect(calls).toHaveLength(4);
    expect(snapshot.daily[0]).toMatchObject({ name: "Tonight", temperature: 48 });
    expect(snapshot.alerts[0]).toMatchObject({ event: "Wind Advisory" });
  });

  it("returns the saved forecast when a refresh fails and labels stale data", async () => {
    const databaseName = `weather-${crypto.randomUUID()}`;
    databases.push(databaseName);
    const fresh = {
      fetchSnapshot: async () => ({ id: "weather-trip", tripId: "trip", latitude: 40, longitude: -124, provider: "nws" as const, fetchedAt: "2026-08-31T10:00:00.000Z", hourly: [], daily: [{ name: "Today", startTime: "", shortForecast: "Rain and wind" }], alerts: [] }),
    };
    await refreshWeatherSnapshot("trip", { latitude: 40, longitude: -124 }, fresh, databaseName);
    const cached = await refreshWeatherSnapshot("trip", { latitude: 40, longitude: -124 }, { fetchSnapshot: async () => { throw new Error("offline"); } }, databaseName);
    expect(cached.fromCache).toBe(true);
    expect(isWeatherStale(cached.snapshot, new Date("2026-08-31T14:01:00.000Z"))).toBe(true);
    expect(weatherSuggestions(cached.snapshot)).toEqual(expect.arrayContaining([expect.stringMatching(/Rain/), expect.stringMatching(/Wind/)]));
  });
});
