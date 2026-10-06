import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateCriterion, validateCriteriaData } from "../js/criteriaEngine.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/criteria.json", import.meta.url), "utf8"));
const byId = new Map(data.criteria.map(item => [item.id, item]));
const evaluate = (id, values = {}) => evaluateCriterion(byId.get(id), values);

test("СП 70 представлен самостоятельной веткой с шестью методами", () => {
  const standard = data.standards.find(item => item.id === "sp70");
  const criteria = data.criteria.filter(item => item.source?.basisDocument === "sp-70-2012");
  assert.equal(standard.shortTitle, "Стальные конструкции — СП 70");
  assert.equal(data.documents.find(item => item.id === "sp-70-2012")?.status, "current");
  assert.ok(criteria.length >= 15);
  assert.deepEqual(new Set(criteria.map(item => item.method)), new Set(["vik", "rk", "uzk", "pvk", "mk", "leak"]));
  assert.deepEqual(validateCriteriaData(data), []);
});

test("ВИК рассчитывает подрез и наружные дефекты по таблице 10.7", () => {
  assert.equal(evaluate("sp70-vik-undercut", { thickness1: 10, depth: 0.5 }).allowed, true);
  assert.equal(evaluate("sp70-vik-undercut", { thickness1: 10, depth: 0.501 }).allowed, false);
  assert.equal(evaluate("sp70-vik-undercut", { thickness1: 30, depth: 1 }).allowed, true);
  assert.equal(evaluate("sp70-vik-undercut", { thickness1: 30, depth: 1.001 }).allowed, false);
  assert.equal(evaluate("sp70-vik-single-defect", { thickness1: 20, sp70AssessmentLength: 30, depth: 2, length: 6 }).allowed, true);
  assert.equal(evaluate("sp70-vik-single-defect", { thickness1: 20, sp70AssessmentLength: 30, depth: 2, length: 6.01 }).allowed, false);
  assert.equal(evaluate("sp70-vik-cracks").allowed, false);
});

test("РК выбирает точные строки таблицы 10.9", () => {
  const values = { sp70Condition: "standard", sp70RkDefectType: "single", depth: 0.8, length: 15, sp70TotalDefectArea: 3 };
  assert.equal(evaluate("sp70-rk-pores-inclusions", { ...values, thickness1: 4 }).allowed, true);
  assert.equal(evaluate("sp70-rk-pores-inclusions", { ...values, thickness1: 6 }).allowed, true);
  const aboveSix = evaluate("sp70-rk-pores-inclusions", { ...values, thickness1: "6,01", depth: 1.2, length: 20, sp70TotalDefectArea: 6 });
  assert.equal(aboveSix.allowed, true);
  assert.match(aboveSix.checks[0].calculation, /6 < S ≤ 8/);
  assert.equal(evaluate("sp70-rk-pores-inclusions", { ...values, thickness1: 60, depth: 4, length: 30, sp70TotalDefectArea: 18 }).allowed, true);
  assert.equal(evaluate("sp70-rk-pores-inclusions", { ...values, thickness1: 60.01 }).status, "outside");
});

test("РК в специальных условиях допускает только одиночный сферический дефект", () => {
  const single = evaluate("sp70-rk-pores-inclusions", { sp70Condition: "special", sp70RkDefectType: "single", thickness1: 10, depth: 0.8, neighborDistance: 40 });
  assert.equal(single.allowed, true);
  assert.equal(evaluate("sp70-rk-pores-inclusions", { sp70Condition: "special", sp70RkDefectType: "single", thickness1: 10, depth: 0.81, neighborDistance: 40 }).allowed, false);
  assert.equal(evaluate("sp70-rk-pores-inclusions", { sp70Condition: "special", sp70RkDefectType: "chain", thickness1: 10 }).allowed, false);
});

test("УЗК применяет таблицу 10.10 и специальное уменьшение площади", () => {
  const base = { sp70Condition: "standard", equivalentArea: 4, length: 10, defectCount: 1 };
  assert.equal(evaluate("sp70-uzk-table1010", { ...base, thickness1: 6 }).status, "outside");
  assert.equal(evaluate("sp70-uzk-table1010", { ...base, thickness1: 6.001 }).allowed, true);
  assert.equal(evaluate("sp70-uzk-table1010", { ...base, thickness1: 10 }).allowed, true);
  assert.equal(evaluate("sp70-uzk-table1010", { ...base, thickness1: 10.001, equivalentArea: 6, defectCount: 2 }).allowed, true);
  const special = evaluate("sp70-uzk-table1010", { sp70Condition: "special", thickness1: 20, equivalentArea: 3, length: 10, defectCount: 2, neighborDistance: 50 });
  assert.equal(special.allowed, true);
  assert.equal(evaluate("sp70-uzk-table1010", { sp70Condition: "special", thickness1: 20, equivalentArea: 3.01, length: 10, defectCount: 2, neighborDistance: 50 }).allowed, false);
});

test("суммарная площадь и контроль герметичности показывают расчёт", () => {
  assert.equal(evaluate("sp70-all-total-area", { sp70JointAccess: "two", sp70SectionArea: 100, sp70TotalDefectArea: 5 }).allowed, true);
  assert.equal(evaluate("sp70-all-total-area", { sp70JointAccess: "two", sp70SectionArea: 100, sp70TotalDefectArea: 5.01 }).allowed, false);
  assert.equal(evaluate("sp70-all-total-area", { sp70JointAccess: "one", sp70SectionArea: 100, sp70TotalDefectArea: 10 }).allowed, true);
  assert.equal(evaluate("sp70-leak", { sp70LeakState: "no" }).allowed, true);
  assert.equal(evaluate("sp70-leak", { sp70LeakState: "yes" }).allowed, false);
});
