import test from "node:test";
import assert from "node:assert/strict";
import { getArticleTocEntries } from "../js/articleNavigation.js";
import { buildKnowledgeGraph, getKnowledgeBacklinks, inferKnowledgeStage } from "../js/knowledgeGraph.js";

test("якорное содержание включается только для длинных статей ВИК", () => {
  const sections = Array.from({ length: 16 }, (_, index) => ({ type: "text", title: `Раздел ${index + 1}` }));
  assert.equal(getArticleTocEntries("vik", { sections }).length, 16);
  assert.equal(getArticleTocEntries("uzk", { sections }).length, 0);
  assert.equal(getArticleTocEntries("vik", { sections: sections.slice(0, 4) }).length, 0);
});

test("граф знаний строит обратную ссылку для явной связи", () => {
  const items = [
    { methodKey: "uzk", id: "uzk-procedure", parentId: "uzk-method", category: "Проведение", title: "Процедура", sections: [{ type: "related", title: "Связи", items: [{ method: "uzk", id: "uzk-indication" }] }] },
    { methodKey: "uzk", id: "uzk-indication", parentId: "uzk-atlas", category: "Индикации", title: "Индикация" },
    { methodKey: "uzk", id: "uzk-method", title: "УЗК" },
    { methodKey: "uzk", id: "uzk-atlas", title: "Атлас" }
  ];
  const graph = buildKnowledgeGraph(items);
  assert.equal(getKnowledgeBacklinks(graph, "uzk", "uzk-indication")[0].id, "uzk-procedure");
  assert.equal(inferKnowledgeStage(items[0]), "procedure");
  assert.equal(inferKnowledgeStage(items[1]), "indication");
});
