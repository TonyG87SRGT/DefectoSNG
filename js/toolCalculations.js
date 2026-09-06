const EPSILON = 1e-9;

export function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundValue(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function calculateRingGeometry(diameterValue, controlledLengthValue = null) {
  const diameter = toNumber(diameterValue);
  if (!(diameter > 0)) return null;
  const circumference = Math.PI * diameter;
  const controlledLength = toNumber(controlledLengthValue);
  return {
    diameter,
    circumference,
    meters: circumference / 1000,
    fractions: {
      half: circumference / 2,
      quarter: circumference / 4,
      sixth: circumference / 6
    },
    controlledPercent: controlledLength != null && controlledLength >= 0
      ? controlledLength / circumference * 100
      : null
  };
}

export function calculateUtCoordinates({ soundPath, angle, thickness, probeIndex = 0 }) {
  const path = toNumber(soundPath);
  const degrees = toNumber(angle);
  const wall = toNumber(thickness);
  const index = toNumber(probeIndex) ?? 0;
  if (!(path >= 0) || !(degrees > 0 && degrees < 90) || !(wall > 0)) return null;

  const radians = degrees * Math.PI / 180;
  const unfoldedDepth = path * Math.cos(radians);
  const surfaceDistance = path * Math.sin(radians);
  const period = 2 * wall;
  const phase = ((unfoldedDepth % period) + period) % period;
  const depth = phase <= wall ? phase : period - phase;
  const leg = Math.max(1, Math.floor(Math.max(0, unfoldedDepth - EPSILON) / wall) + 1);

  return {
    depth,
    surfaceDistance,
    coordinateFromProbeFront: index + surfaceDistance,
    unfoldedDepth,
    leg
  };
}

export function calculateUtScanZone({ thickness, angle, probeIndex = 0 }) {
  const wall = toNumber(thickness);
  const degrees = toNumber(angle);
  const index = toNumber(probeIndex) ?? 0;
  if (!(wall > 0) || !(degrees > 0 && degrees < 90)) return null;
  const radians = degrees * Math.PI / 180;
  const halfSkip = wall * Math.tan(radians);
  const halfPath = wall / Math.cos(radians);
  return {
    halfSkip,
    fullSkip: halfSkip * 2,
    halfPath,
    fullPath: halfPath * 2,
    firstLegFromProbeFront: index + halfSkip,
    fullSkipFromProbeFront: index + halfSkip * 2
  };
}

export function amplitudeRatioToDb(referenceValue, measuredValue) {
  const reference = toNumber(referenceValue);
  const measured = toNumber(measuredValue);
  if (!(reference > 0) || !(measured > 0)) return null;
  return {
    db: 20 * Math.log10(measured / reference),
    ratio: measured / reference,
    percent: measured / reference * 100
  };
}

export function dbToAmplitudeRatio(dbValue) {
  const db = toNumber(dbValue);
  if (db == null) return null;
  const ratio = 10 ** (db / 20);
  return { db, ratio, percent: ratio * 100 };
}

export function applyDbCorrection(baseValue, correctionValue) {
  const base = toNumber(baseValue);
  const correction = toNumber(correctionValue);
  if (base == null || correction == null) return null;
  return { result: base + correction };
}

export function calculateRingPosition(diameterValue, arcLengthValue) {
  const ring = calculateRingGeometry(diameterValue);
  const arcLength = toNumber(arcLengthValue);
  if (!ring || !(arcLength >= 0)) return null;
  const normalizedLength = arcLength % ring.circumference;
  const degrees = normalizedLength / ring.circumference * 360;
  let totalClockMinutes = Math.round(degrees * 2) % 720;
  let hour = Math.floor(totalClockMinutes / 60);
  const minute = totalClockMinutes % 60;
  if (hour === 0) hour = 12;
  return { ...ring, normalizedLength, degrees, hour, minute };
}

export function parseThicknessSeries(value) {
  return (String(value ?? "").match(/-?\d+(?:[.,]\d+)?/g) || [])
    .map(item => Number(item.replace(",", ".")))
    .filter(item => Number.isFinite(item) && item > 0);
}

export function analyzeThickness(values, options = {}) {
  const measurements = Array.isArray(values) ? values.filter(value => Number(value) > 0).map(Number) : [];
  if (!measurements.length) return null;
  const minimum = Math.min(...measurements);
  const maximum = Math.max(...measurements);
  const average = measurements.reduce((sum, value) => sum + value, 0) / measurements.length;
  const nominal = toNumber(options.nominal);
  const allowable = toNumber(options.allowable);
  const previousMinimum = toNumber(options.previousMinimum);
  const intervalYears = toNumber(options.intervalYears);
  const corrosionRate = previousMinimum != null && intervalYears > 0
    ? (previousMinimum - minimum) / intervalYears
    : null;
  const remainingToAllowable = allowable != null ? minimum - allowable : null;
  const estimatedYears = corrosionRate > 0 && remainingToAllowable > 0
    ? remainingToAllowable / corrosionRate
    : null;
  return {
    count: measurements.length,
    minimum,
    maximum,
    average,
    spread: maximum - minimum,
    loss: nominal != null ? nominal - minimum : null,
    lossPercent: nominal > 0 ? (nominal - minimum) / nominal * 100 : null,
    allowable,
    remainingToAllowable,
    corrosionRate,
    estimatedYears
  };
}

export function convertNdtValue(mode, rawValue, extraValue) {
  const value = toNumber(rawValue);
  const extra = toNumber(extraValue);
  if (value == null) return null;
  if (mode === "time-one-way") {
    if (!(extra > 0)) return null;
    return { value: value * extra / 1000, unit: "мм", formula: "L = t × c / 1000" };
  }
  if (mode === "time-pulse-echo") {
    if (!(extra > 0)) return null;
    return { value: value * extra / 2000, unit: "мм", formula: "H = t × c / 2000" };
  }
  if (mode === "wavelength") {
    if (!(extra > 0)) return null;
    return { value: extra / (value * 1000), unit: "мм", formula: "λ = c / (f × 1000)" };
  }
  if (mode === "area-diameter") {
    if (!(value >= 0)) return null;
    return { value: Math.sqrt(4 * value / Math.PI), unit: "мм", formula: "dэкв = √(4S / π)" };
  }
  if (mode === "mm-m") return { value: value / 1000, unit: "м", formula: "м = мм / 1000" };
  if (mode === "m-mm") return { value: value * 1000, unit: "мм", formula: "мм = м × 1000" };
  return null;
}

export function calculateVesselShellStrength({ diameter, thickness, allowance, allowableStress, weldFactor, designPressure }) {
  const innerDiameter = toNumber(diameter);
  const wall = toNumber(thickness);
  const totalAllowance = toNumber(allowance);
  const stress = toNumber(allowableStress);
  const factor = toNumber(weldFactor);
  const pressure = toNumber(designPressure);
  if (!(innerDiameter > 0) || !(wall > 0) || !(totalAllowance >= 0) || !(stress > 0) || !(factor > 0 && factor <= 1)) return null;
  const effectiveThickness = wall - totalAllowance;
  if (!(effectiveThickness > 0)) return null;
  const allowablePressure = 2 * stress * factor * effectiveThickness / (innerDiameter + effectiveThickness);
  const ratio = effectiveThickness / innerDiameter;
  const thicknessConditionLimit = 0.1;
  const diameterConditionMet = innerDiameter >= 200;
  let requiredCalculatedThickness = null;
  let requiredNominalThickness = null;
  if (pressure != null && pressure >= 0 && 2 * stress * factor > pressure) {
    requiredCalculatedThickness = pressure * innerDiameter / (2 * stress * factor - pressure);
    requiredNominalThickness = requiredCalculatedThickness + totalAllowance;
  }
  return {
    effectiveThickness,
    allowablePressure,
    ratio,
    thicknessConditionLimit,
    diameterConditionMet,
    thicknessConditionMet: diameterConditionMet && ratio <= thicknessConditionLimit + EPSILON,
    designPressure: pressure,
    pressureConditionMet: pressure == null ? null : pressure <= allowablePressure + EPSILON,
    requiredCalculatedThickness,
    requiredNominalThickness
  };
}
