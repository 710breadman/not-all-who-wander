export const checklistCategories = [
  "food",
  "gear",
  "clothes",
  "hygiene-first-aid",
  "extras",
] as const;

export type ChecklistCategory = (typeof checklistCategories)[number];
export type TripStyle = "car" | "light-backpacking" | "custom";
export const campingLevels = ["camper", "tent", "backpacking"] as const;
export type CampingLevel = (typeof campingLevels)[number];
export type ItemSource = "seed" | "user" | "research";
export type TripItemStatus =
  "not-packed" | "packed" | "need-to-buy" | "not-needed";
export type QuantityRule =
  | { kind: "fixed"; amount: number }
  | { kind: "per-person"; amount: number }
  | { kind: "per-day"; amount: number }
  | { kind: "per-person-per-day"; amount: number };

export interface AppSettings {
  schemaVersion: number;
  defaultTripStyle: TripStyle;
  compactPackingMode: boolean;
}

export interface MasterItem {
  id: string;
  name: string;
  category: ChecklistCategory;
  section: string;
  defaultQuantity: number;
  quantityRule?: QuantityRule;
  unit: string;
  tripStyles: TripStyle[];
  tags: string[];
  aliases?: string[];
  notes?: string;
  archived: boolean;
  source: ItemSource;
}

export interface SeedCategory {
  id: ChecklistCategory;
  name: string;
  order: number;
}

export interface ChecklistSeed {
  schemaVersion: number;
  seedVersion: string;
  categories: SeedCategory[];
  items: MasterItem[];
}

export interface Trip {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface TripItem {
  id: string;
  tripId: string;
  masterItemId?: string;
  name: string;
  category: ChecklistCategory;
  section: string;
  quantity: number;
  unit: string;
  status: TripItemStatus;
  notes?: string;
  assigneeId?: string | undefined;
  tags: string[];
  custom: boolean;
  sortOrder: number;
}

export interface PersonalItemTemplate {
  name: string;
  category: ChecklistCategory;
  section: string;
  quantity: number;
  unit: string;
}

export interface UserProfile {
  id: string;
  name: string;
  personalItems: PersonalItemTemplate[];
  createdAt: string;
  updatedAt: string;
}
