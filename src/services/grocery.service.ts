import { getDB } from '../db/database';
import type { GroceryListItem, PantryItem, ItemCategory } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';
import { addPantryItemFromPurchase } from './pantry.service';

export async function getAllGroceryItems(): Promise<GroceryListItem[]> {
  const db = await getDB();
  return db.getAll('groceryList');
}

export async function regenerateGroceryList(): Promise<GroceryListItem[]> {
  const db = await getDB();

  const typicalItems = await db.getAll('typicalOrder');
  const pantryItems = await db.getAll('pantryItems');

  // Build pantry lookup by normalizedName
  const pantryMap = new Map<string, PantryItem>();
  for (const item of pantryItems) {
    const existing = pantryMap.get(item.normalizedName);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      pantryMap.set(item.normalizedName, { ...item });
    }
  }

  // Compute auto items from typical order
  const autoItems: GroceryListItem[] = [];
  for (const typical of typicalItems) {
    const pantryItem = pantryMap.get(typical.normalizedName);
    if (!pantryItem) {
      autoItems.push({
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
    // If in pantry, skip (v1: presence-based matching)
  }

  // Preserve manual, recipe, and out items, keep their checked state
  const currentList = await db.getAll('groceryList');
  const preserved = currentList.filter(
    item => item.source === 'manual' || item.source === 'recipe' || item.source === 'out'
  );

  // Clear and rewrite
  const tx = db.transaction('groceryList', 'readwrite');
  await tx.objectStore('groceryList').clear();
  const merged = [...autoItems, ...preserved];
  for (const item of merged) {
    await tx.objectStore('groceryList').put(item);
  }
  await tx.done;

  return merged;
}

export async function addManualGroceryItem(
  name: string, quantity: number, unit: string, category: ItemCategory
): Promise<GroceryListItem> {
  const db = await getDB();
  const item: GroceryListItem = {
    id: crypto.randomUUID(),
    name,
    normalizedName: normalizeIngredientName(name),
    quantity,
    unit,
    category,
    source: 'manual',
    checked: false,
  };
  await db.put('groceryList', item);
  return item;
}

export async function toggleGroceryItem(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('groceryList', id);
  if (item) {
    item.checked = !item.checked;
    await db.put('groceryList', item);
  }
}

export async function deleteGroceryItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('groceryList', id);
}

export async function clearCheckedItems(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('groceryList');
  const tx = db.transaction('groceryList', 'readwrite');
  for (const item of all) {
    if (item.checked) {
      await tx.objectStore('groceryList').delete(item.id);
    }
  }
  await tx.done;
}

export async function purchaseGroceryItem(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('groceryList', id);
  if (!item) return;

  // Add to pantry (or update existing pantry item)
  await addPantryItemFromPurchase(
    item.name, item.normalizedName, item.quantity, item.unit, item.category
  );

  // Remove from grocery list
  await db.delete('groceryList', id);
}
