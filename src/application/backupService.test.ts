import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase, openCampingDatabase } from "../data/database";
import {
  MasterItemRepository,
  TripItemRepository,
  TripRepository,
} from "../data/repositories";
import {
  BACKUP_VERSION,
  createBackup,
  parseBackup,
  readSharedTripFile,
  restoreBackup,
  tripItemsToCsv,
  tripToShareFile,
} from "./backupService";

describe("backup service", () => {
  const names: string[] = [];
  afterEach(async () => {
    await Promise.all(
      names.splice(0).map((name) => deleteCampingDatabase(name)),
    );
  });
  it("rejects malformed backup files", () =>
    expect(() => parseBackup("not-json")).toThrow(/valid JSON/i));
  it("creates escaped, spreadsheet-readable CSV", () => {
    const csv = tripItemsToCsv(
      {
        id: "trip",
        name: "Camp, trip",
        camperCount: 1,
        style: "car",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        archived: false,
      },
      [
        {
          id: "item",
          tripId: "trip",
          name: 'Bob\'s "Burgers"',
          category: "food",
          section: "Dinner",
          quantity: 2,
          unit: "item",
          status: "not-packed",
          tags: [],
          custom: false,
          sortOrder: 1,
        },
      ],
    );
    expect(csv).toContain('"Bob\'s ""Burgers"""');
    expect(BACKUP_VERSION).toBe(1);
  });
  it("creates and reads a portable shared trip file", () => {
    const trip = {
      id: "shared-trip",
      name: "Shared camp",
      camperCount: 2,
      style: "car" as const,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archived: false,
    };
    const items = [
      {
        id: "shared-item",
        tripId: trip.id,
        name: "Pillow",
        category: "gear" as const,
        section: "Shelter & Sleep",
        quantity: 1,
        unit: "item",
        status: "not-packed" as const,
        tags: [],
        custom: true,
        assigneeId: "profile-sam",
        sortOrder: 1,
      },
    ];
    const profiles = [
      {
        id: "profile-sam",
        name: "Sam",
        personalItems: [],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];
    expect(
      readSharedTripFile(tripToShareFile(trip, items, profiles)),
    ).toMatchObject({ format: "camping-trip-v1", trip, items, profiles });
  });
  it("round-trips representative inventory, trip, and item data", async () => {
    const source = `backup-source-${crypto.randomUUID()}`;
    const destination = `backup-destination-${crypto.randomUUID()}`;
    names.push(source, destination);
    const database = await openCampingDatabase({ databaseName: source });
    const trip = {
      id: "trip-backup",
      name: "Backup trip",
      camperCount: 2,
      style: "car" as const,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      archived: false,
    };
    await new TripRepository(database).save(trip);
    await new TripItemRepository(database).save({
      id: "item-backup",
      tripId: trip.id,
      name: "Custom lamp",
      category: "gear",
      section: "Power & Electronics",
      quantity: 2,
      unit: "item",
      status: "need-to-buy",
      tags: ["custom"],
      custom: true,
      sortOrder: 1,
    });
    await new MasterItemRepository(database).save({
      id: "user-backup",
      name: "Custom lamp",
      category: "gear",
      section: "Power & Electronics",
      defaultQuantity: 2,
      unit: "item",
      tripStyles: ["car"],
      tags: [],
      archived: false,
      source: "user",
    });
    database.close();
    const backup = await createBackup(source);
    await restoreBackup(backup, destination);
    const restored = await openCampingDatabase({ databaseName: destination });
    expect((await new TripRepository(restored).get(trip.id))?.name).toBe(
      "Backup trip",
    );
    expect(
      (await new TripItemRepository(restored).get("item-backup"))?.status,
    ).toBe("need-to-buy");
    expect(
      (await new MasterItemRepository(restored).get("user-backup"))?.name,
    ).toBe("Custom lamp");
    restored.close();
  });
});
