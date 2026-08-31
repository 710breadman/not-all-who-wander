import { describe, expect, it } from "vitest";
import { ArcGisContextProvider, FirmsFireProvider } from "./contextLayerService";

describe("context layer providers", () => {
  it("requires a configured NASA FIRMS key instead of substituting fire data", async () => {
    await expect(new FirmsFireProvider().fetch({ latitude: 40, longitude: -124 })).rejects.toThrow(/MAP_KEY/);
  });
  it("marks source-designated roads as legal context, never physical passability", async () => {
    const provider = new ArcGisContextProvider("usfs-mvum", "Routes", "Legal routes are not passability.", "https://example.test/routes", async () => new Response(JSON.stringify({ features: [{ id: "road-1", geometry: { coordinates: [-124, 40] }, properties: { ROUTE_NAME: "Forest Road 7" } }] }), { status: 200 }));
    const layer = await provider.fetch({ latitude: 40, longitude: -124 });
    expect(layer.features[0]).toMatchObject({ name: "Forest Road 7", accessStatus: "legally-designated" });
    expect(layer.legend).toMatch(/not passability/i);
  });
});
