import { normalizeIngredientName } from './normalize';

export interface ParsedIngredient {
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '\u00BC': 0.25, // 1/4
  '\u00BD': 0.5,  // 1/2
  '\u00BE': 0.75, // 3/4
  '\u2153': 1/3,  // 1/3
  '\u2154': 2/3,  // 2/3
  '\u215B': 0.125, // 1/8
  '\u215C': 0.375, // 3/8
  '\u215D': 0.625, // 5/8
  '\u215E': 0.875, // 7/8
};

const UNIT_PATTERN = '(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|g|grams?|kg|kilograms?|lb|lbs?|pounds?|ml|milliliters?|l|liters?|litres?|cloves?|slices?|pieces?|bunch(?:es)?|heads?|cans?|bags?|boxes?|jars?|packages?|pkg|pinch(?:es)?|dash(?:es)?|stalks?|sprigs?|handfuls?|sticks?)';

const INGREDIENT_RE = new RegExp(
  `^(?:([\\d\\s./\u00BC-\u00BE\u2150-\u215E]+(?:\\s*-\\s*[\\d./\u00BC-\u00BE\u2150-\u215E]+)?)\\s*)?(?:(${UNIT_PATTERN})\\s+(?:of\\s+)?)?(.+)$`,
  'i'
);

function parseFraction(s: string): number {
  s = s.trim();
  // Replace unicode fractions
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(char)) {
      const before = s.replace(char, '').trim();
      return (before ? parseFloat(before) : 0) + val;
    }
  }
  // Handle "1 1/2" or "1/2"
  const parts = s.split(/\s+/);
  let total = 0;
  for (const part of parts) {
    if (part.includes('/')) {
      const [num, den] = part.split('/');
      total += parseFloat(num) / parseFloat(den);
    } else {
      total += parseFloat(part);
    }
  }
  return isNaN(total) ? 1 : total;
}

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().replace(/s$/, '');
  const map: Record<string, string> = {
    cup: 'cups', tablespoon: 'tbsp', teaspoon: 'tsp',
    ounce: 'oz', gram: 'g', kilogram: 'kg',
    pound: 'lb', lb: 'lb', milliliter: 'ml',
    liter: 'l', litre: 'l', package: 'package', pkg: 'package',
    clove: 'cloves', slice: 'slices', piece: 'pieces',
    bunch: 'bunch', head: 'head', can: 'can', bag: 'bag',
    box: 'box', jar: 'jar', pinch: 'pinch', dash: 'dash',
    stalk: 'stalks', sprig: 'sprigs', handful: 'handfuls', stick: 'sticks',
  };
  return map[u] || u;
}

export function parseIngredient(raw: string): ParsedIngredient {
  const trimmed = raw.trim();
  const match = trimmed.match(INGREDIENT_RE);

  if (!match || !match[3]) {
    return {
      name: trimmed,
      normalizedName: normalizeIngredientName(trimmed),
      quantity: null,
      unit: 'count',
    };
  }

  const [, qtyStr, unitStr, nameStr] = match;
  return {
    name: nameStr.trim(),
    normalizedName: normalizeIngredientName(nameStr),
    quantity: qtyStr ? parseFraction(qtyStr) : null,
    unit: unitStr ? normalizeUnit(unitStr) : 'count',
  };
}
