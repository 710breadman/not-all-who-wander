import rawSeed from "../../data/checklist_seed.json";
import {
  checklistCategories,
  type ChecklistCategory,
  type ChecklistSeed,
  type ItemSource,
  type MasterItem,
  type TripStyle,
} from "../domain/models";

const tripStyles = ["car", "light-backpacking", "custom"] as const;
const itemSources = ["seed", "user", "research"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function parseItem(value: unknown): MasterItem {
  if (!isRecord(value)) throw new Error("Seed item must be an object.");

  const requiredStringFields = ["id", "name", "section", "unit"] as const;
  for (const field of requiredStringFields) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      throw new Error(`Seed item has an invalid ${field}.`);
    }
  }

  if (!includesValue(checklistCategories, value.category)) {
    throw new Error(`Seed item ${value.id} has an invalid category.`);
  }
  if (typeof value.defaultQuantity !== "number" || value.defaultQuantity < 0) {
    throw new Error(`Seed item ${value.id} has an invalid default quantity.`);
  }
  if (!Array.isArray(value.tripStyles) || !value.tripStyles.every((style) => includesValue(tripStyles, style))) {
    throw new Error(`Seed item ${value.id} has invalid trip styles.`);
  }
  if (!isStringArray(value.tags)) throw new Error(`Seed item ${value.id} has invalid tags.`);
  if (value.aliases !== undefined && !isStringArray(value.aliases)) {
    throw new Error(`Seed item ${value.id} has invalid aliases.`);
  }
  if (value.notes !== undefined && typeof value.notes !== "string") {
    throw new Error(`Seed item ${value.id} has invalid notes.`);
  }
  if (typeof value.archived !== "boolean" || !includesValue(itemSources, value.source)) {
    throw new Error(`Seed item ${value.id} has invalid metadata.`);
  }

  return {
    id: value.id as string,
    name: value.name as string,
    category: value.category as ChecklistCategory,
    section: value.section as string,
    defaultQuantity: value.defaultQuantity,
    unit: value.unit as string,
    tripStyles: value.tripStyles as TripStyle[],
    tags: value.tags,
    ...(value.aliases === undefined ? {} : { aliases: value.aliases }),
    ...(value.notes === undefined ? {} : { notes: value.notes }),
    archived: value.archived,
    source: value.source as ItemSource,
  };
}

export function parseChecklistSeed(value: unknown): ChecklistSeed {
  if (!isRecord(value)) throw new Error("Checklist seed must be an object.");
  if (!Number.isInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
    throw new Error("Checklist seed has an invalid schema version.");
  }
  if (typeof value.seedVersion !== "string" || value.seedVersion.length === 0) {
    throw new Error("Checklist seed has an invalid seed version.");
  }
  if (!Array.isArray(value.categories) || !Array.isArray(value.items)) {
    throw new Error("Checklist seed categories and items must be arrays.");
  }

  const categories = value.categories.map((category) => {
    if (
      !isRecord(category) ||
      !includesValue(checklistCategories, category.id) ||
      typeof category.name !== "string" ||
      typeof category.order !== "number"
    ) {
      throw new Error("Checklist seed has an invalid category.");
    }
    return { id: category.id, name: category.name, order: category.order };
  });

  const items = value.items.map(parseItem);
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("Checklist seed contains duplicate item IDs.");
  }

  return {
    schemaVersion: value.schemaVersion as number,
    seedVersion: value.seedVersion,
    categories,
    items,
  };
}

export function loadChecklistSeed(): ChecklistSeed {
  return parseChecklistSeed(rawSeed);
}
