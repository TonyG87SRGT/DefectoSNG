import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTION_TYPES,
  validateArticleShape,
  validatePipelineJointShape,
  validateSectionShape
} from "../js/schema.js";

const samples = {
  facts: { type: "facts", items: [{ label: "Метод", value: "ВИК" }] },
  text: { type: "text", title: "Описание", content: "Текст" },
  steps: { type: "steps", title: "Порядок", items: ["Шаг"] },
  list: { type: "list", title: "Список", items: ["Пункт"] },
  warning: { type: "warning", title: "Важно", content: "Текст" },
  table: { type: "table", headers: ["A", "B"], rows: [["1", "2"]] },
  image: { type: "image", src: "images/example.webp", alt: "Пример" },
  tip: { type: "tip", title: "Совет", content: "Текст" },
  practice: { type: "practice", title: "Практика", content: "Текст" },
  note: { type: "note", title: "Примечание", content: "Текст" },
  comparison: { type: "comparison", title: "Сравнение", items: [["A", "B"]] },
  methods: { type: "methods", title: "Методы", items: [{ method: "ВИК", description: "Описание" }] },
  related: { type: "related", title: "См. также", items: [{ method: "pvk", id: "pvk-1" }] },
  documents: { type: "documents", title: "Документы", items: ["ГОСТ"] }
};

test("для каждого типа секции есть валидный пример", () => {
  assert.deepEqual(Object.keys(samples).sort(), [...SECTION_TYPES].sort());
  for (const [type, section] of Object.entries(samples)) {
    assert.deepEqual(validateSectionShape(section), [], type);
  }
});

test("схема выявляет неверную таблицу", () => {
  const errors = validateSectionShape({
    type: "table",
    headers: ["A", "B"],
    rows: [["1"]]
  });
  assert.ok(errors.some(error => error.includes("2 ячеек")));
});

test("опубликованная статья требует содержимое", () => {
  const errors = validateArticleShape({
    id: "test-1",
    title: "Тест",
    category: "Тест"
  });
  assert.ok(errors.some(error => error.includes("статья должна содержать")));
});

test("карточка трубопровода допускает неизвестные значения как null", () => {
  assert.deepEqual(validatePipelineJointShape({
    designation: "С17",
    category: "butt",
    connectedElements: null,
    edgePreparation: null,
    weldCharacter: null,
    backing: null,
    weldingMethods: [],
    thicknessRange: null,
    minimumDiameter: null,
    standardTable: null,
    specialFilters: [],
    parameters: [],
    images: { edgePreparation: null, weldSection: null }
  }), []);
});
