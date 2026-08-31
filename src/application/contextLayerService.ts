import { openCampingDatabase } from "../data/database";

export type AccessStatus = "legally-designated" | "physically-reported-passable" | "unknown";
export interface ContextFeature { id: string; name: string; latitude?: number; longitude?: number; accessStatus: AccessStatus; details?: string; attributes?: Record<string, string>; }
export interface ContextLayer { id: "active-fire" | "blm-land" | "usfs-mvum" | "fire-restrictions" | "closures" | "smoke-aqi" | "water-sources"; title: string; legend: string; sourceUrl: string; fetchedAt: string; features: ContextFeature[]; }
export interface ContextLayerProvider { id: ContextLayer["id"]; fetch: (coordinates: { latitude: number; longitude: number }) => Promise<ContextLayer>; }

export class FirmsFireProvider implements ContextLayerProvider {
  readonly id = "active-fire" as const;
  constructor(private readonly mapKey?: string, private readonly request: typeof fetch = fetch) {}
  async fetch(coordinates: { latitude: number; longitude: number }): Promise<ContextLayer> {
    if (!this.mapKey) throw new Error("NASA FIRMS requires a configured MAP_KEY.");
    const box = `${coordinates.longitude - .25},${coordinates.latitude - .25},${coordinates.longitude + .25},${coordinates.latitude + .25}`;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${this.mapKey}/VIIRS_NOAA21_NRT/${box}/1`;
    const response = await this.request(url); if (!response.ok) throw new Error("NASA FIRMS is unavailable.");
    const rows = (await response.text()).trim().split("\n"); const [firstHeader = [], ...data] = rows.map((row) => row.split(",")); const header = firstHeader;
    return { id: this.id, title: "Active fire detections", legend: "Satellite detections are not fire perimeters or closure status.", sourceUrl: "https://firms.modaps.eosdis.nasa.gov/api/", fetchedAt: new Date().toISOString(), features: data.flatMap((row, index) => { const value = Object.fromEntries(header.map((key, column) => [key!, row[column] ?? ""])); const latitude = Number(value.latitude), longitude = Number(value.longitude); return Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ id: `firms-${index}`, name: "Satellite fire detection", latitude, longitude, accessStatus: "unknown" as const, attributes: value }] : []; }) };
  }
}

export class ArcGisContextProvider implements ContextLayerProvider {
  constructor(public readonly id: ContextLayer["id"], private readonly title: string, private readonly legend: string, private readonly endpoint: string, private readonly request: typeof fetch = fetch) {}
  async fetch(coordinates: { latitude: number; longitude: number }): Promise<ContextLayer> {
    const url = new URL(`${this.endpoint}/query`); url.search = new URLSearchParams({ where: "1=1", geometry: `${coordinates.longitude},${coordinates.latitude}`, geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects", distance: "50000", units: "esriSRUnit_Meter", outFields: "*", returnGeometry: "true", f: "geojson" }).toString();
    const response = await this.request(url); if (!response.ok) throw new Error(`${this.title} is unavailable.`);
    const payload = await response.json() as { features?: Array<{ id?: string; geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }> };
    return { id: this.id, title: this.title, legend: this.legend, sourceUrl: this.endpoint, fetchedAt: new Date().toISOString(), features: (payload.features ?? []).flatMap((feature, index) => { const [longitude, latitude] = feature.geometry?.coordinates ?? []; const properties = feature.properties ?? {}; const name = ["NAME", "FET_NAME", "FORESTNAME", "ROUTE_NAME"].map((key) => properties[key]).find((value): value is string => typeof value === "string") ?? "Source feature"; return [{ id: feature.id ?? `${this.id}-${index}`, name, ...(typeof latitude === "number" ? { latitude } : {}), ...(typeof longitude === "number" ? { longitude } : {}), accessStatus: "legally-designated" as const, details: "Legal designation is not a report of physical passability or safety.", attributes: Object.fromEntries(Object.entries(properties).filter(([, value]) => typeof value === "string").map(([key, value]) => [key, value as string])) }]; }) };
  }
}

export const contextProviders: ContextLayerProvider[] = [
  new ArcGisContextProvider("blm-land", "BLM public-land context", "Land-management context only; verify local rules before travel.", "https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recs_pts/MapServer/0"),
  new ArcGisContextProvider("usfs-mvum", "USFS motor-vehicle routes", "Legally designated routes are not automatically safe or physically passable.", "https://apps.fs.usda.gov/fsgisx05/rest/services/wo_nfs_gtac/IVMQuery/MapServer/0"),
];
export async function readContextLayers(coordinates: { latitude: number; longitude: number }): Promise<ContextLayer[] | undefined> { const database = await openCampingDatabase(); try { return ((await database.get("meta", `context:${coordinates.latitude.toFixed(2)},${coordinates.longitude.toFixed(2)}`)) as { layers?: ContextLayer[] } | undefined)?.layers; } finally { database.close(); } }
export async function refreshContextLayers(coordinates: { latitude: number; longitude: number }, providers = contextProviders): Promise<{ layers: ContextLayer[]; failed: string[] }> { const responses = await Promise.allSettled(providers.map((provider) => provider.fetch(coordinates))); const layers = responses.flatMap((response) => response.status === "fulfilled" ? response.value : []); const failed = responses.flatMap((response, index) => response.status === "rejected" ? [providers[index]!.id] : []); const database = await openCampingDatabase(); try { await database.put("meta", { layers, fetchedAt: new Date().toISOString() }, `context:${coordinates.latitude.toFixed(2)},${coordinates.longitude.toFixed(2)}`); } finally { database.close(); } return { layers, failed }; }
