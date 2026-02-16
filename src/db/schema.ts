import type { DBSchema } from 'idb';
import type { PantryItem, TypicalOrderItem, GroceryListItem, Recipe } from '../models/types';

export interface PantryDB extends DBSchema {
  pantryItems: {
    key: string;
    value: PantryItem;
    indexes: {
      'by-category': string;
      'by-normalizedName': string;
    };
  };
  typicalOrder: {
    key: string;
    value: TypicalOrderItem;
    indexes: {
      'by-category': string;
    };
  };
  groceryList: {
    key: string;
    value: GroceryListItem;
    indexes: {
      'by-source': string;
      'by-category': string;
    };
  };
  recipes: {
    key: string;
    value: Recipe;
  };
}
