import { describe, expect, it } from "vitest";
import type { MasterItem, TripItem } from "../domain/models";
import { addCustomTripItem, calculateTripQuantity, isMatchingItem, listTripItems, promoteTripItem, saveProfile } from "./tripService";

describe("trip service", () => {
  const item: TripItem = { id: "item", tripId: "trip", name: "Battery Bank", category: "gear", section: "Electronics", quantity: 1, unit: "item", status: "need-to-buy", tags: ["power"], custom: false, sortOrder: 1 };

  it("filters by search and packing state", () => {
    expect(isMatchingItem(item, "power", "all")).toBe(true);
    expect(isMatchingItem(item, "battery", "need-to-buy")).toBe(true);
    expect(isMatchingItem(item, "battery", "remaining")).toBe(true);
    expect(isMatchingItem({ ...item, status: "packed" }, "", "remaining")).toBe(false);
  });

  it("calculates rules while retaining fixed defaults", () => {
    const master: MasterItem = { id: "water", name: "Water", category: "food", section: "Drinks", defaultQuantity: 1, unit: "liter", tripStyles: ["car"], tags: [], archived: false, source: "user", quantityRule: { kind: "per-person-per-day", amount: 2 } };
    expect(calculateTripQuantity(master, { camperCount: 3, startDate: "2026-08-01", endDate: "2026-08-03" })).toBe(12);
    const fixedMaster = { ...master };
    delete fixedMaster.quantityRule;
    expect(calculateTripQuantity(fixedMaster, { camperCount: 3 })).toBe(1);
  });

  it("creates local profiles with normalized email or Gmail addresses", async () => {
    const gmail = `pal-${crypto.randomUUID()}@GMAIL.com`;
    const profile = await saveProfile({
      name: "Ranger",
      email: gmail,
      personalItems: [],
    });

    expect(profile.email).toBe(gmail.toLowerCase());
    await expect(
      saveProfile({
        name: "Duplicate Ranger",
        email: gmail.toLowerCase(),
        personalItems: [],
      }),
    ).rejects.toThrow("already exists");
  });

  it("marks a promoted custom item as linked to its master item", async () => {
    const tripId = `promote-${crypto.randomUUID()}`;
    const custom = await addCustomTripItem(tripId, `Audit lantern ${tripId}`);
    const master = await promoteTripItem(custom);
    const [promoted] = await listTripItems(tripId);

    expect(promoted).toMatchObject({
      id: custom.id,
      masterItemId: master.id,
      custom: false,
    });
  });
});
