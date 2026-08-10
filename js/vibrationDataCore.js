export const VIBRATION_DATA_FORMAT_VERSION = 1;
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_POINTS = 250000;

export function parseLocaleNumber(value, decimal = "auto") {
  let text = String(value ?? "").trim().replace(/\u00a0/g, "").replace(/\s+/g, "");
  if (!text) return NaN;
  if (decimal === "," || (decimal === "auto" && text.includes(",") && !text.includes("."))) text = text.replace(",", ".");
  return Number(text);
}

export function detectTableFormat(text) {
  const clean = String(text).replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter(line => line.trim()).slice(0, 20);
  const candidates = [";", "\t", ","];
  const scores = candidates.map(separator => ({ separator, score: lines.reduce((sum, line) => sum + Math.max(0, line.split(separator).length - 1), 0) }));
  let separator = scores.sort((a, b) => b.score - a.score)[0]?.separator || ";";
  if (lines.length > 1 && lines.every(line => line.includes(";")) && lines.slice(1).some(line => /\d,\d/.test(line))) separator = ";";
  if (!scores[0]?.score && lines.every(line => line.trim().split(/\s+/).length > 1)) separator = "space";
  const first = splitRow(lines[0] || "", separator);
  const decimal = separator === ";" && lines.some(line => /(?:^|;)\s*[-+]?\d+,\d+(?:;|$)/.test(line)) ? "," : ".";
  const header = first.some(value => Number.isNaN(parseLocaleNumber(value, decimal)));
  return { separator, decimal, header, encoding: "UTF-8", lineCount: clean.split(/\r?\n/).length, columnCount: first.length };
}

export function splitRow(line, separator) {
  if (separator === "space") return line.trim().split(/\s+/);
  const result = []; let current = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') { if (quoted && line[index + 1] === '"') { current += '"'; index += 1; } else quoted = !quoted; }
    else if (char === separator && !quoted) { result.push(current); current = ""; }
    else current += char;
  }
  result.push(current); return result;
}

export function parseTable(text, options = {}) {
  const format = { ...detectTableFormat(text), ...options };
  const rows = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim()).map(line => splitRow(line, format.separator));
  const headers = format.header ? rows.shift().map((value, index) => value.trim() || `Столбец ${index + 1}`) : (rows[0] || []).map((_, index) => `Столбец ${index + 1}`);
  return { format, headers, rows };
}

export function buildSeries(table, mapping, options = {}) {
  const issues = { invalid: 0, empty: 0, negativeX: 0, duplicates: 0, unsorted: false, nonUniform: false };
  const original = [];
  table.rows.forEach((row, sourceIndex) => {
    const x = parseLocaleNumber(row[mapping.x], table.format.decimal); const y = parseLocaleNumber(row[mapping.y], table.format.decimal);
    if (!row.some(value => String(value).trim())) { issues.empty += 1; return; }
    if (!Number.isFinite(x) || !Number.isFinite(y)) { issues.invalid += 1; return; }
    if (x < 0 && options.mode === "spectrum") { issues.negativeX += 1; return; }
    original.push({ x, y, phase: mapping.phase == null ? null : parseLocaleNumber(row[mapping.phase], table.format.decimal), sourceIndex });
  });
  if (original.length < 2) throw new Error("Для анализа требуется не менее двух корректных точек.");
  issues.unsorted = original.some((point, index) => index && point.x < original[index - 1].x);
  const sorted = [...original].sort((a, b) => a.x - b.x); const groups = new Map();
  sorted.forEach(point => { const list = groups.get(point.x) || []; list.push(point); groups.set(point.x, list); });
  issues.duplicates = [...groups.values()].reduce((sum, values) => sum + Math.max(0, values.length - 1), 0);
  const duplicateMode = options.duplicateMode || "maximum";
  const points = [...groups.values()].map(values => {
    if (duplicateMode === "first") return values[0]; if (duplicateMode === "last") return values.at(-1);
    if (duplicateMode === "average") return { ...values[0], y: values.reduce((sum, item) => sum + item.y, 0) / values.length };
    return values.reduce((best, item) => item.y > best.y ? item : best);
  });
  const resolution = analyzeResolution(points); issues.nonUniform = !resolution.uniform;
  return { points, original, issues, resolution };
}

export function analyzeResolution(points) {
  const steps = points.slice(1).map((point, index) => point.x - points[index].x).filter(step => step > 0);
  if (!steps.length) return { minimum: 0, maximum: 0, average: 0, uniform: false };
  const minimum = Math.min(...steps); const maximum = Math.max(...steps); const average = steps.reduce((a, b) => a + b, 0) / steps.length;
  return { minimum, maximum, average, uniform: maximum - minimum <= Math.max(1e-9, average * 0.001) };
}

export function findPeaks(points, options = {}) {
  const minAmplitude = Number(options.minAmplitude ?? -Infinity); const prominence = Math.max(0, Number(options.prominence || 0));
  const minDistance = Math.max(0, Number(options.minDistance || 0)); const from = Number(options.from ?? -Infinity); const to = Number(options.to ?? Infinity);
  const candidates = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]; if (point.x < from || point.x > to || point.y < minAmplitude) continue;
    if (point.y >= points[index - 1].y && point.y > points[index + 1].y && point.y - Math.max(points[index - 1].y, points[index + 1].y) >= prominence) candidates.push({ ...point, index, prominence: point.y - Math.max(points[index - 1].y, points[index + 1].y) });
  }
  const accepted = [];
  candidates.sort((a, b) => b.y - a.y).forEach(point => { if (accepted.every(item => Math.abs(item.x - point.x) >= minDistance)) accepted.push(point); });
  return accepted.sort((a, b) => b.y - a.y).slice(0, Math.min(100, Number(options.limit || 20)));
}

export function nearestPeak(peaks, frequency) {
  if (!peaks.length) return null; const peak = peaks.reduce((best, item) => Math.abs(item.x - frequency) < Math.abs(best.x - frequency) ? item : best);
  return { ...peak, differenceHz: peak.x - frequency, relativeDifference: frequency ? Math.abs(peak.x - frequency) / frequency * 100 : null };
}

export function decimateMinMax(points, target = 2500) {
  if (points.length <= target) return points; const bucket = Math.ceil(points.length / Math.max(1, target / 2)); const result = [];
  for (let index = 0; index < points.length; index += bucket) { const slice = points.slice(index, index + bucket); const min = slice.reduce((a, b) => b.y < a.y ? b : a); const max = slice.reduce((a, b) => b.y > a.y ? b : a); result.push(...(min.x <= max.x ? [min, max] : [max, min])); }
  return result;
}

export function timeStatistics(points) {
  const values = points.map(point => point.y); const mean = values.reduce((a, b) => a + b, 0) / values.length; const peak = Math.max(...values.map(Math.abs));
  const rms = Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
  return { minimum: Math.min(...values), maximum: Math.max(...values), mean, rms, peak, peakToPeak: Math.max(...values) - Math.min(...values), crestFactor: rms ? peak / rms : null };
}

const WINDOWS = { none: () => 1, hann: (i, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)), hamming: (i, n) => 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)), blackman: (i, n) => 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (n - 1)) };
export function fftSpectrum(points, options = {}) {
  const resolution = analyzeResolution(points); if (!resolution.uniform) throw new Error("FFT требует равномерной дискретизации.");
  const requested = Number(options.size || 0); let n = requested || 2 ** Math.floor(Math.log2(points.length)); n = Math.min(n, points.length, 65536);
  if (n < 8 || (n & (n - 1))) throw new Error("Число точек FFT должно быть степенью двойки и не менее 8.");
  const dt = resolution.average; const fs = 1 / dt; const window = WINDOWS[options.window || "hann"]; if (!window) throw new Error("Неизвестная оконная функция.");
  const source = points.slice(0, n).map(point => point.y); const mean = options.removeMean === false ? 0 : source.reduce((a, b) => a + b, 0) / n;
  const real = new Float64Array(n); const imag = new Float64Array(n); let gain = 0;
  for (let i = 0; i < n; i += 1) { const w = window(i, n); gain += w; real[i] = (source[i] - mean) * w; }
  for (let i = 1, j = 0; i < n; i += 1) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [real[i], real[j]] = [real[j], real[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const angle = -2 * Math.PI / len; for (let start = 0; start < n; start += len) for (let j = 0; j < len / 2; j += 1) { const c = Math.cos(angle * j); const s = Math.sin(angle * j); const uR = real[start + j]; const uI = imag[start + j]; const vR = real[start + j + len / 2] * c - imag[start + j + len / 2] * s; const vI = real[start + j + len / 2] * s + imag[start + j + len / 2] * c; real[start + j] = uR + vR; imag[start + j] = uI + vI; real[start + j + len / 2] = uR - vR; imag[start + j + len / 2] = uI - vI; } }
  const spectrum = Array.from({ length: n / 2 + 1 }, (_, index) => ({ x: index * fs / n, y: (index === 0 || index === n / 2 ? 1 : 2) * Math.hypot(real[index], imag[index]) / gain }));
  return { points: spectrum, sampleRate: fs, duration: n * dt, size: n, frequencyResolution: fs / n, nyquist: fs / 2, window: options.window || "hann", amplitude: "Peak" };
}

export function bladeOrGearFrequency(rotationHz, count, harmonics = 3) {
  const base = Number(rotationHz) * Number(count); if (!(base > 0) || !Number.isInteger(Number(count)) || Number(count) < 1) throw new Error("Укажите положительную частоту вращения и целое количество элементов.");
  return Array.from({ length: harmonics }, (_, index) => ({ multiplier: index + 1, hz: base * (index + 1) }));
}
