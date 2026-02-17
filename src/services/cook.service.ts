import { getAllPantryItems } from './pantry.service';
import { matchIngredientsAgainstPantry } from './ingredient-matcher';
import { saveScannedRecipe } from './recipe.service';
import { normalizeIngredientName } from '../utils/normalize';
import type { MealType, SuggestedRecipe, PantryItem, Recipe } from '../models/types';

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

const MEAL_TYPE_CATEGORIES: Record<MealType, string[] | null> = {
  all: null,
  breakfast: ['Breakfast'],
  lunch: ['Starter', 'Side', 'Vegetarian', 'Vegan', 'Pasta', 'Miscellaneous'],
  dinner: ['Beef', 'Chicken', 'Lamb', 'Pork', 'Seafood', 'Goat', 'Pasta'],
};

const CATEGORY_PRIORITY: Record<string, number> = {
  meat: 1,
  seafood: 2,
  produce: 3,
  dairy: 4,
};

interface MealDbFilterResult {
  meals: { strMeal: string; strMealThumb: string; idMeal: string }[] | null;
}

interface MealDbLookupResult {
  meals: Record<string, string>[] | null;
}

function pickKeyIngredients(items: PantryItem[], max: number): string[] {
  const inStock = items.filter(i => !i.isOut);
  inStock.sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category] ?? 5;
    const pb = CATEGORY_PRIORITY[b.category] ?? 5;
    return pa - pb;
  });
  return inStock.slice(0, max).map(i => i.name);
}

function extractIngredients(meal: Record<string, string>): { name: string; measure: string }[] {
  const ingredients: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: (measure || '').trim() });
    }
  }
  return ingredients;
}

export async function findRecipesByPantry(mealType: MealType): Promise<SuggestedRecipe[]> {
  const pantryItems = await getAllPantryItems();
  const inStock = pantryItems.filter(i => !i.isOut);
  if (inStock.length === 0) return [];

  const pantryNormalized = new Set(inStock.map(i => i.normalizedName));
  const keyIngredients = pickKeyIngredients(pantryItems, 5);

  // Fetch meals matching each key ingredient
  const mealIdScores = new Map<string, number>();
  const fetches = keyIngredients.map(async (ingredient) => {
    try {
      const res = await fetch(`${API_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`);
      const data: MealDbFilterResult = await res.json();
      if (data.meals) {
        for (const meal of data.meals) {
          mealIdScores.set(meal.idMeal, (mealIdScores.get(meal.idMeal) || 0) + 1);
        }
      }
    } catch {
      // skip failed ingredient searches
    }
  });
  await Promise.all(fetches);

  if (mealIdScores.size === 0) return [];

  // Sort by score and take top 10
  const topMealIds = [...mealIdScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  // Fetch full details for top meals
  const detailFetches = topMealIds.map(async (id): Promise<SuggestedRecipe | null> => {
    try {
      const res = await fetch(`${API_BASE}/lookup.php?i=${id}`);
      const data: MealDbLookupResult = await res.json();
      if (!data.meals || data.meals.length === 0) return null;

      const meal = data.meals[0];
      const category = meal.strCategory || '';

      // Filter by meal type
      const allowedCategories = MEAL_TYPE_CATEGORIES[mealType];
      if (allowedCategories && !allowedCategories.includes(category)) return null;

      const ingredients = extractIngredients(meal);
      const matchedNames: string[] = [];
      const missingNames: string[] = [];

      for (const ing of ingredients) {
        const normalized = normalizeIngredientName(ing.name);
        if (pantryNormalized.has(normalized)) {
          matchedNames.push(ing.name);
        } else {
          missingNames.push(ing.name);
        }
      }

      return {
        mealDbId: id,
        title: meal.strMeal || '',
        image: meal.strMealThumb || '',
        category,
        ingredients,
        matchCount: matchedNames.length,
        totalIngredients: ingredients.length,
        matchedNames,
        missingNames,
      };
    } catch {
      return null;
    }
  });

  const results = (await Promise.all(detailFetches)).filter(
    (r): r is SuggestedRecipe => r !== null && r.matchCount > 0
  );

  // Sort by match count descending
  results.sort((a, b) => b.matchCount - a.matchCount);
  return results;
}

export async function saveSuggestedRecipe(suggestion: SuggestedRecipe): Promise<Recipe> {
  const rawIngredients = suggestion.ingredients.map(
    i => i.measure ? `${i.measure} ${i.name}` : i.name
  );
  const ingredients = await matchIngredientsAgainstPantry(rawIngredients);
  return saveScannedRecipe(suggestion.title, ingredients);
}
