import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateCriterion, validateCriteriaData } from "../js/criteriaEngine.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/criteria.json", import.meta.url), "utf8"));
const byId = new Map(data.criteria.map(item => [item.id, item]));
const evaluate = (id, values = {}) => evaluateCriterion(byId.get(id), values);

test("ГОСТ 34347-2017 представлен пятью методами и 14 карточками", () => {
  const standard = data.standards.find(item => item.id === "gost34347");
  const criteria = data.criteria.filter(item => item.source?.basisDocument === "gost-34347-2017");
  assert.equal(standard.title, "Сосуды и аппараты");
  assert.equal(data.documents.find(item => item.id === "gost-34347-2017")?.status, "current");
  assert.equal(criteria.length, 14);
  assert.deepEqual(new Set(criteria.map(item => item.method)), new Set(["vik", "rk", "uzk", "pvk", "mk"]));
  assert.deepEqual(validateCriteriaData(data), []);
});

test("таблица 15 проверяет размер и число наружных пор на точных границах", () => {
  const base = { gost34347Thickness: 3, width: 0.5, defectCount: 3 };
  assert.equal(evaluate("gost34347-vik-pores", base).allowed, true);
  assert.equal(evaluate("gost34347-vik-pores", { ...base, width: 0.51 }).allowed, false);
  assert.equal(evaluate("gost34347-vik-pores", { gost34347Thickness: "3,01", width: 0.6, defectCount: 4 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-pores", { gost34347Thickness: 40, width: 2.5, defectCount: 7 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-pores", { gost34347Thickness: 40.01, width: 2.5, defectCount: 8 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-pores", { gost34347Thickness: 1.99, width: 0, defectCount: 0 }).status, "outside");
});

test("исключение для местного подреза требует группу 3–5 и температуру выше нуля", () => {
  const values = { gost34347VesselGroup: "3", temperature: 1, gost34347Thickness: 10, depth: 0.5, undercutLength: 10, weldLength: 100 };
  assert.equal(evaluate("gost34347-vik-undercut", values).allowed, true);
  assert.equal(evaluate("gost34347-vik-undercut", { ...values, depth: 0.51 }).allowed, false);
  assert.equal(evaluate("gost34347-vik-undercut", { ...values, gost34347VesselGroup: "2" }).allowed, false);
  assert.equal(evaluate("gost34347-vik-undercut", { ...values, temperature: 0 }).allowed, false);
});

test("таблицы 7 и 12 выбирают корректные диапазоны смещения кромок", () => {
  assert.equal(evaluate("gost34347-vik-pipe-offset", { gost34347Thickness: 3, edgeOffset: 0.6 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-pipe-offset", { gost34347Thickness: 3.01, edgeOffset: 0.601 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-pipe-offset", { gost34347Thickness: 20, edgeOffset: 2 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-pipe-offset", { gost34347Thickness: 40, edgeOffset: 3.01 }).allowed, false);
  assert.equal(evaluate("gost34347-vik-sheet-offset-longitudinal", { gost34347Thickness: 100, edgeOffset: 3 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-sheet-offset-circumferential", { gost34347Thickness: 100, edgeOffset: 7.5 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-sheet-offset-circumferential", { gost34347Thickness: 100.01, edgeOffset: 7.50025 }).allowed, true);
  assert.equal(evaluate("gost34347-vik-sheet-offset-circumferential", { gost34347Thickness: 100.01, edgeOffset: 7.51 }).allowed, false);
});

test("таблица 16 назначает классы 3–7 и применяет соответствующую строку ГОСТ 23055", () => {
  const measurements = { gost34347Thickness: 10, width: 0.8, length: 2.5, clusterLength: 3.75, totalLength: 8 };
  const class3 = evaluate("gost34347-rk-pores-inclusions", { gost34347VesselGroup: "1", gost34347JointType: "butt", ...measurements });
  assert.equal(class3.allowed, true);
  assert.match(class3.decision, /КЛАССУ 3/);
  assert.equal(evaluate("gost34347-rk-pores-inclusions", { gost34347VesselGroup: "1", gost34347JointType: "butt", ...measurements, width: 0.81 }).allowed, false);

  const class7 = evaluate("gost34347-rk-pores-inclusions", { gost34347VesselGroup: "5", gost34347JointType: "lap", gost34347Thickness: 10, width: 2, length: 10, clusterLength: 15, totalLength: 20 });
  assert.equal(class7.allowed, true);
  assert.match(class7.decision, /КЛАССУ 7/);
  assert.equal(evaluate("gost34347-rk-pores-inclusions", { gost34347VesselGroup: "5", gost34347JointType: "lap", gost34347Thickness: 121, width: 1, length: 1, clusterLength: 1, totalLength: 1 }).status, "outside");
});

test("УЗК не получает выдуманную эквивалентную площадь", () => {
  const result = evaluate("gost34347-uzk-other");
  assert.equal(result.status, "guidance");
  assert.match(result.message, /не устанавливает.*универсальную численную/);
});
