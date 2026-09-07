import { getDB } from '../db/database';
import type { GroceryListItem } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';
import { addPantryItemFromPurchase } from './pantry.service';
import { emit } from '../utils/events';

// Strip trailing price, quantity codes, and barcode numbers from a receipt line
function stripReceiptNoise(line: string): string {
  let text = line;
  // Remove trailing price like "1.29", "$1.29", "1,234.56 T", "1.29 F"
  text = text.replace(/\s+\$?\d{1,3}(?:[,]\d{3})*[.]\d{2}\s*[A-Z]?\s*$/, '');
  // Remove leading quantity like "2 x ", "3X "
  text = text.replace(/^\d+\s*[xX]\s+/, '');
  // Remove barcode / SKU sequences (5+ digits)
  text = text.replace(/\b\d{5,}\b/g, '');
  return text.trim();
}

const RECEIPT_SKIP_PATTERNS = [
  /total/i, /subtotal/i, /sub-total/i, /\btax\b/i, /\btax\s/i,
  /change/i, /\bcash\b/i, /credit/i, /debit/i, /\bvisa\b/i,
  /mastercard/i, /amex/i, /discover/i, /balance/i, /savings/i,
  /thank you/i, /receipt/i, /\bstore\b/i, /\bphone\b/i,
  /manager/i, /cashier/i, /\bdate\b/i, /\btime\b/i,
  /welcome/i, /loyalty/i, /reward/i, /coupon/i, /discount/i,
  /^\s*\d+\s*$/, // pure numbers
  /^\s*[*#\-=]+\s*$/, // separator lines
];

export function parseReceiptLines(rawLines: string[]): string[] {
  const results: string[] = [];

  for (const line of rawLines) {
    if (RECEIPT_SKIP_PATTERNS.some(p => p.test(line))) continue;

    const cleaned = stripReceiptNoise(line);
    if (cleaned.length >= 2) {
      results.push(cleaned);
    }
  }

  return results;
}

/**
 * Whole-word alignment rather than raw containment.
 *
 * The old test asked whether either string contained the other, which made
 * "milk" claim "oat milk", "almond milk" and "milk chocolate". A wrong match
 * moved a row the user did not buy into the pantry and deleted it off the
 * list, silently — the worst failure shape for a product whose success
 * condition is that the ledger is true.
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
  /** Lines that look like products but are on no list row. */
  unmatched: string[];
}

/**
 * Reads only. The receipt used to move a dozen rows between two stores the
 * instant the photo finished, with nothing on screen and no way back; matching
 * and applying are now two steps with the user's decision in between.
 */
export async function matchReceiptAgainstGroceryList(
  receiptItemNames: string[],
): Promise<ReceiptReview> {
  const db = await getDB();
  const groceryItems = await db.getAll('groceryList');

  const normalized = receiptItemNames.map(name => ({
    line: name,
    norm: normalizeIngredientName(name),
  }));

  const matched: ReceiptMatch[] = [];
  const claimed = new Set<string>();

  for (const grocery of groceryItems) {
    const hit = normalized.find(r => namesMatch(r.norm, grocery.normalizedName));
    if (!hit) continue;
    matched.push({ item: grocery, line: hit.line });
    claimed.add(hit.line);
  }

  // Everything else you bought. PRODUCT.md promises "receipt photo → pantry
  // population", and these lines used to be parsed and then thrown away.
  const unmatched = normalized
    .filter(r => !claimed.has(r.line) && r.norm.length >= 3)
    .map(r => r.line);

  return { matched, unmatched: dedupe(unmatched) };
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
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

/** For a receipt line that was never on the list but is now in the cupboard. */
export async function addReceiptLineToPantry(line: string): Promise<void> {
  await addPantryItemFromPurchase(
    line, normalizeIngredientName(line), 1, 'count', 'other',
  );
}
