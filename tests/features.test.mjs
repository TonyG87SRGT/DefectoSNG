import test from "node:test";
import assert from "node:assert/strict";
import { formatDefectCount, normalizeAtlasSearch } from "../js/atlas.js";
import { selectCacheStrategy } from "../js/pwaPolicy.js";
import { calculateRingWeld } from "../js/ringWeld.js";
import { getItemRoute } from "../js/store.js";

test("калькулятор возвращает миллиметры и метры", () => {
  const result = calculateRingWeld("530");
  assert.equal(Math.round(result.millimeters), 1665);
  assert.equal(result.meters.toFixed(3), "1.665");
  assert.equal(calculateRingWeld("0"), null);
});

test("атлас нормализует поиск и склоняет количество", () => {
  assert.equal(normalizeAtlasSearch(" Ёмкость! "), "емкость");
  assert.equal(formatDefectCount(1), "Показан 1 дефект");
  assert.equal(formatDefectCount(2), "Показано 2 дефекта");
  assert.equal(formatDefectCount(11), "Показано 11 дефектов");
});

test("раздел и специальный атлас получают канонические маршруты", () => {
  assert.deepEqual(getItemRoute("vik", { id: "group", type: "section" }), {
    view: "section",
    method: "vik",
    itemId: "group"
  });
  assert.deepEqual(getItemRoute("vik", { id: "vik-defects", type: "section" }), {
    view: "atlas"
  });
  assert.deepEqual(getItemRoute("pipeline", {
    id: "pipeline-joint-c17",
    pipelineJoint: { designation: "С17" }
  }), {
    view: "pipelineJoint",
    itemId: "pipeline-joint-c17"
  });
});

test("PWA выбирает стратегию по типу запроса", () => {
  const base = "https://example.com/app/";
  const cached = new Set([`${base}js/app.js`]);
  assert.equal(selectCacheStrategy({ method: "GET", mode: "navigate", url: base }, base, cached), "network-first");
  assert.equal(selectCacheStrategy({ method: "GET", mode: "cors", url: `${base}js/app.js` }, base, cached), "cache-first");
  assert.equal(selectCacheStrategy({ method: "POST", mode: "cors", url: base }, base, cached), "ignore");
  assert.equal(selectCacheStrategy({ method: "GET", mode: "cors", url: "https://cdn.example/x" }, base, cached), "ignore");
});
