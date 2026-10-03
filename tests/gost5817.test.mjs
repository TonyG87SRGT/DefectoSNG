import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateCriterion, validateCriteriaData } from "../js/criteriaEngine.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/criteria.json", import.meta.url), "utf8"));
const byId = new Map(data.criteria.map(item => [item.id, item]));
const evaluate = (id, values) => evaluateCriterion(byId.get(id), values);

test("ветка ГОСТ ISO 5817-2025 встроена как Общие сварные соединения", () => {
  const standard = data.standards.find(item => item.id === "gost-iso-5817-2025");
  assert.equal(standard.title, "Общие сварные соединения");
  assert.equal(data.documents.find(item => item.id === standard.id)?.status, "current");
  assert.equal(data.criteria.filter(item => item.source?.basisDocument === standard.id).length, 33);
  assert.deepEqual(validateCriteriaData(data), []);
});

test("подрез выбирает точную границу t = 3 мм и уровень качества", () => {
  assert.equal(evaluate("iso5817-undercut", { iso5817Quality: "B", iso5817Thickness: 3, iso5817Measured: 0 }).allowed, false);
  assert.equal(evaluate("iso5817-undercut", { iso5817Quality: "B", iso5817Thickness: "3,01", iso5817Measured: "0,15" }).allowed, true);
  assert.equal(evaluate("iso5817-undercut", { iso5817Quality: "B", iso5817Thickness: "3,01", iso5817Measured: "0,16" }).allowed, false);
  assert.equal(evaluate("iso5817-undercut", { iso5817Quality: "D", iso5817Thickness: 10, iso5817Measured: 1 }).allowed, true);
  assert.equal(evaluate("iso5817-undercut", { iso5817Quality: "D", iso5817Thickness: 10, iso5817Measured: 1.01 }).allowed, false);
});

test("формулы смещения, выпуклости и минимального угла показывают граничный результат", () => {
  assert.equal(evaluate("iso5817-sheet-misalignment", { iso5817Quality: "C", iso5817Thickness: 10, iso5817Measured: 1.5 }).allowed, true);
  assert.equal(evaluate("iso5817-sheet-misalignment", { iso5817Quality: "C", iso5817Thickness: 10, iso5817Measured: 1.51 }).allowed, false);
  assert.equal(evaluate("iso5817-excess-butt", { iso5817Quality: "B", iso5817WeldWidth: 20, iso5817Measured: 3 }).allowed, true);
  assert.equal(evaluate("iso5817-excess-butt", { iso5817Quality: "B", iso5817WeldWidth: 20, iso5817Measured: 3.01 }).allowed, false);
  assert.equal(evaluate("iso5817-profile-angle", { iso5817Quality: "B", iso5817Angle: 150 }).allowed, true);
  assert.equal(evaluate("iso5817-profile-angle", { iso5817Quality: "B", iso5817Angle: 149.9 }).allowed, false);
});

test("пористость различает однослойный и многослойный шов", () => {
  assert.equal(evaluate("iso5817-porosity-percent", { iso5817Quality: "B", iso5817LayerCount: "single", iso5817PorosityPercent: 1 }).allowed, true);
  assert.equal(evaluate("iso5817-porosity-percent", { iso5817Quality: "B", iso5817LayerCount: "single", iso5817PorosityPercent: 1.01 }).allowed, false);
  assert.equal(evaluate("iso5817-porosity-percent", { iso5817Quality: "B", iso5817LayerCount: "multi", iso5817PorosityPercent: 2 }).allowed, true);
});

test("трещина и медное включение безусловно не допускаются", () => {
  for (const quality of ["B", "C", "D"]) {
    assert.equal(evaluate("iso5817-surface-cracks", { iso5817Quality: quality }).allowed, false);
    assert.equal(evaluate("iso5817-internal-crack-copper", { iso5817Quality: quality }).allowed, false);
  }
});
