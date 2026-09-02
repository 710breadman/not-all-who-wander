# Meal Planner — Codex Sprint Sheet

**Status:** Complete — 2026-09-01

**Product:** Path A Logical (PAL) Camping

**Scheduling:** Keep `MP-*` IDs until this work is inserted into the main numbered sprint queue. Do not renumber or skip existing queued sprints.

> **Core rule:** The app may be smart. The screen should not look smart.

## Outcome

A camper can answer “What are we eating each day?” and plan a weekend in under five minutes. The beginner path is:

`Trip → Meals → day → meal slot → choose or type → done`

Deeper tools—ingredients, servings, groceries, gear, and prep—appear only when requested.

## v1 scope

- Trip-level **Meals** area with `Plan | Groceries | Meals` sub-navigation.
- Day board using trip dates when present and numbered days otherwise.
- Default slots: Breakfast, Lunch, Dinner, Snacks, Treats.
- Quick Add accepts plain text without creating a saved meal.
- Reusable saved meals with Favorites, Recent, category filters, and search.
- Optional meal details: servings, ingredients, camp complexity, cooking method, cooler need, equipment, prep-at-home note, camp directions, and notes.
- Consolidated trip grocery list with `Need to Buy`, `Already Have`, and `Packed` states.
- Optional, explicit **Add missing gear** action.
- Offline-first local storage, backup/restore, mobile access, and behavior-level tests.

## Architecture guardrails

- Preserve `UI → application service → repository → IndexedDB`; components must not open IndexedDB directly.
- Keep the existing database name and compatibility-sensitive IDs unchanged.
- Add a forward-only IndexedDB migration; never rewrite prior migrations.
- A planned meal stores a snapshot of the saved meal. Later library edits must not silently alter an existing trip.
- Grocery totals are produced by one deterministic application service, not by UI components.
- Never silently change quantities, add gear, remove user overrides, or delete out-of-range meal days.
- Cloud sync/shared-trip support is additive later; the entire v1 must work without an account or network.

---

## MP-01 — Domain and local persistence

**Dependency:** none

**Ease:** 1/5
**Status:** Complete

### Scope

Create the smallest durable data layer needed by every later sprint.

### Tasks

- Add domain types for `SavedMeal`, `MealIngredient`, `MealPlanEntry`, and `TripGroceryItem`.
- Add IndexedDB stores and indexes through the next schema migration:
  - `savedMeals`: by category, favorite, archived, and last used.
  - `mealPlanEntries`: by trip and `[tripId, dayIndex]`.
  - `tripGroceryItems`: by trip and `[tripId, status]`.
- Add repositories with public CRUD/list operations and in-memory test equivalents.
- Add `mealPlannerService` as the only application entry point used by the UI.
- Extend JSON backup/restore validation and round-trip coverage for all new stores.
- Define deterministic normalization for grocery matching: trimmed, case-folded ingredient name plus normalized unit.

### Acceptance criteria

- A saved meal, plan entry, and grocery state survive reload and offline restart.
- Migration from the current production schema preserves every existing record.
- Archived saved meals remain valid in historical meal snapshots.
- Backup → clear/fresh database → restore reproduces representative meal data and statuses.
- Repositories and services close database connections in `finally` paths.

---

## MP-02 — Simple meal plan board and Quick Add

**Dependency:** MP-01

**Ease:** 2/5
**Status:** Complete

### Scope

Ship the complete beginner workflow before exposing recipe-like detail.

### Tasks

- Add **Meals** to the trip UI and a `Plan | Groceries | Meals` sub-navigation.
- Render one vertical card per trip day with the five default meal slots.
- Derive labels from `Trip.startDate`; use `Day 1`, `Day 2`, etc. when dates are missing.
- On slot tap, show Recent, Favorites, Quick Add, and Create Meal choices.
- Support add, replace, clear, and undo-last-change for a plan entry.
- Let Quick Add store any non-empty text, including “Eat in town,” “Leftovers,” “Whatever we catch,” and “TBD.”
- Preserve entries beyond a shortened trip range and show them under **Extra days** until the user moves or removes them.
- Show an unobtrusive unplanned-slot count; do not block the trip.

### Acceptance criteria

- A first-time user can plan a normal three-day trip without a tutorial or saved meal.
- The common action is no more than: tap slot → tap recent/favorite, or type Quick Add → save.
- Replacing or clearing dinner changes only that slot.
- Changing trip dates relabels days without silently losing planned meals.
- The board works at a narrow phone viewport with no horizontal scrolling.
- All controls are keyboard reachable, clearly labeled, and have comfortable touch targets.

---

## MP-03 — Saved meals and optional details

**Dependency:** MP-02

**Ease:** 2/5
**Status:** Complete

### Scope

Add reusable depth without making it part of the beginner path.

### Tasks

- Build **Meals** list with Favorites, Recent, Breakfast, Lunch, Dinner, Snacks, Treats, All, and search.
- Create/edit/archive a saved meal.
- Keep the first form short: name, category, favorite. Put all other fields under **More details**.
- Support optional:
  - default servings;
  - ingredients with quantity, unit, and grocery section;
  - complexity: Easy, Moderate, Involved;
  - method: No Cook, Stove, Campfire, Grill, Dutch Oven, Other;
  - storage: Shelf Stable, Cooler, Frozen;
  - required equipment;
  - prep-at-home note, camp directions, and notes.
- When adding a saved meal to the plan, write a full snapshot to the plan entry and update `lastUsedAt`.
- Allow a Quick Add entry to be saved as a reusable meal later.
- When camper count or servings changes, offer scaling only when structured quantities exist; require confirmation before applying it.

### Acceptance criteria

- A user can save and reuse a meal without entering an ingredient or quantity.
- Favorites and Recent reduce repeat planning to one tap after choosing a slot.
- Archived meals disappear from normal selection but remain visible on existing trips.
- Editing a saved meal does not change a previously planned snapshot.
- Unknown or non-scalable quantities remain unchanged; the app never pretends to know a serving amount.
- A card can show useful compact context such as `Easy · Stove · Cooler` without extra screen clutter.

---

## MP-04 — Consolidated groceries

**Dependency:** MP-03

**Ease:** 3/5
**Status:** Complete

### Scope

Turn structured planned meals into a reliable shopping-and-packing list.

### Tasks

- Build a pure grocery aggregation function from meal-entry snapshots.
- Combine only normalized ingredient names with compatible units; do not perform unit conversion in v1.
- Keep ingredients without quantities as valid list items.
- Group display by grocery section, then alphabetically.
- Persist status as `need-to-buy`, `already-have`, or `packed`.
- Support manual grocery items, notes, quantity overrides, and deletion of manual items.
- Rebuild derived rows when a planned meal changes while preserving status/manual overrides for still-matching rows.
- If a derived ingredient disappears, remove it only when it has no manual contribution; make the meal change undoable.
- Show a compact `Groceries — N items` link on the Plan board.

### Acceptance criteria

- Ingredients from multiple meals consolidate deterministically without duplicate compatible rows.
- Incompatible units remain separate and clearly labeled.
- Changing or removing a meal updates derived groceries without touching unrelated manual items.
- `Already Have` and `Packed` remain distinct and survive reload.
- A grocery list can be useful even when some or all ingredient quantities are blank.
- Aggregation and status transitions work fully offline.

---

## MP-05 — Camping integrations and release polish

**Dependency:** MP-04

**Ease:** 3/5
**Status:** Complete

### Scope

Connect meals to existing PAL workflows while keeping every action advisory and reversible.

### Tasks

- Build a **Before Trip** list from prep-at-home notes.
- Compare required equipment with trip/master inventory using stable IDs when available and normalized names as fallback.
- Show missing equipment, then provide an explicit **Add missing gear** action; never auto-add it.
- Avoid duplicates when suitable gear is already present or packed.
- Add a simple print/screenshot-friendly plan and grocery layout.
- Add empty, loading, error, and offline states that leave existing trip/checklist use intact.
- Add user-facing acceptance tests and update sprint/status/backup documentation.
- Complete the full project quality gate.

### Acceptance criteria

- Prep-at-home tasks are visible without opening every meal.
- The app can say either “All required cooking gear is covered” or list missing items.
- Gear enters the checklist only after explicit confirmation and can be undone.
- Meal planning remains usable when grocery or gear integration fails.
- Plan and grocery views print cleanly and are easy to screenshot.
- No network, account, or cloud provider is required.

---

## Data model notes

Names are illustrative; match current repo naming conventions.

```ts
type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks" | "treats";
type MealCategory = MealSlot | "other";
type GroceryStatus = "need-to-buy" | "already-have" | "packed";

interface MealIngredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  grocerySection?: string;
  scalable: boolean;
}

interface SavedMeal {
  id: string;
  name: string;
  category: MealCategory;
  favorite: boolean;
  defaultServings?: number;
  ingredients: MealIngredient[];
  complexity?: "easy" | "moderate" | "involved";
  cookingMethods: Array<"no-cook" | "stove" | "campfire" | "grill" | "dutch-oven" | "other">;
  storageNeeds: Array<"shelf-stable" | "cooler" | "frozen">;
  equipment: Array<{ name: string; masterItemId?: string }>;
  prepAtHome?: string;
  campDirections?: string;
  notes?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface MealPlanEntry {
  id: string;
  tripId: string;
  dayIndex: number; // zero-based; stable when trip dates move
  slot: MealSlot;
  title: string; // supports Quick Add
  savedMealId?: string;
  mealSnapshot?: SavedMeal;
  servings?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TripGroceryItem {
  id: string;
  tripId: string;
  matchKey: string; // normalized name + compatible unit
  name: string;
  unit?: string;
  derivedQuantity?: number;
  quantityOverride?: number;
  sourceMealEntryIds: string[];
  manual: boolean;
  status: GroceryStatus;
  grocerySection?: string;
  notes?: string;
  updatedAt: string;
}
```

### Model decisions

- `dayIndex` keeps “Saturday dinner” in the same trip position if dates shift.
- `mealSnapshot` follows the app’s existing trip snapshot principle and protects trip history.
- Quick Add uses `title` with no required `savedMealId` or ingredients.
- Grocery `matchKey` is service-owned. Do not use display text alone as a database identity.
- Do not merge mass, volume, count, package, or free-text units unless a future conversion system explicitly supports it.
- Keep grocery status separate from checklist `TripItemStatus`; they describe different workflows.

## UX rules

- Lead with `day → slot → meal`, never recipe setup.
- Use familiar labels: **Plan**, **Groceries**, **Meals**; do not say “Meal Library” in primary navigation.
- Quick Add is always available and never forces conversion to a saved meal.
- Show details progressively; no long form in the default add flow.
- Plain text is valid. “TBD,” “Eat in town,” and “Leftovers” are not errors.
- Use words plus icons; never rely on color or icons alone.
- Warnings are advisory, dismissible, and never block planning.
- Serving changes, grocery rebuilds, and gear additions must be visible, confirmed when destructive, and reversible.
- Keep dense tools out of the Plan board. One meal title plus compact tags is enough.
- Do not start continuous work, location access, sync, or network calls from this feature.

## Testing checklist

### Unit and service tests

- [x] Day count/labels with valid, missing, shifted, and shortened trip dates.
- [x] Quick Add, replace, clear, undo, and duplicate-slot prevention.
- [x] Saved-meal snapshot remains unchanged after library edit/archive.
- [x] Favorite/recent ordering and archived filtering.
- [x] Confirmed scaling, unknown quantities, rounding policy, and non-scalable items.
- [x] Grocery normalization, compatible merge, incompatible-unit split, and stable ordering.
- [x] Grocery rebuild preserves matching status and manual overrides.
- [x] Gear comparison and duplicate prevention.

### Persistence and portability

- [x] IndexedDB fresh install and upgrade from the prior schema version.
- [x] Repository CRUD/index behavior in real IndexedDB and memory test storage.
- [x] Backup validation rejects malformed meal data.
- [x] Backup/restore round trip includes meals, plan entries, groceries, and statuses.
- [x] Offline reload retains all work.

### UI and E2E

- [x] First-time user plans a three-day trip using only Quick Add.
- [x] Repeat user plans from Favorites/Recent.
- [x] Edit dinner and verify groceries update correctly.
- [x] Move grocery items through Need to Buy → Already Have → Packed.
- [x] Add missing gear only after confirmation.
- [x] Desktop and narrow-mobile layouts have no horizontal overflow.
- [x] Keyboard navigation, focus return, status announcements, labels, and touch targets.
- [x] Print/screenshot layout hides controls and preserves the plan.
- [x] App remains usable when offline or when an integration throws.

### Required project gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run test:e2e` (must build before preview)
- [x] Relevant Android build/lint checks if native files or behavior changed
- [x] `STATUS.md`, main sprint queue, acceptance tests, and backup docs updated

## Explicit non-goals for v1

- Calories, macros, nutrition charts, dieting, or medical dietary advice.
- Public recipes, ratings, comments, social feeds, or a giant food database.
- Recipe scraping/import, barcode scanning, receipt capture, price comparison, or store ordering.
- Silent serving/quantity changes or automatic unit conversion.
- Automatic gear insertion or removal.
- Complex pantry stock counts or expiration tracking.
- Adult/child serving math, allergy engine, or dietary recommendation engine.
- Custom meal-slot designer, drag-and-drop, auto-fill-the-trip, or AI meal generation.
- Leftover dependency automation; “Leftovers” remains valid plain text in v1.
- Water-consumption estimates, drinks planning, cost budgeting, and nutrition reports.
- Cloud requirement, live collaboration, or Firebase-only behavior.

## Release definition

The meal planner is ready when a new user can plan a three-day trip in under five minutes without creating a saved meal, a power user can add structured detail, groceries update predictably, gear is only suggested, all work survives offline reload and backup/restore, and the full project gate passes.
