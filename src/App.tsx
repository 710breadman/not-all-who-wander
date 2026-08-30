import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  downloadText,
  readSharedTripFile,
  tripItemsToCsv,
  tripToShareFile,
} from "./application/backupService";
import {
  addCustomTripItem,
  addParticipantItems,
  createTrip,
  importSharedTrip,
  isMatchingItem,
  listProfiles,
  listTripItems,
  listTrips,
  promoteTripItem,
  saveProfile,
  updateTrip,
  updateTripItem,
} from "./application/tripService";
import { DataTools } from "./components/DataTools";
import { InventoryScreen } from "./components/InventoryScreen";
import { loadChecklistSeed } from "./data/seedLoader";
import type {
  CampingLevel,
  ChecklistCategory,
  PersonalItemTemplate,
  Trip,
  TripItem,
  TripItemStatus,
  TripStyle,
  UserProfile,
} from "./domain/models";
import "./App.css";

const categoryIcons: Record<ChecklistCategory, string> = {
  food: "🥣",
  gear: "⛺",
  clothes: "🧥",
  "hygiene-first-aid": "✚",
  extras: "✨",
};
const categoryNames: Record<ChecklistCategory, string> = {
  food: "Food",
  gear: "Gear",
  clothes: "Clothes",
  "hygiene-first-aid": "Hygiene & First Aid",
  extras: "Extras",
};
const levelDetails: Record<
  CampingLevel,
  { label: string; description: string; style: TripStyle }
> = {
  camper: {
    label: "Camper / RV",
    description:
      "Full campsite setup: vehicle, power, comfort, and camp-kitchen gear.",
    style: "car",
  },
  tent: {
    label: "Tent camping",
    description:
      "A standard campsite list: shelter, sleep, kitchen, clothing, and essentials.",
    style: "car",
  },
  backpacking: {
    label: "Backpacking",
    description:
      "A lighter list that leaves out car-only comfort and electronics by default.",
    style: "light-backpacking",
  },
};
type Filter = "all" | TripItemStatus | "remaining";
type Screen = "home" | "inventory" | "data" | "profiles";

export default function App() {
  const seed = useMemo(() => loadChecklistSeed(), []);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [trip, setTrip] = useState<Trip>();
  const [items, setItems] = useState<TripItem[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<ChecklistCategory>("food");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [packingMode, setPackingMode] = useState(false);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItem>();
  const [editingTrip, setEditingTrip] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const refreshTrips = useCallback(async () => setTrips(await listTrips()), []);
  const refreshProfiles = useCallback(
    async () => setProfiles(await listProfiles()),
    [],
  );
  const openTrip = useCallback(async (next: Trip) => {
    setBusy(true);
    setError("");
    setTrip(next);
    try {
      setItems(await listTripItems(next.id));
    } catch {
      setError("Local storage is unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void Promise.all([listTrips(), listProfiles()])
      .then(([nextTrips, nextProfiles]) => {
        if (alive) {
          setTrips(nextTrips);
          setProfiles(nextProfiles);
        }
      })
      .catch(() => {
        if (alive) setError("Local storage is unavailable.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const setupLevel = String(form.get("setupLevel") ?? "tent") as CampingLevel;
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const next = await createTrip({
        name,
        camperCount: Math.max(1, Number(form.get("campers")) || 1),
        style: levelDetails[setupLevel].style,
        setupLevel,
        participantIds: form.getAll("participants").map(String),
        ...tripFields(form),
      });
      await refreshTrips();
      await openTrip(next);
      setShowNewTrip(false);
    } catch {
      setError("Couldn’t create that trip. Please try again.");
      setBusy(false);
    }
  }
  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trip) return;
    const form = new FormData(event.currentTarget);
    const participantIds = form.getAll("participants").map(String);
    const updated = await updateTrip(trip.id, {
      name: String(form.get("name") ?? "").trim() || trip.name,
      camperCount: Math.max(1, Number(form.get("campers")) || 1),
      participantIds,
      ...tripFields(form),
    });
    if (!updated) return;
    const additions = participantIds.filter(
      (id) => !trip.participantIds?.includes(id),
    );
    if (additions.length) await addParticipantItems(updated.id, additions);
    setTrip(updated);
    setItems(await listTripItems(updated.id));
    setEditingTrip(false);
    await refreshTrips();
  }
  async function saveItem(
    id: string,
    changes: Partial<
      Pick<
        TripItem,
        | "name"
        | "category"
        | "section"
        | "quantity"
        | "unit"
        | "status"
        | "notes"
        | "assigneeId"
      >
    >,
  ) {
    const updated = await updateTripItem(id, changes);
    if (updated)
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
  }
  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trip) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("item") ?? "").trim();
    if (!name) return;
    const item = await addCustomTripItem(
      trip.id,
      name,
      String(form.get("category")) as ChecklistCategory,
      String(form.get("section") ?? "Custom items"),
    );
    setItems((current) => [...current, item]);
    setActiveCategory(item.category);
    setShowCustom(false);
  }
  async function shareTrip() {
    if (!trip) return;
    const filename = `${slug(trip.name)}.camptrip.json`;
    const text = tripToShareFile(
      trip,
      items,
      profiles.filter((profile) => trip.participantIds?.includes(profile.id)),
    );
    const file = new File([text], filename, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: trip.name,
          text: "Camping trip checklist",
          files: [file],
        });
        return;
      }
    } catch {
      return;
    }
    downloadText(filename, text, "application/json");
  }
  async function importTrip(file?: File) {
    if (!file) return;
    try {
      const imported = await importSharedTrip(
        readSharedTripFile(await file.text()),
      );
      await refreshTrips();
      await refreshProfiles();
      await openTrip(imported);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not import that trip.",
      );
    }
  }

  if (screen === "inventory")
    return <InventoryScreen onBack={() => setScreen("home")} />;
  if (screen === "data")
    return (
      <DataTools
        onBack={() => setScreen("home")}
        onRestored={() => {
          setTrip(undefined);
          setScreen("home");
          void refreshTrips();
        }}
      />
    );
  if (screen === "profiles")
    return (
      <ProfilesScreen
        profiles={profiles}
        onBack={() => setScreen("home")}
        onSaved={refreshProfiles}
      />
    );
  if (!trip)
    return (
      <Home
        seedCount={seed.items.length}
        trips={trips}
        busy={busy}
        error={error}
        onNew={() => setShowNewTrip(true)}
        onOpen={openTrip}
        onInventory={() => setScreen("inventory")}
        onDataTools={() => setScreen("data")}
        onProfiles={() => setScreen("profiles")}
        onImport={importTrip}
        profiles={profiles}
        showNew={showNewTrip}
        onCreate={create}
        onDismiss={() => setShowNewTrip(false)}
      />
    );

  const effectiveFilter = packingMode ? "remaining" : filter;
  const visibleItems = items.filter(
    (item) =>
      (filter === "need-to-buy" || item.category === activeCategory) &&
      isMatchingItem(item, search, effectiveFilter),
  );
  const itemSections = groupItemsBySection(visibleItems);
  const applicable = items.filter((item) => item.status !== "not-needed");
  const packed = applicable.filter((item) => item.status === "packed").length;
  const progress = applicable.length
    ? Math.round((packed / applicable.length) * 100)
    : 0;
  return (
    <main className={`app-shell ${packingMode ? "packing-mode" : ""}`}>
      <header className="trip-header">
        <button
          className="text-button"
          type="button"
          onClick={() => setTrip(undefined)}
        >
          ← All trips
        </button>
        <p className="eyebrow">
          {trip.setupLevel ? levelDetails[trip.setupLevel].label : trip.style} ·{" "}
          {trip.camperCount} camper{trip.camperCount === 1 ? "" : "s"}
        </p>
        <div className="trip-title-row">
          <h1>{trip.name}</h1>
          <button
            className="text-button"
            type="button"
            onClick={() => setEditingTrip(true)}
          >
            Edit trip
          </button>
        </div>
        {trip.destination && (
          <p className="trip-destination">
            {trip.destination}
            {trip.address ? ` · ${trip.address}` : ""}
          </p>
        )}
        <div className="progress-row">
          <div className="progress-track" aria-label={`${progress}% packed`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>
            {packed}/{applicable.length} packed
          </strong>
        </div>
      </header>
      <section className="inventory-card" aria-labelledby="checklist-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TRIP CHECKLIST</p>
            <h2 id="checklist-heading">Checklist</h2>
          </div>
          <div className="header-actions">
            <button
              className={
                packingMode ? "secondary-action selected" : "secondary-action"
              }
              type="button"
              aria-pressed={packingMode}
              onClick={() => setPackingMode((current) => !current)}
            >
              {packingMode ? "Exit packing" : "Packing mode"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void shareTrip()}
            >
              Share trip
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() =>
                downloadText(
                  `${slug(trip.name)}-checklist.csv`,
                  tripItemsToCsv(trip, items),
                  "text/csv",
                )
              }
            >
              Export CSV
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => setShowCustom(true)}
            >
              + Add item
            </button>
          </div>
        </div>
        <nav className="category-tabs" aria-label="Checklist categories">
          {seed.categories.map((category) => (
            <button
              className={
                category.id === activeCategory
                  ? "category-tab active"
                  : "category-tab"
              }
              key={category.id}
              type="button"
              aria-pressed={category.id === activeCategory}
              onClick={() => setActiveCategory(category.id)}
            >
              <span aria-hidden="true">{categoryIcons[category.id]}</span>
              {category.name}
            </button>
          ))}
        </nav>
        <div className="toolbar">
          <input
            aria-label="Search checklist"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this checklist"
          />
          <select
            aria-label="Filter checklist"
            value={filter}
            disabled={packingMode}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            <option value="all">All items</option>
            <option value="remaining">Remaining</option>
            <option value="need-to-buy">Need to buy — all tabs</option>
            <option value="packed">Packed</option>
          </select>
        </div>
        <p className="status-key">
          <span className="packed">Green: packed</span>
          <span className="need-to-buy">Red: buy</span>
          <span className="not-packed">Yellow: pack</span>
          <span className="not-needed">Gray: skip</span>
        </p>
        {busy ? (
          <p className="empty-state">Loading your checklist…</p>
        ) : visibleItems.length ? (
          <div className="section-list">
            {itemSections.map(([section, sectionItems]) => (
              <ChecklistSection
                key={section}
                section={section}
                items={sectionItems}
                profiles={profiles}
                onSave={saveItem}
                onEdit={setEditingItem}
                onPromote={promoteTripItem}
              />
            ))}
          </div>
        ) : (
          <p className="empty-state">Nothing matches this view.</p>
        )}
      </section>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {showCustom && (
        <Dialog title="Add a new item" onClose={() => setShowCustom(false)}>
          <form onSubmit={addItem}>
            <label>
              Item name
              <input name="item" autoFocus required />
            </label>
            <div className="field-row">
              <label>
                Category
                <select name="category" defaultValue="extras">
                  {Object.entries(categoryNames).map(([id, name]) => (
                    <option value={id} key={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section
                <input name="section" defaultValue="Custom items" />
              </label>
            </div>
            <button className="primary-action" type="submit">
              Add to checklist
            </button>
          </form>
        </Dialog>
      )}
      {editingItem && (
        <EditTripItemDialog
          item={editingItem}
          profiles={profiles.filter((profile) =>
            trip.participantIds?.includes(profile.id),
          )}
          onClose={() => setEditingItem(undefined)}
          onSave={saveItem}
        />
      )}
      {editingTrip && (
        <TripDialog
          title="Edit trip"
          trip={trip}
          profiles={profiles}
          onClose={() => setEditingTrip(false)}
          onSubmit={saveTrip}
        />
      )}
    </main>
  );
}

function ChecklistSection({
  section,
  items,
  profiles,
  onSave,
  onEdit,
  onPromote,
}: {
  section: string;
  items: TripItem[];
  profiles: UserProfile[];
  onSave: (
    id: string,
    changes: Partial<Pick<TripItem, "quantity" | "status" | "assigneeId">>,
  ) => Promise<void>;
  onEdit: (item: TripItem) => void;
  onPromote: (item: TripItem) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(true);
  const applicable = items.filter((item) => item.status !== "not-needed");
  return (
    <section aria-label={section}>
      <button
        className="item-section-heading"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{section}</span>
        <small>
          {items.filter((item) => item.status === "packed").length}/
          {applicable.length} packed · {open ? "Hide" : "Show"}
        </small>
      </button>
      {open && (
        <ul className="item-list">
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              profiles={profiles}
              onSave={onSave}
              onEdit={onEdit}
              onPromote={onPromote}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
function ChecklistRow({
  item,
  profiles,
  onSave,
  onEdit,
  onPromote,
}: {
  item: TripItem;
  profiles: UserProfile[];
  onSave: (
    id: string,
    changes: Partial<Pick<TripItem, "quantity" | "status" | "assigneeId">>,
  ) => Promise<void>;
  onEdit: (item: TripItem) => void;
  onPromote: (item: TripItem) => Promise<unknown>;
}) {
  const states: Array<[TripItemStatus, string, string]> = [
    ["packed", "Packed", "✓"],
    ["need-to-buy", "Need to buy", "!"],
    ["not-packed", "To pack", "•"],
    ["not-needed", "Not needed", "–"],
  ];
  const assignee = profiles.find((profile) => profile.id === item.assigneeId);
  return (
    <li className={`check-item ${item.status}`}>
      <div
        className="status-controls"
        role="group"
        aria-label={`${item.name} status`}
      >
        {states.map(([status, label, icon]) => (
          <button
            className={
              item.status === status
                ? `status-button ${status} active`
                : `status-button ${status}`
            }
            key={status}
            type="button"
            aria-pressed={item.status === status}
            aria-label={label}
            title={label}
            onClick={() => void onSave(item.id, { status })}
          >
            {icon}
          </button>
        ))}
      </div>
      <div>
        <strong>{item.name}</strong>
        <small>
          {assignee
            ? `For ${assignee.name}`
            : item.custom
              ? "Custom item"
              : item.unit}
        </small>
      </div>
      <div className="stepper">
        <button
          aria-label={`Decrease ${item.name} quantity`}
          type="button"
          onClick={() => void onSave(item.id, { quantity: item.quantity - 1 })}
        >
          −
        </button>
        <span>{item.quantity}</span>
        <button
          aria-label={`Increase ${item.name} quantity`}
          type="button"
          onClick={() => void onSave(item.id, { quantity: item.quantity + 1 })}
        >
          +
        </button>
      </div>
      <button className="promote" type="button" onClick={() => onEdit(item)}>
        Edit
      </button>
      {item.custom && (
        <button
          className="promote"
          type="button"
          onClick={() => void onPromote(item)}
        >
          Promote
        </button>
      )}
    </li>
  );
}
function EditTripItemDialog({
  item,
  profiles,
  onClose,
  onSave,
}: {
  item: TripItem;
  profiles: UserProfile[];
  onClose: () => void;
  onSave: (
    id: string,
    changes: Partial<
      Pick<
        TripItem,
        | "name"
        | "category"
        | "section"
        | "quantity"
        | "unit"
        | "status"
        | "notes"
        | "assigneeId"
      >
    >,
  ) => Promise<void>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const assigneeId = String(values.get("assignee") ?? "");
    await onSave(item.id, {
      name: String(values.get("name") ?? "").trim() || item.name,
      category: String(values.get("category")) as ChecklistCategory,
      section: String(values.get("section") ?? "").trim() || item.section,
      quantity: Math.max(0, Number(values.get("quantity")) || 0),
      unit: String(values.get("unit") ?? "").trim() || item.unit,
      status: String(values.get("status")) as TripItemStatus,
      notes: String(values.get("notes") ?? "").trim(),
      assigneeId: assigneeId || undefined,
    });
    onClose();
  }
  return (
    <Dialog title={`Edit ${item.name}`} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Name
          <input name="name" defaultValue={item.name} required />
        </label>
        <div className="field-row">
          <label>
            Category
            <select name="category" defaultValue={item.category}>
              {Object.entries(categoryNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <input name="section" defaultValue={item.section} />
          </label>
        </div>
        <div className="field-row">
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min="0"
              defaultValue={item.quantity}
            />
          </label>
          <label>
            Unit
            <input name="unit" defaultValue={item.unit} />
          </label>
        </div>
        <fieldset className="choice-set">
          <legend>Status</legend>
          {statusChoices.map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="status"
                value={value}
                defaultChecked={item.status === value}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {profiles.length > 0 && (
          <fieldset className="choice-set">
            <legend>Who has this?</legend>
            <label>
              <input
                type="radio"
                name="assignee"
                value=""
                defaultChecked={!item.assigneeId}
              />
              Shared / anyone
            </label>
            {profiles.map((profile) => (
              <label key={profile.id}>
                <input
                  type="radio"
                  name="assignee"
                  value={profile.id}
                  defaultChecked={item.assigneeId === profile.id}
                />
                {profile.name}
              </label>
            ))}
          </fieldset>
        )}
        <label>
          Notes
          <textarea name="notes" defaultValue={item.notes} rows={3} />
        </label>
        <button className="primary-action" type="submit">
          Save changes
        </button>
      </form>
    </Dialog>
  );
}

function Home({
  seedCount,
  trips,
  busy,
  error,
  onNew,
  onOpen,
  onInventory,
  onDataTools,
  onProfiles,
  onImport,
  profiles,
  showNew,
  onCreate,
  onDismiss,
}: {
  seedCount: number;
  trips: Trip[];
  busy: boolean;
  error: string;
  onNew: () => void;
  onOpen: (trip: Trip) => void;
  onInventory: () => void;
  onDataTools: () => void;
  onProfiles: () => void;
  onImport: (file?: File) => Promise<void>;
  profiles: UserProfile[];
  showNew: boolean;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onDismiss: () => void;
}) {
  const [sort, setSort] = useState<"recent" | "name" | "date">("recent");
  const shown = [...trips].sort((left, right) =>
    sort === "name"
      ? left.name.localeCompare(right.name)
      : sort === "date"
        ? (left.startDate ?? "9999").localeCompare(right.startDate ?? "9999")
        : right.updatedAt.localeCompare(left.updatedAt),
  );
  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            ▲
          </div>
          <div>
            <p className="eyebrow">LOCAL-FIRST CAMPING</p>
            <h1>Pack well. Wander far.</h1>
          </div>
        </div>
        <p className="hero-copy">
          A reusable packing list that works even when the signal doesn’t.
        </p>
        <button className="primary-action" type="button" onClick={onNew}>
          Start a new trip
        </button>
      </header>
      <section className="inventory-card" aria-labelledby="trips-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR TRIPS</p>
            <h2 id="trips-heading">
              {trips.length
                ? "Pick up where you left off"
                : "Your next trip starts here"}
            </h2>
          </div>
          <span className="seed-badge">{seedCount} essentials ready</span>
        </div>
        {trips.length > 1 && (
          <label className="sort-control">
            Sort trips
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "recent" | "name" | "date")
              }
            >
              <option value="recent">Recently edited</option>
              <option value="date">Trip date</option>
              <option value="name">Name</option>
            </select>
          </label>
        )}
        {busy ? (
          <p className="empty-state">Preparing local storage…</p>
        ) : trips.length ? (
          <ul className="trip-list">
            {shown.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => void onOpen(entry)}>
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.destination || "No destination"} ·{" "}
                    {entry.camperCount} camper
                    {entry.camperCount === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            Create a trip to generate your checklist from the master inventory.
          </p>
        )}
        <div className="data-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={onProfiles}
          >
            People & profiles
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={onInventory}
          >
            Manage master inventory
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={onDataTools}
          >
            Backup & restore
          </button>
          <label className="secondary-action">
            Import shared trip
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) =>
                void onImport(event.currentTarget.files?.[0])
              }
            />
          </label>
        </div>
      </section>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {showNew && (
        <TripDialog
          title="New camping trip"
          profiles={profiles}
          onSubmit={onCreate}
          onClose={onDismiss}
        />
      )}
    </main>
  );
}
function ProfilesScreen({
  profiles,
  onBack,
  onSaved,
}: {
  profiles: UserProfile[];
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const [editor, setEditor] = useState<UserProfile>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    await saveProfile({
      ...(editor?.id ? { id: editor.id, createdAt: editor.createdAt } : {}),
      name,
      personalItems: parsePersonalItems(
        String(form.get("personalItems") ?? ""),
      ),
    });
    await onSaved();
    setEditor(undefined);
  }
  return (
    <main className="app-shell">
      <header className="trip-header">
        <button className="text-button" type="button" onClick={onBack}>
          ← All trips
        </button>
        <p className="eyebrow">NO PASSWORDS</p>
        <h1>People & profiles</h1>
        <p className="trip-destination">
          Save individual essentials such as meds, drinks, a pillow, or a
          headlamp.
        </p>
      </header>
      <section className="inventory-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{profiles.length} PROFILES</p>
            <h2>Personal lists</h2>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() =>
              setEditor({
                id: "",
                name: "",
                personalItems: [],
                createdAt: "",
                updatedAt: "",
              })
            }
          >
            + Add person
          </button>
        </div>
        {profiles.length ? (
          <ul className="item-list">
            {profiles.map((profile) => (
              <li className="inventory-item" key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <small>
                    {profile.personalItems.length
                      ? profile.personalItems
                          .map((item) => item.name)
                          .join(", ")
                      : "No personal items yet"}
                  </small>
                </div>
                <button
                  className="promote"
                  type="button"
                  onClick={() => setEditor(profile)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            Add each person once. Choose them on a trip to add their personal
            list.
          </p>
        )}
      </section>
      {editor && (
        <Dialog
          title={editor.id ? "Edit profile" : "Add profile"}
          onClose={() => setEditor(undefined)}
        >
          <form onSubmit={(event) => void submit(event)}>
            <label>
              Name
              <input
                name="name"
                defaultValue={editor.name}
                autoFocus
                required
              />
            </label>
            <label>
              Personal items{" "}
              <small>One per line. Optional: Item | category | section</small>
              <textarea
                name="personalItems"
                rows={7}
                defaultValue={personalItemsText(editor.personalItems)}
                placeholder={
                  "Personal meds | hygiene-first-aid | Personal\nFavorite drinks | food | Drinks\nPillow | gear | Shelter & Sleep"
                }
              />
            </label>
            <button className="primary-action" type="submit">
              Save profile
            </button>
          </form>
        </Dialog>
      )}
    </main>
  );
}
function TripDialog({
  title,
  trip,
  profiles,
  onSubmit,
  onClose,
}: {
  title: string;
  trip?: Trip;
  profiles: UserProfile[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label>
          Trip name
          <input
            name="name"
            autoFocus
            required
            defaultValue={trip?.name}
            placeholder="Redwoods weekend"
          />
        </label>
        <label>
          Destination
          <input
            name="destination"
            defaultValue={trip?.destination}
            placeholder="Where are you going?"
          />
        </label>
        <label>
          Address / campsite
          <input
            name="address"
            defaultValue={trip?.address}
            placeholder="Campsite address or reservation details"
          />
        </label>
        <div className="field-row">
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={trip?.startDate}
            />
          </label>
          <label>
            End date
            <input name="endDate" type="date" defaultValue={trip?.endDate} />
          </label>
        </div>
        <label>
          Campers
          <input
            name="campers"
            type="number"
            min="1"
            defaultValue={trip?.camperCount ?? 1}
          />
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            rows={3}
            defaultValue={trip?.notes}
            placeholder="Reservation, campsite, or meal notes"
          />
        </label>
        {profiles.length > 0 && (
          <fieldset className="choice-set">
            <legend>Who is going?</legend>
            {profiles.map((profile) => (
              <label key={profile.id}>
                <input
                  type="checkbox"
                  name="participants"
                  value={profile.id}
                  defaultChecked={trip?.participantIds?.includes(profile.id)}
                />
                {profile.name}
              </label>
            ))}
          </fieldset>
        )}
        {!trip && (
          <fieldset className="level-picker">
            <legend>Camping level</legend>
            <p>
              Choose the setup closest to your trip. You can still adjust any
              generated item.
            </p>
            {(
              Object.entries(levelDetails) as [
                CampingLevel,
                (typeof levelDetails)[CampingLevel],
              ][]
            ).map(([level, details]) => (
              <label className="level-option" key={level}>
                <input
                  name="setupLevel"
                  type="radio"
                  value={level}
                  defaultChecked={level === "tent"}
                />
                <span>
                  <strong>{details.label}</strong>
                  <small>{details.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {!trip && (
          <details className="category-guide">
            <summary>Where do items belong?</summary>
            <ul>
              <li>
                <strong>Food:</strong> meals, drinks, snacks, and condiments.
              </li>
              <li>
                <strong>Gear:</strong> shelter, sleeping, kitchen, tools, power,
                and vehicle supplies.
              </li>
              <li>
                <strong>Clothes:</strong> layers, rainwear, footwear, and
                accessories.
              </li>
              <li>
                <strong>Hygiene & First Aid:</strong> toiletries, sun and bug
                care, and first aid.
              </li>
              <li>
                <strong>Extras:</strong> campsite, family, pet, or activity
                items.
              </li>
            </ul>
          </details>
        )}
        <button className="primary-action" type="submit">
          {trip ? "Save trip" : "Create checklist"}
        </button>
      </form>
    </Dialog>
  );
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button
            className="text-button"
            aria-label="Close dialog"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
const statusChoices: Array<[TripItemStatus, string]> = [
  ["not-packed", "To pack"],
  ["packed", "Packed"],
  ["need-to-buy", "Need to buy"],
  ["not-needed", "Not needed"],
];
function tripFields(
  values: FormData,
): Partial<
  Pick<Trip, "destination" | "address" | "startDate" | "endDate" | "notes">
> {
  return Object.fromEntries(
    ["destination", "address", "startDate", "endDate", "notes"]
      .map((key) => [key, String(values.get(key) ?? "").trim()])
      .filter(([, value]) => value),
  ) as Partial<
    Pick<Trip, "destination" | "address" | "startDate" | "endDate" | "notes">
  >;
}
function parsePersonalItems(text: string): PersonalItemTemplate[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        name = "",
        category = "hygiene-first-aid",
        section = "Personal items",
      ] = line.split("|").map((entry) => entry.trim());
      return {
        name,
        category: isCategory(category) ? category : "extras",
        section: section || "Personal items",
        quantity: 1,
        unit: "item",
      };
    });
}
function personalItemsText(items: PersonalItemTemplate[]): string {
  return items
    .map((item) => `${item.name} | ${item.category} | ${item.section}`)
    .join("\n");
}
function isCategory(value: string): value is ChecklistCategory {
  return value in categoryNames;
}
function slug(value: string): string {
  return (
    value
      .replaceAll(/[^a-z0-9]+/gi, "-")
      .replaceAll(/^-|-$/g, "")
      .toLowerCase() || "trip"
  );
}
function groupItemsBySection(items: TripItem[]): Array<[string, TripItem[]]> {
  const sections = new Map<string, TripItem[]>();
  for (const item of items)
    sections.set(item.section, [...(sections.get(item.section) ?? []), item]);
  return [...sections.entries()];
}
