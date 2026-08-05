import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { searchArticles } from "../js/search.js";
import { tokenizeSearch } from "../js/searchCore.js";
import {
  createVibrationKnowledgeApi,
  filterVibrationKnowledge,
  getVibrationKnowledgeBlocks
} from "../js/vibrationKnowledge.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/vibration.json", import.meta.url), "utf8"));
const articles = data.filter(item => item.type !== "section");
const byId = new Map(data.map(item => [item.id, item]));
const requiredArrays = [
  "tags", "aliases", "measuredParameters", "relatedFaults", "relatedSpectra",
  "relatedScenarios", "relatedReferences", "normativeDocuments", "relatedMeasurements",
  "relatedParameters", "probableFaults", "similarSpectra", "additionalChecks"
];

test("каждый материал имеет единую схему базы знаний", () => {
  articles.forEach(article => requiredArrays.forEach(field => {
    assert.ok(Array.isArray(article.metadata[field]), `${article.id}: ${field}`);
  }));
});

test("фасеты фильтруются совместно и доступны через общий API", () => {
  const pumps = filterVibrationKnowledge(articles, { equipment: "Насосы" });
  assert.ok(pumps.length > 0);
  assert.ok(pumps.every(item => item.metadata.equipment.some(value => value.toLocaleLowerCase("ru-RU") === "насосы")));

  const api = createVibrationKnowledgeApi(() => data);
  const equipment = api.getFacetOptions("equipment");
  assert.ok(equipment.some(value => value.toLocaleLowerCase("ru-RU") === "насосы"));
  assert.equal(new Set(equipment.map(value => value.toLocaleLowerCase("ru-RU"))).size, equipment.length);
  assert.deepEqual(api.filter({ equipment: "Насосы" }).map(item => item.id), pumps.map(item => item.id));
});

test("автоматические блоки разделяют типы материалов без дублей", () => {
  const source = byId.get("vibration-bearing-supports");
  const blocks = getVibrationKnowledgeBlocks(source, data, 6);
  assert.ok(blocks.some(block => block.id === "faults"));
  assert.ok(blocks.some(block => block.id === "spectra"));
  blocks.filter(block => !block.facet).forEach(block => {
    assert.equal(new Set(block.items.map(item => item.id)).size, block.items.length, block.id);
  });
});

test("поиск понимает BPFO, БПФО и синоним наружной обоймы", () => {
  const documents = articles.map(article => {
    const searchText = JSON.stringify(article);
    return { ...article, methodKey: "vibration", searchText,
      searchTokens: tokenizeSearch(searchText), titleTokens: tokenizeSearch(article.title),
      primaryTokens: tokenizeSearch([article.title, ...(article.metadata.aliases || [])].join(" ")) };
  });
  for (const query of ["BPFO", "БПФО", "наружная обойма"]) {
    assert.ok(searchArticles(query, documents).some(item =>
      item.id === "vibration-spectrum-bpfo" || item.id === "vibration-fault-bearing-outer-race"
    ), query);
  }
});

test("будущие инструменты используют единый API метаданных", () => {
  data.filter(item => item.template === "tool").forEach(tool => {
    assert.equal(tool.toolConfig.knowledgeApi, "vibration", tool.id);
  });
});
