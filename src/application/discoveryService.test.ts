import { describe, expect, it } from "vitest";
import { ArcGisDiscoveryProvider, duplicateCandidates } from "./discoveryService";

describe("official discovery adapters", () => {
  it("normalizes official ArcGIS GeoJSON without guessing missing details", async () => {
    const provider = new ArcGisDiscoveryProvider("usfs", "https://example.test/sites", async () => new Response(JSON.stringify({ features: [{ id: 7, geometry: { coordinates: [-124.1, 41.4] }, properties: { RECAREANAME: "Fern Canyon", RECAREAURL: "https://fs.example/fern", RECTYPE: "Primitive camping" } }] }), { status: 200 }));
    const [site] = await provider.search({ latitude: 41.4, longitude: -124.1 }, 10);
    expect(site).toMatchObject({ source: "usfs", name: "Fern Canyon", classification: "primitive" });
  });

  it("surfaces close same-name candidates instead of silently merging them", () => {
    const base = { id: "usfs-1", source: "usfs" as const, sourceUrl: "", name: "Fern Canyon", latitude: 41.4, longitude: -124.1, amenities: [], fetchedAt: "" };
    expect(duplicateCandidates(base, [base, { ...base, id: "blm-1", source: "blm" as const, latitude: 41.401 }]).map((site) => site.id)).toEqual(["blm-1"]);
  });
});
