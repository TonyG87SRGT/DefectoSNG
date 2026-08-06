export const STANDARD_GRAVITY = 9.80665;
export const TWO_PI = 2 * Math.PI;

export class CalculationError extends Error {
  constructor(message, field = "") { super(message); this.name = "CalculationError"; this.field = field; }
}

export function parseDecimal(value, field = "value") {
  const normalized = String(value ?? "").trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    throw new CalculationError("Введите числовое значение.", field);
  }
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new CalculationError("Введите конечное числовое значение.", field);
  return number;
}

export function formatCalculation(value, digits = 3) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const maximum = abs > 0 && abs < 0.001 ? Math.max(digits, 6) : digits;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: maximum }).format(value);
}

const rotationToHz = Object.freeze({ rpm: value => value / 60, rps: value => value, hz: value => value, rad: value => value / TWO_PI });

export function convertRotation(value, unit = "rpm") {
  const number = parseDecimal(value, "rotation");
  if (number <= 0) throw new CalculationError("Частота вращения должна быть больше нуля.", "rotation");
  const converter = rotationToHz[unit];
  if (!converter) throw new CalculationError("Неизвестная единица частоты вращения.", "rotation-unit");
  const hz = converter(number);
  return { rpm: hz * 60, rps: hz, hz, radPerSecond: hz * TWO_PI, periodSeconds: 1 / hz, periodMilliseconds: 1000 / hz };
}

export function calculateOrders(rotation, unit = "rpm", maximumOrder = 10, customOrder = null) {
  const base = convertRotation(rotation, unit);
  const max = parseDecimal(maximumOrder, "maximum-order");
  if (!Number.isInteger(max) || max < 1 || max > 20) throw new CalculationError("Укажите целое число гармоник от 1 до 20.", "maximum-order");
  const orders = [0.5, 1 / 3, 0.25, 0.4, 0.42, 0.45, 0.47, ...Array.from({ length: max }, (_, index) => index + 1)];
  if (customOrder !== null && String(customOrder).trim() !== "") {
    const custom = parseDecimal(customOrder, "custom-order");
    if (custom <= 0 || custom > 100) throw new CalculationError("Порядок должен быть больше нуля и не более 100×.", "custom-order");
    orders.push(custom);
  }
  return [...new Set(orders)].sort((a, b) => a - b).map(order => ({ order, hz: base.hz * order, cyclesPerMinute: base.rpm * order }));
}

export function calculateBearingFrequencies(input) {
  const inner = convertRotation(input.innerRotation, input.rotationUnit).hz;
  const outerRaw = String(input.outerRotation ?? "0").trim();
  const outer = outerRaw ? parseDecimal(outerRaw, "outer-rotation") : 0;
  if (outer < 0) throw new CalculationError("Частота наружного кольца не может быть отрицательной.", "outer-rotation");
  if (outer !== 0) throw new CalculationError("Проверенный расчёт доступен для неподвижного наружного кольца. Общий случай вращения обоих колец не применяется без подтверждённой формулы.", "outer-rotation");
  const count = parseDecimal(input.rollingElements, "rolling-elements");
  const diameter = parseDecimal(input.rollingElementDiameter, "rolling-element-diameter");
  const pitch = parseDecimal(input.pitchDiameter, "pitch-diameter");
  const angle = parseDecimal(input.contactAngle ?? 0, "contact-angle");
  const harmonicCount = parseDecimal(input.harmonicCount ?? 3, "harmonic-count");
  if (!Number.isInteger(count) || count < 3) throw new CalculationError("Количество тел качения должно быть целым числом не менее 3.", "rolling-elements");
  if (diameter <= 0) throw new CalculationError("Диаметр тела качения должен быть больше нуля.", "rolling-element-diameter");
  if (pitch <= 0) throw new CalculationError("Диаметр окружности центров должен быть больше нуля.", "pitch-diameter");
  if (diameter >= pitch) throw new CalculationError("Диаметр тела качения должен быть меньше диаметра окружности центров.", "rolling-element-diameter");
  if (angle < 0 || angle > 90) throw new CalculationError("Угол контакта должен находиться в диапазоне от 0° до 90°.", "contact-angle");
  if (!Number.isInteger(harmonicCount) || harmonicCount < 1 || harmonicCount > 10) throw new CalculationError("Количество гармоник должно быть целым числом от 1 до 10.", "harmonic-count");
  const ratio = diameter / pitch;
  const factor = ratio * Math.cos(angle * Math.PI / 180);
  const fr = inner;
  const values = {
    FTF: 0.5 * fr * (1 - factor),
    BPFO: 0.5 * count * fr * (1 - factor),
    BPFI: 0.5 * count * fr * (1 + factor),
    BSF: pitch / (2 * diameter) * fr * (1 - factor ** 2)
  };
  const frequencies = Object.entries(values).map(([code, hz]) => ({
    code, hz, order: hz / fr,
    harmonics: Array.from({ length: harmonicCount }, (_, index) => ({ multiplier: index + 1, hz: hz * (index + 1) }))
  }));
  const sidebands = [1, 2].flatMap(order => [
    { label: `BPFI − ${order}×`, hz: Math.max(0, values.BPFI - order * fr) },
    { label: `BPFI + ${order}×`, hz: values.BPFI + order * fr }
  ]);
  return { rotation: convertRotation(input.innerRotation, input.rotationUnit), frequencies, sidebands, geometryWarning: ratio > 0.5 };
}

const displacementFactors = Object.freeze({ m: 1, mm: 1e-3, um: 1e-6, inch: 0.0254, mil: 0.0000254 });
const velocityFactors = Object.freeze({ "m/s": 1, "mm/s": 1e-3, "cm/s": 1e-2, "in/s": 0.0254 });
const accelerationFactors = Object.freeze({ "m/s2": 1, "mm/s2": 1e-3, g: STANDARD_GRAVITY });

function convertUnit(value, from, to, factors, field = "value") {
  const number = parseDecimal(value, field);
  if (!(from in factors) || !(to in factors)) throw new CalculationError("Неизвестная единица измерения.", field);
  return number * factors[from] / factors[to];
}

export const convertDisplacement = (value, from, to) => convertUnit(value, from, to, displacementFactors);
export const convertVelocity = (value, from, to) => convertUnit(value, from, to, velocityFactors);
export const convertAcceleration = (value, from, to) => convertUnit(value, from, to, accelerationFactors);

export function convertAmplitude(value, from, to) {
  const number = parseDecimal(value);
  if (from === to) return number;
  if (from === "peak" && to === "p2p") return number * 2;
  if (from === "p2p" && to === "peak") return number / 2;
  if (from === "rms" && to === "peak") return number * Math.SQRT2;
  if (from === "peak" && to === "rms") return number / Math.SQRT2;
  throw new CalculationError("Для выбранных представлений прямой пересчёт не предусмотрен.", "amplitude-type");
}

export function calculateSinusoidal(input) {
  const frequency = convertRotation(input.frequency, input.frequencyUnit === "rpm" ? "rpm" : "hz").hz;
  let displacementPeak;
  let velocityPeak;
  let accelerationPeak;
  if (input.known === "displacement") {
    displacementPeak = convertDisplacement(input.value, input.unit, "m");
    if (input.amplitudeType === "p2p") displacementPeak /= 2;
    if (input.amplitudeType !== "peak" && input.amplitudeType !== "p2p") throw new CalculationError("Для перемещения выберите Peak или Peak-to-Peak.", "amplitude-type");
    velocityPeak = TWO_PI * frequency * displacementPeak;
    accelerationPeak = TWO_PI ** 2 * frequency ** 2 * displacementPeak;
  } else if (input.known === "velocity") {
    velocityPeak = convertVelocity(input.value, input.unit, "m/s");
    if (input.amplitudeType === "rms") velocityPeak *= Math.SQRT2;
    accelerationPeak = TWO_PI * frequency * velocityPeak;
    displacementPeak = velocityPeak / (TWO_PI * frequency);
  } else if (input.known === "acceleration") {
    accelerationPeak = convertAcceleration(input.value, input.unit, "m/s2");
    if (input.amplitudeType === "rms") accelerationPeak *= Math.SQRT2;
    velocityPeak = accelerationPeak / (TWO_PI * frequency);
    displacementPeak = accelerationPeak / (TWO_PI * frequency) ** 2;
  } else throw new CalculationError("Выберите известную величину.", "known");
  return {
    frequencyHz: frequency,
    displacementPeakM: displacementPeak,
    displacementPeakToPeakM: displacementPeak * 2,
    velocityPeakMps: velocityPeak,
    velocityRmsMps: velocityPeak / Math.SQRT2,
    accelerationPeakMps2: accelerationPeak,
    accelerationRmsMps2: accelerationPeak / Math.SQRT2
  };
}
