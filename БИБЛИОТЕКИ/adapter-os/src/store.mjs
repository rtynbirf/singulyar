const DB = 'singulyar-adapter-os';
const VERSION = 1;
const STORE = 'records';

export function openStore() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, VERSION);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function put(key, value) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function get(key) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function exportRecord(key) {
  const value = await get(key);
  if (value === undefined) throw new Error('record not found');
  return new Blob([JSON.stringify({ schema: 1, key, value }, null, 2)], { type: 'application/json' });
}
