import {
  DEFAULT_RECIPE_OPTIONS,
  EQUIPMENT,
  SERVINGS_MAX,
  SERVINGS_MIN,
  TIME_STEPS,
  type MeasurementSystem,
  type RecipeOptions,
} from '../models/types';

/**
 * What you told Claude last time.
 *
 * Servings, time, measurements and equipment are set once and prefilled ever
 * after, which is the whole point of the sheet that holds them. They live in
 * `localStorage` rather than IndexedDB because they are a preference, not
 * ledger data — the same call `item-form.ts` makes for the last category and
 * unit, and the app's only other use of this API. Being a preference, they are
 * also deliberately outside export/import: a backup restores your pantry, not
 * your slider positions.
 */
const KEY = 'pantry-recipe-options';

const MEASUREMENTS: MeasurementSystem[] = ['us', 'metric', 'either'];

function clampServings(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_RECIPE_OPTIONS.servings;
  return Math.min(Math.max(n, SERVINGS_MIN), SERVINGS_MAX);
}

/** Only a value the slider can actually land on. Anything else is the default,
 *  because a remembered time with no matching stop would leave the control
 *  showing something the user never chose. */
function readMaxMinutes(value: unknown): number | null {
  if (value === null) return null;
  return TIME_STEPS.includes(value as number | null)
    ? (value as number)
    : DEFAULT_RECIPE_OPTIONS.maxMinutes;
}

function readEquipment(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  // Filtered against the vocabulary: an id this build no longer knows would
  // otherwise go into the prompt and come back out of the summary line as a
  // word the checklist cannot show.
  return EQUIPMENT.filter(item => value.includes(item));
}

/**
 * Never throws. Safari in private mode throws on `localStorage` itself, and a
 * sheet that will not open is worse than a sheet with default settings — so
 * every failure, from a blocked read to hand-edited JSON, lands on the
 * defaults instead.
 */
export function loadRecipeOptions(): RecipeOptions {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_RECIPE_OPTIONS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_RECIPE_OPTIONS };

    const measurements = parsed.measurements as MeasurementSystem;
    return {
      servings: clampServings(parsed.servings),
      maxMinutes: readMaxMinutes(parsed.maxMinutes),
      measurements: MEASUREMENTS.includes(measurements)
        ? measurements
        : DEFAULT_RECIPE_OPTIONS.measurements,
      equipment: readEquipment(parsed.equipment),
    };
  } catch {
    return { ...DEFAULT_RECIPE_OPTIONS };
  }
}

/**
 * Written on every change rather than on send.
 *
 * `item-form.ts` saves its remembered choices only after the write lands,
 * because a failed database write used to change them anyway. Nothing here can
 * fail that way, and ticking your equipment and then closing the sheet without
 * sending should not throw the ticks away.
 */
export function saveRecipeOptions(options: RecipeOptions): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
  } catch {
    // A full or blocked store costs the memory of a preference, nothing more.
  }
}
