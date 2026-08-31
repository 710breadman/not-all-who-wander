import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  downloadText,
  readSharedTripFile,
  tripItemsToCsv,
  tripToShareFile,
} from "./application/backupService";
import {
  addCustomTripItem,
  addPersonalItemToProfile,
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
type ChecklistTab = ChecklistCategory | "personal";

export default function App() {
  const seed = useMemo(() => loadChecklistSeed(), []);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [trip, setTrip] = useState<Trip>();
  const [items, setItems] = useState<TripItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ChecklistTab>("food");
  const [activeProfileId, setActiveProfileId] = useState<string>();
  const [showProfileSwitch, setShowProfileSwitch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [visibleStatuses, setVisibleStatuses] = useState<
    Record<TripItemStatus, boolean>
  >({
    "not-packed": true,
    packed: true,
    "need-to-buy": true,
    "not-needed": true,
  });
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
        ...(activeProfileId ? { ownerProfileId: activeProfileId } : {}),
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
      String(form.get("personalProfile") ?? "") || undefined,
    );
    const personalProfile = String(form.get("personalProfile") ?? "");
    if (personalProfile)
      await addPersonalItemToProfile(personalProfile, {
        name,
        category: item.category,
        section: item.section,
        quantity: item.quantity,
        unit: item.unit,
      });
    if (personalProfile) await refreshProfiles();
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
  async function emailItinerary() {
    if (!trip) return;
    const people =
      profiles
        .filter((profile) => trip.participantIds?.includes(profile.id))
        .map((profile) => profile.name)
        .join(", ") || "Not specified";
    const itinerary = [
      `Camping itinerary: ${trip.name}`,
      `Dates: ${trip.startDate || "Not set"} to ${trip.endDate || "Not set"}`,
      `Location: ${[trip.destination, trip.address].filter(Boolean).join(" — ") || "Not set"}`,
      `Who is going: ${people}`,
      trip.notes ? `Notes: ${trip.notes}` : "",
      "\nShared for trip safety and planning.",
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(`Camping itinerary — ${trip.name}`)}&body=${encodeURIComponent(itinerary)}`;
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
        activeProfile={profiles.find(
          (profile) => profile.id === activeProfileId,
        )}
        onSwitchProfile={() => setShowProfileSwitch(true)}
        menuOpen={showMenu}
        onToggleMenu={() => setShowMenu((value) => !value)}
        showNew={showNewTrip}
        onCreate={create}
        onDismiss={() => setShowNewTrip(false)}
      />
    );

  const effectiveFilter = packingMode ? "remaining" : filter;
  const visibleItems = items.filter(
    (item) =>
      (filter === "need-to-buy" ||
        (activeCategory === "personal"
          ? activeProfileId
            ? item.assigneeId === activeProfileId
            : item.assigneeId !== undefined
          : item.category === activeCategory)) &&
      visibleStatuses[item.status] &&
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
              onClick={() => setShowShare(true)}
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
          <button
            className={
              activeCategory === "personal"
                ? "category-tab active"
                : "category-tab"
            }
            type="button"
            aria-pressed={activeCategory === "personal"}
            title="View personal items assigned to individual campers"
            onClick={() => setActiveCategory("personal")}
          >
            <span aria-hidden="true">◎</span>Personal
          </button>
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
          {statusChoices.map(([status, label]) => (
            <button
              key={status}
              type="button"
              title={`Show or hide ${label.toLocaleLowerCase()} items`}
              className={`${status} ${visibleStatuses[status] ? "active" : ""}`}
              aria-pressed={visibleStatuses[status]}
              onClick={() =>
                setVisibleStatuses((current) => ({
                  ...current,
                  [status]: !current[status],
                }))
              }
            >
              {statusColor(status)}: {label}
            </button>
          ))}
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
            {profiles.length > 0 && (
              <fieldset className="choice-set">
                <legend>Personal item?</legend>
                <p className="empty-state">
                  Choose a person to also save this item to their Personal tab.
                  Its packed state stays linked on this trip.
                </p>
                <label>
                  Who is this for?
                  <select name="personalProfile" defaultValue="">
                    <option value="">No — shared trip item</option>
                    {profiles
                      .filter((profile) =>
                        trip.participantIds?.includes(profile.id),
                      )
                      .map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                  </select>
                </label>
              </fieldset>
            )}
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
      {showProfileSwitch && (
        <ProfileSwitchDialog
          profiles={profiles}
          activeProfileId={activeProfileId}
          onClose={() => setShowProfileSwitch(false)}
          onSelect={setActiveProfileId}
        />
      )}
      {showShare && (
        <ShareDialog
          trip={trip}
          onClose={() => setShowShare(false)}
          onShare={shareTrip}
          onEmail={emailItinerary}
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
  activeProfile,
  onSwitchProfile,
  menuOpen,
  onToggleMenu,
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
  activeProfile?: UserProfile | undefined;
  onSwitchProfile: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  showNew: boolean;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onDismiss: () => void;
}) {
  const [sort, setSort] = useState<"recent" | "name" | "date">("recent");
  const shown = trips
    .filter(
      (trip) =>
        !activeProfile ||
        !trip.ownerProfileId ||
        trip.ownerProfileId === activeProfile.id,
    )
    .sort((left, right) =>
      sort === "name"
        ? left.name.localeCompare(right.name)
        : sort === "date"
          ? (left.startDate ?? "9999").localeCompare(right.startDate ?? "9999")
          : right.updatedAt.localeCompare(left.updatedAt),
    );
  return (
    <main className="app-shell">
      <header className="hero">
        <button
          className="hero-menu"
          type="button"
          title="Open settings, inventory, backup, and shared-trip tools"
          aria-label="Open menu"
          onClick={onToggleMenu}
        >
          ☰
        </button>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            ↟
          </div>
          <div>
            <p className="eyebrow">FOR THE ROAD AHEAD</p>
            <h1>Not all who wander pack light.</h1>
          </div>
        </div>
        <p className="hero-copy">
          A calmer way to remember meals, miles, and a well-made camp.
        </p>
        <div className="hero-actions">
          <button
            className="primary-action"
            type="button"
            title="Create a new camping checklist"
            onClick={onNew}
          >
            Start a new trip
          </button>
        </div>
        {menuOpen && (
          <nav className="burger-menu" aria-label="App menu">
            <button type="button" title="Sign in, switch profiles, and view that person's trips and personal list" onClick={onSwitchProfile}>
              {activeProfile ? `Switch profile (${activeProfile.name})` : "Sign in / switch profile"}
            </button>
            <button type="button" onClick={onProfiles}>
              Profile settings
            </button>
            <button type="button" onClick={onInventory}>
              Manage master inventory
            </button>
            <button type="button" onClick={onDataTools}>
              Backup & restore
            </button>
            <label>
              Import shared trip
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  void onImport(event.currentTarget.files?.[0])
                }
              />
            </label>
          </nav>
        )}
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
  const [personalItem, setPersonalItem] = useState<PersonalItemTemplate>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    await saveProfile({
      ...(editor?.id ? { id: editor.id, createdAt: editor.createdAt } : {}),
      name,
      ...(String(form.get("email") ?? "").trim()
        ? { email: String(form.get("email")).trim() }
        : {}),
      ...(String(form.get("password") ?? "")
        ? { passwordHash: await hashText(String(form.get("password"))) }
        : editor?.passwordHash
          ? { passwordHash: editor.passwordHash }
          : {}),
      personalItems: editor?.personalItems ?? [],
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
        <h1>People & profiles</h1>
        <p className="trip-destination">
          Save individual essentials such as meds, drinks, a pillow, or a
          headlamp.
        </p>
      </header>
      <section className="inventory-card">
        <div className="section-heading">
          <div>
            <h2>Profiles</h2>
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
              Username
              <input
                name="name"
                defaultValue={editor.name}
                autoFocus
                required
              />
            </label>
            <label>
              Email <small>(optional)</small>
              <input
                name="email"
                type="email"
                defaultValue={editor.email}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password{" "}
              <small>
                {editor.passwordHash
                  ? "Leave blank to keep the current password."
                  : "Optional local password for switching profiles."}
              </small>
              <input name="password" type="password" minLength={4} />
            </label>
            <div className="section-heading">
              <strong>Personal checklist</strong>
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  setPersonalItem({
                    name: "",
                    category: "hygiene-first-aid",
                    section: "Personal items",
                    quantity: 1,
                    unit: "item",
                  })
                }
              >
                + Add item
              </button>
            </div>
            {editor.personalItems.length ? (
              <ul className="item-list">
                {editor.personalItems.map((item, index) => (
                  <li className="inventory-item" key={`${item.name}-${index}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {categoryNames[item.category]} · {item.section}
                      </small>
                    </div>
                    <button
                      className="promote danger"
                      type="button"
                      onClick={() =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                personalItems: current.personalItems.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              }
                            : current,
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Add meds, drinks, pillows, or other individual essentials.
              </p>
            )}
            <button className="primary-action" type="submit">
              Save profile
            </button>
          </form>
        </Dialog>
      )}
      {personalItem && (
        <PersonalItemDialog
          item={personalItem}
          onClose={() => setPersonalItem(undefined)}
          onAdd={(item) => {
            setEditor((current) =>
              current
                ? {
                    ...current,
                    personalItems: [...current.personalItems, item],
                  }
                : current,
            );
            setPersonalItem(undefined);
          }}
        />
      )}
    </main>
  );
}
function PersonalItemDialog({
  item,
  onClose,
  onAdd,
}: {
  item: PersonalItemTemplate;
  onClose: () => void;
  onAdd: (item: PersonalItemTemplate) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    onAdd({
      name,
      category: String(form.get("category")) as ChecklistCategory,
      section:
        String(form.get("section") ?? "Personal items").trim() ||
        "Personal items",
      quantity: 1,
      unit: "item",
    });
  }
  return (
    <Dialog title="Add personal item" onClose={onClose}>
      <form onSubmit={submit}>
        <label>
          Item name
          <input name="name" defaultValue={item.name} autoFocus required />
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
        <button className="primary-action" type="submit">
          Add to personal list
        </button>
      </form>
    </Dialog>
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

function ProfileSwitchDialog({
  profiles,
  activeProfileId,
  onClose,
  onSelect,
}: {
  profiles: UserProfile[];
  activeProfileId?: string | undefined;
  onClose: () => void;
  onSelect: (id: string | undefined) => void;
}) {
  const [selected, setSelected] = useState<UserProfile>();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function signIn() {
    if (!selected) return;
    if (
      selected.passwordHash &&
      selected.passwordHash !== (await hashText(password))
    ) {
      setMessage("That password does not match this local profile.");
      return;
    }
    onSelect(selected.id);
    onClose();
  }
  return (
    <Dialog title="Sign in or switch profile" onClose={onClose}>
      <p className="empty-state">
        Profiles stay on this device. Choose one to show their trips and
        personal checklist.
      </p>
      <div className="profile-switcher">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={selected?.id === profile.id ? "active" : ""}
            onClick={() => {
              setSelected(profile);
              setMessage("");
            }}
          >
            {profile.name}
            {profile.email ? <small>{profile.email}</small> : null}
          </button>
        ))}
      </div>
      {selected && (
        <>
          <label>
            Password{" "}
            {selected.passwordHash ? (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
            ) : (
              <small>This profile has no password yet.</small>
            )}
          </label>
          <button
            className="primary-action"
            type="button"
            onClick={() => void signIn()}
          >
            Continue as {selected.name}
          </button>
        </>
      )}
      {activeProfileId && (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            onSelect(undefined);
            onClose();
          }}
        >
          View shared trips
        </button>
      )}
      {message && <p className="error-message">{message}</p>}
    </Dialog>
  );
}

function ShareDialog({
  trip,
  onClose,
  onShare,
  onEmail,
}: {
  trip: Trip;
  onClose: () => void;
  onShare: () => Promise<void>;
  onEmail: () => Promise<void>;
}) {
  return (
    <Dialog title={`Share ${trip.name}`} onClose={onClose}>
      <p className="empty-state">
        Send the base checklist as an importable file to another app user, or
        open your email app with a safety itinerary.
      </p>
      <button
        className="primary-action"
        type="button"
        title="Downloads or opens the system share sheet with the complete checklist"
        onClick={() => void onShare()}
      >
        Share packing list
      </button>
      <button
        className="secondary-action"
        type="button"
        title="Creates an email with dates, location, attendees, and notes"
        onClick={() => void onEmail()}
      >
        Email safety itinerary
      </button>
    </Dialog>
  );
}
const statusChoices: Array<[TripItemStatus, string]> = [
  ["not-packed", "To pack"],
  ["packed", "Packed"],
  ["need-to-buy", "Need to buy"],
  ["not-needed", "Not needed"],
];
function statusColor(status: TripItemStatus): string {
  return {
    packed: "Green",
    "need-to-buy": "Red",
    "not-packed": "Yellow",
    "not-needed": "Gray",
  }[status];
}
async function hashText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
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
