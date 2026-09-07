export type ItemCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'grains'
  | 'canned'
  | 'frozen'
  | 'snacks'
  | 'beverages'
  | 'condiments'
  | 'baking'
  | 'spices'
  | 'other';

export const CATEGORIES: ItemCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'grains', 'canned',
  'frozen', 'snacks', 'beverages', 'condiments', 'baking', 'spices', 'other',
];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  meat: 'Meat',
  seafood: 'Seafood',
  grains: 'Grains',
  canned: 'Canned',
  frozen: 'Frozen',
  snacks: 'Snacks',
  beverages: 'Beverages',
  condiments: 'Condiments',
  baking: 'Baking',
  spices: 'Spices',
  other: 'Other',
};

const CATEGORY_SET = new Set<string>(CATEGORIES);

/**
 * Anything outside the enum becomes `other`. Both list views group by the
 * categories they actually find, but a row carrying a value no label exists
 * for would render under a blank heading — and an imported backup is free to
 * carry one. Coerce at the door instead.
 */
export function coerceCategory(value: unknown): ItemCategory {
  return typeof value === 'string' && CATEGORY_SET.has(value)
    ? (value as ItemCategory)
    : 'other';
}

export const UNITS = [
  'count', 'cups', 'tbsp', 'tsp', 'oz', 'g', 'kg', 'lb', 'ml', 'l',
  'cloves', 'slices', 'pieces', 'bunch', 'head', 'can', 'bag', 'box', 'jar', 'package',
];

export interface PantryItem {
  id: string;
  name: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  dateAdded: number;
  isOut?: boolean;
  purchaseDate?: number;
}

export interface TypicalOrderItem {
  id: string;
  name: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  /**
   * Set when the user deletes this item's auto-generated row off the shopping
   * list. The list rebuilds itself on every open, so without this a deleted
   * row would reappear immediately. Cleared the next time the item is bought,
   * which is what makes it a snooze rather than an off switch.
   */
  snoozed?: boolean;
}

/** `recipe` is legacy: recipe parsing was removed and nothing writes it now.
 *  Kept so leftover rows stay typed while they are purged on load. */
export type GrocerySource = 'auto' | 'manual' | 'recipe' | 'out';

export interface GroceryListItem {
  id: string;
  name: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  source: GrocerySource;
  sourceRecipeId?: string;
  sourcePantryId?: string;
  checked: boolean;
}

export interface RecipeIngredient {
  raw: string;
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: string;
  inPantry: boolean;
}

/** Owned by the Saved tab, not by the removed recipe-parsing feature — the
 *  Saved tab's own copy still calls its items recipes. Renaming would touch
 *  ~20 sites there for no user-visible gain. */
export type RecipeMealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const RECIPE_MEAL_CATEGORIES: RecipeMealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const RECIPE_MEAL_CATEGORY_LABELS: Record<RecipeMealCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export interface Recipe {
  id: string;
  url: string;
  title: string;
  ingredients: RecipeIngredient[];
  dateAdded: number;
  mealCategory?: RecipeMealCategory;
}

export type InspoPlatform = 'tiktok' | 'instagram' | 'image' | 'other';

export interface InspoItem {
  id: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  platform: InspoPlatform;
  mealCategory?: RecipeMealCategory;
  dateAdded: number;
}
