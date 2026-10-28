// Reading history in IndexedDB, with an in-memory fallback when IndexedDB is unavailable
// (some private-browsing modes). Device and demo readings are tagged by `source` and are
// always queried separately, so demo data never mixes with real data.

import type { DataSource, Reading } from '../types';

const DB_NAME = 'plantcare';
const STORE = 'readings';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory: Reading[] = [];
let memId = 1;

export let storageMode: 'indexeddb' | 'memory' = 'indexeddb';

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('source_ts', ['source', 'ts']);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { storageMode = 'memory'; resolve(null); };
      req.onblocked = () => { storageMode = 'memory'; resolve(null); };
    } catch {
      storageMode = 'memory';
      resolve(null);
    }
  });
  return dbPromise;
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    const r = fn(s);
    let result: T | undefined;
    if (r) r.onsuccess = () => { result = r.result; };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function addReading(r: Reading): Promise<void> {
  const db = await open();
  if (!db) { memory.push({ ...r, id: memId++ }); return; }
  try { await tx(db, 'readwrite', (s) => s.add(r)); } catch { memory.push({ ...r, id: memId++ }); }
}

export async function addReadings(rs: Reading[]): Promise<void> {
  const db = await open();
  if (!db) { rs.forEach((r) => memory.push({ ...r, id: memId++ })); return; }
  await tx(db, 'readwrite', (s) => { rs.forEach((r) => s.add(r)); });
}

/**
 * Readings stored by the previous app version (firmware with POT_ADC / SW1 / SW2) have no
 * sunlightPct, warnings, etc. Fill them in so old history still shows. main.c computes
 * SUNLIGHT_PCT = LDR_ADC * 100 / 4095 (integer), so it can be derived exactly.
 */
export function normalizeReading(raw: Reading): Reading {
  const r = raw as Partial<Reading> & Reading;
  if (typeof r.sunlightPct === 'number' && Array.isArray(r.warnings)) return r;
  return {
    ...r,
    mlProvisional: r.mlProvisional ?? 0,
    fwDay: r.fwDay ?? -1,
    laptopIsDay: r.laptopIsDay ?? null,
    tempAssumedC: r.tempAssumedC ?? 25,
    sunlightPct: typeof r.sunlightPct === 'number' ? r.sunlightPct : Math.floor(((r.ldrAdc ?? 0) * 100) / 4095),
    lowLightMin: r.lowLightMin ?? 0,
    highLightMin: r.highLightMin ?? 0,
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
  };
}

/** Readings for one source in [from, to], oldest first. */
export async function getReadings(source: DataSource, from: number, to: number): Promise<Reading[]> {
  const db = await open();
  const fromMem = memory.filter((r) => r.source === source && r.ts >= from && r.ts <= to);
  if (!db) return fromMem.sort((a, b) => a.ts - b.ts);
  const rows = await tx<Reading[]>(db, 'readonly', (s) =>
    s.index('source_ts').getAll(IDBKeyRange.bound([source, from], [source, to])),
  );
  return [...(rows ?? []), ...fromMem].map(normalizeReading).sort((a, b) => a.ts - b.ts);
}

export async function countReadings(source: DataSource): Promise<number> {
  const db = await open();
  const mem = memory.filter((r) => r.source === source).length;
  if (!db) return mem;
  const n = await tx<number>(db, 'readonly', (s) =>
    s.index('source_ts').count(IDBKeyRange.bound([source, 0], [source, Number.MAX_SAFE_INTEGER])),
  );
  return (n ?? 0) + mem;
}

export async function clearReadings(source: DataSource): Promise<void> {
  for (let i = memory.length - 1; i >= 0; i--) if (memory[i].source === source) memory.splice(i, 1);
  const db = await open();
  if (!db) return;
  await tx(db, 'readwrite', (s) => {
    const req = s.index('source_ts').openKeyCursor(IDBKeyRange.bound([source, 0], [source, Number.MAX_SAFE_INTEGER]));
    req.onsuccess = () => {
      const c = req.result;
      if (c) { s.delete(c.primaryKey); c.continue(); }
    };
  });
}

/** Deletes readings older than `before` for one source. */
export async function pruneReadings(source: DataSource, before: number): Promise<void> {
  for (let i = memory.length - 1; i >= 0; i--) if (memory[i].source === source && memory[i].ts < before) memory.splice(i, 1);
  const db = await open();
  if (!db) return;
  await tx(db, 'readwrite', (s) => {
    const req = s.index('source_ts').openKeyCursor(IDBKeyRange.bound([source, 0], [source, before], false, true));
    req.onsuccess = () => {
      const c = req.result;
      if (c) { s.delete(c.primaryKey); c.continue(); }
    };
  });
}
