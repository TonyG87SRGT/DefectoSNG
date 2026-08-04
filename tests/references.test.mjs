import test from "node:test";
import assert from "node:assert/strict";
import { filterReferenceRows } from "../js/references.js";

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
