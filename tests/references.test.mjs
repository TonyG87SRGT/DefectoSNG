import test from "node:test";
import assert from "node:assert/strict";
import { filterReferenceRows } from "../js/references.js";
import references from "../data/references.json" with { type: "json" };

const reference = {
  columns: [
    { key: "material", label: "Материал" },
    { key: "longitudinal", label: "Продольная волна" }
  ],
  rows: [
    { material: "Сталь углеродистая", longitudinal: "5920" },
    { material: "Алюминий", longitudinal: "6320" }
  ]
};

test("справочная таблица фильтруется по материалу и значению", () => {
  assert.deepEqual(filterReferenceRows(reference, "сталь"), [reference.rows[0]]);
  assert.deepEqual(filterReferenceRows(reference, "6320"), [reference.rows[1]]);
  assert.deepEqual(filterReferenceRows(reference, ""), reference.rows);
});

test("общий справочник покрывает данные, термины, единицы, прослеживаемость и навигацию", () => {
  assert.deepEqual(references.map(item => item.id), [
    "sound-velocity", "ndt-terminology", "units-and-notation",
    "result-traceability", "control-method-selection", "application-tool-model"
  ]);
  assert.ok(references.every(item => item.rows.length >= 5));
  assert.match(JSON.stringify(references).toLowerCase(), /индикация.*дефект|дефект.*индикация/);
});
