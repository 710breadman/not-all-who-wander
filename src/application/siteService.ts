import type { Site, SiteAmenities, SiteVisitState, Trip } from "../domain/models";
import { openCampingDatabase } from "../data/database";
import { SiteRepository } from "../data/repositories";

const id = () => `site-${crypto.randomUUID()}`;

export type SiteInput = {
  name: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  sourceUrl?: string;
  tags?: string[];
  rating?: number;
  visitState?: SiteVisitState;
  lastVerified?: string;
  amenities?: SiteAmenities;
  accessNotes?: string;
  vehicleSuitability?: string;
  trailerRvNotes?: string;
  parkingNotes?: string;
  costReservationPermitNotes?: string;
};

export async function listSites(includeArchived = false, databaseName?: string): Promise<Site[]> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try {
    return await new SiteRepository(database).list(includeArchived);
  } finally {
    database.close();
  }
}

export async function saveSite(input: SiteInput & Partial<Pick<Site, "id" | "createdAt" | "archived">>, databaseName?: string): Promise<Site> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try {
    const now = new Date().toISOString();
    const current = input.id ? await new SiteRepository(database).get(input.id) : undefined;
    const site: Site = {
      id: current?.id ?? input.id ?? id(),
      name: input.name.trim(),
      ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
      ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
      ...(input.sourceUrl?.trim() ? { sourceUrl: input.sourceUrl.trim() } : {}),
      tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? current?.tags ?? [],
      ...(input.rating === undefined ? {} : { rating: Math.min(5, Math.max(1, input.rating)) }),
      visitState: input.visitState ?? current?.visitState ?? "want-to-visit",
      ...(input.lastVerified ? { lastVerified: input.lastVerified } : {}),
      amenities: input.amenities ?? current?.amenities ?? {},
      ...(input.accessNotes?.trim() ? { accessNotes: input.accessNotes.trim() } : {}),
      ...(input.vehicleSuitability?.trim() ? { vehicleSuitability: input.vehicleSuitability.trim() } : {}),
      ...(input.trailerRvNotes?.trim() ? { trailerRvNotes: input.trailerRvNotes.trim() } : {}),
      ...(input.parkingNotes?.trim() ? { parkingNotes: input.parkingNotes.trim() } : {}),
      ...(input.costReservationPermitNotes?.trim() ? { costReservationPermitNotes: input.costReservationPermitNotes.trim() } : {}),
      createdAt: current?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
      archived: input.archived ?? current?.archived ?? false,
    };
    await new SiteRepository(database).save(site);
    return site;
  } finally {
    database.close();
  }
}

export async function archiveSite(id: string, databaseName?: string): Promise<void> {
  const database = await openCampingDatabase(databaseName === undefined ? {} : { databaseName });
  try {
    await new SiteRepository(database).archive(id);
  } finally {
    database.close();
  }
}

export async function saveTripDestinationAsSite(trip: Trip, databaseName?: string): Promise<Site | undefined> {
  const name = trip.destination?.trim();
  if (!name) return undefined;
  const existing = (await listSites(true, databaseName)).find(
    (site) => site.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0,
  );
  if (existing) return existing;
  return saveSite({
    name,
    notes: [trip.address, trip.notes].filter(Boolean).join("\n"),
    visitState: "want-to-visit",
  }, databaseName);
}
