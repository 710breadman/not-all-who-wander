import { describe, expect, it } from "vitest";
import { externalNavigationUrl, tripMapMarkers } from "./mapService";

describe("map service", () => {
  it("keeps local marker data independent from the tile provider", () => {
    const markers = tripMapMarkers(
      { id: "trip", name: "Coast", destination: "Fern Canyon", destinationLatitude: 41.4, destinationLongitude: -124.1, camperCount: 1, style: "car", createdAt: "", updatedAt: "", archived: false },
      [{ id: "site", name: "Camp", latitude: 41.3, longitude: -124.2, tags: [], visitState: "want-to-visit", amenities: {}, createdAt: "", updatedAt: "", archived: false }],
      [{ id: "waypoint", tripId: "trip", type: "trailhead", name: "Trailhead", latitude: 41.2, longitude: -124.3, createdAt: "", updatedAt: "" }],
    );
    expect(markers.map((marker) => marker.kind)).toEqual(["trip", "site", "waypoint"]);
    expect(externalNavigationUrl(markers[0]!)).toContain("41.4%2C-124.1");
  });
});
