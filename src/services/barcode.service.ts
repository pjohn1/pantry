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

/**
 * The outcome of a product lookup. `null` used to stand in for every failure,
 * which meant "no signal", "server down" and "barcode we've never seen" all
 * produced the same blank form. Each case now needs a different message and a
 * different recovery, so each gets its own shape.
 */
export type BarcodeLookup =
  | { kind: 'found'; name: string; category: ItemCategory }
  | { kind: 'unknown'; code: string }
  | { kind: 'offline' }
  | { kind: 'unavailable'; status: number }
  | { kind: 'cancelled' };

/** Aisle-appropriate, not web-appropriate: bad signal should fail fast. */
const LOOKUP_TIMEOUT_MS = 3000;

export async function lookupBarcode(
  code: string,
  signal?: AbortSignal,
): Promise<BarcodeLookup> {
  if (signal?.aborted) return { kind: 'cancelled' };
  if (navigator.onLine === false) return { kind: 'offline' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
      { signal: controller.signal },
    );

    if (!res.ok) return { kind: 'unavailable', status: res.status };

    const data = await res.json();
    if (data.status !== 1 || !data.product) return { kind: 'unknown', code };

    const product = data.product;
    const name: string = (product.product_name_en || product.product_name || '').trim();
    // A product record with no usable name is indistinguishable, to the user,
    // from a barcode that isn't in the database at all.
    if (!name) return { kind: 'unknown', code };

    const tags: string[] = product.categories_tags || [];
    return { kind: 'found', name, category: mapCategory(tags) };
  } catch {
    // The caller aborting is a deliberate cancel, not a failure to report.
    if (signal?.aborted) return { kind: 'cancelled' };
    // Everything else here is a timeout or a transport failure: from the
    // aisle, both mean the same thing — the database is out of reach.
    return { kind: 'offline' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
