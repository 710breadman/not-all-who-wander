import { describe, expect, it } from "vitest";
import { checklistCategories } from "../domain/models";
import { loadChecklistSeed, parseChecklistSeed } from "./seedLoader";

describe("checklist seed loader", () => {
  it("loads the canonical seed through application code", () => {
    const seed = loadChecklistSeed();

    expect(seed.categories.map((category) => category.id)).toEqual(checklistCategories);
    expect(seed.items.length).toBeGreaterThan(0);
    expect(seed.items.some((item) => item.name === "Propane Torch")).toBe(true);
    expect(seed.items.some((item) => item.name === "Sauce")).toBe(false);
  });

  it("rejects malformed seed data", () => {
    expect(() => parseChecklistSeed({ schemaVersion: 1, seedVersion: "bad", categories: [], items: [{}] }))
      .toThrow(/invalid id/i);
  });
});
