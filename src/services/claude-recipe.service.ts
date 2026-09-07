import {
  CATEGORIES,
  CATEGORY_LABELS,
  UNITS,
  coerceCategory,
  type PantryItem,
  type RecipeOptions,
  type SavedRecipe,
  type SavedRecipeIngredient,
} from '../models/types';

/**
 * The Claude hand-off.
 *
 * This is the one path by which pantry contents leave the device, and it leaves
 * as a link the user taps — the app makes no request, holds no key, and talks
 * to no server. Nothing is transmitted until the user taps send inside Claude.
 *
 * Everything here is pure: no database, no network, no DOM beyond `DOMParser`,
 * which is used as a parser and never renders. That is what lets the whole
 * round trip be tested by reading one file.
 */

/** The element Claude is told to embed, and the one this module reads back. */
export const RECIPE_SCRIPT_TYPE = 'application/pantry-recipes+json';

/** Anthropic documents roughly a 14,000-character ceiling on `q`. Stop well
 *  short of it: a link that silently truncates is worse than a shorter list. */
const MAX_URL_LENGTH = 12000;

/** Three is what fits on a phone screen and what a person actually reads. */
const RECIPE_COUNT = 3;

function itemLine(item: PantryItem, detailed: boolean): string {
  if (!detailed) return `- ${item.name}`;
  const amount = item.quantity > 0 ? `${item.quantity} ${item.unit}` : item.unit;
  return `- ${item.name} (${amount}, ${CATEGORY_LABELS[item.category].toLowerCase()})`;
}

/** How the sliders and the segmented control read as a sentence. */
function askLine(options: RecipeOptions): string {
  const serves = options.servings === 1 ? 'for one person' : `for ${options.servings} people`;
  const within = options.maxMinutes
    ? `, each ready in ${options.maxMinutes} minutes or less,`
    : ',';
  return `Suggest ${RECIPE_COUNT} different recipes I could cook ${serves}${within} favouring ones that lean on what I already have. Each recipe may call for at most 3 ingredients I don't have; say plainly which those are. Vary them — don't give me three versions of the same dish.`;
}

function measurementLine(options: RecipeOptions): string {
  if (options.measurements === 'us') {
    return '\n\nGive every quantity in US customary measures — cups, ounces, tablespoons and teaspoons — not metric.';
  }
  if (options.measurements === 'metric') {
    return '\n\nGive every quantity in metric — grams, kilograms, millilitres and litres — not cups or ounces.';
  }
  return '';
}

/** Said only when something is ticked. An empty selection means the user has
 *  not told us, which is not the same as a kitchen with nothing in it. */
function equipmentLine(options: RecipeOptions): string {
  if (options.equipment.length === 0) return '';
  return `\n\nThe only equipment I have is: ${options.equipment.join(', ')}. Don't suggest anything that needs equipment I haven't listed.`;
}

/**
 * The prompt, in one place so it can be read and edited as prose.
 *
 * It carries only what the user chose to send: the items they currently have,
 * plus the four things they set on the options sheet. Not the out-of-stock
 * list, not the usually-buy baseline, not the shopping list. Anything added
 * here is added to what leaves the device.
 */
function promptFor(
  items: PantryItem[],
  detailed: boolean,
  omitted: number,
  options: RecipeOptions,
): string {
  const list = items.map(item => itemLine(item, detailed)).join('\n');
  const andMore = omitted > 0 ? `\n- (and ${omitted} more items)` : '';
  const servingsRule = `\n- "servings" must be ${options.servings} on every recipe.`;
  const timeRule = options.maxMinutes
    ? `\n- "totalMinutes" must be present and must be ${options.maxMinutes} or less.`
    : '';

  return `Here is everything in my pantry right now:

${list}${andMore}

${askLine(options)}${measurementLine(options)}${equipmentLine(options)}

Then give me the whole thing back as ONE downloadable file named pantry-recipes.html, built exactly like this:

1. A complete, self-contained HTML page I can open and read on an iPhone. Use the system font stack (-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif), around 16px body text, generous line height, comfortable margins, and one clearly separated section per recipe with its title, time, servings, ingredients and numbered steps. Include a @media (prefers-color-scheme: dark) block so it is readable in dark mode. No external CSS, JavaScript, images or fonts — everything inline, so the file works with no network.

2. Immediately before </body>, include this element, with the JSON filled in. My pantry app reads it to import the recipes, so it has to be exactly this tag:

<script type="${RECIPE_SCRIPT_TYPE}">
{"pantryRecipes":1,"recipes":[
  {
    "title": "Honey garlic salmon",
    "summary": "One sentence on what it is and why it works.",
    "servings": ${options.servings},
    "totalMinutes": ${options.maxMinutes ?? 30},
    "ingredients": [
      {"name": "salmon fillets", "quantity": 2, "unit": "pieces", "category": "seafood", "have": true},
      {"name": "honey", "quantity": 2, "unit": "tbsp", "category": "condiments", "have": false}
    ],
    "steps": ["Pat the salmon dry and season both sides.", "Sear skin-side down for four minutes."],
    "notes": "Optional. Leave the field out if there is nothing to say."
  }
]}
</script>

Rules for that JSON:
- "category" must be exactly one of: ${CATEGORIES.join(', ')}.
- "unit" must be exactly one of: ${UNITS.join(', ')}.
- "have" is true only for ingredients that appear on my pantry list above, and false for everything else.
- "steps" are plain sentences in order, with no numbering, no bullets and no markdown.
- "title", "summary", "ingredients" and "steps" are required on every recipe; "notes" is optional.${servingsRule}${timeRule}
- The JSON must be valid and must describe exactly the same recipes as the page above it.

Give me the finished file to download, and keep any commentary to a sentence.`;
}

export function claudeRecipeUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/**
 * Build the prompt and the link together, shrinking the pantry list until the
 * URL fits.
 *
 * Detail goes first (quantities and categories are useful but not load
 * bearing), then the tail of the list. A pantry of any size still produces a
 * link that works, which is the only property that matters here.
 */
export function buildRecipeHandoff(
  pantry: PantryItem[],
  options: RecipeOptions,
): { prompt: string; url: string } {
  // Only what is actually in stock. An item marked out is one the user knows
  // they don't have, and putting it in front of Claude invites a recipe built
  // around the one thing that ran out.
  const items = pantry
    .filter(item => !item.isOut)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const detailed of [true, false]) {
    let count = items.length;
    while (count >= 0) {
      const prompt = promptFor(items.slice(0, count), detailed, items.length - count, options);
      const url = claudeRecipeUrl(prompt);
      if (url.length <= MAX_URL_LENGTH) return { prompt, url };
      // Drop a tenth of what is left each pass rather than one item at a time,
      // so a very large pantry does not mean hundreds of re-encodings.
      count -= Math.max(1, Math.floor(count / 10));
    }
  }

  const prompt = promptFor([], false, items.length, options);
  return { prompt, url: claudeRecipeUrl(prompt) };
}

// ── Reading a file back ──────────────────────────────────────────

export interface ParsedRecipe {
  title: string;
  recipe: SavedRecipe;
}

function fail(message: string): never {
  throw new Error(message);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** A positive whole number, or undefined. Guards against a model handing back
 *  "about 4", NaN, Infinity, or 900 servings. */
function asCount(value: unknown, max: number): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.round(n), max);
}

function asUnit(value: unknown): string | undefined {
  const unit = asString(value).toLowerCase();
  return UNITS.includes(unit) ? unit : undefined;
}

function readIngredient(raw: unknown): SavedRecipeIngredient | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const name = asString(source.name);
  if (!name) return null;
  return {
    name,
    quantity: asCount(source.quantity, 9999),
    unit: asUnit(source.unit),
    category: coerceCategory(source.category),
    have: source.have === true,
  };
}

function readRecipe(raw: unknown): ParsedRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;

  const title = asString(source.title);
  const steps = Array.isArray(source.steps)
    ? source.steps.map(asString).filter(Boolean)
    : [];
  // A recipe with no name or no method is not a recipe. Dropping it beats
  // saving a row that opens onto nothing.
  if (!title || steps.length === 0) return null;

  const ingredients = Array.isArray(source.ingredients)
    ? source.ingredients.map(readIngredient).filter((i): i is SavedRecipeIngredient => i !== null)
    : [];

  return {
    title,
    recipe: {
      summary: asString(source.summary),
      servings: asCount(source.servings, 99),
      totalMinutes: asCount(source.totalMinutes, 24 * 60),
      ingredients,
      steps,
      notes: asString(source.notes) || undefined,
    },
  };
}

/**
 * Pull the JSON out of whatever the user brought back.
 *
 * Three shapes are accepted, in the order they are likely: the whole HTML file
 * Claude wrote, the `<script>` block on its own, and bare JSON — the last one
 * fenced or not, because copying a code block on iOS often brings the fence.
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) fail('There was nothing to import.');

  if (trimmed.includes(RECIPE_SCRIPT_TYPE)) {
    // `DOMParser` does not execute scripts, so this is a parser and not a
    // renderer — the safe way to read a file a model wrote.
    const doc = new DOMParser().parseFromString(trimmed, 'text/html');
    const block = doc.querySelector(`script[type="${RECIPE_SCRIPT_TYPE}"]`)?.textContent?.trim();
    if (block) return block;
  }

  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  if (fenced) return fenced[1].trim();

  return trimmed;
}

/**
 * Everything crossing this boundary was written by a model, so none of it is
 * trusted: every field is read defensively and anything unusable is dropped
 * rather than stored. The thrown messages are what the sheet shows in a toast.
 */
export function parseRecipeFile(text: string): ParsedRecipe[] {
  const json = extractJson(text);

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    fail("That file didn't contain any recipes this app can read.");
  }

  const raw = (data as { recipes?: unknown })?.recipes;
  if (!Array.isArray(raw)) fail("That file didn't contain any recipes this app can read.");

  const recipes = raw.map(readRecipe).filter((r): r is ParsedRecipe => r !== null);
  if (recipes.length === 0) fail('Those recipes were missing a title or the steps.');

  return recipes;
}
