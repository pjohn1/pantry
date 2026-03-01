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

function namesMatch(receiptNorm: string, groceryNorm: string): boolean {
  if (receiptNorm === groceryNorm) return true;

  // Direct substring containment
  if (receiptNorm.includes(groceryNorm) || groceryNorm.includes(receiptNorm)) return true;

  // All meaningful words in grocery name appear in receipt name
  const groceryWords = groceryNorm.split(' ').filter(w => w.length > 2);
  if (groceryWords.length > 0 && groceryWords.every(w => receiptNorm.includes(w))) return true;

  return false;
}

export interface ReceiptProcessResult {
  matched: GroceryListItem[];
  totalReceiptItems: number;
}

export async function processReceiptAgainstGroceryList(
  receiptItemNames: string[],
): Promise<ReceiptProcessResult> {
  const db = await getDB();
  const groceryItems = await db.getAll('groceryList');

  const normalizedReceipt = receiptItemNames.map(name => normalizeIngredientName(name));

  const matched: GroceryListItem[] = [];

  for (const grocery of groceryItems) {
    const hit = normalizedReceipt.some(rNorm => namesMatch(rNorm, grocery.normalizedName));
    if (hit) matched.push(grocery);
  }

  // Add matched items to pantry and remove from grocery list
  for (const item of matched) {
    await addPantryItemFromPurchase(
      item.name, item.normalizedName, item.quantity, item.unit, item.category,
    );
  }

  if (matched.length > 0) {
    const tx = db.transaction('groceryList', 'readwrite');
    for (const item of matched) {
      await tx.objectStore('groceryList').delete(item.id);
    }
    await tx.done;
  }

  const remaining = await db.getAll('groceryList');
  emit('grocery-count', remaining.filter(i => !i.checked).length);

  return { matched, totalReceiptItems: receiptItemNames.length };
}
