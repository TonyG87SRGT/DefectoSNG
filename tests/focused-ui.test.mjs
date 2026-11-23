import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ATLAS_COLLECTIONS } from "../js/config.js";
import { findRelatedCriteria, getCriterionSearchTerm } from "../js/criterionLinks.js";
import { getRouteHash, parseRoute } from "../js/router.js";

test("упрощённая навигация содержит только атлас, критерии и избранное", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.deepEqual([...html.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]), ["atlas", "criteria", "favorites"]);
  assert.match(html, /Найти дефект или критерий/);
});

test("все восемь визуальных коллекций имеют уникальную точку входа", () => {
  assert.equal(ATLAS_COLLECTIONS.length, 8);
  assert.equal(new Set(ATLAS_COLLECTIONS.map(item => `${item.method}:${item.rootId}`)).size, 8);
});

test("новые и старые ссылки атласа ведут в единый визуальный маршрут", () => {
  const route = { view: "atlasItem", method: "rk", itemId: "rk-atlas-crack" };
  assert.deepEqual(parseRoute(getRouteHash(route)), route);
  assert.deepEqual(parseRoute("#article=vik:vik-cracks"), { view: "atlasItem", method: "vik", itemId: "vik-cracks" });
  assert.deepEqual(parseRoute("#task=criteria"), { view: "criteria", query: "" });
});

test("визуальная карточка получает связанные критерии с приоритетом своего метода", () => {
  const data = { criteria: [
    { id: "rk-pore", method: "rk", defect: "Поры и включения", aliases: ["газовая пора"] },
    { id: "vik-pore", method: "vik", defect: "Наружная пора", aliases: ["пора"] },
    { id: "vik-crack", method: "vik", defect: "Трещина", aliases: [] }
  ] };
  const item = { title: "Одиночная газовая пора", summary: "Округлое потемнение", tags: ["пора"] };
  assert.deepEqual(findRelatedCriteria(data, item, "rk").map(item => item.id), ["rk-pore", "vik-pore"]);
  assert.match(getCriterionSearchTerm(item), /пор/);
});
