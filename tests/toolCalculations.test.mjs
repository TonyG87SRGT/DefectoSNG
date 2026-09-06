import test from "node:test";
import assert from "node:assert/strict";
import {
  amplitudeRatioToDb,
  analyzeThickness,
  calculateRingGeometry,
  calculateRingPosition,
  calculateUtCoordinates,
  calculateUtScanZone,
  calculateVesselShellStrength,
  convertNdtValue,
  dbToAmplitudeRatio,
  parseThicknessSeries
} from "../js/toolCalculations.js";

test("геометрия кольцевого шва считает доли и процент контроля", () => {
  const result = calculateRingGeometry(530, 300);
  assert.equal(Math.round(result.circumference), 1665);
  assert.equal(Math.round(result.fractions.sixth), 278);
  assert.ok(Math.abs(result.controlledPercent - 18.01754) < 0.001);
  assert.equal(calculateRingGeometry(0), null);
});

test("координаты УЗК сворачивают путь по толщине", () => {
  const result = calculateUtCoordinates({ soundPath: 30, angle: 60, thickness: 10, probeIndex: 5 });
  assert.ok(Math.abs(result.surfaceDistance - 25.9808) < 0.001);
  assert.ok(Math.abs(result.depth - 5) < 0.001);
  assert.equal(result.leg, 2);
  assert.ok(Math.abs(result.coordinateFromProbeFront - 30.9808) < 0.001);
});

test("ход луча считает половину и полный скачок", () => {
  const result = calculateUtScanZone({ thickness: 10, angle: 45 });
  assert.ok(Math.abs(result.halfSkip - 10) < 1e-9);
  assert.ok(Math.abs(result.fullSkip - 20) < 1e-9);
  assert.ok(Math.abs(result.halfPath - Math.sqrt(200)) < 1e-9);
});

test("амплитудные отношения обратимы через децибелы", () => {
  assert.ok(Math.abs(amplitudeRatioToDb(1, 2).db - 6.0205999) < 1e-6);
  assert.ok(Math.abs(dbToAmplitudeRatio(6.0205999).ratio - 2) < 1e-6);
});

test("координата на шве переводится в циферблат", () => {
  const ring = calculateRingGeometry(100);
  const result = calculateRingPosition(100, ring.circumference / 4);
  assert.ok(Math.abs(result.degrees - 90) < 1e-9);
  assert.equal(result.hour, 3);
  assert.equal(result.minute, 0);
});

test("анализ толщинометрии считает статистику и линейную скорость", () => {
  const measurements = parseThicknessSeries("9,8; 9.6\n9,4");
  const result = analyzeThickness(measurements, { nominal: 10, allowable: 8, previousMinimum: 9.8, intervalYears: 2 });
  assert.deepEqual(measurements, [9.8, 9.6, 9.4]);
  assert.equal(result.minimum, 9.4);
  assert.ok(Math.abs(result.average - 9.6) < 1e-9);
  assert.ok(Math.abs(result.corrosionRate - 0.2) < 1e-9);
  assert.ok(Math.abs(result.estimatedYears - 7) < 1e-9);
});

test("конвертер учитывает двойной ход эхо-импульса", () => {
  assert.equal(convertNdtValue("time-one-way", 10, 5900).value, 59);
  assert.equal(convertNdtValue("time-pulse-echo", 10, 5900).value, 29.5);
  assert.ok(Math.abs(convertNdtValue("area-diameter", Math.PI).value - 2) < 1e-9);
});

test("обечайка рассчитывается по формулам 2 и 3 ГОСТ 34233.2", () => {
  const result = calculateVesselShellStrength({
    diameter: 1000,
    thickness: 12,
    allowance: 2,
    allowableStress: 140,
    weldFactor: 0.9,
    designPressure: 2
  });
  assert.ok(Math.abs(result.allowablePressure - 2.4950495) < 1e-6);
  assert.equal(result.pressureConditionMet, true);
  assert.equal(result.thicknessConditionMet, true);
  assert.ok(Math.abs(result.requiredCalculatedThickness - 8) < 1e-9);
  assert.ok(Math.abs(result.requiredNominalThickness - 10) < 1e-9);
  assert.equal(calculateVesselShellStrength({ diameter: 150, thickness: 10, allowance: 1, allowableStress: 140, weldFactor: 1 }).diameterConditionMet, false);
  assert.equal(calculateVesselShellStrength({ diameter: 1000, thickness: 2, allowance: 2, allowableStress: 140, weldFactor: 1 }), null);
});
