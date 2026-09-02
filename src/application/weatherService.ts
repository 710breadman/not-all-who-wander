import { openCampingDatabase } from "../data/database";
import { WeatherSnapshotRepository } from "../data/repositories";
import type { WeatherAlert, WeatherPeriod, WeatherSnapshot } from "../domain/models";

export type ForecastCoordinates = { latitude: number; longitude: number };
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface WeatherProvider {
  fetchSnapshot: (tripId: string, coordinates: ForecastCoordinates) => Promise<WeatherSnapshot>;
}

export class NwsWeatherProvider implements WeatherProvider {
  constructor(private readonly request: FetchLike = (input, init) => fetch(input, init)) {}

  async fetchSnapshot(tripId: string, coordinates: ForecastCoordinates): Promise<WeatherSnapshot> {
    const headers = { Accept: "application/geo+json" };
    const points = await json(this.request(`https://api.weather.gov/points/${coordinates.latitude},${coordinates.longitude}`, { headers }));
    const properties = record(points).properties;
    const forecastUrl = stringProperty(properties, "forecast");
    const hourlyUrl = stringProperty(properties, "forecastHourly");
    const [dailyPayload, hourlyPayload, alertsPayload] = await Promise.all([
      json(this.request(forecastUrl, { headers })),
      json(this.request(hourlyUrl, { headers })),
      json(this.request(`https://api.weather.gov/alerts/active?point=${coordinates.latitude},${coordinates.longitude}`, { headers })),
    ]);
    const daily = periods(dailyPayload);
    const hourly = periods(hourlyPayload);
    return {
      id: `weather-${tripId}`,
      tripId,
      ...coordinates,
      provider: "nws",
      fetchedAt: new Date().toISOString(),
      ...(hourly[0] ? { current: hourly[0] } : {}),
      hourly,
      daily,
      alerts: alerts(alertsPayload),
    };
  }
}

export async function readWeatherSnapshot(tripId: string, databaseName?: string): Promise<WeatherSnapshot | undefined> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try {
    return await new WeatherSnapshotRepository(database).getByTrip(tripId);
  } finally {
    database.close();
  }
}

export async function refreshWeatherSnapshot(
  tripId: string,
  coordinates: ForecastCoordinates,
  provider: WeatherProvider = new NwsWeatherProvider(),
  databaseName?: string,
): Promise<{ snapshot: WeatherSnapshot; fromCache: boolean }> {
  try {
    const snapshot = await provider.fetchSnapshot(tripId, coordinates);
    const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
    try {
      await new WeatherSnapshotRepository(database).save(snapshot);
    } finally {
      database.close();
    }
    return { snapshot, fromCache: false };
  } catch (error) {
    const cached = await readWeatherSnapshot(tripId, databaseName);
    if (cached) return { snapshot: cached, fromCache: true };
    throw error;
  }
}

export function isWeatherStale(snapshot: WeatherSnapshot, now = new Date()): boolean {
  return now.getTime() - new Date(snapshot.fetchedAt).getTime() > 3 * 60 * 60 * 1000;
}

export function weatherSuggestions(snapshot: WeatherSnapshot): string[] {
  const text = [...snapshot.daily, ...snapshot.hourly]
    .slice(0, 24)
    .map((period) => `${period.shortForecast} ${period.detailedForecast ?? ""} ${period.windSpeed ?? ""}`)
    .join(" ")
    .toLocaleLowerCase();
  return [
    ...(text.includes("rain") || text.includes("shower") || text.includes("precip") ? ["Rain is forecast: consider rain layers and a tarp."] : []),
    ...(text.includes("wind") ? ["Wind is forecast: check tent stakes and tie-downs."] : []),
    ...(text.includes("snow") || text.includes("freez") ? ["Cold conditions are forecast: consider warm layers and sleep insulation."] : []),
  ];
}

async function json(response: Promise<Response>): Promise<unknown> {
  const value = await response;
  if (!value.ok) throw new Error(`Weather provider returned ${value.status}.`);
  return value.json();
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("Weather provider returned invalid data.");
  return value as Record<string, unknown>;
}
function stringProperty(value: unknown, key: string): string {
  const entry = record(value)[key];
  if (typeof entry !== "string") throw new Error(`Weather provider response is missing ${key}.`);
  return entry;
}
function periods(value: unknown): WeatherPeriod[] {
  const payload = record(value);
  const entries = record(payload.properties).periods;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const period = record(entry);
    const name = typeof period.name === "string" ? period.name : "Forecast";
    const startTime = typeof period.startTime === "string" ? period.startTime : "";
    const shortForecast = typeof period.shortForecast === "string" ? period.shortForecast : "Unavailable";
    const precipitation = period.probabilityOfPrecipitation;
    const precipitationValue = precipitation && typeof precipitation === "object"
      ? (precipitation as Record<string, unknown>).value
      : undefined;
    return [{
      name,
      startTime,
      ...(typeof period.temperature === "number" ? { temperature: period.temperature } : {}),
      ...(typeof period.temperatureUnit === "string" ? { temperatureUnit: period.temperatureUnit } : {}),
      shortForecast,
      ...(typeof period.detailedForecast === "string" ? { detailedForecast: period.detailedForecast } : {}),
      ...(typeof period.windSpeed === "string" ? { windSpeed: period.windSpeed } : {}),
      ...(typeof period.windDirection === "string" ? { windDirection: period.windDirection } : {}),
      ...(typeof precipitationValue === "number" ? { precipitationChance: precipitationValue } : {}),
    }];
  });
}
function alerts(value: unknown): WeatherAlert[] {
  const entries = record(value).features;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const properties = record(record(entry).properties);
    if (typeof properties.id !== "string" && typeof record(entry).id !== "string") return [];
    return [{
      id: typeof record(entry).id === "string" ? record(entry).id as string : properties.id as string,
      event: typeof properties.event === "string" ? properties.event : "Weather alert",
      ...(typeof properties.severity === "string" ? { severity: properties.severity } : {}),
      ...(typeof properties.headline === "string" ? { headline: properties.headline } : {}),
      ...(typeof properties.description === "string" ? { description: properties.description } : {}),
      ...(typeof properties.effective === "string" ? { effective: properties.effective } : {}),
      ...(typeof properties.expires === "string" ? { expires: properties.expires } : {}),
    }];
  });
}
