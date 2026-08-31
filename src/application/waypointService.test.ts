import { describe, expect, it } from "vitest";
import { distanceAndBearing, getCurrentCoordinates } from "./waypointService";

describe("waypoint service", () => {
  it("uses a permission-aware geolocation abstraction", async () => {
    const current = await getCurrentCoordinates({
      getCurrentPosition(success) {
        success({ coords: { latitude: 40, longitude: -124, accuracy: 8 }, timestamp: Date.UTC(2026, 7, 30) } as GeolocationPosition);
      },
    });
    expect(current).toMatchObject({ latitude: 40, longitude: -124, accuracy: 8 });
  });

  it("calculates an offline distance and compass bearing", () => {
    const relative = distanceAndBearing(
      { latitude: 40, longitude: -124 },
      { latitude: 40.01, longitude: -124 },
    );
    expect(relative.meters).toBeGreaterThan(1_000);
    expect(relative.bearing).toBe(0);
  });
});
