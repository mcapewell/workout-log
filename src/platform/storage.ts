import Dexie, { type Table } from 'dexie';
import type { StateStorage } from 'zustand/middleware';

// A single key/value table backs the whole app state. Keeping everything as one
// serialized blob makes export/import trivial and keeps IndexedDB usage simple.
// Swapping to a synced backend later means replacing this adapter only.
interface KV {
  key: string;
  value: string;
}

class AppDB extends Dexie {
  kv!: Table<KV, string>;
  constructor() {
    super('workout-log');
    this.version(1).stores({ kv: 'key' });
  }
}

export const db = new AppDB();

export const dexieStorage: StateStorage = {
  getItem: async (name) => (await db.kv.get(name))?.value ?? null,
  setItem: async (name, value) => {
    await db.kv.put({ key: name, value });
  },
  removeItem: async (name) => {
    await db.kv.delete(name);
  },
};
