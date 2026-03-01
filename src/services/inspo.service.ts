import { getDB } from '../db/database';
import type { InspoItem, InspoPlatform } from '../models/types';

function detectPlatform(url: string): InspoPlatform {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}

async function fetchOembedThumbnail(oembedUrl: string): Promise<string> {
  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) return '';
    const data = await res.json();
    return (data.thumbnail_url as string) || '';
  } catch {
    return '';
  }
}

export async function saveInspoUrl(url: string, title?: string): Promise<InspoItem> {
  const platform = detectPlatform(url);
  let thumbnailUrl = '';

  if (platform === 'tiktok') {
    thumbnailUrl = await fetchOembedThumbnail(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    );
  } else if (platform === 'instagram') {
    thumbnailUrl = await fetchOembedThumbnail(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&format=json`
    );
  }

  const item: InspoItem = {
    id: crypto.randomUUID(),
    url,
    title: title || '',
    thumbnailUrl,
    platform,
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
