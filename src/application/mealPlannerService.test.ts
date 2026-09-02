import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MealPlanEntry, SavedMeal, TripGroceryItem, TripItem } from "../domain/models";
import { InMemoryMealPlanEntryRepository, InMemorySavedMealRepository, InMemoryTripGroceryItemRepository } from "../data/mealPlannerMemory";
import { deleteCampingDatabase } from "../data/database";
import { addSavedMealToPlan, aggregateGroceries, archiveSavedMeal, clearMealPlanEntry, deriveMealDays, findMissingMealGear, getBeforeTripTasks, getMealPlannerState, groceryMatchKey, mergeRebuiltGroceries, moveMealPlanEntry, quickAddMeal, saveSavedMeal, scaleMealPlanEntry, undoMealPlanChange } from "./mealPlannerService";

const meal = (overrides: Partial<SavedMeal> = {}): SavedMeal => ({
  id: "meal-chili", name: "Camp chili", category: "dinner", favorite: true, favoriteIndex: "1", archivedIndex: "0", defaultServings: 2,
  ingredients: [
    { id: "beans", name: " Black Beans ", quantity: 2, unit: "Can", grocerySection: "Pantry", scalable: true },
    { id: "salt", name: "Salt", unit: "to taste", grocerySection: "Pantry", scalable: false },
  ],
  complexity: "easy", cookingMethods: ["stove"], storageNeeds: ["shelf-stable"], equipment: [{ name: "Camp stove", masterItemId: "gear-stove" }], prepAtHome: "Chop the onion", createdAt: "2026-01-01", updatedAt: "2026-01-01", archived: false,
  ...overrides,
});

const entry = (id: string, snapshot = meal()): MealPlanEntry => ({ id, tripId: "trip-1", dayIndex: 0, slot: "dinner", title: snapshot.name, savedMealId: snapshot.id, mealSnapshot: structuredClone(snapshot), servings: 2, createdAt: "2026-01-01", updatedAt: "2026-01-01" });

describe("meal planner behavior", () => {
  it("labels dated and fallback days and retains shortened-trip entries as extra days", () => {
    expect(deriveMealDays({ startDate: "2026-09-04", endDate: "2026-09-06" }).map((day) => day.label)).toEqual(["Fri, Sep 4", "Sat, Sep 5", "Sun, Sep 6"]);
    expect(deriveMealDays({}).map((day) => day.label)).toEqual(["Day 1", "Day 2", "Day 3"]);
    expect(deriveMealDays({ startDate: "2026-09-04", endDate: "2026-09-04" }, [{ ...entry("late"), dayIndex: 2 }]).map((day) => day.extra)).toEqual([false, true, true]);
  });

  it("normalizes compatible grocery rows, keeps incompatible units separate, and retains blank quantities", () => {
    const second = entry("plan-2", meal({ ingredients: [
      { id: "beans-2", name: "black   beans", quantity: 1, unit: "can", grocerySection: "Pantry", scalable: true },
      { id: "beans-bag", name: "Black Beans", quantity: 2, unit: "bag", grocerySection: "Pantry", scalable: true },
    ] }));
    const rows = aggregateGroceries([entry("plan-1"), second], "now");
    expect(rows.map((row) => [row.matchKey, row.derivedQuantity])).toEqual([
      [groceryMatchKey("Black Beans", "bag"), 2],
      [groceryMatchKey("Black Beans", "can"), 3],
      [groceryMatchKey("Salt", "to taste"), undefined],
    ]);
  });

  it("preserves statuses and overrides on rebuild and keeps manual-only rows", () => {
    const derived = aggregateGroceries([entry("plan-1")], "new");
    const existing: TripGroceryItem[] = [
      { ...derived[0]!, status: "packed", quantityOverride: 5, notes: "store brand", updatedAt: "old" },
      { id: "manual", tripId: "trip-1", matchKey: "coffee|bag", name: "Coffee", sourceMealEntryIds: [], manual: true, status: "already-have", updatedAt: "old" },
    ];
    const rebuilt = mergeRebuiltGroceries(derived, existing, "new");
    expect(rebuilt.find((row) => row.matchKey === derived[0]!.matchKey)).toMatchObject({ status: "packed", quantityOverride: 5, notes: "store brand" });
    expect(rebuilt.find((row) => row.id === "manual")).toMatchObject({ manual: true, status: "already-have" });
  });

  it("finds prep and missing gear without duplicating present equipment", () => {
    const plan = entry("plan-1");
    const items: TripItem[] = [{ id: "stove", tripId: "trip-1", masterItemId: "gear-stove", name: "Stove", category: "gear", section: "Kitchen", quantity: 1, unit: "item", status: "packed", tags: [], custom: false, sortOrder: 1 }];
    expect(getBeforeTripTasks([plan])).toEqual([{ entryId: "plan-1", meal: "Camp chili", note: "Chop the onion" }]);
    expect(findMissingMealGear([plan], items)).toEqual([]);
    expect(findMissingMealGear([plan], [])).toMatchObject([{ name: "Camp stove", masterItemId: "gear-stove" }]);
  });

  it("provides repository-compatible in-memory equivalents with snapshot isolation", async () => {
    const meals = new InMemorySavedMealRepository();
    const plans = new InMemoryMealPlanEntryRepository();
    const groceries = new InMemoryTripGroceryItemRepository();
    await meals.save(meal());
    await plans.save(entry("plan-1"));
    await groceries.saveMany(aggregateGroceries(await plans.listByTrip("trip-1")));
    const edited = meal({ name: "Edited chili", archived: true, archivedIndex: "1" });
    await meals.save(edited);
    expect((await plans.get("plan-1"))?.mealSnapshot?.name).toBe("Camp chili");
    expect(await meals.list()).toEqual([]);
    expect(await groceries.listByStatus("trip-1", "need-to-buy")).toHaveLength(2);
  });
});

describe.sequential("meal planner application service", () => {
  beforeEach(() => deleteCampingDatabase());
  afterEach(() => deleteCampingDatabase());

  it("quick-adds, replaces, clears, and undoes one slot without duplicates", async () => {
    const first = await quickAddMeal("trip-service", 0, "dinner", "TBD");
    expect(first.before).toBeUndefined();
    const replacement = await quickAddMeal("trip-service", 0, "dinner", "Eat in town");
    expect(replacement.before?.title).toBe("TBD");
    expect((await getMealPlannerState("trip-service")).entries).toHaveLength(1);
    const cleared = await clearMealPlanEntry(replacement.after!.id);
    expect((await getMealPlannerState("trip-service")).entries).toEqual([]);
    await undoMealPlanChange(cleared);
    expect((await getMealPlannerState("trip-service")).entries[0]?.title).toBe("Eat in town");
    const moved = await moveMealPlanEntry(replacement.after!.id, 2, "lunch");
    expect((await getMealPlannerState("trip-service")).entries[0]).toMatchObject({ dayIndex: 2, slot: "lunch" });
    await undoMealPlanChange(moved);
    expect((await getMealPlannerState("trip-service")).entries[0]).toMatchObject({ dayIndex: 0, slot: "dinner" });
  });

  it("keeps snapshots stable after library edits and scales only after confirmation", async () => {
    const saved = await saveSavedMeal({
      name: "Camp chili", category: "dinner", favorite: true, defaultServings: 2,
      ingredients: [{ id: "beans", name: "Beans", quantity: 2, unit: "can", scalable: true }, { id: "salt", name: "Salt", scalable: false }],
      cookingMethods: ["stove"], storageNeeds: ["shelf-stable"], equipment: [],
    });
    const planned = await addSavedMealToPlan("trip-service", 1, "dinner", saved.id);
    await saveSavedMeal({ ...saved, name: "Edited chili" });
    await archiveSavedMeal(saved.id);
    expect((await getMealPlannerState("trip-service")).entries[0]?.mealSnapshot?.name).toBe("Camp chili");
    await expect(scaleMealPlanEntry(planned.after!.id, 4, false)).rejects.toThrow(/confirm/i);
    await scaleMealPlanEntry(planned.after!.id, 4, true);
    const state = await getMealPlannerState("trip-service");
    expect(state.entries[0]?.mealSnapshot?.ingredients.map((item) => item.quantity)).toEqual([4, undefined]);
    expect(state.groceries.find((item) => item.name === "Beans")?.derivedQuantity).toBe(4);
  });
});
