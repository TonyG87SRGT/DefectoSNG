import test from "node:test";
import assert from "node:assert/strict";
import { getRouteHash, parseRoute } from "../js/router.js";

const routes = [
  { view: "home" },
  { view: "atlas" },
  { view: "atlas", category: "shape", query: "смещение кромок" },
  { view: "favorites" },
  { view: "tools" },
  { view: "documents" },
  { view: "search", query: "сварной шов" },
  { view: "tool", tool: "ring-weld" },
  { view: "method", method: "pvk" },
  { view: "section", method: "vik", itemId: "vik-preparation" },
  { view: "article", method: "pvk", itemId: "pvk-1" }
];

test("маршруты преобразуются в hash и обратно", () => {
  for (const route of routes) {
    assert.deepEqual(parseRoute(getRouteHash(route)), route);
  }
});

test("неизвестный hash ведёт на главную", () => {
  assert.deepEqual(parseRoute("#unknown=value"), { view: "home" });
});

test("старые ссылки атласа остаются совместимыми", () => {
  assert.deepEqual(parseRoute("#article=vik-cracks"), {
    view: "article",
    method: "vik",
    itemId: "vik-cracks"
  });
});
