import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { assessmentLength, effectiveThickness, evaluateCriterion, validateCriteriaData } from "../js/criteriaEngine.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/criteria.json", import.meta.url), "utf8"));
const byId = new Map(data.criteria.map(item => [item.id, item]));

test("модель нормативных критериев проходит отдельную валидацию", () => assert.deepEqual(validateCriteriaData(data), []));

test("мастер предлагает все нормативные ветки до выбора метода", () => {
  assert.deepEqual(
    data.standards.map(item => item.id),
    ["sp406-sp86", "gost32569", "gost11666"]
  );
  for (const standard of data.standards) {
    assert.ok(data.criteria.some(item => standard.basisDocuments.includes(item.source.basisDocument)), standard.id);
  }
});

test("ГОСТ Р ИСО 17640 связан как методика, а не самостоятельный критерий", () => {
  assert.equal(data.standards.some(item => item.id === "gost17640"), false);
  const guide = data.guides.find(item => item.id === "gost17640");
  assert.ok(guide);
  assert.equal(guide.documentId, "gost-r-iso-17640-2016");
  assert.equal(guide.items.length, 5);
  assert.ok(data.standards.find(item => item.id === "gost11666").supportingGuideIds.includes("gost17640"));
});

test("выбор НТД изолирует критерии разных документов", () => {
  const gost32569 = data.criteria.filter(item => item.source.basisDocument === "gost-32569-2013");
  assert.deepEqual(new Set(gost32569.map(item => item.method)), new Set(["vik", "rk", "uzk", "pvk", "mk"]));
  assert.ok(gost32569.every(item => item.outcome !== "reference-only"));
  assert.ok(data.criteria.filter(item => item.source.basisDocument === "gost-r-iso-17640-2016").length >= 5);
  assert.ok(data.criteria.filter(item => item.source.basisDocument === "gost-iso-11666-2024").length >= 4);
});

test("ГОСТ 32569 рассчитывает УЗК для особых условий", () => {
  const criterion = byId.get("gost32569-uzk-area");
  assert.equal(evaluateCriterion(criterion, { conditionClass: "special", thickness1: 10, equivalentArea: 1.6, defectCount: 2 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { conditionClass: "special", thickness1: 10.01, equivalentArea: 2.01, defectCount: 2 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { conditionClass: "special", thickness1: 20, equivalentArea: 2, defectCount: 3 }).allowed, false);
});

test("таблица 12.5 не интерполирует отсутствующие толщины", () => {
  const criterion = byId.get("gost32569-uzk-area");
  assert.equal(evaluateCriterion(criterion, { conditionClass: "standard", thickness1: 9, equivalentArea: 1.6 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { conditionClass: "standard", thickness1: 11, equivalentArea: 1 }).status, "outside");
  assert.equal(evaluateCriterion(criterion, { conditionClass: "standard", thickness1: 24, equivalentArea: 3 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { conditionClass: "standard", thickness1: 24.001, equivalentArea: 1 }).status, "outside");
});

test("таблица 12.2 выбирает точные включённые границы", () => {
  const criterion = byId.get("gost32569-rk-pore-inclusion");
  const inputs = { rtNormGroup: "A", width: 0.5, length: 1, clusterLength: 2, totalLength: 3 };
  assert.equal(evaluateCriterion(criterion, { ...inputs, thickness1: 3 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...inputs, thickness1: 3.0000001 }).allowed, true);
  assert.match(evaluateCriterion(criterion, { ...inputs, thickness1: 3.0000001 }).checks[0].calculation, /3 < S ≤ 5/);
});

test("ГОСТ 32569 проверяет размер и количество поверхностных пор", () => {
  const criterion = byId.get("gost32569-vik-surface-pores");
  assert.equal(evaluateCriterion(criterion, { rtNormGroup: "A", thickness1: 3, width: 0.4, defectCount: 3 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { rtNormGroup: "A", thickness1: 3, width: 0.41, defectCount: 3 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { rtNormGroup: "C", thickness1: 9, width: 1.2, defectCount: 4 }).allowed, false);
});

test("ГОСТ 32569 рассчитывает геометрию корня только для нормированной группы", () => {
  const criterion = byId.get("gost32569-rk-root-concavity");
  assert.equal(evaluateCriterion(criterion, { rootNormGroup: "A", thickness1: 20, diameter: 100, depth: 1.5, totalLength: 39 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { rootNormGroup: "A", thickness1: 20, diameter: 100, depth: 1.51, totalLength: 39 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { rootNormGroup: "B", thickness1: 20, diameter: 100, depth: 5, totalLength: 100 }).allowed, null);
});

test("ГОСТ Р ИСО 17640 проверяет область, контакт и шум", () => {
  assert.equal(evaluateCriterion(byId.get("gost17640-applicability"), { thickness1: 8, temperature: 0 }).allowed, true);
  assert.equal(evaluateCriterion(byId.get("gost17640-applicability"), { thickness1: 7.99, temperature: 20 }).allowed, false);
  assert.match(evaluateCriterion(byId.get("gost17640-contact"), { contactLoss: 6 }).decision, /ВВЕСТИ ПОПРАВКУ/);
  assert.equal(evaluateCriterion(byId.get("gost17640-noise"), { noiseMargin: 11.9 }).allowed, false);
});

test("ГОСТ ISO 11666 применяет таблицу A.1 для AL2 и AL3", () => {
  const criterion = byId.get("gost11666-amplitude-length");
  const base = { thickness1: 20, referenceTechnique: "1", length: 8 };
  assert.equal(evaluateCriterion(criterion, { ...base, acceptanceLevel: "AL2", amplitudeDb: 0 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...base, acceptanceLevel: "AL2", amplitudeDb: 0.1 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { ...base, acceptanceLevel: "AL3", amplitudeDb: 4 }).allowed, true);
});

test("ГОСТ ISO 11666 не назначает AL 3 уровню качества D", () => {
  const result = evaluateCriterion(byId.get("gost11666-quality-mapping"), { weldQualityLevel: "D" });
  assert.equal(result.status, "outside");
  assert.match(result.message, /не устанавливает уровни приёмки/);
  assert.deepEqual(data.inputs.weldQualityLevel.options.map(item => item.value), ["B", "C"]);
});

test("ГОСТ ISO 11666 ограничивает суммарную длину на участке 6t", () => {
  const criterion = byId.get("gost11666-total-length");
  assert.equal(evaluateCriterion(criterion, { thickness1: 10, acceptanceLevel: "AL2", totalLength: 12 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { thickness1: 10, acceptanceLevel: "AL2", totalLength: 12.01 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { thickness1: 10, acceptanceLevel: "AL3", totalLength: 18 }).allowed, true);
});

test("ГОСТ ISO 11666 применяет строгие условия группирования и таблицы DSR", () => {
  const grouped = byId.get("gost11666-grouping");
  const base = { thickness1: 20, length1: 5, length2: 4, dx: 9.9, dy: 9.9, dz: 9.9 };
  assert.match(evaluateCriterion(grouped, base).decision, /ОБЪЕДИНИТЬ/);
  assert.match(evaluateCriterion(grouped, { ...base, dx: 10 }).decision, /РАЗДЕЛЬНО/);
  const dsr = evaluateCriterion(byId.get("gost11666-dsr"), { thickness1: 20, waveType: "shear", frequency: 2 });
  assert.match(dsr.decision, /D_DSR/);
});

test("граница подреза считается по 0,1S, но не более 0,5 мм", () => {
  const criterion = byId.get("sp406-vik-undercut-gas");
  const atLimit = evaluateCriterion(criterion, { thickness1: 12, depth: 0.5, length: 150 });
  assert.equal(atLimit.allowed, true);
  assert.equal(evaluateCriterion(criterion, { thickness1: 12, depth: 0.49, length: 149.9 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { thickness1: 12, depth: 0.51, length: 150 }).allowed, false);
  assert.equal(atLimit.checks[0].limit, 0.5);
});

test("для разнотолщинного соединения используется меньшая толщина", () => {
  assert.equal(effectiveThickness({ thickness1: 12, thickness2: 8 }), 8);
  const result = evaluateCriterion(byId.get("sp406-vik-undercut-gas"), { thickness1: 12, thickness2: 4, depth: 0.45, length: 10 });
  assert.equal(result.allowed, false);
  assert.equal(result.thickness, 4);
  assert.equal(result.usedSmallerThickness, true);
});

test("оценочный участок выбирается по наружному диаметру", () => {
  assert.equal(assessmentLength(600).value, 300);
  assert.ok(Math.abs(assessmentLength(300).value - Math.PI * 50) < 1e-9);
  assert.ok(Math.abs(assessmentLength(80).value - Math.PI * 80) < 1e-9);
});

test("УЗК газопровода выбирает непересекающиеся диапазоны толщины", () => {
  const criterion = byId.get("sp406-uzk-equivalent-area-gas");
  const atEight = evaluateCriterion(criterion, { thickness1: 8, quality: "A", equivalentArea: 1.05 });
  const belowEight = evaluateCriterion(criterion, { thickness1: 7.999, quality: "A", equivalentArea: 0.85 });
  const atTwelve = evaluateCriterion(criterion, { thickness1: 12, quality: "B", equivalentArea: 2 });
  assert.equal(atEight.allowed, true);
  assert.match(atEight.checks[0].calculation, /8 ≤ S < 12/);
  assert.equal(belowEight.allowed, true);
  assert.match(belowEight.checks[0].calculation, /6 ≤ S < 8/);
  assert.equal(atTwelve.allowed, true);
  assert.equal(evaluateCriterion(criterion, { thickness1: 40, quality: "A", equivalentArea: 1 }).status, "outside");
});

test("категории нефтепровода дают разные пределы", () => {
  const criterion = byId.get("sp406-uzk-nonextended-oil");
  assert.equal(evaluateCriterion(criterion, { category: "BI", totalLength: 40 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { category: "II-IV", totalLength: 40 }).allowed, true);
});

test("трещина безусловно ведёт к категории «Вырезать»", () => {
  const result = evaluateCriterion(byId.get("sp406-rk-crack"), {});
  assert.equal(result.allowed, false);
  assert.equal(result.decision, "ВЫРЕЗАТЬ");
});

test("движок сообщает об отсутствующих данных и неизвестном критерии", () => {
  const incomplete = evaluateCriterion(byId.get("sp406-vik-undercut-gas"), { thickness1: 10 });
  assert.equal(incomplete.status, "incomplete");
  assert.deepEqual(incomplete.missing, ["depth", "length"]);
  assert.equal(evaluateCriterion(null, {}).status, "error");
});

test("нечисловой критерий ПВК не превращает индикацию в готовый диагноз", () => {
  const result = evaluateCriterion(byId.get("sp406-pvk-guidance"), {});
  assert.equal(result.status, "guidance");
  assert.equal(result.decision, "ТРЕБУЕТ ОЦЕНКИ");
});
