import { getDB } from '../db/database';
import type { TypicalOrderItem } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';

export async function getAllTypicalOrderItems(): Promise<TypicalOrderItem[]> {
  const db = await getDB();
  return db.getAll('typicalOrder');
}

export async function findTypicalOrderItemByName(
  normalizedName: string,
): Promise<TypicalOrderItem | null> {
  const db = await getDB();
  const all = await db.getAll('typicalOrder');
  return all.find(i => i.normalizedName === normalizedName) ?? null;
}

/**
 * Upserts on `normalizedName`. Two rows sharing one join key is the failure
 * that quietly breaks everything downstream — the pantry row's lookup keeps
 * only the last of them, and the shopping list emits the item twice — so the
 * second write updates the first instead of inserting beside it.
 */
export async function addTypicalOrderItem(
  item: Omit<TypicalOrderItem, 'id' | 'normalizedName'>,
): Promise<TypicalOrderItem> {
  const db = await getDB();
  const normalizedName = normalizeIngredientName(item.name);

  const all = await db.getAll('typicalOrder');
  const existing = all.find(i => i.normalizedName === normalizedName);

  const merged: TypicalOrderItem = existing
    ? { ...existing, ...item, normalizedName }
    : { ...item, id: crypto.randomUUID(), normalizedName };

  await db.put('typicalOrder', merged);
  return merged;
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

/** Keeps a deliberately-deleted shopping-list row from coming straight back. */
export async function setSnoozedByName(
  normalizedName: string,
  snoozed: boolean,
): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('typicalOrder');
  const match = all.find(i => i.normalizedName === normalizedName);
  if (!match || Boolean(match.snoozed) === snoozed) return;
  match.snoozed = snoozed;
  await db.put('typicalOrder', match);
}

/** Buying the thing is what ends the snooze: the cycle has started again. */
export async function clearSnoozeByName(normalizedName: string): Promise<void> {
  await setSnoozedByName(normalizedName, false);
}
