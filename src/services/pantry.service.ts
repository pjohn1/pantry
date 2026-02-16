import { getDB } from '../db/database';
import type { PantryItem, ItemCategory } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';

export async function getAllPantryItems(): Promise<PantryItem[]> {
  const db = await getDB();
  return db.getAll('pantryItems');
}

export async function getPantryItemsByCategory(category: ItemCategory): Promise<PantryItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('pantryItems', 'by-category', category);
}

export async function addPantryItem(item: Omit<PantryItem, 'id' | 'normalizedName' | 'dateAdded'>): Promise<PantryItem> {
  const db = await getDB();
  const newItem: PantryItem = {
    ...item,
    id: crypto.randomUUID(),
    normalizedName: normalizeIngredientName(item.name),
    dateAdded: Date.now(),
  };
  await db.put('pantryItems', newItem);
  return newItem;
}

export async function updatePantryItem(item: PantryItem): Promise<void> {
  const db = await getDB();
  item.normalizedName = normalizeIngredientName(item.name);
  await db.put('pantryItems', item);
}

export async function deletePantryItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pantryItems', id);
}

export async function getPantryNameSet(): Promise<Set<string>> {
  const items = await getAllPantryItems();
  return new Set(items.map(i => i.normalizedName));
}
