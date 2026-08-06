const HISTORY_KEY = "defectoSngVibrationCalculatorHistory";
const TRANSFER_KEY = "defectoSngVibrationToolTransfer";
const LIMIT = 15;

function read(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function loadCalculatorHistory(storage = localStorage) {
  const value = read(storage, HISTORY_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function saveCalculatorResult(entry, storage = localStorage) {
  const saved = [{ id: `calculation-${Date.now()}`, date: new Date().toISOString(), ...entry }, ...loadCalculatorHistory(storage)].slice(0, LIMIT);
  storage.setItem(HISTORY_KEY, JSON.stringify(saved));
  return saved;
}

export function deleteCalculatorResult(id, storage = localStorage) {
  const saved = loadCalculatorHistory(storage).filter(item => item.id !== id);
  storage.setItem(HISTORY_KEY, JSON.stringify(saved));
  return saved;
}

export function clearCalculatorHistory(storage = localStorage) { storage.removeItem(HISTORY_KEY); }
export function saveToolTransfer(value, storage = sessionStorage) { storage.setItem(TRANSFER_KEY, JSON.stringify({ createdAt: Date.now(), ...value })); }
export function consumeToolTransfer(target, storage = sessionStorage) {
  const value = read(storage, TRANSFER_KEY, null);
  if (!value || value.target !== target) return null;
  storage.removeItem(TRANSFER_KEY);
  return value;
}

export const CALCULATOR_HISTORY_LIMIT = LIMIT;
