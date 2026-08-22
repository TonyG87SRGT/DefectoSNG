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
    "result-traceability", "control-method-selection", "application-tool-model",
    "gost-32569-2013-ndt"
  ]);
  assert.ok(references.filter(item => item.rows).every(item => item.rows.length >= 5));
  const gost = references.find(item => item.id === "gost-32569-2013-ndt");
  assert.equal(gost.sections.length, 24);
  assert.equal(new Set(gost.sections.map(section => section.id)).size, 24);
  assert.ok(gost.normativeData.rules.length >= 7);
  assert.match(JSON.stringify(references).toLowerCase(), /индикация.*дефект|дефект.*индикация/);
});
