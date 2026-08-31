import { describe, expect, it } from "vitest";
import type { TripItem } from "../domain/models";
import { getDependencyWarnings, itineraryText } from "./preflightService";

const item = (name: string): TripItem => ({
  id: name,
  tripId: "trip",
  name,
  category: "gear",
  section: "Test",
  quantity: 1,
  unit: "item",
  status: "not-packed",
  tags: [],
  custom: true,
  sortOrder: 1,
});

describe("preflight service", () => {
  it("emits deterministic, advisory dependency warnings", () => {
    expect(getDependencyWarnings([item("Camp stove")])).toEqual([
      { id: "stove:fuel", message: "Stove is on this checklist; add fuel." },
    ]);
    expect(getDependencyWarnings([item("Camp stove"), item("Fuel canister")])).toEqual([]);
  });

  it("only includes user-approved itinerary fields and never medical notes", () => {
    const text = itineraryText(
      {
        name: "Redwoods",
        destination: "Fern Canyon",
        emergencyContactName: "Sam",
        medicalAllergyNote: "private",
      },
      ["location"],
    );
    expect(text).toContain("Fern Canyon");
    expect(text).not.toContain("Sam");
    expect(text).not.toContain("private");
  });
});
