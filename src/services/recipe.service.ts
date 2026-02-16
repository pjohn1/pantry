import { getDB } from '../db/database';
import type { Recipe, RecipeIngredient } from '../models/types';
import { matchIngredientsAgainstPantry } from './ingredient-matcher';

// Configure this to your Cloudflare Worker URL
const RECIPE_PROXY_URL = 'https://pantry-recipe-proxy.workers.dev';

interface ProxyResponse {
  recipes: {
    title: string;
    url: string;
    ingredients: string[];
    description?: string;
    image?: string;
  }[];
}

export async function fetchRecipeFromUrl(url: string): Promise<Recipe> {
  const proxyUrl = `${RECIPE_PROXY_URL}/?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch recipe' }));
    throw new Error((error as { error: string }).error || `HTTP ${response.status}`);
  }

  const data: ProxyResponse = await response.json();

  if (!data.recipes || data.recipes.length === 0) {
    throw new Error('No recipe found on this page');
  }

  const recipeData = data.recipes[0];
  const ingredients = await matchIngredientsAgainstPantry(recipeData.ingredients);

  const recipe: Recipe = {
    id: crypto.randomUUID(),
    url,
    title: recipeData.title,
    ingredients,
    dateAdded: Date.now(),
  };

  const db = await getDB();
  await db.put('recipes', recipe);

  return recipe;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  return db.getAll('recipes');
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const db = await getDB();
  return db.get('recipes', id);
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('recipes', id);
}

export async function refreshRecipeMatches(recipe: Recipe): Promise<RecipeIngredient[]> {
  const rawIngredients = recipe.ingredients.map(i => i.raw);
  const updated = await matchIngredientsAgainstPantry(rawIngredients);
  recipe.ingredients = updated;
  const db = await getDB();
  await db.put('recipes', recipe);
  return updated;
}
