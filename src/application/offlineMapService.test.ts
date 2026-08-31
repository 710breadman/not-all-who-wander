import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase } from "../data/database";
import { createOfflineMapRegion, deleteOfflineMapRegion, downloadOfflineMapRegion, estimateMapRegionBytes, isMapRegionStale, listOfflineMapRegions, validateRasterPmtiles } from "./offlineMapService";

function rasterPmtilesFixture() {
  const tile = new Uint8Array([137, 80, 78, 71]);
  const directory = new Uint8Array([1, 0, 1, tile.length, 1]);
  const metadata = new TextEncoder().encode("{}");
  const tileOffset = 127 + directory.length + metadata.length;
  const header = new ArrayBuffer(127);
  const bytes = new Uint8Array(header); bytes.set(new TextEncoder().encode("PMTiles")); bytes[7] = 3; bytes[96] = 1; bytes[97] = 1; bytes[98] = 1; bytes[99] = 2; bytes[100] = 0; bytes[101] = 20;
  const view = new DataView(header);
  const uint64 = (offset: number, value: number) => { view.setUint32(offset, value, true); view.setUint32(offset + 4, 0, true); };
  uint64(8, 127); uint64(16, directory.length); uint64(24, 127 + directory.length); uint64(32, metadata.length); uint64(40, tileOffset); uint64(48, 0); uint64(56, tileOffset); uint64(64, tile.length); uint64(72, 1); uint64(80, 1); uint64(88, 1);
  view.setInt32(102, -1800000000, true); view.setInt32(106, -850511290, true); view.setInt32(110, 1800000000, true); view.setInt32(114, 850511290, true);
  return new Blob([header, directory, metadata, tile]);
}

describe("offline map regions", () => {
  const names: string[] = [];
  afterEach(async () => { await Promise.all(names.splice(0).map((name) => deleteCampingDatabase(name))); });
  it("requires a licensed HTTPS archive and estimates increasing detail", async () => {
    const bounds = { west: -124.2, south: 41.2, east: -123.8, north: 41.5 };
    expect(estimateMapRegionBytes(bounds, 8, 14)).toBeGreaterThan(estimateMapRegionBytes(bounds, 8, 12));
    await expect(createOfflineMapRegion({ tripId: "trip", name: "Map", bounds, minZoom: 8, maxZoom: 14, sourceUrl: "http://example.test/map.pmtiles", licenseConfirmed: true })).rejects.toThrow(/HTTPS/);
    await expect(createOfflineMapRegion({ tripId: "trip", name: "Map", bounds, minZoom: 8, maxZoom: 14, sourceUrl: "https://example.test/map.pmtiles", licenseConfirmed: false })).rejects.toThrow(/licensed/);
  });
  it("validates the PMTiles v3 raster header before marking a region complete", async () => {
    await expect(validateRasterPmtiles(rasterPmtilesFixture())).resolves.toMatchObject({ minZoom: 0, maxZoom: 20, bounds: { west: -180, east: 180 } });
    await expect(validateRasterPmtiles(new Blob(["not a map"]))).rejects.toThrow();
  });
  it("tracks complete downloads and deletion without touching trip data", async () => {
    const databaseName = `offline-map-${crypto.randomUUID()}`;
    names.push(databaseName);
    const bounds = { west: -124.2, south: 41.2, east: -123.8, north: 41.5 };
    const region = await createOfflineMapRegion({ tripId: "trip", name: "Redwoods", bounds, minZoom: 8, maxZoom: 14, sourceUrl: "https://example.test/map.pmtiles", licenseConfirmed: true }, databaseName);
    const completed = await downloadOfflineMapRegion(region.id, { databaseName, fetcher: async () => new Response(new Blob(["archive"])), validateArchive: async () => ({ bounds, minZoom: 0, maxZoom: 20 }) });
    expect(completed.status).toBe("complete");
    expect(completed.archive?.size).toBeGreaterThan(0);
    expect(isMapRegionStale(completed, new Date(completed.downloadedAt!).getTime() + 31 * 24 * 60 * 60 * 1_000)).toBe(true);
    await deleteOfflineMapRegion(region.id, databaseName);
    expect(await listOfflineMapRegions("trip", databaseName)).toEqual([]);
  });
});
