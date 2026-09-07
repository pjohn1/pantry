import { getDB } from '../db/database';
import type { GroceryListItem, ItemCategory, PantryItem } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';
import { addPantryItemFromPurchase, findPantryItemByName } from './pantry.service';
import { setSnoozedByName } from './typical-order.service';
import { emit } from '../utils/events';

async function emitGroceryCount(): Promise<void> {
  const db = await getDB();
  const items = await db.getAll('groceryList');
  emit('grocery-count', items.length);
}

export async function getAllGroceryItems(): Promise<GroceryListItem[]> {
  const db = await getDB();
  let items = await db.getAll('groceryList');

  // Recipe parsing was removed, so nothing can create these any more. Clear
  // out any that predate the removal rather than showing rows whose origin no
  // longer exists. Idempotent: after the first load there are none left.
  const orphans = items.filter(i => i.source === 'recipe');
  if (orphans.length > 0) {
    const tx = db.transaction('groceryList', 'readwrite');
    for (const o of orphans) await tx.objectStore('groceryList').delete(o.id);
    await tx.done;
    items = items.filter(i => i.source !== 'recipe');
  }

  emit('grocery-count', items.length);
  return items;
}

/**
 * Brings the `auto` rows into line with the standing order, and touches
 * nothing else. Runs on every open, so the list is correct before the user
 * thinks about it — which is the product's whole claim, and used to be a
 * button below the fold.
 *
 * Deliberately not a clear-and-rebuild: `manual` and `out` rows keep their
 * identity, and an `auto` row that is already there keeps its id rather than
 * being destroyed and re-minted underneath the user's thumb.
 */
export async function reconcileGroceryList(): Promise<GroceryListItem[]> {
  const db = await getDB();

  // Read everything first: an idb transaction closes on any await outside it.
  const [typicalItems, pantryItems, currentList] = await Promise.all([
    db.getAll('typicalOrder'),
    db.getAll('pantryItems'),
    db.getAll('groceryList'),
  ]);

  const inPantry = new Set(pantryItems.filter(p => !p.isOut).map(p => p.normalizedName));

  // What the standing order says should be on the list right now.
  const wanted = new Map<string, GroceryListItem>();
  for (const typical of typicalItems) {
    if (typical.snoozed) continue;
    if (inPantry.has(typical.normalizedName)) continue;
    wanted.set(typical.normalizedName, {
      id: crypto.randomUUID(),
      name: typical.name,
      normalizedName: typical.normalizedName,
      quantity: typical.quantity,
      unit: typical.unit,
      category: typical.category,
      source: 'auto',
      checked: false,
    });
  }

  const adds: GroceryListItem[] = [];
  const removes: string[] = [];
  const keep: GroceryListItem[] = [];
  const seen = new Set<string>();

  // Two passes, because `getAll` returns rows in key order and a row you put
  // there yourself has to win regardless of where it lands in that order. One
  // pass would keep an auto duplicate whenever the auto row happened to be
  // read before the `out` row covering the same item — which is every staple
  // you mark as run out.
  for (const row of currentList) {
    if (row.source === 'auto') continue;
    keep.push(row);
    seen.add(row.normalizedName);
  }

  for (const row of currentList) {
    if (row.source !== 'auto') continue;
    if (wanted.has(row.normalizedName) && !seen.has(row.normalizedName)) {
      seen.add(row.normalizedName);
      keep.push(row);
    } else {
      removes.push(row.id);
    }
  }

  for (const [name, row] of wanted) {
    if (seen.has(name)) continue;
    seen.add(name);
    adds.push(row);
  }

  if (adds.length > 0 || removes.length > 0) {
    const tx = db.transaction('groceryList', 'readwrite');
    for (const id of removes) await tx.objectStore('groceryList').delete(id);
    for (const row of adds) await tx.objectStore('groceryList').put(row);
    await tx.done;
  }

  const merged = [...keep, ...adds];
  emit('grocery-count', merged.length);
  return merged;
}

export async function addManualGroceryItem(
  name: string, quantity: number, unit: string, category: ItemCategory
): Promise<GroceryListItem> {
  const db = await getDB();
  const normalizedName = normalizeIngredientName(name);

  // Already on the list under any source: update it in place rather than
  // stacking a second row for the same thing.
  const existing = (await db.getAll('groceryList'))
    .find(i => i.normalizedName === normalizedName);

  const item: GroceryListItem = existing
    ? { ...existing, name, quantity, unit, category }
    : {
        id: crypto.randomUUID(),
        name,
        normalizedName,
        quantity,
        unit,
        category,
        source: 'manual',
        checked: false,
      };

  await db.put('groceryList', item);
  await emitGroceryCount();
  return item;
}

export async function updateGroceryItem(item: GroceryListItem): Promise<void> {
  const db = await getDB();
  item.normalizedName = normalizeIngredientName(item.name);
  await db.put('groceryList', item);
  await emitGroceryCount();
}

/**
 * Deleting an `auto` row snoozes its standing-order entry. The list rebuilds
 * itself on every open, so without this the row the user just removed would
 * be back before they reached the top of the screen.
 */
export async function deleteGroceryItem(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('groceryList', id);
  await db.delete('groceryList', id);
  if (item?.source === 'auto') {
    await setSnoozedByName(item.normalizedName, true);
  }
  await emitGroceryCount();
}

export async function restoreGroceryItem(item: GroceryListItem): Promise<void> {
  const db = await getDB();
  await db.put('groceryList', item);
  if (item.source === 'auto') {
    await setSnoozedByName(item.normalizedName, false);
  }
  await emitGroceryCount();
}

/**
 * Ticking a row in the aisle is the highest-frequency write in the app, and it
 * spans two stores. `before` is everything needed to put both of them back, so
 * a fumbled tap on a moving cart costs one button rather than a tab switch, a
 * search and a guess.
 */
export interface PurchaseSnapshot {
  groceryItem: GroceryListItem;
  priorPantryItem: PantryItem | null;
}

export async function purchaseGroceryItem(id: string): Promise<PurchaseSnapshot | null> {
  const db = await getDB();
  const item = await db.get('groceryList', id);
  if (!item) return null;

  const priorPantryItem = await findPantryItemByName(item.normalizedName);

  await addPantryItemFromPurchase(
    item.name, item.normalizedName, item.quantity, item.unit, item.category
  );

  await db.delete('groceryList', id);
  await emitGroceryCount();

  return { groceryItem: item, priorPantryItem: priorPantryItem ? { ...priorPantryItem } : null };
}

export async function undoPurchase(snapshot: PurchaseSnapshot): Promise<void> {
  const db = await getDB();
  const { groceryItem, priorPantryItem } = snapshot;

  const current = await findPantryItemByName(groceryItem.normalizedName);
  if (priorPantryItem) {
    await db.put('pantryItems', priorPantryItem);
  } else if (current) {
    // The purchase created this row; nothing was there before it.
    await db.delete('pantryItems', current.id);
  }

  await db.put('groceryList', groceryItem);
  await emitGroceryCount();
}
