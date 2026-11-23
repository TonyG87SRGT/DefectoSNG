import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCriterion, validateCriteriaData, parseCriterionNumber } from "../js/criteriaEngine.js";
import { buildSearchIndex, searchArticles } from "../js/search.js";
import { parseRoute, getRouteHash } from "../js/router.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/criteria.json", import.meta.url)));
const entries = data.criteria.filter(c => c.id.startsWith("rb305-"));
const check = (id, values = {}) => evaluateCriterion(entries.find(c => c.id === "rb305-" + id), values);

test("РБ 305: отдельная ветка и все восемь методов, валидация", () => {
  assert.equal(entries.length, 26);
  assert.deepEqual(validateCriteriaData(data), []);
  assert.deepEqual(new Set(entries.map(c => c.method)), new Set(["vik", "uzk", "rk", "ae", "uzt", "pvk", "mk", "leak"]));
  for (const c of entries) {
    assert.equal(c.source.basisDocument, "rb-305-2023");
    assert.ok(c.source.criterionTable);
    assert.equal(c.recommendation, true);
  }
});

test("ВИК: смещение, запятая, обе стороны предела, ограничение 3 мм", () => {
  for (const [s, limit] of [[10, 1], [10.1, 1.01], [12, 1.2], [40, 3]]) {
    for (const delta of [-0.001, 0, 0.001]) {
      assert.equal(check("vik-offset", { rb305S: String(s).replace(".", ","), edgeOffset: limit + delta }).allowed, delta <= 0);
    }
  }
});

test("ВИК: все формулы катета, неровности и повреждений", () => {
  assert.equal(check("vik-surface", { profileDeviation: 1 }).allowed, true);
  assert.equal(check("vik-surface", { profileDeviation: 1.001 }).allowed, false);
  assert.equal(check("vik-fillet-profile", { filletLegSize: 5, profileDeviation: 1 }).allowed, true);
  assert.equal(check("vik-fillet-profile", { filletLegSize: 5, profileDeviation: 1.001 }).allowed, false);
  assert.equal(check("vik-leg-reduction", { rb305LegChange: 1 }).allowed, true);
  for (const [k, limit] of [[5, 1], [5.001, 2]]) {
    assert.equal(check("vik-leg-increase", { filletLegSize: k, rb305LegChange: limit }).allowed, true);
    assert.equal(check("vik-leg-increase", { filletLegSize: k, rb305LegChange: limit + .01 }).allowed, false);
  }
  assert.equal(check("vik-damage", { rb305S: 10, depth: .5 }).allowed, true);
  assert.equal(check("vik-damage", { rb305S: 10, depth: .501 }).allowed, false);
});

test("Подрез: все девять сочетаний АЭ/шва и длина 10%", () => {
  const limits = { "vertical-bottom": [.2, .3, .5], horizontal: [.3, .6, .8], other: [.6, .6, .8] };
  for (const [rvsJointType, values] of Object.entries(limits)) {
    ["active", "critical", "catastrophic"].forEach((rb305Ae, i) => {
      const args = { rvsJointType, rb305Ae, rb305S: 20, depth: values[i], undercutLength: 10, weldWithinPlateLength: 100 };
      assert.equal(check("vik-undercut", args).allowed, true);
      assert.equal(check("vik-undercut", { ...args, depth: values[i] + .001 }).allowed, false);
      assert.equal(check("vik-undercut", { ...args, undercutLength: 10.001 }).allowed, false);
    });
  }
  assert.equal(check("vik-undercut", { rvsJointType: "horizontal", rb305Ae: "catastrophic", rb305S: 4, depth: .201, undercutLength: 1, weldWithinPlateLength: 100 }).allowed, false);
});

const ut = { rb305Temperature: "normal", equivalentArea: 7, conditionalLength: 20, defectCount: 1 };
test("УЗК: диапазоны, неопределённые границы источника, предпросмотр", () => {
  for (const [rb305S, length, count] of [[5,20,1],[8,20,1],[10,20,1],[10.1,25,2],[20,25,2],[20.1,30,3],[30,30,3]]) {
    const result = check("uzk-table", { ...ut, rb305S, conditionalLength: length, defectCount: count });
    assert.equal(result.checks.find(c => c.input === "defectCount").limit, count);
    assert.equal(result.allowed, [10,20].includes(rb305S) ? null : true);
    assert.equal(check("uzk-table", { ...ut, rb305S, defectCount: count + 1 }).allowed, [10,20].includes(rb305S) ? null : false);
  }
  assert.equal(check("uzk-table", { rb305S: 8, rb305Temperature: "normal" }).allowed, null);
  for (const rb305S of [4.999,30.001]) assert.equal(check("uzk-table", { ...ut, rb305S }).status, "outside");
});

test("УЗК: холод, площади вдвое и удвоенное расстояние", () => {
  const args = { ...ut, rb305S: 12, rb305Temperature: "cold", rb305NeighborState: "yes", equivalentArea: 3.5, neighborDistance: 50 };
  assert.equal(check("uzk-table", args).allowed, true);
  assert.equal(check("uzk-table", { ...args, equivalentArea: 3.501 }).allowed, false);
  assert.equal(check("uzk-table", { ...args, neighborDistance: 49.999 }).allowed, false);
  assert.equal(check("uzk-table", { ...args, neighborDistance: "" }).allowed, null);
  assert.equal(check("uzk-table", args).facts.find(f => f.label === "Поисковая эквивалентная площадь").value, "2,5 мм²");
});

test("УЗК/РК: строгая и нестрогая группировка, суммарная площадь", () => {
  assert.match(check("uzk-group", { length1: 10, length2: 20, neighborDistance: 14.99 }).decision, /^РАССМАТРИВАТЬ/);
  assert.match(check("uzk-group", { length1: 10, length2: 20, neighborDistance: 15 }).decision, /^НЕ ОБЪЕДИНЯЮТСЯ/);
  assert.match(check("rk-group", { width: 2, neighborDistance: 2 }).decision, /^РАССМАТРИВАТЬ/);
  assert.match(check("rk-group", { width: 2, neighborDistance: 2.01 }).decision, /^НЕ ОБЪЕДИНЯЮТСЯ/);
  for (const [rb305Access, limit] of [["two",5],["one",10]]) {
    assert.equal(check("uzk-total-area", { rb305Access, rb305SectionArea: 100, rb305TotalArea: limit }).allowed, true);
    assert.equal(check("uzk-total-area", { rb305Access, rb305SectionArea: 100, rb305TotalArea: limit + .01 }).allowed, false);
  }
});

test("РК: все 18 строк, три категории АЭ и каждая граница", () => {
  const criterion = entries.find(c => c.id === "rb305-rk-pores");
  for (const [rb305Ae, ranges] of Object.entries(criterion.customRule.tables)) {
    for (const [i, r] of ranges.entries()) {
      for (const rb305S of [i ? r.min + .0001 : r.min, r.max - .0001, r.max]) {
        const args = { rb305Ae, rb305S, width: r.width, length: r.length, clusterLength: 1.5*r.length, totalLength: r.total };
        const ambiguous = [8,11,14,20,26].includes(rb305S);
        assert.equal(check("rk-pores", args).allowed, ambiguous ? null : true);
        for (const field of ["width","length","clusterLength","totalLength"]) {
          assert.equal(check("rk-pores", { ...args, [field]: args[field] + .001 }).allowed, ambiguous ? null : false);
        }
      }
    }
  }
  for (const rb305S of [4.99,34.01]) assert.equal(check("rk-pores", { rb305S, rb305Ae: "active" }).status, "outside");
});

test("Недопустимые дефекты, АЭ, ПВК/МПК, герметичность и УЗТ без ложной годности", () => {
  for (const id of ["vik-prohibited","vik-base-prohibited","rk-prohibited"]) assert.equal(check(id).allowed, false);
  for (const rb305Ae of ["critical","catastrophic"]) assert.equal(check("ae-sources", { rb305Ae }).allowed, false);
  assert.notEqual(check("ae-sources", { rb305Ae:"active" }).allowed, true);
  for (const id of ["pvk-indications","mk-indications","uzt-wall","vik-base-local"]) assert.notEqual(check(id).allowed, true);
  for (const id of ["uzt-roof","uzt-pontoon","uzt-floating-roof","uzt-bottom"]) {
    const result = check(id, { rb305ProjectThickness: 8, rb305Remaining: 4 });
    assert.equal(result.allowed, null);
    assert.equal(result.checks[0].limit, 4);
    assert.equal(check(id, { rb305ProjectThickness: 8, rb305Remaining: 3.99 }).checks[0].passed, false);
  }
  for (const id of ["leak-vacuum","leak-foam"]) {
    assert.equal(check(id, { rb305Leak: "yes" }).allowed, false);
    assert.notEqual(check(id, { rb305Leak: "no" }).allowed, true);
    assert.notEqual(check(id).allowed, true);
  }
});

test("Числа: пусто, отрицательные, ноль, текст, NaN, десятичная запятая", () => {
  assert.equal(parseCriterionNumber("10,1"), 10.1);
  for (const rb305S of ["",0,-1,"x","1,2,3",NaN,Infinity]) assert.notEqual(check("vik-offset", { rb305S, edgeOffset: 0 }).allowed, true);
  assert.notEqual(check("vik-offset", { rb305S: 10, edgeOffset: -1 }).allowed, true);
  assert.notEqual(check("uzk-table", { ...ut, rb305S: 8, defectCount: 1.5 }).allowed, true);
});

test("Поиск всех новых карточек и обратимый прямой маршрут", () => {
  const index = buildSearchIndex(data);
  for (const query of ["РВС","смещение кромок","подрез","непровар","УЗК РВС","РК РВС","остаточная толщина","износ днища","герметичность"]) {
    assert.ok(searchArticles(query,index).some(c => c.id.startsWith("rb305-")),query);
  }
  for (const criterion of entries) {
    const route = { view:"criteria",criterionId:criterion.id,query:"" };
    assert.deepEqual(parseRoute(getRouteHash(route)),route);
  }
});
