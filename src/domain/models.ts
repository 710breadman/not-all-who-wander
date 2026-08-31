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
  ownerProfileId?: string;
  siteId?: string;
  expectedDeparture?: string;
  expectedReturn?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vehicleDescription?: string;
  vehiclePlateNote?: string;
  medicalAllergyNote?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  preflightChecks?: Partial<Record<PreflightCheck, boolean>>;
  dismissedDependencyWarnings?: string[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export const preflightChecks = [
  "maps-downloaded",
  "weather-checked",
  "permits-saved",
  "emergency-contact-set",
  "fuel",
  "water",
  "first-aid",
  "power",
] as const;
export type PreflightCheck = (typeof preflightChecks)[number];

export type SiteVisitState = "want-to-visit" | "visited" | "revisit";

export const waypointTypes = [
  "campsite",
  "parking",
  "trailhead",
  "water",
  "hazard",
  "custom",
] as const;
export type WaypointType = (typeof waypointTypes)[number];

export interface Waypoint {
  id: string;
  tripId: string;
  siteId?: string;
  type: WaypointType;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherPeriod {
  name: string;
  startTime: string;
  temperature?: number;
  temperatureUnit?: string;
  shortForecast: string;
  detailedForecast?: string;
  windSpeed?: string;
  windDirection?: string;
  precipitationChance?: number;
}

export interface WeatherAlert {
  id: string;
  event: string;
  severity?: string;
  headline?: string;
  description?: string;
  effective?: string;
  expires?: string;
}

export interface WeatherSnapshot {
  id: string;
  tripId: string;
  latitude: number;
  longitude: number;
  provider: "nws";
  fetchedAt: string;
  current?: WeatherPeriod;
  hourly: WeatherPeriod[];
  daily: WeatherPeriod[];
  alerts: WeatherAlert[];
}

export interface RouteTrack {
  id: string;
  tripId: string;
  kind: "route" | "track";
  name: string;
  points: Array<{ latitude: number; longitude: number; elevation?: number }>;
  distanceMeters: number;
  createdAt: string;
  updatedAt: string;
}

export type OfflineMapRegionStatus = "downloading" | "paused" | "complete" | "failed";

export interface OfflineMapRegion {
  id: string;
  tripId: string;
  name: string;
  bounds: { west: number; south: number; east: number; north: number };
  minZoom: number;
  maxZoom: number;
  sourceUrl: string;
  provider: "user-supplied-pmtiles";
  licenseConfirmed: boolean;
  status: OfflineMapRegionStatus;
  bytesDownloaded: number;
  bytesTotal?: number;
  archive?: Blob;
  downloadedAt?: string;
  updatedAt: string;
  error?: string;
}

export interface SiteAmenities {
  potableWater?: boolean;
  toilets?: boolean;
  showers?: boolean;
  fireRing?: boolean;
  picnicTable?: boolean;
  bearStorage?: boolean;
  electricity?: boolean;
  cellServiceNotes?: string;
}

export interface Site {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  sourceUrl?: string;
  tags: string[];
  rating?: number;
  visitState: SiteVisitState;
  lastVerified?: string;
  amenities: SiteAmenities;
  accessNotes?: string;
  vehicleSuitability?: string;
  trailerRvNotes?: string;
  parkingNotes?: string;
  costReservationPermitNotes?: string;
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
  email?: string;
  passwordHash?: string;
  personalItems: PersonalItemTemplate[];
  createdAt: string;
  updatedAt: string;
}
