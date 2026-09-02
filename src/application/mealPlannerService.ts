import type {
  GroceryStatus,
  MasterItem,
  MealCategory,
  MealIngredient,
  MealPlanEntry,
  MealSlot,
  SavedMeal,
  Trip,
  TripGroceryItem,
  TripItem,
} from "../domain/models";
import { openCampingDatabase, type CampingDatabase } from "../data/database";
import {
  MasterItemRepository,
  MealPlanEntryRepository,
  SavedMealRepository,
  TripGroceryItemRepository,
  TripItemRepository,
} from "../data/repositories";

export interface MealPlannerState {
  entries: MealPlanEntry[];
  groceries: TripGroceryItem[];
  savedMeals: SavedMeal[];
}

export interface MealPlanChange { before?: MealPlanEntry; after?: MealPlanEntry; displaced?: MealPlanEntry }
export interface MealDay { dayIndex: number; label: string; extra: boolean }
export interface MissingMealGear { name: string; masterItemId?: string; sourceEntryIds: string[] }

export type SavedMealInput = Omit<SavedMeal, "id" | "favoriteIndex" | "archivedIndex" | "createdAt" | "updatedAt" | "archived" | "lastUsedAt"> & {
  id?: string;
  lastUsedAt?: string;
};

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const slotOrder: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2, snacks: 3, treats: 4 };

export function normalizeIngredientName(value: string): string { return value.trim().toLocaleLowerCase().replace(/\s+/g, " "); }
export function normalizeGroceryUnit(value?: string): string { return (value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " "); }
export function groceryMatchKey(name: string, unit?: string): string { return `${normalizeIngredientName(name)}|${normalizeGroceryUnit(unit)}`; }

export function deriveMealDays(trip: Pick<Trip, "startDate" | "endDate">, entries: MealPlanEntry[] = []): MealDay[] {
  let dayCount = 3;
  const start = parseDate(trip.startDate);
  const end = parseDate(trip.endDate);
  if (start && end && end >= start) dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const highestPlanned = entries.reduce((highest, entry) => Math.max(highest, entry.dayIndex), -1);
  const visibleCount = Math.max(dayCount, highestPlanned + 1);
  return Array.from({ length: visibleCount }, (_, dayIndex) => ({
    dayIndex,
    label: start && dayIndex < dayCount
      ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(start.getTime() + dayIndex * 86_400_000))
      : `Day ${dayIndex + 1}`,
    extra: dayIndex >= dayCount,
  }));
}

function parseDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function aggregateGroceries(entries: MealPlanEntry[], now = new Date().toISOString()): TripGroceryItem[] {
  const rows = new Map<string, TripGroceryItem>();
  for (const entry of entries) {
    for (const ingredient of entry.mealSnapshot?.ingredients ?? []) {
      const name = ingredient.name.trim();
      if (!name) continue;
      const matchKey = groceryMatchKey(name, ingredient.unit);
      const current = rows.get(matchKey);
      const quantity = ingredient.quantity;
      if (current) {
        if (quantity !== undefined) current.derivedQuantity = (current.derivedQuantity ?? 0) + quantity;
        if (!current.sourceMealEntryIds.includes(entry.id)) current.sourceMealEntryIds.push(entry.id);
        continue;
      }
      rows.set(matchKey, {
        id: `grocery-${entry.tripId}-${stableHash(matchKey)}`,
        tripId: entry.tripId,
        matchKey,
        name,
        ...(ingredient.unit?.trim() ? { unit: ingredient.unit.trim() } : {}),
        ...(quantity === undefined ? {} : { derivedQuantity: quantity }),
        sourceMealEntryIds: [entry.id],
        manual: false,
        status: "need-to-buy",
        ...(ingredient.grocerySection?.trim() ? { grocerySection: ingredient.grocerySection.trim() } : {}),
        updatedAt: now,
      });
    }
  }
  return sortGroceries([...rows.values()]);
}

export function mergeRebuiltGroceries(derived: TripGroceryItem[], existing: TripGroceryItem[], now = new Date().toISOString()): TripGroceryItem[] {
  const oldByKey = new Map(existing.map((item) => [item.matchKey, item]));
  const next = derived.map((row) => {
    const old = oldByKey.get(row.matchKey);
    oldByKey.delete(row.matchKey);
    return old ? {
      ...row,
      id: old.id,
      manual: old.manual,
      status: old.status,
      ...(old.quantityOverride === undefined ? {} : { quantityOverride: old.quantityOverride }),
      ...(old.notes === undefined ? {} : { notes: old.notes }),
      updatedAt: now,
    } : row;
  });
  for (const old of oldByKey.values()) {
    if (old.manual) next.push({
      id: old.id,
      tripId: old.tripId,
      matchKey: old.matchKey,
      name: old.name,
      ...(old.unit === undefined ? {} : { unit: old.unit }),
      ...(old.quantityOverride === undefined ? {} : { quantityOverride: old.quantityOverride }),
      sourceMealEntryIds: [],
      manual: true,
      status: old.status,
      ...(old.grocerySection === undefined ? {} : { grocerySection: old.grocerySection }),
      ...(old.notes === undefined ? {} : { notes: old.notes }),
      updatedAt: now,
    });
  }
  return sortGroceries(next);
}

export async function getMealPlannerState(tripId: string): Promise<MealPlannerState> {
  return withDatabase(async (database) => ({
    entries: await new MealPlanEntryRepository(database).listByTrip(tripId),
    groceries: await new TripGroceryItemRepository(database).listByTrip(tripId),
    savedMeals: await new SavedMealRepository(database).list(),
  }));
}

export async function listSavedMeals(options: { category?: MealCategory; favorites?: boolean; search?: string; includeArchived?: boolean } = {}): Promise<SavedMeal[]> {
  return withDatabase(async (database) => {
    const repository = new SavedMealRepository(database);
    const meals = options.category ? await repository.listByCategory(options.category) : options.favorites ? await repository.listFavorites() : await repository.list(options.includeArchived);
    const search = normalizeIngredientName(options.search ?? "");
    return search ? meals.filter((meal) => normalizeIngredientName(meal.name).includes(search)) : meals;
  });
}

export async function saveSavedMeal(input: SavedMealInput): Promise<SavedMeal> {
  const name = input.name.trim();
  if (!name) throw new Error("Meal name is required.");
  return withDatabase(async (database) => {
    const repository = new SavedMealRepository(database);
    const current = input.id ? await repository.get(input.id) : undefined;
    const now = new Date().toISOString();
    const meal: SavedMeal = {
      ...input,
      id: current?.id ?? makeId("meal"),
      name,
      ingredients: input.ingredients.filter((ingredient) => ingredient.name.trim()).map(cleanIngredient),
      equipment: input.equipment.filter((item) => item.name.trim()).map((item) => ({ ...item, name: item.name.trim() })),
      favoriteIndex: input.favorite ? "1" : "0",
      archivedIndex: current?.archived ? "1" : "0",
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      archived: current?.archived ?? false,
    };
    await repository.save(meal);
    return meal;
  });
}

function cleanIngredient(ingredient: MealIngredient): MealIngredient {
  const { unit, grocerySection, ...required } = ingredient;
  return {
    ...required,
    id: ingredient.id || makeId("ingredient"),
    name: ingredient.name.trim(),
    ...(unit?.trim() ? { unit: unit.trim() } : {}),
    ...(grocerySection?.trim() ? { grocerySection: grocerySection.trim() } : {}),
  };
}

export async function archiveSavedMeal(id: string): Promise<void> { return withDatabase(async (database) => new SavedMealRepository(database).archive(id)); }

export async function quickAddMeal(tripId: string, dayIndex: number, slot: MealSlot, title: string): Promise<MealPlanChange> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Enter a meal or plan note.");
  return withDatabase(async (database) => savePlanChange(database, { tripId, dayIndex, slot, title: cleanTitle }));
}

export async function addSavedMealToPlan(tripId: string, dayIndex: number, slot: MealSlot, savedMealId: string): Promise<MealPlanChange> {
  return withDatabase(async (database) => {
    const mealRepository = new SavedMealRepository(database);
    const meal = await mealRepository.get(savedMealId);
    if (!meal || meal.archived) throw new Error("That saved meal is no longer available.");
    const now = new Date().toISOString();
    const updatedMeal = { ...meal, lastUsedAt: now, updatedAt: now };
    await mealRepository.save(updatedMeal);
    return savePlanChange(database, {
      tripId,
      dayIndex,
      slot,
      title: meal.name,
      savedMealId: meal.id,
      mealSnapshot: structuredClone(updatedMeal),
      ...(meal.defaultServings === undefined ? {} : { servings: meal.defaultServings }),
    });
  });
}

async function savePlanChange(database: CampingDatabase, input: Pick<MealPlanEntry, "tripId" | "dayIndex" | "slot" | "title"> & Partial<Pick<MealPlanEntry, "savedMealId" | "mealSnapshot" | "servings" | "notes">>): Promise<MealPlanChange> {
  if (!Number.isInteger(input.dayIndex) || input.dayIndex < 0) throw new Error("Meal day must be zero or greater.");
  const repository = new MealPlanEntryRepository(database);
  const before = (await repository.listByTripDay(input.tripId, input.dayIndex)).find((entry) => entry.slot === input.slot);
  const now = new Date().toISOString();
  const after: MealPlanEntry = {
    id: before?.id ?? makeId("meal-plan"),
    ...input,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
  };
  await repository.save(after);
  await rebuildGroceriesInDatabase(database, input.tripId);
  return { ...(before ? { before } : {}), after };
}

export async function clearMealPlanEntry(id: string): Promise<MealPlanChange> {
  return withDatabase(async (database) => {
    const repository = new MealPlanEntryRepository(database);
    const before = await repository.get(id);
    if (!before) return {};
    await repository.delete(id);
    await rebuildGroceriesInDatabase(database, before.tripId);
    return { before };
  });
}

export async function moveMealPlanEntry(id: string, dayIndex: number, slot: MealSlot): Promise<MealPlanChange> {
  if (!Number.isInteger(dayIndex) || dayIndex < 0) throw new Error("Choose a valid meal day.");
  return withDatabase(async (database) => {
    const repository = new MealPlanEntryRepository(database);
    const before = await repository.get(id);
    if (!before) throw new Error("That planned meal no longer exists.");
    const displaced = (await repository.listByTripDay(before.tripId, dayIndex)).find((entry) => entry.slot === slot && entry.id !== id);
    if (displaced) await repository.delete(displaced.id);
    const after = { ...before, dayIndex, slot, updatedAt: new Date().toISOString() };
    await repository.save(after);
    await rebuildGroceriesInDatabase(database, before.tripId);
    return { before, after, ...(displaced ? { displaced } : {}) };
  });
}

export async function undoMealPlanChange(change: MealPlanChange): Promise<void> {
  return withDatabase(async (database) => {
    const repository = new MealPlanEntryRepository(database);
    if (change.before) await repository.save(change.before);
    else if (change.after) await repository.delete(change.after.id);
    if (change.displaced) await repository.save(change.displaced);
    const tripId = change.before?.tripId ?? change.after?.tripId;
    if (tripId) await rebuildGroceriesInDatabase(database, tripId);
  });
}

export async function scaleMealPlanEntry(id: string, servings: number, confirmed: boolean): Promise<MealPlanChange> {
  if (!confirmed) throw new Error("Confirm scaling before changing ingredient quantities.");
  if (!Number.isFinite(servings) || servings <= 0) throw new Error("Servings must be greater than zero.");
  return withDatabase(async (database) => {
    const repository = new MealPlanEntryRepository(database);
    const before = await repository.get(id);
    const snapshot = before?.mealSnapshot;
    const baseServings = before?.servings ?? snapshot?.defaultServings;
    if (!before || !snapshot || !baseServings || !snapshot.ingredients.some((ingredient) => ingredient.scalable && ingredient.quantity !== undefined)) throw new Error("This meal has no structured quantities to scale.");
    const ratio = servings / baseServings;
    const now = new Date().toISOString();
    const after: MealPlanEntry = {
      ...before,
      servings,
      mealSnapshot: {
        ...structuredClone(snapshot),
        ingredients: snapshot.ingredients.map((ingredient) => ingredient.scalable && ingredient.quantity !== undefined ? { ...ingredient, quantity: roundQuantity(ingredient.quantity * ratio) } : structuredClone(ingredient)),
      },
      updatedAt: now,
    };
    await repository.save(after);
    await rebuildGroceriesInDatabase(database, before.tripId);
    return { before, after };
  });
}

export async function rebuildGroceries(tripId: string): Promise<TripGroceryItem[]> { return withDatabase((database) => rebuildGroceriesInDatabase(database, tripId)); }

async function rebuildGroceriesInDatabase(database: CampingDatabase, tripId: string): Promise<TripGroceryItem[]> {
  const entries = await new MealPlanEntryRepository(database).listByTrip(tripId);
  const repository = new TripGroceryItemRepository(database);
  const existing = await repository.listByTrip(tripId);
  const next = mergeRebuiltGroceries(aggregateGroceries(entries), existing);
  const nextIds = new Set(next.map((item) => item.id));
  await repository.saveMany(next);
  await Promise.all(existing.filter((item) => !nextIds.has(item.id)).map((item) => repository.delete(item.id)));
  return next;
}

export async function updateGroceryItem(id: string, changes: Partial<Pick<TripGroceryItem, "status" | "quantityOverride" | "notes" | "grocerySection">>): Promise<TripGroceryItem | undefined> {
  return withDatabase(async (database) => {
    const repository = new TripGroceryItemRepository(database);
    const current = await repository.get(id);
    if (!current) return undefined;
    const updated = { ...current, ...changes, updatedAt: new Date().toISOString() };
    await repository.save(updated);
    return updated;
  });
}

export async function addManualGroceryItem(tripId: string, input: { name: string; unit?: string; quantity?: number; grocerySection?: string; notes?: string }): Promise<TripGroceryItem> {
  const name = input.name.trim();
  if (!name) throw new Error("Grocery item name is required.");
  return withDatabase(async (database) => {
    const repository = new TripGroceryItemRepository(database);
    const matchKey = groceryMatchKey(name, input.unit);
    const existing = (await repository.listByTrip(tripId)).find((item) => item.matchKey === matchKey);
    const item: TripGroceryItem = {
      id: existing?.id ?? `grocery-${tripId}-${stableHash(matchKey)}`,
      tripId,
      matchKey,
      name,
      ...(input.unit?.trim() ? { unit: input.unit.trim() } : existing?.unit === undefined ? {} : { unit: existing.unit }),
      ...(existing?.derivedQuantity === undefined ? {} : { derivedQuantity: existing.derivedQuantity }),
      ...(input.quantity === undefined ? existing?.quantityOverride === undefined ? {} : { quantityOverride: existing.quantityOverride } : { quantityOverride: input.quantity }),
      sourceMealEntryIds: existing?.sourceMealEntryIds ?? [],
      manual: true,
      status: existing?.status ?? "need-to-buy",
      ...(input.grocerySection?.trim() ? { grocerySection: input.grocerySection.trim() } : existing?.grocerySection === undefined ? {} : { grocerySection: existing.grocerySection }),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : existing?.notes === undefined ? {} : { notes: existing.notes }),
      updatedAt: new Date().toISOString(),
    };
    await repository.save(item);
    return item;
  });
}

export async function deleteManualGroceryItem(id: string): Promise<void> {
  return withDatabase(async (database) => {
    const repository = new TripGroceryItemRepository(database);
    const item = await repository.get(id);
    if (!item || !item.manual) return;
    if (item.sourceMealEntryIds.length) await repository.save({ ...item, manual: false, updatedAt: new Date().toISOString() });
    else await repository.delete(id);
  });
}

export function getBeforeTripTasks(entries: MealPlanEntry[]): Array<{ entryId: string; meal: string; note: string }> {
  return entries.flatMap((entry) => entry.mealSnapshot?.prepAtHome?.trim() ? [{ entryId: entry.id, meal: entry.title, note: entry.mealSnapshot.prepAtHome.trim() }] : []);
}

export function findMissingMealGear(entries: MealPlanEntry[], tripItems: TripItem[]): MissingMealGear[] {
  const coveredIds = new Set(tripItems.filter((item) => item.status !== "not-needed").flatMap((item) => item.masterItemId ? [item.masterItemId] : []));
  const coveredNames = new Set(tripItems.filter((item) => item.status !== "not-needed").map((item) => normalizeIngredientName(item.name)));
  const needed = new Map<string, MissingMealGear>();
  for (const entry of entries) for (const equipment of entry.mealSnapshot?.equipment ?? []) {
    const key = equipment.masterItemId ? `id:${equipment.masterItemId}` : `name:${normalizeIngredientName(equipment.name)}`;
    if ((equipment.masterItemId && coveredIds.has(equipment.masterItemId)) || coveredNames.has(normalizeIngredientName(equipment.name))) continue;
    const current = needed.get(key);
    if (current) current.sourceEntryIds.push(entry.id);
    else needed.set(key, { name: equipment.name, ...(equipment.masterItemId ? { masterItemId: equipment.masterItemId } : {}), sourceEntryIds: [entry.id] });
  }
  return [...needed.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMissingMealGear(tripId: string): Promise<MissingMealGear[]> {
  return withDatabase(async (database) => findMissingMealGear(await new MealPlanEntryRepository(database).listByTrip(tripId), await new TripItemRepository(database).listByTrip(tripId)));
}

export async function addMissingMealGear(tripId: string): Promise<string[]> {
  return withDatabase(async (database) => {
    const plans = await new MealPlanEntryRepository(database).listByTrip(tripId);
    const tripItems = new TripItemRepository(database);
    const current = await tripItems.listByTrip(tripId);
    const missing = findMissingMealGear(plans, current);
    const masters = new MasterItemRepository(database);
    const maxSort = current.reduce((max, item) => Math.max(max, item.sortOrder), 0);
    const additions: TripItem[] = [];
    for (const [index, gear] of missing.entries()) {
      const master: MasterItem | undefined = gear.masterItemId ? await masters.get(gear.masterItemId) : undefined;
      additions.push({
        id: makeId("trip-item"),
        tripId,
        ...(gear.masterItemId ? { masterItemId: gear.masterItemId } : {}),
        name: master?.name ?? gear.name,
        category: "gear",
        section: master?.section ?? "Camp kitchen",
        quantity: master?.defaultQuantity ?? 1,
        unit: master?.unit ?? "item",
        status: "not-packed",
        tags: master?.tags ?? ["meal-gear"],
        custom: !master,
        sortOrder: maxSort + index + 1,
      });
    }
    await tripItems.saveMany(additions);
    return additions.map((item) => item.id);
  });
}

export async function undoAddedMealGear(ids: string[]): Promise<void> { return withDatabase(async (database) => { const repository = new TripItemRepository(database); await Promise.all(ids.map((id) => repository.delete(id))); }); }

function stableHash(value: string): string { let hash = 2166136261; for (const character of value) { hash ^= character.codePointAt(0) ?? 0; hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }
function roundQuantity(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function sortGroceries(items: TripGroceryItem[]): TripGroceryItem[] { return items.sort((a, b) => (a.grocerySection ?? "Other").localeCompare(b.grocerySection ?? "Other") || a.name.localeCompare(b.name) || (a.unit ?? "").localeCompare(b.unit ?? "")); }
async function withDatabase<T>(operation: (database: CampingDatabase) => Promise<T>): Promise<T> { const database = await openCampingDatabase(); try { return await operation(database); } finally { database.close(); } }

export const groceryStatuses: readonly GroceryStatus[] = ["need-to-buy", "already-have", "packed"];
export const mealCategoryOrder: readonly MealCategory[] = ["breakfast", "lunch", "dinner", "snacks", "treats", "other"];
export function sortMealPlanEntries(entries: MealPlanEntry[]): MealPlanEntry[] { return [...entries].sort((a, b) => a.dayIndex - b.dayIndex || slotOrder[a.slot] - slotOrder[b.slot]); }
