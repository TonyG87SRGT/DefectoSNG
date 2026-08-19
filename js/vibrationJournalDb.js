import { JOURNAL_STORES, createId, normalizeBackup } from "./vibrationJournalCore.js";

export const JOURNAL_DB_NAME = "DefectoSNGVibrationJournal";
export const JOURNAL_DB_VERSION = 2;
export const JOURNAL_SCHEMA = Object.freeze({
  objects: [["status", "status"]],
  units: [["objectId", "objectId"], ["equipmentType", "equipmentType"], ["status", "status"]],
  nodes: [["unitId", "unitId"], ["nodeType", "nodeType"]],
  points: [["nodeId", "nodeId"], ["direction", "direction"], ["parameter", "defaultParameter"], ["status", "status"]],
  measurements: [["pointId", "pointId"], ["measuredAt", "measuredAt"], ["pointDate", ["pointId", "measuredAt"]], ["parameter", "parameter"], ["eventId", "eventId"]],
  spectralComponents: [["measurementId", "measurementId"], ["designation", "designation"]],
  events: [["unitId", "unitId"], ["occurredAt", "occurredAt"], ["eventType", "eventType"]],
  limits: [["pointId", "pointId"]], routes: [["objectId", "objectId"], ["status", "status"]], settings: [],
  vibrationDatasets: [["analysisId", "analysisId"], ["mode", "mode"], ["createdAt", "createdAt"]],
  vibrationAnalyses: [["measurementId", "measurementId"], ["mode", "mode"], ["analyzedAt", "analyzedAt"]]
});

let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

export function openJournalDb(factory = globalThis.indexedDB) {
  if (!factory) return Promise.reject(new Error("IndexedDB недоступна в этом браузере."));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = factory.open(JOURNAL_DB_NAME, JOURNAL_DB_VERSION);
    request.onupgradeneeded = event => {
      const db = request.result;
      for (const [storeName, indexes] of Object.entries(JOURNAL_SCHEMA)) {
        const store = db.objectStoreNames.contains(storeName) ? event.target.transaction.objectStore(storeName) : db.createObjectStore(storeName, { keyPath: "id" });
        indexes.forEach(([name, keyPath]) => { if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique: false }); });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Обновление базы заблокировано другой открытой вкладкой."));
  });
  return databasePromise;
}

async function transaction(storeNames, mode, operation) {
  const db = await openJournalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Операция с журналом отменена."));
    try { result = operation(tx); } catch (error) { tx.abort(); reject(error); }
  });
}

export async function putJournalRecord(storeName, record) {
  const now = new Date().toISOString();
  const value = { ...record, id: record.id || createId(storeName.slice(0, -1)), createdAt: record.createdAt || now, updatedAt: now };
  await transaction([storeName], "readwrite", tx => tx.objectStore(storeName).put(value));
  return value;
}

export async function getJournalRecord(storeName, id) {
  const db = await openJournalDb(); return requestResult(db.transaction(storeName).objectStore(storeName).get(id));
}

export async function listJournalRecords(storeName, options = {}) {
  const db = await openJournalDb(); const store = db.transaction(storeName).objectStore(storeName);
  const source = options.index && store.indexNames.contains(options.index) ? store.index(options.index) : store;
  const range = options.value !== undefined ? IDBKeyRange.only(options.value) : options.from || options.to ? IDBKeyRange.bound(options.from || "", options.to || "\uffff") : null;
  const direction = options.direction || "next"; const limit = options.limit || 500;
  return new Promise((resolve, reject) => {
    const results = []; const request = source.openCursor(range, direction);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const cursor = request.result; if (!cursor || results.length >= limit) return resolve(results); results.push(cursor.value); cursor.continue(); };
  });
}

export async function countJournalRecords(storeName, index, value) {
  const db = await openJournalDb(); const store = db.transaction(storeName).objectStore(storeName); const source = index ? store.index(index) : store;
  return requestResult(source.count(value === undefined ? null : IDBKeyRange.only(value)));
}

export async function deleteJournalRecord(storeName, id) {
  await transaction([storeName], "readwrite", tx => tx.objectStore(storeName).delete(id));
}

export async function relatedCounts(kind, id) {
  if (kind === "objects") return { units: await countJournalRecords("units", "objectId", id) };
  if (kind === "units") return { nodes: await countJournalRecords("nodes", "unitId", id), events: await countJournalRecords("events", "unitId", id) };
  if (kind === "nodes") return { points: await countJournalRecords("points", "nodeId", id) };
  if (kind === "points") return { measurements: await countJournalRecords("measurements", "pointId", id), limits: await countJournalRecords("limits", "pointId", id) };
  return {};
}

export async function exportJournalData() {
  const result = {};
  for (const store of JOURNAL_STORES) result[store] = await listJournalRecords(store, { limit: Number.MAX_SAFE_INTEGER });
  return result;
}

export async function importJournalData(backup, mode = "merge") {
  const normalizedBackup = normalizeBackup(backup);
  const stores = [...JOURNAL_STORES]; const copyPrefix = `copy-${Date.now()}-`;
  const idMap = new Map(stores.flatMap(name => normalizedBackup.data[name].map(record => [record.id, `${copyPrefix}${record.id}`])));
  const foreignKeys = { units: ["objectId"], nodes: ["unitId"], points: ["nodeId"], measurements: ["pointId", "eventId"], spectralComponents: ["measurementId"], events: ["unitId"], limits: ["pointId"], routes: ["objectId"], vibrationDatasets: ["analysisId"], vibrationAnalyses: ["measurementId", "datasetId"] };
  await transaction(stores, "readwrite", tx => {
    if (mode === "replace") stores.forEach(name => tx.objectStore(name).clear());
    stores.forEach(name => normalizedBackup.data[name].forEach(record => {
      const value = mode === "copy" ? { ...record, id: idMap.get(record.id) } : record;
      if (mode === "copy") {
        (foreignKeys[name] || []).forEach(field => { if (value[field] && idMap.has(value[field])) value[field] = idMap.get(value[field]); });
        if (name === "routes") {
          value.pointIds = (value.pointIds || []).map(id => idMap.get(id) || id);
          value.entries = Object.fromEntries(Object.entries(value.entries || {}).map(([id, entry]) => [idMap.get(id) || id, entry]));
        }
      }
      tx.objectStore(name).put(value);
    }));
  });
}

export async function clearJournalData() {
  await transaction([...JOURNAL_STORES], "readwrite", tx => JOURNAL_STORES.forEach(name => tx.objectStore(name).clear()));
}

export function resetJournalDbConnectionForTests() { databasePromise = undefined; }
