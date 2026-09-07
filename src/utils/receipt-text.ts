/**
 * Turning the text off a photographed receipt into grocery items.
 *
 * The old parser was a blocklist: it dropped a line only if the line matched
 * one of a couple of dozen patterns, and kept everything else. A receipt is
 * mostly *not* products — store address, register and transaction codes, member
 * numbers, card digits, tender and totals — so the survivors were largely junk,
 * and the junk was then written into the pantry verbatim as its display name.
 *
 * This module inverts that. A line is a product because it *carries a price*,
 * with the blocklist demoted to a second stage that only has to catch the lines
 * which genuinely do have prices — totals, tax and tender. Everything else has
 * to earn its way in rather than merely fail to be excluded.
 *
 * Pure by design: no database, no DOM, no network. That is what lets the whole
 * of it be exercised in node against a table of real receipt lines, which is
 * the only test this repo can offer.
 */

import { depluralize } from './normalize';
import type { ItemCategory } from '../models/types';

/**
 * One line as OCR read it. `confidence` is tesseract's own 0-100 mean for the
 * line; it is the signal that decides whether an item is offered ticked or
 * parked under "Not sure about these".
 */
export interface OcrLine {
  text: string;
  confidence: number;
}

/** A product this receipt says was bought. */
export interface ReceiptItem {
  /** Clean display name, ready to be a pantry row. */
  name: string;
  /** The receipt line it came from. Shown, so a guess is visible and correctable. */
  line: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  /** False when OCR or the vocabulary was unsure. The sheet leaves these unticked. */
  confident: boolean;
}

// ── Vocabulary ───────────────────────────────────────────────────
//
// Receipt names are upper-case and consonant-squeezed, because a thermal head
// has about 20 characters to work with. Expansion is what makes them comparable
// with the names a person types.
//
// The expansions are chosen to land on words `normalize.ts` already knows:
// `whole`, `boneless`, `skinless`, `organic`, `frozen` and `ground` are all in
// its MODIFIERS list, so `GV WHL MILK GAL` reduces to `milk` through machinery
// that already exists rather than a second copy of it. That is also why
// expansion has to run *before* normalizeIngredientName, never after.

const RECEIPT_ABBREVIATIONS: Record<string, string> = {
  // Descriptors
  WHL: 'whole', WHT: 'white', BRN: 'brown', YLW: 'yellow',
  GRN: 'green', BLK: 'black', ORG: 'organic', ORGNC: 'organic',
  NAT: 'natural', REG: 'regular', LG: 'large', LRG: 'large', SM: 'small',
  MED: 'medium', XL: 'large', JMB: 'jumbo', MINI: 'mini', BBY: 'baby',
  FRSH: 'fresh', FRZ: 'frozen', FRZN: 'frozen', RFRG: 'refrigerated',
  GRND: 'ground', GRD: 'ground', SHRD: 'shredded', SHRDD: 'shredded',
  SLCD: 'sliced', CHPD: 'chopped', DCD: 'diced', CRSHD: 'crushed',
  BNLS: 'boneless', BNLSS: 'boneless', SKNLS: 'skinless', SKNLSS: 'skinless',
  UNSLT: 'unsalted', SLTD: 'salted', SWT: 'sweet', UNSWT: 'unsweetened',
  LTE: 'light', HVY: 'heavy', XTRA: 'extra', XTR: 'extra',
  PLN: 'plain', RSTD: 'roasted', TSTD: 'toasted', SMKD: 'smoked',
  DRY: 'dry', DRD: 'dried', RIPE: 'ripe', SEEDLESS: 'seedless',
  LOFAT: 'low fat', LWFT: 'low fat',
  WHTWHT: 'whole wheat',

  // Dairy and eggs
  MLK: 'milk', CHZ: 'cheese', CHS: 'cheese', CHDR: 'cheddar', MOZZ: 'mozzarella',
  MOZ: 'mozzarella', PARM: 'parmesan', SWS: 'swiss', AMER: 'american',
  CRM: 'cream', CRMR: 'creamer', SRCRM: 'sour cream', YOG: 'yogurt',
  YOGRT: 'yogurt', YGRT: 'yogurt', BTR: 'butter', BUTR: 'butter',
  MARG: 'margarine', EGG: 'egg', EGGS: 'eggs', CTG: 'cottage', GRK: 'greek',
  HLFHLF: 'half and half', WHIP: 'whipped',

  // Meat and seafood
  CHKN: 'chicken', CHK: 'chicken', CHIK: 'chicken', BRST: 'breast',
  THGH: 'thigh', DRUM: 'drumstick', WNG: 'wing', BF: 'beef', BEF: 'beef',
  STK: 'steak', RST: 'roast', PRK: 'pork', CHP: 'chop', HAM: 'ham',
  BCN: 'bacon', SSG: 'sausage', SAUS: 'sausage', TRKY: 'turkey',
  TURK: 'turkey', LMB: 'lamb', VEAL: 'veal', RIB: 'rib', LOIN: 'loin',
  TNDR: 'tenderloin', PATTY: 'patty', FRANK: 'frankfurter',
  SHRMP: 'shrimp', SHRM: 'shrimp', SLMN: 'salmon', SALM: 'salmon',
  TUNA: 'tuna', TILAP: 'tilapia', COD: 'cod', CRAB: 'crab', SCLP: 'scallop',
  FLLT: 'fillet', FILET: 'fillet',

  // Produce
  BNNA: 'banana', BNANA: 'banana', BAN: 'banana', APPL: 'apple',
  ORNG: 'orange', ORNGE: 'orange', LMN: 'lemon', LME: 'lime',
  STRWB: 'strawberry', STRAW: 'strawberry', BLUB: 'blueberry',
  RSPB: 'raspberry', BLKB: 'blackberry', GRP: 'grape', GRPS: 'grapes',
  MELN: 'melon', WTRMLN: 'watermelon', CANT: 'cantaloupe', PNPPL: 'pineapple',
  PEAR: 'pear', PCH: 'peach', PLM: 'plum', AVCD: 'avocado', AVO: 'avocado',
  TOM: 'tomato', TOMS: 'tomato', TMTO: 'tomato', PTATO: 'potato',
  ONN: 'onion', ONIN: 'onion', GRLC: 'garlic',
  CRRT: 'carrot', CARR: 'carrot', CLRY: 'celery', BROC: 'broccoli',
  BRCLI: 'broccoli', CAUL: 'cauliflower', SPNCH: 'spinach', SPIN: 'spinach',
  LETT: 'lettuce', LTTC: 'lettuce', ROM: 'romaine', CBBG: 'cabbage',
  CUCM: 'cucumber', CUKE: 'cucumber', PEPP: 'pepper', PPR: 'pepper',
  MSHRM: 'mushroom', MUSH: 'mushroom', ZUCC: 'zucchini', SQSH: 'squash',
  ASPRG: 'asparagus', GRNBN: 'green bean', CORN: 'corn', PEAS: 'peas',
  KALE: 'kale', CILAN: 'cilantro', PRSLY: 'parsley', BSL: 'basil',
  GNGR: 'ginger', SCLN: 'green onion', SHLT: 'shallot',
  VEG: 'vegetable', VEGS: 'vegetables', FRT: 'fruit',

  // Grains and bakery
  BRD: 'bread', BRED: 'bread', SNDWCH: 'sandwich', SDWCH: 'sandwich',
  SNDW: 'sandwich', BGL: 'bagel', BUN: 'bun', BUNS: 'buns', RLL: 'roll',
  TRTLLA: 'tortilla', TORT: 'tortilla', PITA: 'pita', MUFF: 'muffin',
  ENG: 'english', CRKR: 'cracker', CRCKR: 'cracker', CRL: 'cereal',
  CEREAL: 'cereal', OATML: 'oatmeal', OAT: 'oat', OATS: 'oats',
  RCE: 'rice', PSTA: 'pasta', SPAG: 'spaghetti', SPGHT: 'spaghetti',
  MCRN: 'macaroni', NDL: 'noodle', NOOD: 'noodle', FLR: 'flour',
  QUIN: 'quinoa', GRNLA: 'granola', WAFF: 'waffle', PNCK: 'pancake',
  BISC: 'biscuit', CRUST: 'crust',

  // Pantry, condiments, baking
  SGR: 'sugar', SUG: 'sugar', SLT: 'salt', PPPR: 'pepper', SPC: 'spice',
  CNMN: 'cinnamon', VNLA: 'vanilla', VAN: 'vanilla', BKNG: 'baking',
  PWDR: 'powder', YST: 'yeast', HNY: 'honey', SYR: 'syrup',
  MPL: 'maple', JLY: 'jelly', JAM: 'jam', PNT: 'peanut', PB: 'peanut butter',
  ALMND: 'almond', CSHW: 'cashew', WLNT: 'walnut', PCN: 'pecan',
  KTCHP: 'ketchup', CTSP: 'ketchup', MST: 'mustard', MUST: 'mustard',
  MAYO: 'mayonnaise', MYO: 'mayonnaise', RNCH: 'ranch', BBQ: 'barbecue',
  SLSA: 'salsa', HMS: 'hummus', GUAC: 'guacamole', VNGR: 'vinegar',
  OLV: 'olive', VEGOIL: 'vegetable oil', CNLA: 'canola', SOY: 'soy',
  SCE: 'sauce', SAUC: 'sauce', DRSNG: 'dressing', DRSG: 'dressing',
  BROTH: 'broth', STCK: 'stock', SOUP: 'soup', BNS: 'beans',
  LNTL: 'lentil', CHKPEA: 'chickpea', TOFU: 'tofu',

  // Drinks
  JCE: 'juice', JUC: 'juice', WTR: 'water', SPRK: 'sparkling',
  COF: 'coffee', COFF: 'coffee', CFE: 'coffee', TEA: 'tea',
  SODA: 'soda', COLA: 'cola', LMND: 'lemonade', SMTH: 'smoothie',
  BEER: 'beer', WNE: 'wine', SLTZR: 'seltzer',

  // Snacks and sweets
  CHOC: 'chocolate', CHCLT: 'chocolate', CKY: 'cookie', COOK: 'cookie',
  CNDY: 'candy', CHIP: 'chip', CHPS: 'chips', PRTZL: 'pretzel',
  PPCRN: 'popcorn', NUT: 'nut', NUTS: 'nuts', BAR: 'bar', ICECRM: 'ice cream',
  ICCRM: 'ice cream', PIZZ: 'pizza', PIZ: 'pizza',
};

/**
 * Store brands. Dropped, and only at the head of a line, where they sit — a
 * `GV` in the middle of a name is far more likely to be OCR debris than
 * Great Value.
 */
const BRAND_PREFIXES = new Set([
  'GV', 'KRO', 'KRGR', 'TJ', '365', 'SB', 'MKT', 'HEB', 'WF', 'EQ', 'MM',
  'SIG', 'SIGNATURE', 'KS', 'ESSENTIAL', 'FAVORITE', 'SIMPLY', 'PRIVATE',
]);

/**
 * Size, pack and unit noise. These say how much was bought, not what it was,
 * and left in they defeat the vocabulary lookup.
 */
const SIZE_TOKENS = new Set([
  'GAL', 'GALLON', 'QT', 'QUART', 'PT', 'PINT', 'OZ', 'FLOZ', 'LB', 'LBS',
  'G', 'KG', 'ML', 'L', 'LTR', 'LITER', 'CT', 'CNT', 'COUNT', 'PK', 'PACK',
  'PKG', 'PCK', 'EA', 'EACH', 'BAG', 'BOX', 'BTL', 'BOTTLE', 'CAN', 'CANS',
  'JAR', 'TUB', 'CTN', 'CARTON', 'DZ', 'DOZ', 'DOZEN', 'ROLL', 'SLC',
  'PC', 'PCS', 'SZ', 'SIZE', 'FAMILY', 'VALUE', 'BONUS', 'TWIN',
]);

/**
 * Canonical grocery names and the category each belongs to.
 *
 * Three jobs: it is the evidence a line is food at all, it supplies a clean
 * display name, and it supplies a real category so extras stop landing under
 * "Other". Scoring prefers the longest phrase that fits, which is what keeps
 * `almond milk` from collapsing into `milk` — they are different products and
 * only one of them may be on the list.
 */
const PRODUCT_VOCABULARY: Record<string, ItemCategory> = {
  // Produce
  apple: 'produce', banana: 'produce', orange: 'produce', lemon: 'produce',
  lime: 'produce', grape: 'produce', strawberry: 'produce', blueberry: 'produce',
  raspberry: 'produce', blackberry: 'produce', watermelon: 'produce',
  cantaloupe: 'produce', pineapple: 'produce', mango: 'produce', pear: 'produce',
  peach: 'produce', plum: 'produce', cherry: 'produce', kiwi: 'produce',
  avocado: 'produce', tomato: 'produce', potato: 'produce', 'sweet potato': 'produce',
  onion: 'produce', 'green onion': 'produce', garlic: 'produce', ginger: 'produce',
  carrot: 'produce', celery: 'produce', broccoli: 'produce', cauliflower: 'produce',
  spinach: 'produce', lettuce: 'produce', 'romaine lettuce': 'produce',
  cabbage: 'produce', cucumber: 'produce', pepper: 'produce', 'bell pepper': 'produce',
  mushroom: 'produce', zucchini: 'produce', squash: 'produce', asparagus: 'produce',
  'green bean': 'produce', corn: 'produce', pea: 'produce', kale: 'produce',
  cilantro: 'produce', parsley: 'produce', basil: 'produce', shallot: 'produce',
  leek: 'produce', radish: 'produce', beet: 'produce', eggplant: 'produce',
  salad: 'produce', 'salad mix': 'produce', coleslaw: 'produce',

  // Dairy
  milk: 'dairy', 'almond milk': 'dairy', 'oat milk': 'dairy', 'soy milk': 'dairy',
  'coconut milk': 'dairy', cheese: 'dairy', cheddar: 'dairy', mozzarella: 'dairy',
  parmesan: 'dairy', 'cream cheese': 'dairy', 'cottage cheese': 'dairy',
  'sour cream': 'dairy', cream: 'dairy', 'heavy cream': 'dairy',
  'half and half': 'dairy', creamer: 'dairy', yogurt: 'dairy', 'greek yogurt': 'dairy',
  butter: 'dairy', margarine: 'dairy', egg: 'dairy',

  // Meat
  chicken: 'meat', 'chicken breast': 'meat', 'chicken thigh': 'meat',
  'chicken wing': 'meat', beef: 'meat', 'ground beef': 'meat', steak: 'meat',
  pork: 'meat', 'pork chop': 'meat', ham: 'meat', bacon: 'meat',
  sausage: 'meat', turkey: 'meat', 'ground turkey': 'meat', lamb: 'meat',
  'hot dog': 'meat', 'deli meat': 'meat', salami: 'meat', pepperoni: 'meat',

  // Seafood
  shrimp: 'seafood', salmon: 'seafood', tuna: 'seafood', tilapia: 'seafood',
  cod: 'seafood', crab: 'seafood', scallop: 'seafood', fish: 'seafood',

  // Grains
  bread: 'grains', bagel: 'grains', bun: 'grains', roll: 'grains',
  tortilla: 'grains', pita: 'grains', muffin: 'grains', 'english muffin': 'grains',
  cracker: 'grains', cereal: 'grains', oatmeal: 'grains', oat: 'grains',
  rice: 'grains', pasta: 'grains', spaghetti: 'grains', macaroni: 'grains',
  noodle: 'grains', quinoa: 'grains', granola: 'grains', couscous: 'grains',

  // Canned
  'canned tomato': 'canned', 'tomato sauce': 'canned', 'tomato paste': 'canned',
  bean: 'canned', 'black bean': 'canned', 'kidney bean': 'canned',
  chickpea: 'canned', lentil: 'canned', soup: 'canned', broth: 'canned',
  stock: 'canned', olive: 'canned', 'coconut cream': 'canned',

  // Frozen
  'ice cream': 'frozen', pizza: 'frozen', waffle: 'frozen', 'frozen fruit': 'frozen',
  'french fries': 'frozen', 'frozen vegetable': 'frozen',

  // Snacks
  chip: 'snacks', 'tortilla chip': 'snacks', pretzel: 'snacks', popcorn: 'snacks',
  nut: 'snacks', almond: 'snacks', cashew: 'snacks', walnut: 'snacks',
  pecan: 'snacks', peanut: 'snacks', cookie: 'snacks', candy: 'snacks',
  chocolate: 'snacks', 'granola bar': 'snacks', 'trail mix': 'snacks',
  'protein bar': 'snacks',

  // Beverages
  water: 'beverages', 'sparkling water': 'beverages', seltzer: 'beverages',
  juice: 'beverages', 'orange juice': 'beverages', 'apple juice': 'beverages',
  coffee: 'beverages', tea: 'beverages', soda: 'beverages', cola: 'beverages',
  lemonade: 'beverages', beer: 'beverages', wine: 'beverages',
  'energy drink': 'beverages', 'sports drink': 'beverages',

  // Condiments
  ketchup: 'condiments', mustard: 'condiments', mayonnaise: 'condiments',
  'salad dressing': 'condiments', dressing: 'condiments', ranch: 'condiments',
  barbecue: 'condiments', 'barbecue sauce': 'condiments', 'soy sauce': 'condiments',
  'hot sauce': 'condiments', salsa: 'condiments', hummus: 'condiments',
  guacamole: 'condiments', vinegar: 'condiments', 'olive oil': 'condiments',
  'vegetable oil': 'condiments', 'canola oil': 'condiments', oil: 'condiments',
  'peanut butter': 'condiments', jam: 'condiments', jelly: 'condiments',
  honey: 'condiments', syrup: 'condiments', 'maple syrup': 'condiments',
  pickle: 'condiments', relish: 'condiments', sauce: 'condiments',

  // Baking
  flour: 'baking', sugar: 'baking', 'brown sugar': 'baking',
  'powdered sugar': 'baking', 'baking powder': 'baking', 'baking soda': 'baking',
  yeast: 'baking', 'vanilla extract': 'baking', vanilla: 'baking',
  'chocolate chip': 'baking', cocoa: 'baking', 'corn starch': 'baking',
  'cake mix': 'baking', 'pie crust': 'baking',

  // Spices
  salt: 'spices', cinnamon: 'spices', paprika: 'spices', cumin: 'spices',
  oregano: 'spices', thyme: 'spices', rosemary: 'spices', 'chili powder': 'spices',
  'garlic powder': 'spices', 'onion powder': 'spices', 'bay leaf': 'spices',
  turmeric: 'spices', 'curry powder': 'spices', 'black pepper': 'spices',
  'red pepper': 'spices', nutmeg: 'spices', 'italian seasoning': 'spices',

  // Other real groceries that still deserve a clean name
  tofu: 'other', 'paper towel': 'other', 'toilet paper': 'other',
  'dish soap': 'other', detergent: 'other', 'trash bag': 'other',
  foil: 'other', 'plastic wrap': 'other', napkin: 'other', sponge: 'other',
};

/**
 * Singular, for comparison only.
 *
 * `depluralize` has no rule for `-oes`, so `tomatoes` reduces to `tomatoe` and
 * never meets `tomato`. Fixing it there is not an option: its output is the
 * persisted join key on every stored row, and changing the function would
 * orphan the keys already in IndexedDB. So the extra rule lives here, where it
 * only ever affects a vocabulary lookup.
 */
function singular(word: string): string {
  return word.endsWith('oes') ? word.slice(0, -2) : depluralize(word);
}

const VOCABULARY_ENTRIES: { phrase: string; words: string[]; category: ItemCategory }[] =
  Object.entries(PRODUCT_VOCABULARY).map(([phrase, category]) => ({
    phrase,
    words: phrase.split(' ').map(singular),
    category,
  }));

/**
 * Line text with the confidence tesseract had in it.
 *
 * Word-level output is requested for exactly this: a line the OCR was unsure
 * of should be offered to the user unticked rather than written into the
 * pantry, and there is no way to know that from the plain text. Lines are
 * re-sorted top to bottom because a quantity line only means anything when it
 * still follows the item it belongs to, and block order does not guarantee it.
 */
export function linesFromOcr(data: { text: string; confidence: number; blocks: unknown }): OcrLine[] {
  const blocks = data.blocks as
    | { lines?: { text: string; confidence: number; bbox: { y0: number } }[] }[]
    | null
    | undefined;

  if (blocks && blocks.length > 0) {
    const found: { text: string; confidence: number; y: number }[] = [];
    for (const block of blocks) {
      for (const line of block.lines ?? []) {
        const text = line.text.replace(/\s+/g, ' ').trim();
        if (text.length >= 2) {
          found.push({ text, confidence: line.confidence, y: line.bbox.y0 });
        }
      }
    }
    if (found.length > 0) {
      found.sort((a, b) => a.y - b.y);
      return found.map(({ text, confidence }) => ({ text, confidence }));
    }
  }

  // No structure came back. Read the flat text and let the page's own
  // confidence stand in for every line of it.
  return data.text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length >= 2)
    .map(text => ({ text, confidence: data.confidence }));
}

// ── Line shapes ──────────────────────────────────────────────────

/**
 * A price at the end of the line, which is what makes a line a product.
 *
 * Captures the sign either way round, because a refund prints as both `-1.29`
 * and `1.29-` depending on the register, and the trailing tax flag (`T`, `F`,
 * `N`, `X`, `O`) that most US receipts stamp on every taxable row.
 */
const PRICE_AT_END = /(-)?\$?(\d{1,4}(?:,\d{3})*\.\d{2})\s*(-)?\s*[A-Z]{0,2}\s*$/;

/** `WHT SDWCH BRD 2/$5.00` — a multi-buy, where the count is the quantity. */
const MULTI_BUY_AT_END = /\s(\d{1,2})\s*\/\s*\$?\d{1,4}\.\d{2}\s*[A-Z]{0,2}\s*$/;

/** `2 @ 3.49` on its own line: the count for the item printed above it. */
const COUNT_CONTINUATION = /^\s*(\d{1,3})\s*(?:@|AT)\s*\$?\d{1,4}\.\d{2}/i;

/** `0.84 lb @ 2.99/lb`: a weighed item's amount, again for the line above. */
const WEIGHT_CONTINUATION = /^\s*(\d{1,3}(?:\.\d{1,3})?)\s*(lb|lbs|kg|oz|g)\b\s*(?:@|AT)/i;

/**
 * Lines that carry a price but are not shopping.
 *
 * This list survives from the old parser and is still load-bearing, because
 * the price anchor cannot tell a total from a tin of beans — both are words
 * followed by money. What changed is that it is no longer the only defence, so
 * it only has to cover the register's own vocabulary. Anchored on word
 * boundaries: the old unanchored /total/i also struck at any product whose
 * name happened to contain it.
 */
const RECEIPT_SKIP_PATTERNS = [
  /\btotals?\b/i, /\bsub\s*-?\s*total\b/i, /\btax\b/i, /\btaxable\b/i,
  /\bchange\b/i, /\bcash\b/i, /\bcredit\b/i, /\bdebit\b/i, /\bvisa\b/i,
  /\bmastercard\b/i, /\bamex\b/i, /\bdiscover\b/i, /\bbalance\b/i,
  /\bsavings\b/i, /\bsaved\b/i, /\bthank you\b/i, /\breceipt\b/i,
  /\bphone\b/i, /\bmanager\b/i, /\bcashier\b/i, /\bwelcome\b/i,
  /\bloyalty\b/i, /\breward\b/i, /\bcoupon\b/i, /\bdiscount\b/i,
  /\btender\b/i, /\btend\b/i, /\bmember\b/i, /\baccount\b/i, /\bauth\b/i,
  /\bapproval\b/i, /\bref\s*#/i, /\bterminal\b/i, /\bmerchant\b/i,
  /\bnet\s+sales\b/i, /\bitems?\s+sold\b/i, /\bgratuity\b/i, /\btip\b/i,
  /\bebt\b/i, /\bsnap\b/i, /\bwic\b/i, /\bbottle\s+dep/i, /\bdeposit\b/i,
  /\bfee\b/i, /\bsurcharge\b/i, /\bround\s*up\b/i, /\bdonation\b/i,
  /\bstore\s*#/i, /\bst\s*#/i, /\bop\s*#/i, /\bte\s*#/i, /\btr\s*#/i,
  /\breg\s*#/i, /\btrans\b/i, /\binvoice\b/i, /\bbarcode\b/i,
  /^\s*\d+\s*$/,            // a bare number
  /^\s*[*#\-=_.]+\s*$/,     // a rule drawn in punctuation
  /\*{3,}/,                 // masked card digits
];

// ── Cleaning ─────────────────────────────────────────────────────

/**
 * Register codes that ride along with the product name: the item or PLU number
 * printed at the head of the line, and any long digit run left inside it.
 */
function stripCodes(text: string): string {
  return text
    .replace(/^\s*\d{3,}\s+/, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/^\s*\d+\s*[xX]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Digits fused to a size, as in `12OZ` or `2PK`, so the size can be dropped. */
function sizeToken(token: string): boolean {
  return SIZE_TOKENS.has(token) || SIZE_TOKENS.has(token.replace(/^\d+(\.\d+)?/, ''));
}

/**
 * A receipt name in words a person would recognise.
 *
 * Store brand goes only if it leads — a `GV` in the middle of a name is much
 * more likely to be OCR debris than Great Value, and dropping it there would
 * quietly delete a real word.
 */
export function expandReceiptName(raw: string): string {
  const tokens = stripCodes(raw)
    .toUpperCase()
    .split(/[^A-Z0-9%]+/)
    .filter(Boolean);

  const words: string[] = [];
  tokens.forEach((token, index) => {
    if (index === 0 && BRAND_PREFIXES.has(token)) return;
    if (sizeToken(token)) return;
    if (/^\d+(\.\d+)?%?$/.test(token)) return;
    const expanded = RECEIPT_ABBREVIATIONS[token];
    if (expanded) {
      words.push(...expanded.split(' '));
      return;
    }
    if (token.length >= 2) words.push(token.toLowerCase());
  });

  return words.join(' ');
}

// ── Naming and categorising ──────────────────────────────────────

/**
 * The best canonical product the expanded words support.
 *
 * Longest phrase wins, which is the rule that keeps `almond milk` from
 * collapsing into `milk`: they are different products and only one of them is
 * on the list. A phrase counts only if every one of its words is present, so a
 * partial overlap never promotes itself into a match.
 */
function lookupVocabulary(
  words: string[],
): { name: string; category: ItemCategory } | null {
  const reduced = words.map(singular);
  const present = new Set(reduced);
  let best: { name: string; category: ItemCategory; score: number; at: number } | null = null;

  for (const entry of VOCABULARY_ENTRIES) {
    if (!entry.words.every(w => present.has(w))) continue;

    // Where in the line this product is named. On a tie, the earlier word wins:
    // a receipt leads with the product and trails with the variant, so
    // `FRZ PIZZ PEPPERONI` is a pizza and not a cut of pepperoni.
    const at = Math.min(...entry.words.map(w => reduced.indexOf(w)));
    if (best && (entry.words.length < best.score
      || (entry.words.length === best.score && at >= best.at))) continue;

    best = { name: entry.phrase, category: entry.category, score: entry.words.length, at };
  }

  return best ? { name: best.name, category: best.category } : null;
}

/** Sentence case, which is the voice the rest of the app's lists use. */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Whether a name with no vocabulary hit is still worth offering ticked.
 *
 * An unusual but real product — tahini, gochujang — should not be punished for
 * being absent from a hand-written list, but OCR mush should not be waved
 * through either. The test is that it reads like words: every token alphabetic,
 * and every token carrying a vowel.
 */
function readsLikeWords(words: string[]): boolean {
  if (words.length === 0) return false;
  return words.every(w => /^[a-z]+$/.test(w) && /[aeiouy]/.test(w));
}

// ── Parsing ──────────────────────────────────────────────────────

/** How sure OCR has to be about a line before its item is offered ticked. */
const CONFIDENT_OCR = 70;
/** Below this, the words are too likely to be invented to tick on the user's behalf. */
const MINIMUM_OCR = 45;

interface PricedLine {
  /** The line with its price, codes and multi-buy count removed. */
  body: string;
  quantity: number;
  unit: string;
}

/** The product half of a priced line, or null if this line is not one. */
function readPricedLine(raw: string): PricedLine | null {
  const text = raw.trim();
  const price = PRICE_AT_END.exec(text);
  if (!price) return null;

  // A refund or a coupon. Money moved, but nothing came home.
  if (price[1] || price[3]) return null;

  let quantity = 1;
  let body = text.slice(0, price.index);

  const multi = MULTI_BUY_AT_END.exec(text);
  if (multi) {
    quantity = Number(multi[1]) || 1;
    body = text.slice(0, multi.index);
  }

  const cleaned = stripCodes(body);
  const letters = cleaned.replace(/[^A-Za-z]/g, '');
  // Words, not a code that happens to sit beside a number. `**** 1234`,
  // `ST# 1234 OP# 00` and a bare member number all fail here.
  if (letters.length < 3 || !/[A-Za-z]{2,}/.test(cleaned)) return null;

  return { body: cleaned, quantity, unit: 'count' };
}

/** A quantity line belonging to the item printed above it, or null. */
function readContinuation(raw: string): { quantity: number; unit: string } | null {
  const weight = WEIGHT_CONTINUATION.exec(raw);
  if (weight) {
    const unit = weight[2].toLowerCase().replace(/^lbs$/, 'lb');
    return { quantity: Number(weight[1]) || 1, unit };
  }
  const count = COUNT_CONTINUATION.exec(raw);
  if (count) return { quantity: Number(count[1]) || 1, unit: 'count' };
  return null;
}

function skipped(text: string): boolean {
  return RECEIPT_SKIP_PATTERNS.some(p => p.test(text));
}

/** Builds the item a cleaned product name describes. */
function toItem(body: string, line: string, quantity: number, unit: string, ocr: number): ReceiptItem | null {
  const expanded = expandReceiptName(body);
  const words = expanded.split(' ').filter(Boolean);
  if (words.length === 0) return null;

  const hit = lookupVocabulary(words);
  const name = hit ? hit.name : expanded;
  // Where the thing actually lives beats what the thing is: frozen broccoli
  // belongs with the frozen food, because that is the door it is behind. The
  // join key is unaffected — `normalize.ts` strips `frozen` as a modifier.
  const category = words.includes('frozen')
    ? 'frozen'
    : hit ? hit.category : 'other';

  // A vocabulary hit is the strong evidence; failing that the words have to at
  // least read like words. Either way OCR has to have been reasonably sure.
  const confident = ocr >= (hit ? CONFIDENT_OCR : 85)
    && (hit !== null || readsLikeWords(words));

  return { name: sentenceCase(name), line, category, quantity, unit, confident };
}

/**
 * Every product the receipt shows, in the order it was bought.
 *
 * Two passes' worth of shape in one: a priced line opens an item, and a
 * quantity line following it amends that item rather than becoming one.
 */
function parsePricedReceipt(lines: OcrLine[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;

    const continuation = readContinuation(text);
    if (continuation && items.length > 0) {
      const last = items[items.length - 1];
      last.quantity = continuation.quantity;
      last.unit = continuation.unit;
      continue;
    }

    if (skipped(text)) continue;
    if (line.confidence < MINIMUM_OCR) continue;

    const priced = readPricedLine(text);
    if (!priced) continue;

    const item = toItem(priced.body, text, priced.quantity, priced.unit, line.confidence);
    if (item) items.push(item);
  }

  return items;
}

/**
 * The reading of last resort, for a photo where the price column did not
 * survive OCR at all.
 *
 * It is the old blocklist, and it is about as trustworthy as the old blocklist
 * was — so everything it produces is marked unsure. That is the whole point:
 * requiring a price must never silently discard a receipt, and a guess must
 * never silently enter the pantry. The user is shown the guesses, unticked.
 */
function parseUnpricedReceipt(lines: OcrLine[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  for (const line of lines) {
    const text = line.text.trim();
    if (!text || skipped(text) || line.confidence < MINIMUM_OCR) continue;
    if (readContinuation(text)) continue;

    const cleaned = stripCodes(text.replace(PRICE_AT_END, ''));
    if (cleaned.replace(/[^A-Za-z]/g, '').length < 3) continue;

    const item = toItem(cleaned, text, 1, 'count', line.confidence);
    if (item) items.push({ ...item, confident: false });
  }

  return items;
}

/** Below this many priced lines, the price column cannot be trusted as an anchor. */
const MINIMUM_PRICED_LINES = 3;
/** Nor can it if it covers too little of the page. */
const MINIMUM_PRICED_SHARE = 0.25;

/**
 * The receipt, read.
 *
 * Deduplicated on the display name, because a receipt that lists the same
 * product twice is one pantry row either way — presence is what the pantry
 * records, not a count of purchases.
 */
export function parseReceipt(lines: OcrLine[]): ReceiptItem[] {
  const substantial = lines.filter(l => l.text.trim().replace(/[^A-Za-z]/g, '').length >= 3);
  const priced = substantial.filter(l => PRICE_AT_END.test(l.text.trim()));

  const trustPrices =
    priced.length >= MINIMUM_PRICED_LINES &&
    priced.length >= substantial.length * MINIMUM_PRICED_SHARE;

  const items = trustPrices ? parsePricedReceipt(lines) : parseUnpricedReceipt(lines);

  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
