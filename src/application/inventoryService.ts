import { openCampingDatabase } from "../data/database";
import { MasterItemRepository } from "../data/repositories";
import type { ChecklistCategory, MasterItem } from "../domain/models";

export async function prepareLocalInventory(): Promise<number> {
  const database = await openCampingDatabase();
  try {
    return await new MasterItemRepository(database).count();
  } finally {
    database.close();
  }
}

export async function listMasterItems(): Promise<MasterItem[]> {
  const database = await openCampingDatabase();
  try { return await new MasterItemRepository(database).list(); } finally { database.close(); }
}

export async function saveMasterItem(item: MasterItem): Promise<void> {
  const database = await openCampingDatabase();
  try { await new MasterItemRepository(database).save(item); } finally { database.close(); }
}

export async function archiveMasterItem(id: string): Promise<void> {
  const database = await openCampingDatabase();
  try { await new MasterItemRepository(database).archive(id); } finally { database.close(); }
}

export function findMasterItems(items: MasterItem[], search: string, category: ChecklistCategory | "all"): MasterItem[] {
  const term = search.trim().toLocaleLowerCase();
  return items.filter((item) => (category === "all" || item.category === category) && (!term || [item.name, item.section, ...item.tags, ...(item.aliases ?? [])].some((value) => value.toLocaleLowerCase().includes(term)))).sort((left, right) => left.category.localeCompare(right.category) || left.section.localeCompare(right.section) || left.name.localeCompare(right.name));
}
