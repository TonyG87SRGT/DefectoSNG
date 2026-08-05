import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { searchArticles } from "../js/search.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/vibration.json", import.meta.url), "utf8"));
const byId = new Map(data.map(item => [item.id, item]));

const expectedGroupSizes = Object.freeze({
  "vibration-basics": 8,
  "vibration-preparation": 7,
  "vibration-equipment": 10,
  "vibration-measurements": 12,
  "vibration-parameters-group": 10,
  "vibration-signal-analysis": 12,
  "vibration-diagnostic-algorithm": 10,
  "vibration-fault-atlas": 29,
  "vibration-spectrum-atlas": 20,
  "vibration-equipment-diagnostics": 10,
  "vibration-practical-situations": 14,
  "vibration-reference": 12,
  "vibration-tools": 8
});

test("раздел ВД содержит все группы без повторяющихся ID", () => {
  assert.equal(data.length, 175);
  assert.equal(byId.size, data.length);

  for (const [groupId, expectedSize] of Object.entries(expectedGroupSizes)) {
    assert.equal(byId.get(groupId)?.type, "section", groupId);
    assert.equal(data.filter(item => item.parentId === groupId).length, expectedSize, groupId);
  }
});

test("две исходные статьи сохранены по прежним ID и включены в основы", () => {
  const introduction = byId.get("vibration-introduction");
  const parameters = byId.get("vibration-parameters");

  assert.equal(introduction.title, "Что такое вибродиагностика");
  assert.equal(parameters.title, "Что измеряет вибродиагностика");
  assert.equal(introduction.parentId, "vibration-basics");
  assert.equal(parameters.parentId, "vibration-basics");
  assert.notEqual(introduction.status, "draft");
  assert.notEqual(parameters.status, "draft");
  assert.ok(introduction.sections.length > 1);
  assert.ok(parameters.sections.length > 1);
});

test("все восемь основ опубликованы и связаны с нормативной основой", () => {
  const basics = data.filter(item => item.parentId === "vibration-basics");

  assert.equal(basics.length, 8);
  basics.forEach(article => {
    assert.notEqual(article.status, "draft", article.id);
    assert.equal(article.futureBlocks, undefined, article.id);
    assert.equal(article.futureImageLabel, undefined, article.id);
    assert.ok(article.sections.length >= 7, article.id);
    assert.ok(article.sections.some(section => section.type === "documents"), article.id);
    assert.ok(article.sections.some(section => section.type === "related"), article.id);
  });
});

test("перелинковка основ ведёт на существующие материалы", () => {
  const basics = data.filter(item => item.parentId === "vibration-basics");
  const relatedIds = basics.flatMap(article => article.sections)
    .filter(section => section.type === "related")
    .flatMap(section => section.items.map(item => item.id));

  assert.ok(relatedIds.includes("vibration-parameters"));
  assert.ok(relatedIds.includes("vibration-displacement"));
  assert.ok(relatedIds.includes("vibration-fault-unbalance"));
  relatedIds.forEach(id => assert.ok(byId.has(id), id));
});

test("новые статьи имеют нейтральные заготовки и будущую структуру", () => {
  const fault = byId.get("vibration-fault-unbalance");
  const spectrum = byId.get("vibration-spectrum-1x");
  const tool = byId.get("vibration-tool-harmonics");

  assert.equal(fault.status, "draft");
  assert.equal(fault.futureBlocks.length, 14);
  assert.equal(spectrum.futureBlocks.length, 8);
  assert.match(spectrum.futureImageLabel, /спектр/i);
  assert.match(tool.sections[0].content, /разработке/i);
});

test("общий поиск находит существующие и новые материалы без дублей", () => {
  const documents = data.map(item => ({
    ...item,
    methodKey: "vibration",
    searchText: JSON.stringify(item)
  }));

  const existing = searchArticles("Что измеряет вибродиагностика", documents)
    .filter(item => item.id === "vibration-parameters");
  const fault = searchArticles("дисбаланс", documents);
  const fft = searchArticles("FFT", documents);

  assert.equal(existing.length, 1);
  assert.ok(fault.some(item => item.id === "vibration-fault-unbalance"));
  assert.ok(fft.some(item => item.id === "vibration-fft"));
});

test("поиск находит каждую статью основ и сокращение ВД", () => {
  const documents = data.map(item => ({
    ...item,
    methodKey: "vibration",
    searchText: JSON.stringify(item)
  }));
  const basics = data.filter(item => item.parentId === "vibration-basics");

  basics.forEach(article => {
    const matches = searchArticles(article.title, documents).filter(item => item.id === article.id);
    assert.equal(matches.length, 1, article.id);
  });
  assert.ok(searchArticles("ВД", documents).some(item => item.id === "vibration-introduction"));
});

test("все десять статей об измерительном оборудовании опубликованы и имеют единый практический шаблон", () => {
  const equipment = data.filter(item => item.parentId === "vibration-equipment");
  const requiredTitles = ["Назначение", "Принцип работы", "Когда использовать", "Преимущества", "Ограничения"];

  assert.equal(equipment.length, 10);
  equipment.forEach(article => {
    assert.notEqual(article.status, "draft", article.id);
    assert.equal(article.futureBlocks, undefined, article.id);
    assert.ok(article.futureImageLabels.length >= 2, article.id);
    assert.ok(article.sections.some(section => section.type === "warning" && /ошиб/i.test(section.title)), article.id);
    assert.ok(article.sections.some(section => section.type === "practice"), article.id);
    assert.ok(article.sections.some(section => section.type === "related"), article.id);
    assert.ok(article.sections.some(section => section.type === "documents"), article.id);
    requiredTitles.forEach(title => {
      assert.ok(article.sections.some(section => section.title === title), `${article.id}: ${title}`);
    });
  });
});

test("ключевые статьи содержат требуемые сравнения и чек-лист", () => {
  const meterTable = byId.get("vibration-meters").sections.find(section => section.type === "table");
  const mountingTable = byId.get("vibration-sensor-mounting").sections.find(section => section.type === "table");
  const chainChecklist = byId.get("vibration-measurement-chain-check").sections.find(section => section.type === "steps");
  const errors = byId.get("vibration-sensor-installation-errors").sections.filter(section => section.type === "comparison");

  assert.deepEqual(meterTable.headers, ["Возможность", "Виброметр"]);
  assert.equal(meterTable.rows.length, 4);
  assert.equal(mountingTable.rows.length, 5);
  assert.equal(chainChecklist.items.length, 8);
  assert.equal(errors.flatMap(section => section.items).length, 10);
});

test("перелинковка оборудования ведёт на существующие статьи", () => {
  const equipment = data.filter(item => item.parentId === "vibration-equipment");
  const relatedIds = equipment.flatMap(article => article.sections)
    .filter(section => section.type === "related")
    .flatMap(section => section.items.map(item => item.id));

  assert.ok(relatedIds.includes("vibration-parameters"));
  assert.ok(relatedIds.includes("vibration-sensor-mounting"));
  assert.ok(relatedIds.includes("vibration-measurement-chain-check"));
  relatedIds.forEach(id => assert.ok(byId.has(id), id));
});

test("поиск находит каждую статью оборудования и практические ключевые слова", () => {
  const documents = data.map(item => ({ ...item, methodKey: "vibration", searchText: JSON.stringify(item) }));
  const equipment = data.filter(item => item.parentId === "vibration-equipment");

  equipment.forEach(article => {
    const matches = searchArticles(article.title, documents).filter(item => item.id === article.id);
    assert.equal(matches.length, 1, article.id);
  });
  assert.ok(searchArticles("вихретоковый датчик", documents).some(item => item.id === "vibration-proximity-probes"));
  assert.ok(searchArticles("слабый магнит", documents).some(item => item.id === "vibration-sensor-installation-errors"));
  assert.ok(searchArticles("калибратор", documents).some(item => item.id === "vibration-measurement-chain-check"));
});
