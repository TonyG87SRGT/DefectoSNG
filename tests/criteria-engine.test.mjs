import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { assessmentLength, effectiveThickness, evaluateCriterion, validateCriteriaData } from "../js/criteriaEngine.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/criteria.json", import.meta.url), "utf8"));
const byId = new Map(data.criteria.map(item => [item.id, item]));

test("ГОСТ 32569: смещение кромок, точные границы и пробел таблицы 12.1", () => {
  const criterion = byId.get("gost32569-vik-edge-transverse");
  for (const [thickness1, limit] of [[4, 0.7], [6, 0.9], [7, 1.05], [10, 1.5], [10.001, 1.50005], [20, 2], [20.001, 2.0001], [30, 3], [50, 3]]) {
    for (const delta of [-0.001, 0, 0.001]) {
      const result = evaluateCriterion(criterion, { thickness1, edgeOffset: limit + delta });
      assert.equal(result.allowed, delta <= 0, `S=${thickness1}, Δ=${limit + delta}`);
      assert.ok(Math.abs(result.checks[0].limit - limit) < 1e-9);
    }
  }
  for (const thickness1 of [6.000001, 6.5, 6.999999]) {
    assert.equal(evaluateCriterion(criterion, { thickness1, edgeOffset: 0 }).status, "outside");
  }
  assert.equal(evaluateCriterion(criterion, { thickness1: 10 }).status, "incomplete");
});

test("ГОСТ 32569: наружное и продольное смещения не смешиваются", () => {
  for (const [id, thickness1, limit] of [
    ["gost32569-vik-edge-external", 10, 3], ["gost32569-vik-edge-external", 20, 5],
    ["gost32569-vik-edge-longitudinal", 10, 1], ["gost32569-vik-edge-longitudinal", 40, 3]
  ]) {
    const criterion = byId.get(id);
    assert.equal(evaluateCriterion(criterion, { thickness1, edgeOffset: limit }).allowed, true);
    const failed = evaluateCriterion(criterion, { thickness1, edgeOffset: limit + 0.01 });
    assert.equal(failed.allowed, false);
    assert.match(failed.message, /переход/);
  }
});

test("модель нормативных критериев проходит отдельную валидацию", () => assert.deepEqual(validateCriteriaData(data), []));

test("мастер предлагает все нормативные ветки до выбора метода", () => {
  assert.deepEqual(
    data.standards.map(item => item.id),
    ["rvs-rb305", "sp406-sp86", "gost32569", "gost11666", "sto-gazprom-15-1.3-004-2023", "fnp536", "rvs-gost31385-sp365", "gost-iso-5817-2025", "gost34347"]
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

test("СТО Газпром представлен всеми пятью методами и текущим документом", () => {
  const criteria = data.criteria.filter(item => item.source.basisDocument === "sto-gazprom-15-1.3-004-2023");
  assert.deepEqual(new Set(criteria.map(item => item.method)), new Set(["vik", "rk", "uzk", "pvk", "mk"]));
  assert.equal(data.documents.find(item => item.id === "sto-gazprom-15-1.3-004-2023").status, "current");
});

test("СТО Газпром рассчитывает подрез по таблице 6.2", () => {
  const criterion = byId.get("sto-gazprom-vik-undercut");
  assert.equal(evaluateCriterion(criterion, { thickness1: 4, depth: 0.4, length: 150 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { thickness1: 4, depth: 0.401, length: 150 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { thickness1: 20, depth: 0.5, length: 150.1 }).allowed, false);
});

test("СТО Газпром не смешивает уровни качества одиночных пор", () => {
  const criterion = byId.get("sto-gazprom-rk-single-pore");
  const common = { thickness1: 20, weldLength: 300, totalLength: 50 };
  assert.equal(evaluateCriterion(criterion, { ...common, quality: "B", stoPoreSpacing: "3d", maxDefectDimension: 2.5 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...common, quality: "B", stoPoreSpacing: "3d", maxDefectDimension: 2.51 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { ...common, quality: "C", stoPoreSpacing: "5d", maxDefectDimension: 3.5 }).allowed, true);
});

test("СТО Газпром уменьшает допустимую сумму вдвое для шва короче 300 мм", () => {
  const criterion = byId.get("sto-gazprom-rk-single-pore");
  const values = { quality: "A", stoPoreSpacing: "3d", thickness1: 10, maxDefectDimension: 1, weldLength: 299, totalLength: 15 };
  assert.equal(evaluateCriterion(criterion, values).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...values, totalLength: 15.01 }).allowed, false);
  assert.match(evaluateCriterion(criterion, values).checks[1].calculation, /Σ₃₀₀ \/ 2/);
});

test("таблица 6.4 СТО Газпром корректно выбирает границы толщины и уровни B/C", () => {
  const criterion = byId.get("sto-gazprom-uzk-equivalent-area");
  assert.equal(evaluateCriterion(criterion, { quality: "A", thickness1: 4, equivalentArea: 0.7 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { quality: "B", thickness1: 6, equivalentArea: 1.2 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { quality: "C", thickness1: 40, equivalentArea: 7 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { quality: "A", thickness1: 54.001, equivalentArea: 1 }).status, "outside");
});

test("ПВК и МПК СТО Газпром используют порог признака, а не готовый диагноз", () => {
  const below = evaluateCriterion(byId.get("sto-gazprom-pvk-indication"), { indicationSize: 1.6 });
  const above = evaluateCriterion(byId.get("sto-gazprom-mk-indication"), { indicationSize: 1.61 });
  assert.equal(below.allowed, null);
  assert.match(below.decision, /ПОРОГ/);
  assert.equal(above.allowed, null);
  assert.match(above.decision, /ПРИЗНАК/);
});

test("ФНП № 536 представлен пятью методами и действующим документом", () => {
  const criteria = data.criteria.filter(item => item.source.basisDocument === "fnp-536-2020");
  assert.deepEqual(new Set(criteria.map(item => item.method)), new Set(["vik", "rk", "uzk", "pvk", "mk"]));
  assert.equal(data.documents.find(item => item.id === "fnp-536-2020").status, "current");
  assert.match(data.standards.find(item => item.id === "fnp536").warning, /РП выбирают строго/);
});

test("ФНП № 536 рассчитывает западание по 0,12РП + 0,6 с пределом 2 мм", () => {
  const criterion = byId.get("fnp536-vik-depression");
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 10, depth: 1.5 }).allowed, true);
  const atLimit = evaluateCriterion(criterion, { dimensionalIndicator: 10, depth: 1.8 });
  assert.equal(atLimit.allowed, true);
  assert.ok(Math.abs(atLimit.checks[0].limit - 1.8) < 1e-9);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 10, depth: 1.9 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 20, depth: 2 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 20, depth: 2.01 }).allowed, false);
});

test("трещина по ФНП № 536 не допускается без размерных параметров", () => {
  const result = evaluateCriterion(byId.get("fnp536-vik-prohibited"), {});
  assert.equal(result.allowed, false);
  assert.equal(result.decision, "НЕ ДОПУСКАЕТСЯ");
});

test("таблица 12.1 ФНП № 536 выбирает формулы количества одиночных включений по РП", () => {
  const criterion = byId.get("fnp536-vik-single-inclusion");
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 10, maxDefectDimension: 1.4, defectCount: 5 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 10.01, maxDefectDimension: 1.402, defectCount: 6 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 20, maxDefectDimension: 2.5, defectCount: 6 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 100, maxDefectDimension: 2.5, defectCount: 8 }).allowed, true);
});

test("ПВК ФНП № 536 не превращает допустимый округлый след в окончательную годность", () => {
  const criterion = byId.get("fnp536-pvk-rounded");
  const result = evaluateCriterion(criterion, { dimensionalIndicator: 10, indicationSize: 4.2, defectCount: 5 });
  assert.equal(result.allowed, null);
  assert.match(result.decision, /ФАКТИЧЕСКОГО ДЕФЕКТА/);
  assert.equal(evaluateCriterion(criterion, { dimensionalIndicator: 10, indicationSize: 4.21, defectCount: 5 }).allowed, false);
});

test("таблица 12.2 ФНП № 536 проверяет границы РП и пропорционально уменьшает число для короткого шва", () => {
  const single = byId.get("fnp536-rk-single-inclusion");
  assert.equal(evaluateCriterion(single, { dimensionalIndicator: 15, maxDefectDimension: 2.75, defectCount: 15.75, weldLength: 100 }).allowed, null);
  assert.equal(evaluateCriterion(single, { dimensionalIndicator: 15, maxDefectDimension: 2.751, defectCount: 15, weldLength: 100 }).allowed, false);
  assert.equal(evaluateCriterion(single, { dimensionalIndicator: 40, maxDefectDimension: 4, defectCount: 22, weldLength: 100 }).allowed, null);
  assert.equal(evaluateCriterion(single, { dimensionalIndicator: 80, maxDefectDimension: 5, defectCount: 16, weldLength: 50 }).allowed, null);
  assert.equal(evaluateCriterion(single, { dimensionalIndicator: 80, maxDefectDimension: 5, defectCount: 17, weldLength: 50 }).allowed, false);

  const extended = byId.get("fnp536-rk-extended-inclusion");
  assert.equal(evaluateCriterion(extended, { dimensionalIndicator: 5, maxDefectDimension: 5.75, defectCount: 2, weldLength: 100 }).allowed, null);
  assert.equal(evaluateCriterion(extended, { dimensionalIndicator: 5.01, maxDefectDimension: 5.7515, defectCount: 3, weldLength: 100 }).allowed, null);
  assert.equal(evaluateCriterion(extended, { dimensionalIndicator: 50.01, maxDefectDimension: 12.5015, defectCount: 4, weldLength: 100 }).allowed, null);
});

test("УЗК ФНП № 536 не выдаёт выдуманную эквивалентную площадь", () => {
  const criterion = byId.get("fnp536-uzk-conditions");
  const needsNd = evaluateCriterion(criterion, { conditionalLength: 8, referenceConditionalLength: 8, neighborDistance: 10, largerConditionalLength: 10 });
  assert.equal(needsNd.allowed, null);
  assert.match(needsNd.decision, /ДОПОЛНИТЕЛЬНАЯ НД/);
  assert.equal(needsNd.checks.some(check => /площад/i.test(check.label)), false);
  assert.equal(evaluateCriterion(criterion, { conditionalLength: 8.1, referenceConditionalLength: 8, neighborDistance: 10, largerConditionalLength: 10 }).allowed, false);
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

test("РВС: подрез проверяется по классу, типу шва и 10% длины", () => {
  const criterion = byId.get("rvs-vik-undercut");
  const values = { tankResponsibilityClass: "KS-2b", rvsJointType: "horizontal", thickness1: 10, depth: 0.5, undercutLength: 100, weldWithinPlateLength: 1000 };
  assert.equal(evaluateCriterion(criterion, values).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...values, depth: 0.501 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { ...values, undercutLength: 100.1 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { ...values, tankResponsibilityClass: "KS-3a", depth: 0.5 }).allowed, true);
});

test("РВС: класс ответственности выбирает класс РК ГОСТ 23055", () => {
  const criterion = byId.get("rvs-rk-pores-inclusions");
  const base = { thickness1: 10, width: 1, length: 3, clusterLength: 4.5, totalLength: 10 };
  assert.equal(evaluateCriterion(criterion, { ...base, tankResponsibilityClass: "KS-3a" }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...base, tankResponsibilityClass: "KS-3a", width: 1.01 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { ...base, tankResponsibilityClass: "KS-2b", width: 1.5, length: 6, clusterLength: 9, totalLength: 15 }).allowed, true);
});

test("РВС: таблица 10.10 УЗК корректно обрабатывает границы толщины", () => {
  const criterion = byId.get("rvs-uzk-sp70");
  const base = { rvsUtCondition: "standard", equivalentArea: 4, length: 10, defectCount: 1 };
  assert.equal(evaluateCriterion(criterion, { ...base, thickness1: 6 }).status, "outside");
  assert.equal(evaluateCriterion(criterion, { ...base, thickness1: 6.01 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...base, thickness1: 10 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...base, thickness1: 10.01, equivalentArea: 6, defectCount: 2 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...base, thickness1: 60, equivalentArea: 10, length: 25, defectCount: 3 }).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...base, thickness1: 60.01 }).status, "outside");
});

test("РВС: специальные условия УЗК уменьшают площадь и требуют увеличенного расстояния", () => {
  const criterion = byId.get("rvs-uzk-sp70");
  const values = { rvsUtCondition: "special", thickness1: 10, equivalentArea: 2, length: 10, defectCount: 1, neighborDistance: 40 };
  assert.equal(evaluateCriterion(criterion, values).allowed, true);
  assert.equal(evaluateCriterion(criterion, { ...values, equivalentArea: 2.01 }).allowed, false);
  assert.equal(evaluateCriterion(criterion, { ...values, neighborDistance: 39.9 }).allowed, false);
});
