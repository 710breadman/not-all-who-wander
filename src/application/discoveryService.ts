import { openCampingDatabase } from "../data/database";
import { saveSite } from "./siteService";

export interface DiscoveredSite {
  id: string;
  source: "usfs" | "blm";
  sourceUrl: string;
  name: string;
  latitude: number;
  longitude: number;
  classification?: "developed" | "primitive" | "dispersed";
  amenities: string[];
  description?: string;
  fetchedAt: string;
}
export interface DiscoveryProvider { source: DiscoveredSite["source"]; search: (coordinates: { latitude: number; longitude: number }, radiusMiles: number) => Promise<DiscoveredSite[]>; }
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class ArcGisDiscoveryProvider implements DiscoveryProvider {
  constructor(public readonly source: DiscoveredSite["source"], private readonly endpoint: string, private readonly request: FetchLike = (input, init) => fetch(input, init)) {}
  async search(coordinates: { latitude: number; longitude: number }, radiusMiles: number): Promise<DiscoveredSite[]> {
    const url = new URL(`${this.endpoint}/query`);
    url.search = new URLSearchParams({ where: "1=1", geometry: `${coordinates.longitude},${coordinates.latitude}`, geometryType: "esriGeometryPoint", inSR: "4326", spatialRel: "esriSpatialRelIntersects", distance: String(radiusMiles * 1609.34), units: "esriSRUnit_Meter", outFields: "*", returnGeometry: "true", f: "geojson" }).toString();
    const response = await this.request(url);
    if (!response.ok) throw new Error(`${this.source.toUpperCase()} discovery is unavailable.`);
    const payload = await response.json() as { features?: Array<{ id?: string | number; geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }> };
    return (payload.features ?? []).flatMap((feature, index) => {
      const [longitude, latitude] = feature.geometry?.coordinates ?? [];
      const attributes = feature.properties ?? {};
      const name = firstString(attributes, ["RECAREANAME", "FET_NAME", "NAME", "FacilityName", "FACILITYNAME"]);
      if (typeof latitude !== "number" || typeof longitude !== "number" || !name) return [];
      const subtype = firstString(attributes, ["FET_SUBTYPE", "REC_TYPE", "RECTYPE", "ACTIVITY"]);
      const description = firstString(attributes, ["DESCRIPTION", "RECAREADESCRIPTION", "DESCRIPTIO"]);
      const sourceUrl = firstString(attributes, ["WEB_LINK", "RECAREAURL", "URL"]) || this.endpoint;
      return [{ id: `${this.source}-${feature.id ?? index}`, source: this.source, sourceUrl, name, latitude, longitude, ...(subtype ? { classification: classify(subtype) } : {}), amenities: subtype ? [subtype] : [], ...(description ? { description } : {}), fetchedAt: new Date().toISOString() }];
    });
  }
}

export const officialDiscoveryProviders: DiscoveryProvider[] = [
  new ArcGisDiscoveryProvider("usfs", "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RecreationOpportunities_01/MapServer/0"),
  new ArcGisDiscoveryProvider("blm", "https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation_Sites_Facilities/MapServer/2"),
];

export async function discoverSites(coordinates: { latitude: number; longitude: number }, radiusMiles = 25, providers = officialDiscoveryProviders): Promise<{ sites: DiscoveredSite[]; failedSources: string[] }> {
  const responses = await Promise.allSettled(providers.map((provider) => provider.search(coordinates, radiusMiles)));
  const sites = responses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
  const deduped = sites.filter((site, index) => sites.findIndex((candidate) => candidate.id === site.id) === index);
  const failedSources = responses.flatMap((response, index) => response.status === "rejected" ? [providers[index]!.source] : []);
  const database = await openCampingDatabase();
  try { await database.put("meta", { sites: deduped, fetchedAt: new Date().toISOString() }, `discovery:${coordinates.latitude.toFixed(2)},${coordinates.longitude.toFixed(2)}`); } finally { database.close(); }
  return { sites: deduped, failedSources };
}

export function duplicateCandidates(site: DiscoveredSite, candidates: DiscoveredSite[]): DiscoveredSite[] {
  return candidates.filter((candidate) => candidate.id !== site.id && normalize(candidate.name) === normalize(site.name) && distanceMiles(site, candidate) < 1);
}

export async function saveDiscoveredSite(site: DiscoveredSite): Promise<void> {
  await saveSite({ name: site.name, latitude: site.latitude, longitude: site.longitude, sourceUrl: site.sourceUrl, notes: [site.description, `Imported from ${site.source.toUpperCase()} on ${site.fetchedAt}.`].filter(Boolean).join("\n"), tags: [site.source, ...(site.classification ? [site.classification] : []), ...site.amenities], visitState: "want-to-visit" });
}
function firstString(value: Record<string, unknown>, keys: string[]): string | undefined { for (const key of keys) if (typeof value[key] === "string" && value[key].trim()) return value[key].trim(); return undefined; }
function classify(value: string): NonNullable<DiscoveredSite["classification"]> { const normalized = value.toLocaleLowerCase(); return normalized.includes("dispers") ? "dispersed" : normalized.includes("primitive") ? "primitive" : "developed"; }
function normalize(value: string): string { return value.toLocaleLowerCase().replaceAll(/[^a-z0-9]/g, ""); }
function distanceMiles(left: Pick<DiscoveredSite, "latitude" | "longitude">, right: Pick<DiscoveredSite, "latitude" | "longitude">): number { const latitude = (right.latitude - left.latitude) * Math.PI / 180; const longitude = (right.longitude - left.longitude) * Math.PI / 180; const a = Math.sin(latitude / 2) ** 2 + Math.cos(left.latitude * Math.PI / 180) * Math.cos(right.latitude * Math.PI / 180) * Math.sin(longitude / 2) ** 2; return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
