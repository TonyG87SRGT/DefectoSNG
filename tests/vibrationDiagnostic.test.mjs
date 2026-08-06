import test from "node:test";
import assert from "node:assert/strict";
import { evaluateDiagnosticAnswers } from "../js/vibrationDiagnosticEngine.js";
import { DIAGNOSTIC_RULES } from "../js/vibrationDiagnosticRules.js";
import { clearDiagnosticHistory, deleteDiagnosticSession, loadDiagnosticHistory, saveDiagnosticSession } from "../js/vibrationDiagnosticStorage.js";

const reliable = { machineState: "running", operatingMode: "steady", rpm: "1500", measurementChecks: ["sensor-correct", "mount-secure", "surface-clean", "cable-checked", "cable-free", "repeated", "other-point", "other-direction"], measurementRisks: [], history: ["gradual"], additional: ["radial-phase-same"] };

test("правила имеют уникальные ID, источники и ссылки на материалы", () => {
  assert.equal(new Set(DIAGNOSTIC_RULES.map(rule => rule.id)).size, DIAGNOSTIC_RULES.length);
  DIAGNOSTIC_RULES.forEach(rule => {
    assert.ok(rule.conditions.length, rule.id);
    assert.ok(rule.possibleFaults.length, rule.id);
    assert.ok(rule.source.some(source => source.document === "ГОСТ Р ИСО 13373-3-2016"), rule.id);
  });
});

test("сценарий вероятного дисбаланса сохраняет альтернативы", () => {
  const result = evaluateDiagnosticAnswers({ ...reliable, equipment: "motor", construction: ["speed-known"], signs: ["one-x"], frequencies: ["dominant-1x"], direction: "horizontal" });
  assert.equal(result.causes[0].id, "vibration-fault-unbalance");
  assert.ok(result.causes.some(item => item.id === "vibration-fault-resonance"));
  assert.ok(result.checks.some(item => /фаз/i.test(item)));
  assert.ok(result.checks.some(item => /разгон/i.test(item)));
});

test("сценарий несоосности рекомендует центровку и муфту", () => {
  const result = evaluateDiagnosticAnswers({ ...reliable, equipment: "pump-unit", signs: ["one-x", "two-x"], frequencies: ["one-two-x"], direction: "axial", additional: ["phase-180-coupling"], history: ["after-repair"] });
  assert.ok(["vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment"].includes(result.causes[0].id));
  assert.ok(result.checks.some(item => /центровк/i.test(item)));
  assert.ok(result.checks.some(item => /муфт/i.test(item)));
});

test("сценарий кавитации учитывает насос, шум и производительность", () => {
  const result = evaluateDiagnosticAnswers({ ...reliable, equipment: "pump", signs: ["broadband", "unusual-noise", "performance-loss"], frequencies: [], history: ["load-dependent"] });
  assert.equal(result.causes[0].id, "vibration-fault-cavitation");
  assert.ok(result.checks.some(item => /всасывании/i.test(item)));
  assert.ok(result.checks.some(item => /расход/i.test(item)));
});

test("подозрение на дефект измерения приостанавливает диагностику", () => {
  const result = evaluateDiagnosticAnswers({ equipment: "motor", operatingMode: "steady", signs: ["overall-rise"], measurementChecks: [], measurementRisks: ["single-channel", "weak-mount", "low-frequency-noise"] });
  assert.equal(result.blocked, true);
  assert.equal(result.quality.level, "низкая");
  assert.ok(result.checks.some(item => /цеп|датчик|кабел/i.test(item)));
});

test("сценарий масляной прецессии учитывает подшипник и 0,4–0,47×", () => {
  const result = evaluateDiagnosticAnswers({ ...reliable, equipment: "turbine", construction: ["journal-bearing", "speed-known"], signs: ["subharmonics", "orbit-change"], frequencies: ["oil-whirl"], operatingMode: "runup", history: ["temperature-dependent"], oilTemperature: "55" });
  assert.ok(["vibration-fault-oil-whirl", "vibration-fault-rotor-precession"].includes(result.causes[0].id));
  assert.ok(result.checks.some(item => /положен.*вала/i.test(item)));
  assert.ok(result.checks.some(item => /масла/i.test(item)));
});

test("локальная история ограничена, удаляется и очищается", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  for (let index = 0; index < 12; index += 1) saveDiagnosticSession({ id: `s${index}`, equipment: "pump", quality: "средняя" }, storage);
  assert.equal(loadDiagnosticHistory(storage).length, 10);
  deleteDiagnosticSession("s11", storage);
  assert.equal(loadDiagnosticHistory(storage).some(item => item.id === "s11"), false);
  clearDiagnosticHistory(storage);
  assert.deepEqual(loadDiagnosticHistory(storage), []);
});
