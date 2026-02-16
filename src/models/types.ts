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
}

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

export interface Recipe {
  id: string;
  url: string;
  title: string;
  ingredients: RecipeIngredient[];
  dateAdded: number;
}
