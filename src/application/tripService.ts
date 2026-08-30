import type {
  CampingLevel,
  ChecklistCategory,
  MasterItem,
  PersonalItemTemplate,
  Trip,
  TripItem,
  TripItemStatus,
  TripStyle,
  UserProfile,
} from "../domain/models";
import { openCampingDatabase } from "../data/database";
import {
  MasterItemRepository,
  TripItemRepository,
  TripRepository,
  UserProfileRepository,
} from "../data/repositories";
import type { SharedTripPackage } from "./backupService";

export type NewTrip = {
  name: string;
  destination?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  camperCount: number;
  style: TripStyle;
  setupLevel?: CampingLevel;
  notes?: string;
  participantIds?: string[];
};

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export async function createTrip(input: NewTrip): Promise<Trip> {
  const database = await openCampingDatabase();
  try {
    const now = new Date().toISOString();
    const trip: Trip = {
      id: id("trip"),
      ...input,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    const masters = await new MasterItemRepository(database).list();
    const items = masters
      .filter((item) => item.tripStyles.includes(input.style))
      .map((item, index) => snapshot(item, trip, index));
    const profiles = await new UserProfileRepository(database).list();
    const people = profiles.filter((profile) =>
      input.participantIds?.includes(profile.id),
    );
    const personalItems = people
      .flatMap((profile) =>
        profile.personalItems.map((item) => ({ item, profile })),
      )
      .map(({ item, profile }, index) =>
        snapshotPersonalItem(item, trip, profile, items.length + index),
      );
    const trips = new TripRepository(database);
    await trips.save(trip);
    await new TripItemRepository(database).saveMany([
      ...items,
      ...personalItems,
    ]);
    return trip;
  } finally {
    database.close();
  }
}

export async function listTrips(): Promise<Trip[]> {
  const database = await openCampingDatabase();
  try {
    return await new TripRepository(database).list();
  } finally {
    database.close();
  }
}

export async function listTripItems(tripId: string): Promise<TripItem[]> {
  const database = await openCampingDatabase();
  try {
    return await new TripItemRepository(database).listByTrip(tripId);
  } finally {
    database.close();
  }
}

export async function updateTrip(
  id: string,
  changes: Partial<
    Pick<
      Trip,
      | "name"
      | "destination"
      | "address"
      | "startDate"
      | "endDate"
      | "camperCount"
      | "notes"
      | "participantIds"
    >
  >,
): Promise<Trip | undefined> {
  const database = await openCampingDatabase();
  try {
    const repository = new TripRepository(database);
    const current = await repository.get(id);
    if (!current) return undefined;
    const next = {
      ...current,
      ...changes,
      camperCount: Math.max(1, changes.camperCount ?? current.camperCount),
      updatedAt: new Date().toISOString(),
    };
    await repository.save(next);
    return next;
  } finally {
    database.close();
  }
}

export async function listProfiles(): Promise<UserProfile[]> {
  const database = await openCampingDatabase();
  try {
    return await new UserProfileRepository(database).list();
  } finally {
    database.close();
  }
}

export async function saveProfile(
  input: Omit<UserProfile, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<UserProfile, "id" | "createdAt">>,
): Promise<UserProfile> {
  const database = await openCampingDatabase();
  try {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      ...input,
      id: input.id ?? id("profile"),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };
    await new UserProfileRepository(database).save(profile);
    return profile;
  } finally {
    database.close();
  }
}

export async function importSharedTrip(
  shared: SharedTripPackage,
): Promise<Trip> {
  const database = await openCampingDatabase();
  try {
    const now = new Date().toISOString();
    const profileRepository = new UserProfileRepository(database);
    const existingProfiles = await profileRepository.list();
    for (const profile of shared.profiles) {
      if (!existingProfiles.some((entry) => entry.id === profile.id))
        await profileRepository.save(profile);
    }
    const trip: Trip = {
      ...shared.trip,
      id: id("trip"),
      name: `${shared.trip.name} (shared)`,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    const items = shared.items.map((item, index) => ({
      ...item,
      id: id("trip-item"),
      tripId: trip.id,
      sortOrder: index,
    }));
    await new TripRepository(database).save(trip);
    await new TripItemRepository(database).saveMany(items);
    return trip;
  } finally {
    database.close();
  }
}

export async function updateTripItem(
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
): Promise<TripItem | undefined> {
  const database = await openCampingDatabase();
  try {
    const repository = new TripItemRepository(database);
    const current = await repository.get(id);
    if (!current) return undefined;
    const next = {
      ...current,
      ...changes,
      quantity: Math.max(0, changes.quantity ?? current.quantity),
    };
    await repository.save(next);
    return next;
  } finally {
    database.close();
  }
}

export async function addCustomTripItem(
  tripId: string,
  name: string,
  category: ChecklistCategory = "extras",
  section = "Custom items",
): Promise<TripItem> {
  const database = await openCampingDatabase();
  try {
    const repository = new TripItemRepository(database);
    const existing = await repository.listByTrip(tripId);
    const item: TripItem = {
      id: id("trip-item"),
      tripId,
      name: name.trim(),
      category,
      section: section.trim() || "Custom items",
      quantity: 1,
      unit: "item",
      status: "not-packed",
      tags: [],
      custom: true,
      sortOrder: Math.max(-1, ...existing.map((entry) => entry.sortOrder)) + 1,
    };
    await repository.save(item);
    return item;
  } finally {
    database.close();
  }
}

export async function addParticipantItems(
  tripId: string,
  profileIds: string[],
): Promise<TripItem[]> {
  const database = await openCampingDatabase();
  try {
    const items = new TripItemRepository(database);
    const existing = await items.listByTrip(tripId);
    const profiles = (await new UserProfileRepository(database).list()).filter(
      (profile) => profileIds.includes(profile.id),
    );
    const additions = profiles
      .flatMap((profile) =>
        profile.personalItems.map((template) => ({ profile, template })),
      )
      .filter(
        ({ profile, template }) =>
          !existing.some(
            (item) =>
              item.assigneeId === profile.id &&
              item.name.trim().toLocaleLowerCase() ===
                template.name.trim().toLocaleLowerCase(),
          ),
      )
      .map(({ profile, template }, index) =>
        snapshotPersonalItem(
          template,
          tripId,
          profile,
          existing.length + index,
        ),
      );
    await items.saveMany(additions);
    return additions;
  } finally {
    database.close();
  }
}

export async function promoteTripItem(item: TripItem): Promise<MasterItem> {
  const database = await openCampingDatabase();
  try {
    const masters = new MasterItemRepository(database);
    const existing = await masters.list();
    const normalized = item.name.trim().toLocaleLowerCase();
    const duplicate = existing.find(
      (entry) => entry.name.trim().toLocaleLowerCase() === normalized,
    );
    if (duplicate) return duplicate;
    const master: MasterItem = {
      id: id("user"),
      name: item.name,
      category: item.category,
      section: item.section,
      defaultQuantity: item.quantity,
      unit: item.unit,
      tripStyles: ["car", "light-backpacking", "custom"],
      tags: item.tags,
      archived: false,
      source: "user",
    };
    await masters.save(master);
    return master;
  } finally {
    database.close();
  }
}

function snapshot(master: MasterItem, trip: Trip, sortOrder: number): TripItem {
  return {
    id: id("trip-item"),
    tripId: trip.id,
    masterItemId: master.id,
    name: master.name,
    category: master.category,
    section: master.section,
    quantity: calculateTripQuantity(master, trip),
    unit: master.unit,
    status: "not-packed",
    ...(master.notes === undefined ? {} : { notes: master.notes }),
    tags: [...master.tags],
    custom: false,
    sortOrder,
  };
}

function snapshotPersonalItem(
  item: PersonalItemTemplate,
  trip: Pick<Trip, "id"> | string,
  profile: UserProfile,
  sortOrder: number,
): TripItem {
  const tripId = typeof trip === "string" ? trip : trip.id;
  return {
    id: id("trip-item"),
    tripId,
    name: item.name,
    category: item.category,
    section: item.section,
    quantity: item.quantity,
    unit: item.unit,
    status: "not-packed",
    tags: ["personal"],
    custom: true,
    assigneeId: profile.id,
    sortOrder,
  };
}

export function calculateTripQuantity(
  master: MasterItem,
  trip: Pick<Trip, "camperCount" | "startDate" | "endDate">,
): number {
  const rule = master.quantityRule;
  if (!rule) return master.defaultQuantity;
  const nights = tripNights(trip.startDate, trip.endDate);
  if (rule.kind === "fixed") return rule.amount;
  if (rule.kind === "per-person") return rule.amount * trip.camperCount;
  if (rule.kind === "per-day") return rule.amount * nights;
  return rule.amount * trip.camperCount * nights;
}

function tripNights(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 1;
  const elapsed =
    Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Number.isFinite(elapsed)
    ? Math.max(1, Math.round(elapsed / 86_400_000))
    : 1;
}

export function isMatchingItem(
  item: TripItem,
  search: string,
  status: "all" | TripItemStatus | "remaining",
): boolean {
  const term = search.trim().toLocaleLowerCase();
  const matchesSearch =
    !term ||
    [item.name, item.section, ...item.tags].some((value) =>
      value.toLocaleLowerCase().includes(term),
    );
  const matchesStatus =
    status === "all" ||
    (status === "remaining"
      ? item.status !== "packed" && item.status !== "not-needed"
      : item.status === status);
  return matchesSearch && matchesStatus;
}
