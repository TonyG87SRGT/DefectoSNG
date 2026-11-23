import test from "node:test";
import assert from "node:assert/strict";
import { getRouteHash, parseRoute } from "../js/router.js";

const routes = [
  { view: "home" },
  { view: "atlas" },
  { view: "atlasItem", method: "vik", itemId: "vik-cracks" },
  { view: "criteria", query: "подрез" },
  { view: "criteria", criterionId: "rvs-vik-prohibited-surface", query: "" },
  { view: "favorites" },
  { view: "search", query: "сварной шов" }
];

test("маршруты упрощённого интерфейса преобразуются в hash и обратно", () => {
  for (const route of routes) assert.deepEqual(parseRoute(getRouteHash(route)), route);
});

test("неизвестный hash ведёт на главную", () => {
  assert.deepEqual(parseRoute("#unknown=value"), { view: "home" });
});

test("старые ссылки статей и разделов ведут в визуальную карточку", () => {
  assert.deepEqual(parseRoute("#article=vik:vik-cracks"), {
    view: "atlasItem", method: "vik", itemId: "vik-cracks"
  });
  assert.deepEqual(parseRoute("#section=rk:rk-radiographic-atlas"), {
    view: "atlasItem", method: "rk", itemId: "rk-radiographic-atlas"
  });
});
