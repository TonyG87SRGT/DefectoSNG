import { convertAcceleration, convertDisplacement, convertVelocity, parseDecimal } from "./vibrationCalculations.js";

export const JOURNAL_FORMAT_VERSION = 2;
export const JOURNAL_STORES = Object.freeze(["objects", "units", "nodes", "points", "measurements", "spectralComponents", "events", "limits", "routes", "settings", "vibrationDatasets", "vibrationAnalyses"]);

export function createId(prefix = "journal") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const units = Object.freeze({
  displacement: { base: "m", convert: convertDisplacement, aliases: ["m", "mm", "um", "inch", "mil"] },
  velocity: { base: "m/s", convert: convertVelocity, aliases: ["m/s", "mm/s", "cm/s", "in/s"] },
  acceleration: { base: "m/s2", convert: convertAcceleration, aliases: ["m/s2", "mm/s2", "g"] }
});
const unitAliases = Object.freeze({ "м": "m", "мм": "mm", "мкм": "um", "дюйм": "inch", "м/с": "m/s", "мм/с": "mm/s", "см/с": "cm/s", "дюйм/с": "in/s", "м/с²": "m/s2", "мм/с²": "mm/s2" });

export function parameterFamily(parameter = "", unit = "") {
  if (units.velocity.aliases.includes(unit)) return "velocity";
  if (units.acceleration.aliases.includes(unit)) return "acceleration";
  if (units.displacement.aliases.includes(unit)) return "displacement";
  const text = `${parameter} ${unit}`.toLocaleLowerCase("ru-RU");
  if (/перемещ|мкм|\bmil\b|\bum\b/.test(text)) return "displacement";
  if (/скорост|мм\/с|mm\/s|cm\/s|in\/s|m\/s/.test(text)) return "velocity";
  if (/ускор|м\/с²|m\/s2|mm\/s2|\bg\b/.test(text)) return "acceleration";
  return "other";
}

export function normalizeMeasurement(input) {
  const value = parseDecimal(input.value, "value");
  const canonicalUnit = unitAliases[input.unit] || input.unit;
  const family = parameterFamily(input.parameter, canonicalUnit);
  let normalizedValue = value;
  let normalizedUnit = input.unit;
  if (units[family]?.aliases.includes(canonicalUnit)) {
    normalizedValue = units[family].convert(value, canonicalUnit, units[family].base);
    normalizedUnit = units[family].base;
  }
  return { ...input, value, normalizedValue, normalizedUnit, parameterFamily: family };
}

export function compatibilityKey(measurement) {
  return [measurement.pointId, measurement.parameterFamily || parameterFamily(measurement.parameter, measurement.unit), measurement.amplitudeType || "unknown", measurement.frequencyRange || "unknown"].join("|");
}

export function groupComparableMeasurements(measurements) {
  const groups = new Map();
  measurements.forEach(item => {
    const normalized = item.normalizedValue == null ? normalizeMeasurement(item) : item;
    const key = compatibilityKey(normalized);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(normalized);
  });
  groups.forEach(items => items.sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt)));
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
}

export function trendStatistics(measurements) {
  const sorted = [...measurements].sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));
  const values = sorted.map(item => Number(item.normalizedValue ?? item.value)).filter(Number.isFinite);
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  const first = values[0]; const last = values.at(-1); const absoluteChange = last - first;
  const relativeChange = first === 0 ? null : absoluteChange / Math.abs(first) * 100;
  const times = sorted.map(item => new Date(item.measuredAt).getTime());
  const origin = times[0]; const xs = times.map(value => (value - origin) / 86400000);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length; const meanY = values.reduce((a, b) => a + b, 0) / values.length;
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const slopePerDay = denominator ? xs.reduce((sum, value, index) => sum + (value - meanX) * (values[index] - meanY), 0) / denominator : 0;
  return { count: values.length, minimum: Math.min(...values), maximum: Math.max(...values), average: meanY, median, first, last, absoluteChange, relativeChange, slopePerDay, intervalDays: (times.at(-1) - origin) / 86400000 };
}

export function describeTrend(stats, measurements = [], events = []) {
  if (!stats || stats.count < 2) return { code: "insufficient", label: "Данных недостаточно" };
  const span = Math.max(Math.abs(stats.maximum - stats.minimum), Math.abs(stats.average) * 0.01, Number.EPSILON);
  const relativeSlope = stats.slopePerDay * Math.max(stats.intervalDays, 1) / span;
  let code = "stable"; let label = "Устойчивый тренд не выявлен";
  if (relativeSlope > 0.25) { code = "growth"; label = "Зафиксирован постепенный рост"; }
  if (relativeSlope < -0.25) { code = "decline"; label = "Наблюдается постепенное снижение"; }
  const deltas = measurements.slice(1).map((item, index) => Math.abs(Number(item.normalizedValue ?? item.value) - Number(measurements[index].normalizedValue ?? measurements[index].value)));
  if (deltas.some(delta => delta > span * 0.65)) { code = "jump"; label = "Значение изменилось скачкообразно"; }
  const eventBetween = events.some(event => { const time = new Date(event.occurredAt).getTime(); return time >= new Date(measurements[0].measuredAt).getTime() && time <= new Date(measurements.at(-1).measuredAt).getTime(); });
  return { code, label, eventBetween };
}

export function compareMeasurements(items) {
  if (items.length < 2 || items.length > 4) throw new Error("Выберите от двух до четырёх измерений.");
  const normalized = items.map(item => item.normalizedValue == null ? normalizeMeasurement(item) : item);
  if (new Set(normalized.map(compatibilityKey)).size !== 1) throw new Error("Записи имеют несопоставимые параметры, тип амплитуды или частотный диапазон.");
  const base = normalized[0];
  return normalized.map(item => ({ ...item, absoluteChange: item.normalizedValue - base.normalizedValue, relativeChange: base.normalizedValue === 0 ? null : (item.normalizedValue - base.normalizedValue) / Math.abs(base.normalizedValue) * 100 }));
}

function quoteCsv(value, delimiter) {
  const text = String(value ?? "");
  return /["\r\n,;]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function measurementsToCsv(rows, delimiter = ";") {
  const headers = ["Объект", "Агрегат", "Узел", "Точка", "Направление", "Дата", "Параметр", "Исходное значение", "Исходная единица", "Нормализованное значение", "Нормализованная единица", "Тип амплитуды", "Обороты", "Нагрузка", "Температура", "Давление", "Расход", "Режим", "Примечание"];
  const fields = ["objectName", "unitName", "nodeName", "pointCode", "direction", "measuredAt", "parameter", "value", "unit", "normalizedValue", "normalizedUnit", "amplitudeType", "rpm", "load", "temperature", "pressure", "flow", "operatingMode", "note"];
  return [headers, ...rows.map(row => fields.map(field => row[field]))].map(row => row.map(value => quoteCsv(value, delimiter)).join(delimiter)).join("\r\n");
}

export function parseMeasurementsCsv(text, delimiter = ";") {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(value); if (row.some(cell => cell !== "")) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  row.push(value); if (row.some(cell => cell !== "")) rows.push(row);
  const headers = rows.shift() || []; const required = ["Точка", "Дата", "Параметр", "Исходное значение", "Исходная единица"];
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`В CSV отсутствуют обязательные столбцы: ${missing.join(", ")}.`);
  return rows.map((cells, rowIndex) => ({ row: rowIndex + 2, ...Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])) }));
}

export function createBackup(data, appVersion) {
  return { format: "DefectoSNG vibration journal", formatVersion: JOURNAL_FORMAT_VERSION, appVersion, exportedAt: new Date().toISOString(), data: Object.fromEntries(JOURNAL_STORES.map(store => [store, Array.isArray(data[store]) ? data[store] : []])) };
}

export function normalizeBackup(value) {
  if (!value || value.format !== "DefectoSNG vibration journal") throw new Error("Файл не является резервной копией журнала DefectoSNG.");
  if (![1, JOURNAL_FORMAT_VERSION].includes(value.formatVersion)) throw new Error(`Версия формата ${value.formatVersion} не поддерживается.`);
  if (!value.data || typeof value.data !== "object") throw new Error("Структура резервной копии повреждена.");
  const legacyRequired = JOURNAL_STORES.filter(store => !["vibrationDatasets", "vibrationAnalyses"].includes(store));
  if (!legacyRequired.every(store => Array.isArray(value.data[store]))) throw new Error("Структура резервной копии повреждена.");
  const data = Object.fromEntries(JOURNAL_STORES.map(store => [store, Array.isArray(value.data[store]) ? value.data[store] : []]));
  return {
    ...value,
    formatVersion: JOURNAL_FORMAT_VERSION,
    migratedFrom: value.formatVersion === JOURNAL_FORMAT_VERSION ? null : value.formatVersion,
    data
  };
}

export function validateBackup(value) {
  const normalized = normalizeBackup(value);
  return {
    formatVersion: normalized.formatVersion,
    migratedFrom: normalized.migratedFrom,
    objects: normalized.data.objects.length,
    units: normalized.data.units.length,
    points: normalized.data.points.length,
    measurements: normalized.data.measurements.length,
    events: normalized.data.events.length
  };
}

export function routeProgress(route) {
  const pointIds = route.pointIds || []; const entries = route.entries || {};
  const completed = pointIds.filter(id => entries[id]?.value !== undefined && entries[id]?.value !== "").length;
  return { total: pointIds.length, completed, skipped: pointIds.length - completed, percent: pointIds.length ? completed / pointIds.length * 100 : 0 };
}
