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

/**
 * What the kitchen has to cook with, and the shape of the four things the
 * Claude hand-off lets you set before it sends.
 *
 * Equipment lives here for the same reason `CATEGORIES` and `UNITS` do: the
 * prompt interpolates the list from this file, so the words the user ticks and
 * the words Claude is given can never drift apart.
 */
export const EQUIPMENT = [
  'oven', 'stovetop', 'microwave', 'air fryer', 'slow cooker', 'pressure cooker',
  'blender', 'food processor', 'stand mixer', 'toaster', 'grill', 'rice cooker',
  'kettle', 'frying pan', 'saucepan', 'baking sheet', 'casserole dish', 'wok',
];

export type MeasurementSystem = 'us' | 'metric' | 'either';

/** Both ends inclusive. One slider step is one person. */
export const SERVINGS_MIN = 1;
export const SERVINGS_MAX = 8;

/**
 * The time slider's stops, in minutes, with `null` as the far end meaning no
 * limit. Indexed by the slider, so the control, the defaults and the validator
 * all read the same numbers.
 */
export const TIME_STEPS: (number | null)[] = [15, 20, 30, 45, 60, 90, 120, null];

export interface RecipeOptions {
  servings: number;
  /** Minutes, or null for no limit. Always one of `TIME_STEPS`. */
  maxMinutes: number | null;
  measurements: MeasurementSystem;
  /** Empty means "don't constrain": the prompt then says nothing about
   *  equipment at all, rather than claiming the kitchen has none. */
  equipment: string[];
}

export const DEFAULT_RECIPE_OPTIONS: RecipeOptions = {
  servings: 2,
  maxMinutes: 45,
  measurements: 'either',
  equipment: [],
};

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

/** Tombstoned along with the `recipes` store. Meal categories were dropped
 *  from the Saved tab: four pills across the top of a personal collection of a
 *  dozen links is a taxonomy nobody was maintaining, and search does the same
 *  job without asking for anything at save time. The type stays because
 *  `Recipe` below still names it and because existing records still carry the
 *  field — nothing reads it now, and nothing should. */
export type RecipeMealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Recipe {
  id: string;
  url: string;
  title: string;
  ingredients: RecipeIngredient[];
  dateAdded: number;
  mealCategory?: RecipeMealCategory;
}

/**
 * A recipe Claude wrote from the pantry list, saved as its own kind of item.
 *
 * It lives on an `InspoItem` rather than in a store of its own. The `recipes`
 * store is tombstoned and a new one would mean bumping `DB_VERSION`, which with
 * `autoUpdate` caching leaves an older cached shell unable to open the database
 * at all (see the comment in `db/database.ts`). IndexedDB records are
 * schemaless, `inspoItems` carries no indexes, and export/import passes its
 * rows through untouched — so an extra field costs nothing and backs itself up.
 */
export interface SavedRecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  category: ItemCategory;
  /** Claude's claim that this was already in the pantry when it wrote the
   *  recipe. Reference information printed in the reader — it is never joined
   *  against `pantryItems` and never drives the grocery list. */
  have: boolean;
}

export interface SavedRecipe {
  summary: string;
  servings?: number;
  totalMinutes?: number;
  ingredients: SavedRecipeIngredient[];
  steps: string[];
  notes?: string;
}

export type InspoPlatform = 'tiktok' | 'instagram' | 'image' | 'recipe' | 'other';

export interface InspoItem {
  id: string;
  url: string;
  title: string;
  /** A data URL once a cover has been fetched or chosen; '' until then. A
   *  remote address only where the host paints but refuses a canvas read. */
  thumbnailUrl: string;
  platform: InspoPlatform;
  /** Tombstoned — see RecipeMealCategory. Never read; kept so that saving an
   *  old record back does not quietly discard it. */
  mealCategory?: RecipeMealCategory;
  /** When a cover was last looked for. A link whose source has no cover to
   *  give would otherwise be re-fetched on every single open. */
  coverTriedAt?: number;
  /** Set only when `platform` is `'recipe'`: the recipe the reader prints.
   *  Such an item carries no `url` and no `thumbnailUrl`, so the cover fetcher
   *  skips it on its own. */
  recipe?: SavedRecipe;
  dateAdded: number;
}
