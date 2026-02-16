import { getDB } from '../db/database';
import type { PantryItem, ItemCategory, GroceryListItem } from '../models/types';
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

export async function toggleOut(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get('pantryItems', id);
  if (!item) return false;

  item.isOut = !item.isOut;
  await db.put('pantryItems', item);

  if (item.isOut) {
    // Add to grocery list
    const existing = await db.getAll('groceryList');
    const alreadyOnList = existing.some(
      (g: GroceryListItem) => g.sourcePantryId === id
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
    // Remove from grocery list
    const existing = await db.getAll('groceryList');
    const tx = db.transaction('groceryList', 'readwrite');
    for (const g of existing) {
      if (g.sourcePantryId === id) {
        await tx.objectStore('groceryList').delete(g.id);
      }
    }
    await tx.done;
  }

  return item.isOut;
}

export async function addPantryItemFromPurchase(
  name: string, normalizedName: string, quantity: number, unit: string, category: ItemCategory
): Promise<PantryItem> {
  const db = await getDB();

  // Check if item already in pantry by normalized name
  const existing = await db.getAll('pantryItems');
  const match = existing.find(i => i.normalizedName === normalizedName);

  if (match) {
    // Un-mark as out and update purchase date
    match.isOut = false;
    match.purchaseDate = Date.now();
    match.quantity = quantity;
    await db.put('pantryItems', match);
    return match;
  }

  // Create new pantry item
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
