import { openDB, type IDBPDatabase } from 'idb';
import type { PantryDB } from './schema';

const DB_NAME = 'pantry-tracker';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PantryDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PantryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PantryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const pantryStore = db.createObjectStore('pantryItems', { keyPath: 'id' });
          pantryStore.createIndex('by-category', 'category');
          pantryStore.createIndex('by-normalizedName', 'normalizedName');

          const typicalStore = db.createObjectStore('typicalOrder', { keyPath: 'id' });
          typicalStore.createIndex('by-category', 'category');

          const groceryStore = db.createObjectStore('groceryList', { keyPath: 'id' });
          groceryStore.createIndex('by-source', 'source');
          groceryStore.createIndex('by-category', 'category');

          // Tombstoned: recipe parsing was removed on 2026-09-07 and nothing
          // reads this store. It is deliberately NOT deleted — `idb` types
          // deleteObjectStore against PantryDB, so dropping it is a two-deploy
          // change, and with autoUpdate caching a bumped DB_VERSION makes an
          // older cached shell fail to open the database at all.
          db.createObjectStore('recipes', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('inspoItems', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
