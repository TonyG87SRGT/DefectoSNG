import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateCriterion, validateCriteriaData } from "../js/criteriaEngine.js";

const data = JSON.parse(await readFile(new URL("../data/criteria.json", import.meta.url), "utf8"));
const byId = new Map(data.criteria.map(item => [item.id, item]));

test("СП 284 + СП 406 образуют отдельную ветку промысловых трубопроводов без копирования таблиц", () => {
  const standard = data.standards.find(item => item.id === "sp284-sp406");
  assert.ok(standard);
  assert.deepEqual(standard.basisDocuments, ["sp-284-2016", "sp-406-2018"]);
  assert.equal(standard.applicationSource.documentId, "sp-284-2016");
  assert.ok(standard.searchAliases.includes("промысловый трубопровод"));

  const criteria = data.criteria.filter(item => standard.basisDocuments.includes(item.source.basisDocument));
  assert.equal(criteria.filter(item => item.source.basisDocument === "sp-406-2018").length, 30);
  assert.deepEqual(new Set(criteria.map(item => item.method)), new Set(["vik", "rk", "uzk", "pvk", "mk"]));
  assert.equal(criteria.length, 32);
});

test("СП 284 требует вырезать стык при повторном ремонте того же участка", () => {
  const result = evaluateCriterion(byId.get("sp284-vik-repeat-repair"), {});
  assert.equal(result.allowed, false);
  assert.equal(result.decision, "ВЫРЕЗАТЬ");
  assert.match(result.message, /повторный ремонт/i);
});

test("многослойный стык не получает универсальную схему УЗК", () => {
  const result = evaluateCriterion(byId.get("sp284-uzk-multilayer-joint"), {});
  assert.equal(result.allowed, undefined);
  assert.equal(result.status, "guidance");
  assert.match(result.message, /технологической карте/i);
});

test("объектная ветка СП 284 использует прежние проверенные численные правила СП 406", () => {
  const undercut = evaluateCriterion(byId.get("sp406-vik-undercut-gas"), {
    thickness1: 12,
    thickness2: 10,
    depth: 0.5,
    length: 150
  });
  assert.equal(undercut.allowed, true);
  assert.equal(undercut.usedSmallerThickness, true);
  assert.equal(undercut.thickness, 10);

  const failed = evaluateCriterion(byId.get("sp406-vik-undercut-gas"), {
    thickness1: 12,
    thickness2: 10,
    depth: 0.51,
    length: 150
  });
  assert.equal(failed.allowed, false);
});

test("модель СП 284 / СП 406 проходит общую нормативную валидацию", () => {
  assert.deepEqual(validateCriteriaData(data), []);
});
