import { getDB } from '../db/database';
import type { TypicalOrderItem } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';

export async function getAllTypicalOrderItems(): Promise<TypicalOrderItem[]> {
  const db = await getDB();
  return db.getAll('typicalOrder');
}

export async function addTypicalOrderItem(item: Omit<TypicalOrderItem, 'id' | 'normalizedName'>): Promise<TypicalOrderItem> {
  const db = await getDB();
  const newItem: TypicalOrderItem = {
    ...item,
    id: crypto.randomUUID(),
    normalizedName: normalizeIngredientName(item.name),
  };
  await db.put('typicalOrder', newItem);
  return newItem;
}

export async function updateTypicalOrderItem(item: TypicalOrderItem): Promise<void> {
  const db = await getDB();
  item.normalizedName = normalizeIngredientName(item.name);
  await db.put('typicalOrder', item);
}

export async function deleteTypicalOrderItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('typicalOrder', id);
}
