import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase, openCampingDatabase } from "../data/database";
import { SiteRepository } from "../data/repositories";
import { saveSite, saveTripDestinationAsSite } from "./siteService";

describe("site service", () => {
  let databaseName: string;
  beforeEach(() => {
    databaseName = `site-service-${crypto.randomUUID()}`;
  });
  afterEach(() => deleteCampingDatabase(databaseName));

  it("normalizes a compact site idea and preserves its planning fields", async () => {
    const site = await saveSite({
      name: "  Moss Landing  ",
      tags: [" coast ", " weekend "],
      rating: 7,
      amenities: { potableWater: true },
      accessNotes: "Two-wheel-drive access.",
    }, databaseName);
    expect(site.name).toBe("Moss Landing");
    expect(site.tags).toEqual(["coast", "weekend"]);
    expect(site.rating).toBe(5);
    expect(site.amenities.potableWater).toBe(true);
    const database = await openCampingDatabase({ databaseName });
    expect((await new SiteRepository(database).get(site.id))?.accessNotes).toBe("Two-wheel-drive access.");
    database.close();
  });

  it("creates one site idea from a trip destination", async () => {
    const site = await saveTripDestinationAsSite({
      id: "trip-idea",
      name: "Weekend",
      destination: "Fern Canyon",
      address: "Trailhead parking",
      camperCount: 2,
      style: "car",
      createdAt: "2026-08-30",
      updatedAt: "2026-08-30",
      archived: false,
    }, databaseName);
    expect(site).toMatchObject({ name: "Fern Canyon", visitState: "want-to-visit" });
  });
});
