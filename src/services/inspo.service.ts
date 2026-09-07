import { getDB } from '../db/database';
import { emit } from '../utils/events';
import type { InspoItem, InspoPlatform } from '../models/types';
import { fetchCover } from './cover.service';

function detectPlatform(url: string): InspoPlatform {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}

/**
 * Saves and returns straight away, with no cover.
 *
 * It used to await the thumbnail fetch before resolving, so pasting a link
 * meant watching "Saving…" for as long as a social CDN felt like taking —
 * indefinitely, in a dead zone. The row now paints its monogram immediately
 * and `ensureCovers` fills the picture in behind it.
 */
export async function saveInspoUrl(url: string, title?: string): Promise<InspoItem> {
  const item: InspoItem = {
    id: crypto.randomUUID(),
    url,
    title: title || '',
    thumbnailUrl: '',
    platform: detectPlatform(url),
    dateAdded: Date.now(),
  };

  const db = await getDB();
  await db.put('inspoItems', item);
  return item;
}

export async function saveInspoImage(dataUrl: string, title?: string): Promise<InspoItem> {
  const item: InspoItem = {
    id: crypto.randomUUID(),
    url: '',
    title: title || '',
    thumbnailUrl: dataUrl,
    platform: 'image',
    dateAdded: Date.now(),
  };

  const db = await getDB();
  await db.put('inspoItems', item);
  return item;
}

export async function getAllInspoItems(): Promise<InspoItem[]> {
  const db = await getDB();
  const items = await db.getAll('inspoItems');
  return items.sort((a, b) => b.dateAdded - a.dateAdded);
}

export async function deleteInspoItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('inspoItems', id);
}

/** Backs the undo on the Saved tab, which used to ask a blocking confirm(). */
export async function restoreInspoItem(item: InspoItem): Promise<void> {
  const db = await getDB();
  await db.put('inspoItems', item);
}

export async function updateInspoItem(
  id: string,
  updates: { title?: string; thumbnailUrl?: string; coverTriedAt?: number },
): Promise<void> {
  const db = await getDB();
  const item = await db.get('inspoItems', id);
  if (!item) return;
  if (updates.title !== undefined) item.title = updates.title;
  if (updates.thumbnailUrl !== undefined) item.thumbnailUrl = updates.thumbnailUrl;
  if (updates.coverTriedAt !== undefined) item.coverTriedAt = updates.coverTriedAt;
  await db.put('inspoItems', item);
}

/** A day. A link that had no cover this morning rarely has one by lunchtime. */
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

/** Two at a time: a cold list of thirty should not open thirty sockets. */
const CONCURRENCY = 2;

function needsCover(item: InspoItem, now: number): boolean {
  if (!item.url || item.thumbnailUrl) return false;
  return item.coverTriedAt === undefined || now - item.coverTriedAt > RETRY_AFTER_MS;
}

/**
 * Looks for a cover for every link that still has none, and announces each one
 * it finds on `inspo-cover` so the view can swap that single tile in place
 * rather than re-rendering a list the user may be scrolling.
 *
 * Every attempt is stamped whether or not it found anything, so a link whose
 * source has no cover to give costs one request a day rather than one per
 * open. Failures are silent by design: a cover is decoration, and the row is
 * already complete without it.
 */
export async function ensureCovers(items: InspoItem[]): Promise<void> {
  const now = Date.now();
  const queue = items.filter(item => needsCover(item, now));
  if (queue.length === 0) return;

  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const item = queue[next++];
      if (!item) return;

      let thumbnailUrl = '';
      try {
        thumbnailUrl = await fetchCover(item.url);
      } catch {
        thumbnailUrl = '';
      }

      try {
        await updateInspoItem(item.id, { thumbnailUrl, coverTriedAt: Date.now() });
      } catch {
        return;
      }

      if (thumbnailUrl) emit('inspo-cover', { id: item.id, thumbnailUrl });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
  );
}
