import { getDB } from '../db/database';
import type { PantryItem, ItemCategory, GroceryListItem } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';
import { clearSnoozeByName } from './typical-order.service';
import { emit } from '../utils/events';

export async function getAllPantryItems(): Promise<PantryItem[]> {
  const db = await getDB();
  return db.getAll('pantryItems');
}

/** Uses the `by-normalizedName` index — the join key the whole app matches on. */
export async function findPantryItemByName(
  normalizedName: string,
): Promise<PantryItem | null> {
  const db = await getDB();
  const match = await db.getFromIndex('pantryItems', 'by-normalizedName', normalizedName);
  return match ?? null;
}

/**
 * Returns the existing row rather than inserting a second one under the same
 * join key. Two "Milk" rows show one standing amount between them, emit the
 * item onto the shopping list twice, and leave the second permanently marked
 * out when the first is restocked.
 */
export async function addPantryItem(
  item: Omit<PantryItem, 'id' | 'normalizedName' | 'dateAdded'>,
): Promise<PantryItem> {
  const db = await getDB();
  const normalizedName = normalizeIngredientName(item.name);

  const existing = await db.getFromIndex('pantryItems', 'by-normalizedName', normalizedName);
  if (existing) return existing;

  const newItem: PantryItem = {
    ...item,
    id: crypto.randomUUID(),
    normalizedName,
    dateAdded: Date.now(),
  };
  await db.put('pantryItems', newItem);
  return newItem;
}

/**
 * Renaming recomputes the join key, so it can collide with another row exactly
 * the way a duplicate add can. Refuses rather than silently creating one.
 */
export async function updatePantryItem(item: PantryItem): Promise<void> {
  const db = await getDB();
  const normalizedName = normalizeIngredientName(item.name);

  if (normalizedName !== item.normalizedName) {
    const clash = await db.getFromIndex('pantryItems', 'by-normalizedName', normalizedName);
    if (clash && clash.id !== item.id) {
      throw new Error(`You already have ${clash.name} in your pantry.`);
    }
  }

  item.normalizedName = normalizedName;
  await db.put('pantryItems', item);
}

/**
 * Also removes the shopping-list row this item put there. Without it, deleting
 * something you are out of leaves a row on the list whose only documented
 * recovery — untick it in the pantry — no longer exists.
 */
export async function deletePantryItem(id: string): Promise<void> {
  const db = await getDB();
  const grocery = await db.getAll('groceryList');
  const linked = grocery.filter(g => g.sourcePantryId === id);

  const tx = db.transaction(['pantryItems', 'groceryList'], 'readwrite');
  await tx.objectStore('pantryItems').delete(id);
  for (const g of linked) await tx.objectStore('groceryList').delete(g.id);
  await tx.done;

  emit('grocery-count', grocery.length - linked.length);
}

export async function restorePantryItem(item: PantryItem): Promise<void> {
  const db = await getDB();
  await db.put('pantryItems', item);
  // The row's own `isOut` decides whether it belongs back on the list.
  if (item.isOut) await toggleOutTo(item.id, true);
}

export async function toggleOut(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('pantryItems', id);
  if (!item) return false;
  return toggleOutTo(id, !item.isOut);
}

async function toggleOutTo(id: string, isOut: boolean): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('pantryItems', id);
  if (!item) return false;

  item.isOut = isOut;
  await db.put('pantryItems', item);

  const existing = await db.getAll('groceryList');

  if (isOut) {
    const alreadyOnList = existing.some(
      (g: GroceryListItem) => g.sourcePantryId === id,
    );
    if (!alreadyOnList) {
      const groceryItem: GroceryListItem = {
        id: crypto.randomUUID(),
        name: item.name,
        normalizedName: item.normalizedName,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        source: 'out',
        sourcePantryId: id,
        checked: false,
      };
      await db.put('groceryList', groceryItem);
    }
  } else {
    const tx = db.transaction('groceryList', 'readwrite');
    for (const g of existing) {
      if (g.sourcePantryId === id) {
        await tx.objectStore('groceryList').delete(g.id);
      }
    }
    await tx.done;
  }

  const allGrocery = await db.getAll('groceryList');
  emit('grocery-count', allGrocery.length);

  return isOut;
}

export async function addPantryItemFromPurchase(
  name: string, normalizedName: string, quantity: number, unit: string, category: ItemCategory
): Promise<PantryItem> {
  const db = await getDB();

  // Buying it ends any snooze on the standing order: the cycle restarted.
  await clearSnoozeByName(normalizedName);

  const match = await db.getFromIndex('pantryItems', 'by-normalizedName', normalizedName);

  if (match) {
    match.isOut = false;
    match.purchaseDate = Date.now();
    // `quantity` on a pantry row is reference information, not a tracked
    // ledger (PRODUCT.md) — a purchase must not overwrite what it records.
    await db.put('pantryItems', match);
    return match;
  }

  const newItem: PantryItem = {
    id: crypto.randomUUID(),
    name,
    normalizedName,
    quantity,
    unit,
    category,
    dateAdded: Date.now(),
    purchaseDate: Date.now(),
  };
  await db.put('pantryItems', newItem);
  return newItem;
}
