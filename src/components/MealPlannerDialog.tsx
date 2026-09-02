import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { GroceryStatus, MealCategory, MealPlanEntry, MealSlot, SavedMeal, Trip, TripGroceryItem } from "../domain/models";
import { mealSlots } from "../domain/models";
import {
  addManualGroceryItem,
  addMissingMealGear,
  addSavedMealToPlan,
  archiveSavedMeal,
  clearMealPlanEntry,
  deleteManualGroceryItem,
  deriveMealDays,
  getBeforeTripTasks,
  getMealPlannerState,
  getMissingMealGear,
  groceryStatuses,
  moveMealPlanEntry,
  quickAddMeal,
  rebuildGroceries,
  saveSavedMeal,
  scaleMealPlanEntry,
  undoAddedMealGear,
  undoMealPlanChange,
  updateGroceryItem,
  type MealPlanChange,
  type MissingMealGear,
  type SavedMealInput,
} from "../application/mealPlannerService";

type Tab = "plan" | "groceries" | "meals";
const slotLabels: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks", treats: "Treats" };
const categoryLabels: Record<MealCategory, string> = { ...slotLabels, other: "Other" };
const statusLabels: Record<GroceryStatus, string> = { "need-to-buy": "Need to Buy", "already-have": "Already Have", packed: "Packed" };

export function MealPlannerDialog({ trip, onClose, onChecklistChanged }: { trip: Trip; onClose: () => void; onChecklistChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("plan");
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [groceries, setGroceries] = useState<TripGroceryItem[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [missingGear, setMissingGear] = useState<MissingMealGear[]>([]);
  const [picker, setPicker] = useState<{ dayIndex: number; slot: MealSlot }>();
  const [lastChange, setLastChange] = useState<MealPlanChange>();
  const [addedGearIds, setAddedGearIds] = useState<string[]>([]);
  const [editingMeal, setEditingMeal] = useState<SavedMeal>();
  const [suggestedMealName, setSuggestedMealName] = useState("");
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealFilter, setMealFilter] = useState<MealCategory | "favorites" | "recent" | "all">("all");
  const [mealSearch, setMealSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const [state, gear] = await Promise.all([getMealPlannerState(trip.id), getMissingMealGear(trip.id)]);
    setEntries(state.entries);
    setGroceries(state.groceries);
    setSavedMeals(state.savedMeals);
    setMissingGear(gear);
  }, [trip.id]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(refresh).catch(() => { if (alive) setError("Meal planning data is unavailable. Your checklist is still safe."); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [refresh]);

  const days = useMemo(() => deriveMealDays(trip, entries), [trip, entries]);
  const regularDays = days.filter((day) => !day.extra);
  const extraDays = days.filter((day) => day.extra);
  const plannedKeys = new Set(entries.filter((entry) => !days.find((day) => day.dayIndex === entry.dayIndex)?.extra).map((entry) => `${entry.dayIndex}:${entry.slot}`));
  const unplanned = regularDays.length * mealSlots.length - plannedKeys.size;
  const prepTasks = getBeforeTripTasks(entries);
  const filteredMeals = savedMeals.filter((meal) => {
    if (mealFilter === "favorites" && !meal.favorite) return false;
    if (mealFilter !== "all" && mealFilter !== "favorites" && mealFilter !== "recent" && meal.category !== mealFilter) return false;
    if (mealFilter === "recent" && !meal.lastUsedAt) return false;
    return meal.name.toLocaleLowerCase().includes(mealSearch.trim().toLocaleLowerCase());
  });

  async function commit(changePromise: Promise<MealPlanChange>, success: string) {
    setError("");
    try {
      const change = await changePromise;
      setLastChange(change);
      setPicker(undefined);
      setMessage(success);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "That meal change could not be saved."); }
  }

  async function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await saveSavedMeal(readMealForm(data, editingMeal?.id));
      setEditingMeal(undefined);
      setSuggestedMealName("");
      setShowMealForm(false);
      setMessage("Meal saved for reuse.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Meal could not be saved."); }
  }

  return (
    <div className="dialog-backdrop meal-planner-backdrop" role="presentation">
      <section className="dialog meal-planner" role="dialog" aria-modal="true" aria-labelledby="meal-planner-title">
        <div className="dialog-heading meal-planner-heading">
          <div><p className="eyebrow">{trip.name}</p><h2 id="meal-planner-title">Meals</h2></div>
          <div className="meal-print-actions"><button className="text-button" type="button" onClick={() => window.print()}>Print</button><button className="icon-button" type="button" aria-label="Close meal planner" onClick={onClose}>×</button></div>
        </div>
        <nav className="meal-tabs" aria-label="Meal planner">
          {(["plan", "groceries", "meals"] as const).map((value) => <button key={value} type="button" className={tab === value ? "active" : ""} aria-pressed={tab === value} onClick={() => { setTab(value); setPicker(undefined); }}>{value[0]?.toUpperCase()}{value.slice(1)}{value === "groceries" ? ` · ${groceries.length}` : ""}</button>)}
        </nav>
        {error && <p className="error-state" role="alert">{error}</p>}
        {message && <p className="meal-message" role="status">{message}</p>}
        {busy ? <p className="empty-state">Loading your local meal plan…</p> : tab === "plan" ? (
          <div className="meal-plan-view">
            <div className="meal-summary"><strong>{unplanned} unplanned slot{unplanned === 1 ? "" : "s"}</strong><button type="button" className="text-button" onClick={() => setTab("groceries")}>Groceries — {groceries.length} items</button>{lastChange && <button type="button" className="text-button" onClick={() => void undoMealPlanChange(lastChange).then(() => { setLastChange(undefined); setMessage("Last meal change undone."); return refresh(); }).catch(showActionError)}>Undo last change</button>}</div>
            {picker && <MealPicker dayLabel={days.find((day) => day.dayIndex === picker.dayIndex)?.label ?? `Day ${picker.dayIndex + 1}`} slot={picker.slot} meals={savedMeals} onQuick={(title) => commit(quickAddMeal(trip.id, picker.dayIndex, picker.slot, title), `${slotLabels[picker.slot]} planned.`)} onMeal={(mealId) => commit(addSavedMealToPlan(trip.id, picker.dayIndex, picker.slot, mealId), `${slotLabels[picker.slot]} planned.`)} onCreate={() => { setPicker(undefined); setEditingMeal(undefined); setSuggestedMealName(""); setShowMealForm(true); setTab("meals"); }} onClose={() => setPicker(undefined)} />}
            <DayBoard days={regularDays} entries={entries} onPick={(dayIndex, slot) => setPicker({ dayIndex, slot })} onClear={(entry) => commit(clearMealPlanEntry(entry.id), `${slotLabels[entry.slot]} cleared.`)} onSaveQuick={(entry) => { setSuggestedMealName(entry.title); setEditingMeal(undefined); setShowMealForm(true); setTab("meals"); setMessage(`Turn “${entry.title}” into a saved meal.`); }} onScale={(entry, servings) => commit(scaleMealPlanEntry(entry.id, servings, true), `${entry.title} scaled to ${servings} servings.`)} />
            {extraDays.length > 0 && <section className="extra-days"><h3>Extra days</h3><p>These meals are outside the current trip dates. Move or clear them when ready.</p><DayBoard days={extraDays} entries={entries} moveDays={regularDays} onPick={(dayIndex, slot) => setPicker({ dayIndex, slot })} onClear={(entry) => commit(clearMealPlanEntry(entry.id), `${slotLabels[entry.slot]} cleared.`)} onSaveQuick={(entry) => { setSuggestedMealName(entry.title); setEditingMeal(undefined); setShowMealForm(true); setTab("meals"); setMessage(`Turn “${entry.title}” into a saved meal.`); }} onScale={(entry, servings) => commit(scaleMealPlanEntry(entry.id, servings, true), `${entry.title} scaled to ${servings} servings.`)} onMove={(entry, dayIndex, slot) => commit(moveMealPlanEntry(entry.id, dayIndex, slot), `${entry.title} moved.`)} /></section>}
            <section className="meal-integration-card"><h3>Before Trip</h3>{prepTasks.length ? <ul>{prepTasks.map((task) => <li key={task.entryId}><strong>{task.meal}:</strong> {task.note}</li>)}</ul> : <p>No prep-at-home notes yet.</p>}<h3>Cooking gear</h3>{missingGear.length ? <><p>Missing: {missingGear.map((gear) => gear.name).join(", ")}</p><button className="secondary-action" type="button" onClick={() => void addMissingMealGear(trip.id).then(async (ids) => { setAddedGearIds(ids); setMessage(`Added ${ids.length} missing gear item${ids.length === 1 ? "" : "s"}.`); await onChecklistChanged(); await refresh(); }).catch(showActionError)}>Add missing gear</button></> : <p>All required cooking gear is covered.</p>}{addedGearIds.length > 0 && <button className="text-button" type="button" onClick={() => void undoAddedMealGear(addedGearIds).then(async () => { setAddedGearIds([]); setMessage("Gear addition undone."); await onChecklistChanged(); await refresh(); }).catch(showActionError)}>Undo gear addition</button>}</section>
          </div>
        ) : tab === "groceries" ? (
          <GroceryView groceries={groceries} onUpdate={async (id, changes) => { try { await updateGroceryItem(id, changes); await refresh(); } catch (reason) { showActionError(reason); } }} onAdd={async (input) => { try { await addManualGroceryItem(trip.id, input); await refresh(); } catch (reason) { showActionError(reason); } }} onDelete={async (id) => { try { await deleteManualGroceryItem(id); await refresh(); } catch (reason) { showActionError(reason); } }} onRebuild={async () => { try { setGroceries(await rebuildGroceries(trip.id)); setMessage("Groceries rebuilt from the current meal plan."); } catch (reason) { showActionError(reason); } }} />
        ) : (
          <div className="meal-library-view">
            <div className="meal-library-tools"><div className="meal-filter-row">{(["favorites", "recent", "breakfast", "lunch", "dinner", "snacks", "treats", "all"] as const).map((value) => <button key={value} type="button" className={mealFilter === value ? "active" : ""} aria-pressed={mealFilter === value} onClick={() => setMealFilter(value)}>{value[0]?.toUpperCase()}{value.slice(1)}</button>)}</div><input aria-label="Search saved meals" placeholder="Search meals" value={mealSearch} onChange={(event) => setMealSearch(event.target.value)} /><button className="primary-action" type="button" onClick={() => { setEditingMeal(undefined); setSuggestedMealName(""); setShowMealForm(true); }}>+ Create meal</button></div>
            {showMealForm && <MealForm {...(editingMeal ? { meal: editingMeal } : {})} suggestedName={suggestedMealName} onSubmit={saveMeal} onCancel={() => { setEditingMeal(undefined); setShowMealForm(false); }} />}
            <div className="saved-meal-list">{filteredMeals.length ? filteredMeals.map((meal) => <article key={meal.id} className="saved-meal-card"><div><strong>{meal.favorite ? "★ " : ""}{meal.name}</strong><small>{[categoryLabels[meal.category], meal.complexity, ...meal.cookingMethods, ...meal.storageNeeds].filter(Boolean).join(" · ")}</small></div><div><button type="button" className="text-button" onClick={() => { setEditingMeal(meal); setShowMealForm(true); }}>Edit</button><button type="button" className="text-button danger" onClick={() => void archiveSavedMeal(meal.id).then(refresh).catch(showActionError)}>Archive</button></div></article>) : <p className="empty-state">No saved meals match this view. Quick Add still works without one.</p>}</div>
          </div>
        )}
      </section>
    </div>
  );

  function showActionError(reason: unknown) {
    setError(reason instanceof Error ? reason.message : "That meal-planner action could not be completed. Your trip checklist is still available.");
  }
}

function DayBoard({ days, entries, moveDays, onPick, onClear, onSaveQuick, onScale, onMove }: { days: Array<{ dayIndex: number; label: string }>; entries: MealPlanEntry[]; moveDays?: Array<{ dayIndex: number; label: string }>; onPick: (dayIndex: number, slot: MealSlot) => void; onClear: (entry: MealPlanEntry) => void; onSaveQuick: (entry: MealPlanEntry) => void; onScale: (entry: MealPlanEntry, servings: number) => void; onMove?: (entry: MealPlanEntry, dayIndex: number, slot: MealSlot) => void }) {
  return <div className="meal-day-board">{days.map((day) => <section className="meal-day-card" key={day.dayIndex}><h3>{day.label}</h3>{mealSlots.map((slot) => { const entry = entries.find((item) => item.dayIndex === day.dayIndex && item.slot === slot); return <div className="meal-slot" key={slot}><button type="button" className="meal-slot-main" aria-label={`${slotLabels[slot]} for ${day.label}${entry ? `: ${entry.title}` : ": unplanned"}`} onClick={() => onPick(day.dayIndex, slot)}><span>{slotLabels[slot]}</span><strong>{entry?.title ?? "+ Add"}</strong>{entry?.mealSnapshot && <small>{[entry.mealSnapshot.complexity, ...entry.mealSnapshot.cookingMethods, ...entry.mealSnapshot.storageNeeds].filter(Boolean).join(" · ")}</small>}</button>{entry && <div className="meal-slot-actions"><button type="button" className="text-button" onClick={() => onClear(entry)}>Clear</button>{!entry.savedMealId && <button type="button" className="text-button" onClick={() => onSaveQuick(entry)}>Save as meal</button>}{moveDays && onMove && <MoveControl entry={entry} days={moveDays} onMove={onMove} />}{entry.mealSnapshot?.defaultServings && entry.mealSnapshot.ingredients.some((ingredient) => ingredient.scalable && ingredient.quantity !== undefined) && <ScaleControl entry={entry} onScale={onScale} />}</div>}</div>; })}</section>)}</div>;
}

function MoveControl({ entry, days, onMove }: { entry: MealPlanEntry; days: Array<{ dayIndex: number; label: string }>; onMove: (entry: MealPlanEntry, dayIndex: number, slot: MealSlot) => void }) {
  const [dayIndex, setDayIndex] = useState(days[0]?.dayIndex ?? 0);
  const [slot, setSlot] = useState<MealSlot>(entry.slot);
  return <details className="scale-control"><summary>Move</summary><label>Day<select value={dayIndex} onChange={(event) => setDayIndex(Number(event.target.value))}>{days.map((day) => <option key={day.dayIndex} value={day.dayIndex}>{day.label}</option>)}</select></label><label>Meal slot<select value={slot} onChange={(event) => setSlot(event.target.value as MealSlot)}>{mealSlots.map((value) => <option key={value} value={value}>{slotLabels[value]}</option>)}</select></label><button type="button" onClick={() => onMove(entry, dayIndex, slot)}>Move meal</button></details>;
}

function ScaleControl({ entry, onScale }: { entry: MealPlanEntry; onScale: (entry: MealPlanEntry, servings: number) => void }) {
  const [servings, setServings] = useState(entry.servings ?? entry.mealSnapshot?.defaultServings ?? 1);
  const [confirmed, setConfirmed] = useState(false);
  return <details className="scale-control"><summary>Servings: {entry.servings ?? entry.mealSnapshot?.defaultServings}</summary><label>New servings<input type="number" min="0.25" step="0.25" value={servings} onChange={(event) => setServings(event.currentTarget.valueAsNumber)} /></label><label className="check-label"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Confirm ingredient scaling</label><button type="button" disabled={!confirmed || !Number.isFinite(servings)} onClick={() => onScale(entry, servings)}>Scale</button></details>;
}

function MealPicker({ dayLabel, slot, meals, onQuick, onMeal, onCreate, onClose }: { dayLabel: string; slot: MealSlot; meals: SavedMeal[]; onQuick: (title: string) => void; onMeal: (id: string) => void; onCreate: () => void; onClose: () => void }) {
  const recent = meals.filter((meal) => meal.lastUsedAt).slice(0, 5);
  const favorites = meals.filter((meal) => meal.favorite).slice(0, 5);
  return <section className="meal-picker" aria-label={`Choose ${slotLabels[slot]} for ${dayLabel}`}><div className="section-heading"><h3>{dayLabel} · {slotLabels[slot]}</h3><button className="text-button" type="button" onClick={onClose}>Cancel</button></div><form onSubmit={(event) => { event.preventDefault(); onQuick(String(new FormData(event.currentTarget).get("quick"))); }}><label>Quick Add<input name="quick" required autoFocus placeholder="TBD, leftovers, eat in town…" /></label><button className="primary-action" type="submit">Save</button></form>{favorites.length > 0 && <MealChoices title="Favorites" meals={favorites} onMeal={onMeal} />}{recent.length > 0 && <MealChoices title="Recent" meals={recent} onMeal={onMeal} />}<button className="secondary-action" type="button" onClick={onCreate}>Create Meal</button></section>;
}

function MealChoices({ title, meals, onMeal }: { title: string; meals: SavedMeal[]; onMeal: (id: string) => void }) { return <div className="meal-choices"><strong>{title}</strong>{meals.map((meal) => <button type="button" key={meal.id} onClick={() => onMeal(meal.id)}>{meal.name}</button>)}</div>; }

function GroceryView({ groceries, onUpdate, onAdd, onDelete, onRebuild }: { groceries: TripGroceryItem[]; onUpdate: (id: string, changes: Partial<Pick<TripGroceryItem, "status" | "quantityOverride" | "notes">>) => Promise<void>; onAdd: (input: { name: string; unit?: string; quantity?: number; grocerySection?: string; notes?: string }) => Promise<void>; onDelete: (id: string) => Promise<void>; onRebuild: () => Promise<void> }) {
  const groups = groupGroceries(groceries);
  return <div className="grocery-view"><div className="meal-summary"><strong>{groceries.length} item{groceries.length === 1 ? "" : "s"}</strong><button type="button" className="text-button" onClick={() => void onRebuild()}>Rebuild from meals</button></div><form className="manual-grocery-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const quantity = optionalNumber(data.get("quantity")); void onAdd({ name: String(data.get("name")), ...(String(data.get("unit")).trim() ? { unit: String(data.get("unit")) } : {}), ...(quantity === undefined ? {} : { quantity }), ...(String(data.get("section")).trim() ? { grocerySection: String(data.get("section")) } : {}) }).then(() => form.reset()); }}><h3>Add grocery item</h3><div className="field-row"><label>Name<input name="name" required /></label><label>Qty<input name="quantity" type="number" step="any" /></label><label>Unit<input name="unit" /></label><label>Section<input name="section" /></label></div><button className="secondary-action" type="submit">Add item</button></form>{groceries.length === 0 ? <p className="empty-state">Add a manual item, or add ingredients to saved meals and place them on the Plan.</p> : [...groups].map(([section, items]) => <section className="grocery-section" key={section}><h3>{section}</h3>{items.map((item) => <form className="grocery-row" key={item.id} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const quantityOverride = optionalNumber(data.get("override")); void onUpdate(item.id, { status: String(data.get("status")) as GroceryStatus, ...(quantityOverride === undefined ? {} : { quantityOverride }), ...(String(data.get("notes")).trim() ? { notes: String(data.get("notes")).trim() } : {}) }); }}><div><strong>{item.name}</strong><small>{item.quantityOverride ?? item.derivedQuantity ?? ""} {item.unit ?? ""}{item.manual ? " · manual" : ""}</small></div><label>Status<select name="status" defaultValue={item.status}>{groceryStatuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label><label>Qty override<input name="override" type="number" step="any" defaultValue={item.quantityOverride} /></label><label>Notes<input name="notes" defaultValue={item.notes} /></label><button type="submit">Save</button>{item.manual && <button type="button" className="text-button danger" onClick={() => void onDelete(item.id)}>Remove manual part</button>}</form>)}</section>)}</div>;
}

function MealForm({ meal, suggestedName, onSubmit, onCancel }: { meal?: SavedMeal; suggestedName: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const ingredients = meal?.ingredients.map((item) => [item.name, item.quantity ?? "", item.unit ?? "", item.grocerySection ?? "", item.scalable ? "yes" : "no"].join(" | ")).join("\n") ?? "";
  const equipment = meal?.equipment.map((item) => [item.name, item.masterItemId ?? ""].join(" | ")).join("\n") ?? "";
  return <form className="meal-form" onSubmit={onSubmit}><div className="section-heading"><h3>{meal ? "Edit meal" : "Create meal"}</h3><button type="button" className="text-button" onClick={onCancel}>Cancel</button></div><label>Name<input name="name" required defaultValue={meal?.name ?? suggestedName} /></label><div className="field-row"><label>Category<select name="category" defaultValue={meal?.category ?? "dinner"}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="check-label"><input type="checkbox" name="favorite" defaultChecked={meal?.favorite} /> Favorite</label></div><details><summary>More details</summary><label>Default servings<input name="servings" type="number" min="0.25" step="0.25" defaultValue={meal?.defaultServings} /></label><label>Ingredients <small>One per line: name | quantity | unit | grocery section | scalable yes/no</small><textarea name="ingredients" rows={5} defaultValue={ingredients} /></label><div className="field-row"><label>Complexity<select name="complexity" defaultValue={meal?.complexity ?? ""}><option value="">Not set</option><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="involved">Involved</option></select></label><label>Cooking methods <small>Comma separated</small><input name="methods" defaultValue={meal?.cookingMethods.join(", ")} placeholder="stove, campfire" /></label><label>Storage needs <small>Comma separated</small><input name="storage" defaultValue={meal?.storageNeeds.join(", ")} placeholder="cooler" /></label></div><label>Required equipment <small>One per line: name | master item ID (optional)</small><textarea name="equipment" rows={3} defaultValue={equipment} /></label><label>Prep at home<textarea name="prep" defaultValue={meal?.prepAtHome} /></label><label>Camp directions<textarea name="directions" defaultValue={meal?.campDirections} /></label><label>Notes<textarea name="notes" defaultValue={meal?.notes} /></label></details><button className="primary-action" type="submit">Save meal</button></form>;
}

function readMealForm(data: FormData, id?: string): SavedMealInput {
  const methods = splitList(data.get("methods")).filter(isCookingMethod);
  const storage = splitList(data.get("storage")).filter(isStorageNeed);
  const servings = optionalNumber(data.get("servings"));
  const complexity = String(data.get("complexity"));
  const prepAtHome = String(data.get("prep")).trim();
  const campDirections = String(data.get("directions")).trim();
  const notes = String(data.get("notes")).trim();
  return {
    ...(id ? { id } : {}), name: String(data.get("name")), category: String(data.get("category")) as MealCategory, favorite: data.get("favorite") === "on",
    ...(servings === undefined ? {} : { defaultServings: servings }), ingredients: parseIngredients(String(data.get("ingredients"))),
    ...(complexity === "easy" || complexity === "moderate" || complexity === "involved" ? { complexity } : {}), cookingMethods: methods, storageNeeds: storage,
    equipment: String(data.get("equipment")).split(/\r?\n/).map((line) => line.split("|").map((value) => value.trim())).filter(([name]) => Boolean(name)).map(([name = "", masterItemId]) => ({ name, ...(masterItemId ? { masterItemId } : {}) })),
    ...(prepAtHome ? { prepAtHome } : {}), ...(campDirections ? { campDirections } : {}), ...(notes ? { notes } : {}),
  };
}

function parseIngredients(text: string) { return text.split(/\r?\n/).map((line) => line.split("|").map((value) => value.trim())).filter(([name]) => Boolean(name)).map(([name = "", rawQuantity, unit, grocerySection, scalable]) => { const quantity = optionalNumber(rawQuantity); return { id: crypto.randomUUID(), name, ...(quantity === undefined ? {} : { quantity }), ...(unit ? { unit } : {}), ...(grocerySection ? { grocerySection } : {}), scalable: /^(yes|y|true|1)$/i.test(scalable ?? "") }; }); }
function splitList(value: FormDataEntryValue | null): string[] { return String(value ?? "").split(",").map((item) => item.trim().toLocaleLowerCase()).filter(Boolean); }
function isCookingMethod(value: string): value is SavedMeal["cookingMethods"][number] { return ["no-cook", "stove", "campfire", "grill", "dutch-oven", "other"].includes(value); }
function isStorageNeed(value: string): value is SavedMeal["storageNeeds"][number] { return ["shelf-stable", "cooler", "frozen"].includes(value); }
function optionalNumber(value: FormDataEntryValue | null | undefined): number | undefined { const text = String(value ?? "").trim(); if (!text) return undefined; const number = Number(text); return Number.isFinite(number) ? number : undefined; }
function groupGroceries(items: TripGroceryItem[]): Map<string, TripGroceryItem[]> { const groups = new Map<string, TripGroceryItem[]>(); for (const item of items) { const section = item.grocerySection ?? "Other"; groups.set(section, [...(groups.get(section) ?? []), item]); } return groups; }
