import type { GroceryStatus, MealCategory, MealPlanEntry, SavedMeal, TripGroceryItem } from "../domain/models";

export class InMemorySavedMealRepository {
  private readonly records = new Map<string, SavedMeal>();
  get(id: string): Promise<SavedMeal | undefined> { return Promise.resolve(clone(this.records.get(id))); }
  list(includeArchived = false): Promise<SavedMeal[]> { return Promise.resolve(sortMeals([...this.records.values()].filter((meal) => includeArchived || !meal.archived).map(clone))); }
  listByCategory(category: MealCategory): Promise<SavedMeal[]> { return Promise.resolve(sortMeals([...this.records.values()].filter((meal) => meal.category === category && !meal.archived).map(clone))); }
  listFavorites(): Promise<SavedMeal[]> { return Promise.resolve(sortMeals([...this.records.values()].filter((meal) => meal.favorite && !meal.archived).map(clone))); }
  save(meal: SavedMeal): Promise<void> { this.records.set(meal.id, clone(meal)); return Promise.resolve(); }
  async archive(id: string): Promise<void> { const meal = this.records.get(id); if (meal) await this.save({ ...meal, archived: true, archivedIndex: "1", updatedAt: new Date().toISOString() }); }
}

export class InMemoryMealPlanEntryRepository {
  private readonly records = new Map<string, MealPlanEntry>();
  get(id: string): Promise<MealPlanEntry | undefined> { return Promise.resolve(clone(this.records.get(id))); }
  listByTrip(tripId: string): Promise<MealPlanEntry[]> { return Promise.resolve([...this.records.values()].filter((entry) => entry.tripId === tripId).map(clone).sort((a, b) => a.dayIndex - b.dayIndex || a.slot.localeCompare(b.slot))); }
  listByTripDay(tripId: string, dayIndex: number): Promise<MealPlanEntry[]> { return Promise.resolve([...this.records.values()].filter((entry) => entry.tripId === tripId && entry.dayIndex === dayIndex).map(clone)); }
  save(entry: MealPlanEntry): Promise<void> { this.records.set(entry.id, clone(entry)); return Promise.resolve(); }
  delete(id: string): Promise<void> { this.records.delete(id); return Promise.resolve(); }
}

export class InMemoryTripGroceryItemRepository {
  private readonly records = new Map<string, TripGroceryItem>();
  get(id: string): Promise<TripGroceryItem | undefined> { return Promise.resolve(clone(this.records.get(id))); }
  listByTrip(tripId: string): Promise<TripGroceryItem[]> { return Promise.resolve(sortGroceries([...this.records.values()].filter((item) => item.tripId === tripId).map(clone))); }
  listByStatus(tripId: string, status: GroceryStatus): Promise<TripGroceryItem[]> { return Promise.resolve([...this.records.values()].filter((item) => item.tripId === tripId && item.status === status).map(clone)); }
  save(item: TripGroceryItem): Promise<void> { this.records.set(item.id, clone(item)); return Promise.resolve(); }
  async saveMany(items: TripGroceryItem[]): Promise<void> { for (const item of items) await this.save(item); }
  delete(id: string): Promise<void> { this.records.delete(id); return Promise.resolve(); }
}

function clone<T>(value: T): T { return value === undefined ? value : structuredClone(value); }
function sortMeals(meals: SavedMeal[]): SavedMeal[] { return meals.sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "") || a.name.localeCompare(b.name)); }
function sortGroceries(items: TripGroceryItem[]): TripGroceryItem[] { return items.sort((a, b) => (a.grocerySection ?? "Other").localeCompare(b.grocerySection ?? "Other") || a.name.localeCompare(b.name) || (a.unit ?? "").localeCompare(b.unit ?? "")); }
