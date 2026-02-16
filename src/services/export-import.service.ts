import { getDB } from '../db/database';
import type { PantryItem, TypicalOrderItem, GroceryListItem, Recipe } from '../models/types';

interface ExportData {
  version: 1;
  exportedAt: string;
  pantryItems: PantryItem[];
  typicalOrder: TypicalOrderItem[];
  groceryList: GroceryListItem[];
  recipes: Recipe[];
}

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    pantryItems: await db.getAll('pantryItems'),
    typicalOrder: await db.getAll('typicalOrder'),
    groceryList: await db.getAll('groceryList'),
    recipes: await db.getAll('recipes'),
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(json: string): Promise<void> {
  const data: ExportData = JSON.parse(json);
  if (data.version !== 1) throw new Error('Unsupported export version');

  const db = await getDB();
  const tx = db.transaction(
    ['pantryItems', 'typicalOrder', 'groceryList', 'recipes'],
    'readwrite'
  );

  await tx.objectStore('pantryItems').clear();
  await tx.objectStore('typicalOrder').clear();
  await tx.objectStore('groceryList').clear();
  await tx.objectStore('recipes').clear();

  for (const item of data.pantryItems) {
    await tx.objectStore('pantryItems').put(item);
  }
  for (const item of data.typicalOrder) {
    await tx.objectStore('typicalOrder').put(item);
  }
  for (const item of data.groceryList) {
    await tx.objectStore('groceryList').put(item);
  }
  for (const item of data.recipes) {
    await tx.objectStore('recipes').put(item);
  }

  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['pantryItems', 'typicalOrder', 'groceryList', 'recipes'],
    'readwrite'
  );
  await tx.objectStore('pantryItems').clear();
  await tx.objectStore('typicalOrder').clear();
  await tx.objectStore('groceryList').clear();
  await tx.objectStore('recipes').clear();
  await tx.done;
}

export function downloadJson(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
