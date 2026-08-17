import test from "node:test";
import assert from "node:assert/strict";
import {
  CalculationError, STANDARD_GRAVITY, calculateBearingFrequencies, calculateOrders, calculateSinusoidal,
  convertAcceleration, convertRotation, parseDecimal
} from "../js/vibrationCalculations.js";
import { recommendParameter, VIBRATION_CALCULATOR_IDS } from "../js/vibrationCalculatorData.js";
import { loadCalculatorHistory, saveCalculatorResult } from "../js/vibrationCalculatorStorage.js";
import vibrationItems from "../data/vibration.json" with { type: "json" };
import { ESSENTIAL_APP_PATHS, APP_VERSION } from "../js/pwaConfig.js";

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);

test("3000 об/мин равны 50 Гц", () => near(convertRotation("3000", "rpm").hz, 50));
test("1 Гц равен 2π рад/с", () => near(convertRotation(1, "hz").radPerSecond, 2 * Math.PI));
test("гармоники 1500 об/мин рассчитаны корректно", () => {
  const rows = calculateOrders(1500, "rpm", 3);
  near(rows.find(row => row.order === 0.5).hz, 12.5);
  near(rows.find(row => row.order === 1).hz, 25);
  near(rows.find(row => row.order === 2).hz, 50);
  near(rows.find(row => row.order === 3).hz, 75);
});

test("частоты подшипника соответствуют фиксированной геометрии", () => {
  const result = calculateBearingFrequencies({ innerRotation: 1500, outerRotation: 0, rotationUnit: "rpm", rollingElements: 8, rollingElementDiameter: 10, pitchDiameter: 50, contactAngle: 0, harmonicCount: 3 });
  const byCode = Object.fromEntries(result.frequencies.map(item => [item.code, item]));
  near(byCode.FTF.hz, 10); near(byCode.BPFO.hz, 80); near(byCode.BPFI.hz, 120); near(byCode.BSF.hz, 60);
  near(byCode.FTF.order, 0.4); near(byCode.BPFO.order, 3.2); near(byCode.BPFI.order, 4.8); near(byCode.BSF.order, 2.4);
  near(byCode.BPFO.harmonics[2].hz, 240);
});

test("1 g переводится в стандартное ускорение", () => near(convertAcceleration(1, "g", "m/s2"), STANDARD_GRAVITY));
test("гармоническое перемещение преобразуется в скорость и ускорение", () => {
  const result = calculateSinusoidal({ known: "displacement", value: 1, unit: "mm", amplitudeType: "peak", frequency: 10, frequencyUnit: "hz" });
  near(result.velocityPeakMps, 2 * Math.PI * 10 * 0.001);
  near(result.accelerationPeakMps2, (2 * Math.PI * 10) ** 2 * 0.001);
});

test("d ≥ D отклоняется понятной ошибкой", () => assert.throws(() => calculateBearingFrequencies({ innerRotation: 1500, outerRotation: 0, rotationUnit: "rpm", rollingElements: 8, rollingElementDiameter: 50, pitchDiameter: 50, contactAngle: 0 }), error => error instanceof CalculationError && error.field === "rolling-element-diameter"));
test("запятая и точка дают одинаковое число", () => near(parseDecimal("12,5"), parseDecimal("12.5")));
test("вращение наружного кольца не рассчитывается по неподтверждённой формуле", () => assert.throws(() => calculateBearingFrequencies({ innerRotation: 1500, outerRotation: 10, rotationUnit: "rpm", rollingElements: 8, rollingElementDiameter: 10, pitchDiameter: 50, contactAngle: 0 }), /неподвижного наружного кольца/));
test("помощник рекомендует ускорение для подшипника", () => assert.match(recommendParameter("bearing", "motor", "high").parameter, /виброускорение/i));
test("история ограничена и читается из совместимого хранилища", () => {
  const data = new Map(); const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  for (let index = 0; index < 20; index += 1) saveCalculatorResult({ toolId: VIBRATION_CALCULATOR_IDS[0], summary: String(index) }, storage);
  assert.equal(loadCalculatorHistory(storage).length, 15);
});
test("все пять прежних ID активированы без смены маршрутов", () => {
  const byId = new Map(vibrationItems.map(item => [item.id, item]));
  VIBRATION_CALCULATOR_IDS.forEach(id => {
    assert.equal(byId.get(id)?.status, "published");
    assert.equal(byId.get(id)?.toolConfig?.kind, "calculator");
  });
});
test("текущая PWA кэширует расчётные модули", () => {
  assert.equal(APP_VERSION, "0.30.0");
  ["css/vibration-calculators.css", "js/vibrationCalculations.js", "js/vibrationCalculatorData.js", "js/vibrationCalculatorStorage.js", "js/vibrationCalculators.js"].forEach(path => assert.ok(ESSENTIAL_APP_PATHS.includes(path), path));
});
