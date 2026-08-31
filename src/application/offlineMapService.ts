import { FileSource, PMTiles, TileType } from "pmtiles";
import { openCampingDatabase } from "../data/database";
import { OfflineMapRegionRepository } from "../data/repositories";
import type { OfflineMapRegion } from "../domain/models";

export type OfflineMapInput = Pick<OfflineMapRegion, "tripId" | "name" | "bounds" | "minZoom" | "maxZoom" | "sourceUrl" | "licenseConfirmed">;
export type ArchiveDetails = Pick<OfflineMapRegion, "bounds" | "minZoom" | "maxZoom">;
export type RegionDownloadOptions = { databaseName?: string; signal?: AbortSignal; fetcher?: typeof fetch; onProgress?: (region: OfflineMapRegion) => void; validateArchive?: (archive: Blob) => Promise<ArchiveDetails> };

export function estimateMapRegionBytes(bounds: OfflineMapRegion["bounds"], minZoom: number, maxZoom: number): number {
  const width = Math.max(0.01, Math.abs(bounds.east - bounds.west));
  const height = Math.max(0.01, Math.abs(bounds.north - bounds.south));
  const zoomFactor = Array.from({ length: Math.max(0, maxZoom - minZoom + 1) }, (_, index) => 4 ** index).reduce((total, value) => total + value, 0);
  return Math.round(width * height * zoomFactor * 1_500);
}

export function isMapRegionStale(region: OfflineMapRegion, now = Date.now()): boolean {
  return !region.downloadedAt || now - new Date(region.downloadedAt).getTime() > 30 * 24 * 60 * 60 * 1_000;
}

export async function createOfflineMapRegion(input: OfflineMapInput, databaseName?: string): Promise<OfflineMapRegion> {
  if (!input.licenseConfirmed) throw new Error("Confirm that this archive is licensed for offline use before downloading it.");
  if (!/^https:\/\//i.test(input.sourceUrl)) throw new Error("Use an HTTPS URL for a PMTiles archive you are allowed to download.");
  if (input.minZoom > input.maxZoom) throw new Error("The maximum zoom must be at least the minimum zoom.");
  const now = new Date().toISOString();
  const region: OfflineMapRegion = { id: `map-region-${crypto.randomUUID()}`, ...input, name: input.name.trim() || "Offline map region", provider: "user-supplied-pmtiles", status: "paused", bytesDownloaded: 0, updatedAt: now };
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try { await new OfflineMapRegionRepository(database).save(region); return region; } finally { database.close(); }
}

export async function listOfflineMapRegions(tripId: string, databaseName?: string): Promise<OfflineMapRegion[]> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try { return (await new OfflineMapRegionRepository(database).listByTrip(tripId)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)); } finally { database.close(); }
}

export async function deleteOfflineMapRegion(id: string, databaseName?: string): Promise<void> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try { await new OfflineMapRegionRepository(database).delete(id); } finally { database.close(); }
}

export async function downloadOfflineMapRegion(id: string, options: RegionDownloadOptions = {}): Promise<OfflineMapRegion> {
  const database = await openCampingDatabase(options.databaseName === undefined ? {} : { databaseName: options.databaseName });
  const repository = new OfflineMapRegionRepository(database);
  try {
    const current = await repository.get(id);
    if (!current) throw new Error("That offline map region no longer exists.");
    const estimate = await globalThis.navigator?.storage?.estimate?.();
    if (estimate?.quota && estimate.usage !== undefined && current.bytesTotal && estimate.usage + current.bytesTotal > estimate.quota) throw new Error("Not enough available device storage for this offline map region.");
    const offset = current.archive?.size ?? 0;
    const request: RequestInit = options.signal ? { signal: options.signal } : {};
    if (offset) request.headers = { Range: `bytes=${offset}-` };
    const response = await (options.fetcher ?? fetch)(current.sourceUrl, request);
    if (!response.ok) throw new Error(`Map archive download failed (${response.status}).`);
    const resumed = offset > 0 && response.status === 206;
    const chunks: BlobPart[] = resumed && current.archive ? [current.archive] : [];
    let downloaded = resumed ? offset : 0;
    const totalHeader = response.headers.get("Content-Range")?.split("/")[1] ?? response.headers.get("Content-Length");
    const bytesTotal = totalHeader ? Number(totalHeader) : undefined;
    const { error: currentError, ...withoutError } = current;
    void currentError;
    let working: OfflineMapRegion = { ...withoutError, status: "downloading", bytesDownloaded: downloaded, ...(bytesTotal && Number.isFinite(bytesTotal) ? { bytesTotal } : {}), updatedAt: new Date().toISOString() };
    await repository.save(working);
    options.onProgress?.(working);
    const reader = response.body?.getReader();
    if (reader) {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        if (next.value) { chunks.push(next.value); downloaded += next.value.byteLength; }
        if (downloaded - working.bytesDownloaded >= 1_000_000) {
          working = { ...working, bytesDownloaded: downloaded, archive: new Blob(chunks), updatedAt: new Date().toISOString() };
          await repository.save(working);
          options.onProgress?.(working);
        }
      }
    } else {
      const bytes = await response.arrayBuffer();
      chunks.push(bytes);
      downloaded += bytes.byteLength;
    }
    const archive = new Blob(chunks, { type: "application/vnd.pmtiles" });
    const details = await (options.validateArchive ?? validateRasterPmtiles)(archive);
    if (!archiveCoversSelection(details.bounds, current.bounds, details.minZoom, details.maxZoom, current.minZoom, current.maxZoom)) throw new Error("This archive does not cover the selected region or zoom range.");
    const { error: workingError, ...completeBase } = working;
    void workingError;
    working = { ...completeBase, status: "complete", bytesDownloaded: archive.size, bytesTotal: archive.size, archive, downloadedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await repository.save(working);
    options.onProgress?.(working);
    return working;
  } catch (error) {
    const current = await repository.get(id);
    if (current && options.signal?.aborted) {
      const paused = { ...current, status: "paused" as const, updatedAt: new Date().toISOString() };
      await repository.save(paused);
      options.onProgress?.(paused);
      return paused;
    }
    if (current) await repository.save({ ...current, status: "failed", error: error instanceof Error ? error.message : "Map archive download failed.", updatedAt: new Date().toISOString() });
    throw error;
  } finally { database.close(); }
}

export async function validateRasterPmtiles(archive: Blob): Promise<ArchiveDetails> {
  const header = await new PMTiles(new FileSource(new File([archive], "offline-map.pmtiles"))).getHeader();
  if (![TileType.Png, TileType.Jpeg, TileType.Webp, TileType.Avif].includes(header.tileType)) throw new Error("Offline maps currently require a raster PMTiles v3 archive.");
  return { bounds: { west: header.minLon, south: header.minLat, east: header.maxLon, north: header.maxLat }, minZoom: header.minZoom, maxZoom: header.maxZoom };
}

function archiveCoversSelection(archive: OfflineMapRegion["bounds"], selected: OfflineMapRegion["bounds"], archiveMinZoom: number, archiveMaxZoom: number, selectedMinZoom: number, selectedMaxZoom: number): boolean {
  return archive.west <= selected.west && archive.south <= selected.south && archive.east >= selected.east && archive.north >= selected.north && archiveMinZoom <= selectedMinZoom && archiveMaxZoom >= selectedMaxZoom;
}
