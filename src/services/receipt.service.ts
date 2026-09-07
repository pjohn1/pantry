import { getDB } from '../db/database';
import type { GroceryListItem } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';
import { addPantryItemFromPurchase } from './pantry.service';
import { emit } from '../utils/events';
import { parseReceipt, type OcrLine, type ReceiptItem } from '../utils/receipt-text';

export type { ReceiptItem } from '../utils/receipt-text';

/**
 * Reading a receipt is all in `utils/receipt-text.ts`, which is pure and can
 * therefore be tested. This file is the part that needs the database: deciding
 * which of the products read off the receipt are already on the shopping list,
 * and writing the user's decision once they have made it.
 */
export function readReceipt(lines: OcrLine[]): ReceiptItem[] {
  return parseReceipt(lines);
}

/**
 * Whole-word alignment rather than raw containment.
 *
 * The old test asked whether either string contained the other, which made
 * "milk" claim "oat milk", "almond milk" and "milk chocolate". A wrong match
 * moved a row the user did not buy into the pantry and deleted it off the
 * list, silently — the worst failure shape for a product whose success
 * condition is that the ledger is true.
 *
 * It is deliberately still this strict. What changed is upstream: a receipt
 * name is now canonicalised against the product vocabulary *before* it gets
 * here, so `WHT SDWCH BRD` arrives as `bread` and matches a list row `bread`
 * exactly. Relaxing this function instead — letting a one-word name match the
 * last word of a longer one — would have re-broken `oat milk`, which the
 * vocabulary keeps as a product in its own right.
 */
function words(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

function namesMatch(receiptNorm: string, groceryNorm: string): boolean {
  if (receiptNorm === groceryNorm) return true;

  const receiptWords = words(receiptNorm);
  const groceryWords = words(groceryNorm);
  if (receiptWords.length === 0 || groceryWords.length === 0) return false;

  const receiptSet = new Set(receiptWords);

  // Every word of the shorter name has to appear whole in the longer one. A
  // one-word grocery name therefore no longer matches a two-word receipt line
  // that merely happens to contain it as a modifier.
  if (groceryWords.length <= receiptWords.length) {
    if (!groceryWords.every(w => receiptSet.has(w))) return false;
  } else {
    const grocerySet = new Set(groceryWords);
    if (!receiptWords.every(w => grocerySet.has(w))) return false;
  }

  // Single-word names have to be exact: "milk" and "oat milk" are different
  // products, and only one of them is on the list.
  return !(groceryWords.length === 1 && receiptWords.length > 1)
    && !(receiptWords.length === 1 && groceryWords.length > 1);
}

export interface ReceiptMatch {
  item: GroceryListItem;
  /** The receipt line that matched, so a guess is visible and correctable. */
  line: string;
}

export interface ReceiptReview {
  matched: ReceiptMatch[];
  /** Everything else the receipt says was bought. */
  extras: ReceiptItem[];
}

/**
 * Reads only. The receipt used to move a dozen rows between two stores the
 * instant the photo finished, with nothing on screen and no way back; matching
 * and applying are now two steps with the user's decision in between.
 */
export async function matchReceiptAgainstGroceryList(
  items: ReceiptItem[],
): Promise<ReceiptReview> {
  const db = await getDB();
  const groceryItems = await db.getAll('groceryList');

  const normalized = items.map(item => ({
    item,
    norm: normalizeIngredientName(item.name),
  }));

  const matched: ReceiptMatch[] = [];
  const claimed = new Set<ReceiptItem>();

  for (const grocery of groceryItems) {
    // Skipping what is already claimed is load-bearing: without it two list
    // rows could both match the same receipt line, and a single purchase would
    // clear two rows off the list and stamp two pantry rows as bought.
    const hit = normalized.find(
      r => !claimed.has(r.item) && namesMatch(r.norm, grocery.normalizedName),
    );
    if (!hit) continue;
    matched.push({ item: grocery, line: hit.item.line });
    claimed.add(hit.item);
  }

  const extras = normalized
    .filter(r => !claimed.has(r.item) && r.norm.length >= 2)
    .map(r => r.item);

  return { matched, extras };
}

/** Moves the rows the user confirmed, and only those. */
export async function applyReceiptMatches(matches: ReceiptMatch[]): Promise<void> {
  if (matches.length === 0) return;
  const db = await getDB();

  for (const { item } of matches) {
    await addPantryItemFromPurchase(
      item.name, item.normalizedName, item.quantity, item.unit, item.category,
    );
  }

  const tx = db.transaction('groceryList', 'readwrite');
  for (const { item } of matches) {
    await tx.objectStore('groceryList').delete(item.id);
  }
  await tx.done;

  const remaining = await db.getAll('groceryList');
  emit('grocery-count', remaining.length);
}

/**
 * For a product that was never on the list but is now in the cupboard.
 *
 * It arrives with a real name, a real category and whatever quantity the
 * receipt stated. The old version of this took a raw OCR line and stored it
 * verbatim as the display name under `other`, which is how `GV WHL MILK GAL`
 * ended up being the name of something in the pantry.
 */
export async function addReceiptItemToPantry(item: ReceiptItem): Promise<void> {
  await addPantryItemFromPurchase(
    item.name,
    normalizeIngredientName(item.name),
    item.quantity,
    item.unit,
    item.category,
  );
}
