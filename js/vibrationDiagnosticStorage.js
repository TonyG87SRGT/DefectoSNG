const DRAFT_KEY = "defectoSngVibrationDiagnosticDraft";
const HISTORY_KEY = "defectoSngVibrationDiagnosticHistory";
const LIMIT = 10;

function read(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function loadDiagnosticDraft(storage = localStorage) { return read(storage, DRAFT_KEY, null); }
export function saveDiagnosticDraft(value, storage = localStorage) { storage.setItem(DRAFT_KEY, JSON.stringify(value)); }
export function clearDiagnosticDraft(storage = localStorage) { storage.removeItem(DRAFT_KEY); }
export function loadDiagnosticHistory(storage = localStorage) { const value = read(storage, HISTORY_KEY, []); return Array.isArray(value) ? value : []; }
export function saveDiagnosticSession(session, storage = localStorage) {
  const history = loadDiagnosticHistory(storage);
  const saved = [{ id: session.id || `diagnostic-${Date.now()}`, date: session.date || new Date().toISOString(), ...session }, ...history].slice(0, LIMIT);
  storage.setItem(HISTORY_KEY, JSON.stringify(saved)); return saved;
}
export function deleteDiagnosticSession(id, storage = localStorage) {
  const history = loadDiagnosticHistory(storage).filter(item => item.id !== id); storage.setItem(HISTORY_KEY, JSON.stringify(history)); return history;
}
export function clearDiagnosticHistory(storage = localStorage) { storage.removeItem(HISTORY_KEY); }

export const DIAGNOSTIC_HISTORY_LIMIT = LIMIT;
