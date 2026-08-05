import test from "node:test";
import assert from "node:assert/strict";
import {
  getPipelineFilterOptions,
  getPipelineJoints,
  matchesPipelineJoint
} from "../js/pipelineJoints.js";

const joints = [
  {
    id: "pipeline-joint-c17",
    title: "С17 — стыковое соединение со скосом кромок",
    summary: "Стыковое соединение труб",
    tags: ["С17", "C17", "V-образная разделка"],
    pipelineJoint: {
      designation: "С17",
      category: "butt",
      connectedElements: ["труба", "арматура"],
      edgePreparation: "со скосом кромок",
      weldCharacter: "односторонний",
      backing: "без подкладки",
      weldingMethods: ["Р"],
      thicknessRange: "3–20 мм",
      specialFilters: ["two-bevel"]
    }
  },
  { id: "section", title: "Раздел" }
];

test("атлас выбирает только карточки соединений", () => {
  assert.deepEqual(getPipelineJoints(joints).map(item => item.id), ["pipeline-joint-c17"]);
});

test("поиск понимает кириллическое и латинское обозначение", () => {
  assert.equal(matchesPipelineJoint(joints[0], { query: "С17" }), true);
  assert.equal(matchesPipelineJoint(joints[0], { query: "C17" }), true);
  assert.equal(matchesPipelineJoint(joints[0], { query: "V образная разделка" }), true);
});

test("текстовый поиск и фильтры применяются совместно", () => {
  assert.equal(matchesPipelineJoint(joints[0], {
    query: "стыковое",
    category: "butt",
    backing: "без подкладки",
    special: "two-bevel"
  }), true);
  assert.equal(matchesPipelineJoint(joints[0], { backing: "на подкладке" }), false);
});

test("варианты фильтра строятся без дубликатов и пустых значений", () => {
  assert.deepEqual(getPipelineFilterOptions([joints[0], joints[0]], "elements"), ["арматура", "труба"]);
});
