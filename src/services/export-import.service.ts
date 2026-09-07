import { getDB } from '../db/database';
import type { PantryItem, TypicalOrderItem, GroceryListItem, InspoItem } from '../models/types';
import { coerceCategory } from '../models/types';
import { normalizeIngredientName } from '../utils/normalize';
import { emit } from '../utils/events';

/**
 * Version 2 drops the `recipes` key (recipe parsing was removed) and adds
 * `inspoItems`, which had never been backed up at all.
 *
 * The bump is what makes this safe in both directions. A version-2 file fed to
 * an older still-cached bundle is refused by its `version !== 1` check, which
 * runs before it opens the database — so it cannot clear a single store and
 * then fail partway through.
 */
const EXPORT_VERSION = 2;

interface ExportData {
  version: number;
  exportedAt: string;
  pantryItems?: PantryItem[];
  typicalOrder?: TypicalOrderItem[];
  groceryList?: GroceryListItem[];
  inspoItems?: InspoItem[];
  /** Version 1 only. Read and discarded. */
  recipes?: unknown[];
}

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const data: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    pantryItems: await db.getAll('pantryItems'),
    typicalOrder: await db.getAll('typicalOrder'),
    groceryList: await db.getAll('groceryList'),
    inspoItems: await db.getAll('inspoItems'),
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(json: string): Promise<void> {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('That file isn’t a Pantry backup.');
  }
  const data = raw as ExportData;

  if (data.version !== 1 && data.version !== 2) {
    throw new Error(
      'That backup was written by a newer version of Pantry. Update the app, then import again.',
    );
  }

  // Only restore stores the file actually carries. A version-1 backup has no
  // `inspoItems` key at all, so saved items are left alone rather than wiped;
  // an explicit empty array means the user genuinely had none, and is cleared.
  // Validate everything before opening a write transaction.
  const sections: Array<['pantryItems' | 'typicalOrder' | 'groceryList' | 'inspoItems', unknown[]]> = [];
  for (const key of ['pantryItems', 'typicalOrder', 'groceryList', 'inspoItems'] as const) {
    const value = data[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      throw new Error(`That backup’s "${key}" section is damaged.`);
    }
    sections.push([key, value]);
  }
  if (sections.length === 0) {
    throw new Error('That backup has nothing in it.');
  }

  const db = await getDB();
  const tx = db.transaction(sections.map(([key]) => key), 'readwrite');
  for (const [key, list] of sections) {
    const store = tx.objectStore(key);
    await store.clear();
    for (const row of list) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await store.put(repair(key, row) as any);
    }
  }
  await tx.done;

  const remaining = await db.getAll('groceryList');
  emit('grocery-count', remaining.length);
}

/**
 * A backup is a hand-editable text file, and the two fields the whole app
 * joins and groups on are exactly the two a hand edit gets wrong. An unknown
 * category used to make a row render nowhere at all; an absent or stale
 * `normalizedName` silently detaches it from its standing order.
 */
function repair(key: string, row: unknown): unknown {
  if (typeof row !== 'object' || row === null) return row;
  if (key === 'inspoItems') return row;

  const item = row as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name : '';
  return {
    ...item,
    category: coerceCategory(item.category),
    normalizedName: name ? normalizeIngredientName(name) : item.normalizedName,
  };
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  // `recipes` is a tombstoned store: nothing writes to it, but old rows are
  // still purged so "delete everything" tells the truth. The guard keeps this
  // correct if the store is ever actually dropped.
  const stores: Array<'pantryItems' | 'typicalOrder' | 'groceryList' | 'inspoItems' | 'recipes'> =
    ['pantryItems', 'typicalOrder', 'groceryList', 'inspoItems'];
  if (db.objectStoreNames.contains('recipes')) stores.push('recipes');

  const tx = db.transaction(stores, 'readwrite');
  for (const name of stores) await tx.objectStore(name).clear();
  await tx.done;

  // Without this the tab badge keeps announcing the count of a list that no
  // longer exists.
  emit('grocery-count', 0);
}

/**
 * `a.download` is unreliable in an installed iOS PWA, and this is the only
 * backup mechanism for a ledger that lives on one device — so the caller is
 * told whether the browser will actually save the file rather than being left
 * to report success either way. Web Share is offered first because in
 * standalone mode it is the path that works.
 */
export async function saveJson(data: string, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([data], filename, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return 'shared';
  }

  const a = document.createElement('a');
  if (!('download' in a)) {
    throw new Error('This browser can’t save files. Open Pantry in Safari and export from there.');
  }

  const url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
