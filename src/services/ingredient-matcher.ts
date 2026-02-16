import { getDB } from '../db/database';
import type { RecipeIngredient, GroceryListItem } from '../models/types';
import { parseIngredient } from '../utils/parse-ingredient';

export async function matchIngredientsAgainstPantry(
  rawIngredients: string[]
): Promise<RecipeIngredient[]> {
  const db = await getDB();
  const pantryItems = await db.getAll('pantryItems');

  const pantryNames = new Set<string>();
  for (const item of pantryItems) {
    pantryNames.add(item.normalizedName);
  }

  return rawIngredients.map(raw => {
    const parsed = parseIngredient(raw);
    return {
      raw,
      name: parsed.name,
      normalizedName: parsed.normalizedName,
      quantity: parsed.quantity,
      unit: parsed.unit,
      inPantry: pantryNames.has(parsed.normalizedName),
    };
  });
}

export async function addMissingToGroceryList(
  ingredients: RecipeIngredient[],
  recipeId: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('groceryList', 'readwrite');

  // Check existing recipe items to avoid duplicates
  const existing = await db.getAll('groceryList');
  const existingNames = new Set(
    existing
      .filter((i: GroceryListItem) => i.sourceRecipeId === recipeId)
      .map((i: GroceryListItem) => i.normalizedName)
  );

  for (const ing of ingredients) {
    if (!ing.inPantry && !existingNames.has(ing.normalizedName)) {
      await tx.objectStore('groceryList').put({
        id: crypto.randomUUID(),
        name: ing.name,
        normalizedName: ing.normalizedName,
        quantity: ing.quantity ?? 1,
        unit: ing.unit,
        category: 'other' as const,
        source: 'recipe' as const,
        sourceRecipeId: recipeId,
        checked: false,
      });
    }
  }

  await tx.done;
}
