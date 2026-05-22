import type { ItemCategory } from '../models/types';

export function isBarcodeDetectorSupported(): boolean {
  return 'BarcodeDetector' in window;
}

const CATEGORY_MAP: Record<string, ItemCategory> = {
  'en:dairy-products': 'dairy',
  'en:milk-and-yogurt': 'dairy',
  'en:cheeses': 'dairy',
  'en:butters-and-creams': 'dairy',
  'en:meats': 'meat',
  'en:meat': 'meat',
  'en:poultry': 'meat',
  'en:fish-and-seafood': 'seafood',
  'en:seafood': 'seafood',
  'en:fresh-fish': 'seafood',
  'en:fresh-vegetables': 'produce',
  'en:vegetables': 'produce',
  'en:fruits': 'produce',
  'en:fresh-fruits': 'produce',
  'en:breads': 'grains',
  'en:cereals': 'grains',
  'en:pasta': 'grains',
  'en:rice': 'grains',
  'en:canned-foods': 'canned',
  'en:canned-vegetables': 'canned',
  'en:canned-fruits': 'canned',
  'en:frozen-foods': 'frozen',
  'en:frozen-vegetables': 'frozen',
  'en:frozen-meals': 'frozen',
  'en:snacks': 'snacks',
  'en:chips-and-crisps': 'snacks',
  'en:cookies': 'snacks',
  'en:crackers': 'snacks',
  'en:candies': 'snacks',
  'en:beverages': 'beverages',
  'en:juices': 'beverages',
  'en:sodas': 'beverages',
  'en:waters': 'beverages',
  'en:coffees': 'beverages',
  'en:teas': 'beverages',
  'en:condiments': 'condiments',
  'en:sauces': 'condiments',
  'en:dressings': 'condiments',
  'en:pickles': 'condiments',
  'en:baking': 'baking',
  'en:baking-ingredients': 'baking',
  'en:flours': 'baking',
  'en:sugars': 'baking',
  'en:spices': 'spices',
  'en:herbs': 'spices',
  'en:herbs-and-spices': 'spices',
};

function mapCategory(tags: string[]): ItemCategory {
  for (const tag of tags) {
    const cat = CATEGORY_MAP[tag];
    if (cat) return cat;
  }
  return 'other';
}

export async function lookupBarcode(code: string): Promise<{ name: string; category: ItemCategory } | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const product = data.product;
    const name: string = product.product_name_en || product.product_name || '';
    const tags: string[] = product.categories_tags || [];
    const category = mapCategory(tags);
    return { name, category };
  } catch {
    return null;
  }
}
