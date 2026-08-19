import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { searchArticles } from "../js/search.js";
import { getAutomaticVibrationRelated, withAutomaticVibrationRelated } from "../js/vibrationRelations.js";
import { VIBRATION_TEMPLATE_DEFINITIONS } from "../js/vibrationTemplates.js";

const data = JSON.parse(fs.readFileSync(new URL("../data/vibration.json", import.meta.url), "utf8"));

test("верхний уровень ВД сгруппирован в семь понятных маршрутов", () => {
  const roots = data.filter(item => !item.parentId).sort((a, b) => a.order - b.order);
  assert.deepEqual(roots.map(item => item.id), [
    "vibration-basics",
    "vibration-measurement-workflow",
    "vibration-parameters-analysis",
    "vibration-diagnostics-workflow",
    "vibration-practical-diagnostics",
    "vibration-reference",
    "vibration-tools"
  ]);
  const expected = {
    "vibration-measurement-workflow": ["vibration-preparation", "vibration-equipment", "vibration-measurements"],
    "vibration-parameters-analysis": ["vibration-parameters-group", "vibration-signal-analysis"],
    "vibration-diagnostics-workflow": ["vibration-diagnostic-algorithm", "vibration-fault-atlas", "vibration-spectrum-atlas"],
    "vibration-practical-diagnostics": ["vibration-equipment-diagnostics", "vibration-practical-situations"]
  };
  for (const [parentId, ids] of Object.entries(expected)) {
    assert.deepEqual(data.filter(item => item.parentId === parentId).sort((a, b) => a.order - b.order).map(item => item.id), ids);
  }
});
const byId = new Map(data.map(item => [item.id, item]));

const expectedGroupSizes = Object.freeze({
  "vibration-basics": 8,
  "vibration-preparation": 7,
  "vibration-equipment": 10,
  "vibration-measurements": 12,
  "vibration-parameters-group": 11,
  "vibration-signal-analysis": 13,
  "vibration-diagnostic-algorithm": 10,
  "vibration-fault-atlas": 29,
  "vibration-spectrum-atlas": 20,
  "vibration-equipment-diagnostics": 11,
  "vibration-practical-situations": 14,
  "vibration-reference": 4,
  "vibration-tools": 8
});

test("раздел ВД содержит все группы без повторяющихся ID", () => {
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

  assert.equal(fault.status, "published");
  assert.equal(fault.metadata.status, "published");
  assert.ok(fault.sections.some(section => section.type === "warning"));
  assert.ok(fault.sections.some(section => section.type === "related"));
  assert.equal(spectrum.status, "published");
  assert.equal(spectrum.metadata.status, "published");
  assert.ok(spectrum.sections.some(section => section.type === "warning"));
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

test("окончательная структура содержит все дополнительно разделённые страницы", () => {
  for (const id of [
    "vibration-subharmonics",
    "vibration-coastdown-analysis",
    "vibration-diagnostics-smoke-exhausters"
  ]) assert.ok(byId.has(id), id);

  assert.equal(byId.get("vibration-harmonics-subharmonics").title, "Гармоники");
  assert.equal(byId.get("vibration-runup-coastdown").title, "Анализ разгона");
  assert.equal(byId.get("vibration-diagnostics-fans").title, "Вентиляторы");
});

test("каждый материал ВД имеет валидные метаданные и шаблон", () => {
  data.filter(item => item.type !== "section").forEach(article => {
    assert.ok(VIBRATION_TEMPLATE_DEFINITIONS[article.template], article.id);
    assert.equal(article.metadata.section, "vibration", article.id);
    assert.equal(article.metadata.group, article.parentId, article.id);
    assert.equal(article.metadata.materialType, article.template, article.id);
    assert.ok(Array.isArray(article.metadata.equipment), article.id);
    assert.ok(Array.isArray(article.metadata.faults), article.id);
    assert.ok(Array.isArray(article.metadata.diagnosticSigns), article.id);
    assert.ok(Array.isArray(article.metadata.keywords), article.id);
    assert.ok(Array.isArray(article.metadata.relatedArticles), article.id);
    assert.equal(article.metadata.status, article.status || "published", article.id);
    if (article.status === "draft") {
      assert.deepEqual(article.futureBlocks, [...VIBRATION_TEMPLATE_DEFINITIONS[article.template].sections], article.id);
      assert.ok(article.mediaSlots.length > 0, article.id);
    }
  });
});

test("атласы, сценарии и инструменты используют специализированные шаблоны", () => {
  assert.equal(byId.get("vibration-fault-unbalance").template, "fault");
  assert.equal(byId.get("vibration-spectrum-1x").template, "spectrum");
  assert.equal(byId.get("vibration-case-high-overall").template, "scenario");
  assert.equal(byId.get("vibration-reference-symbols").template, "reference");
  assert.equal(byId.get("vibration-tool-harmonics").template, "tool");
  assert.equal(byId.has("vibration-tool-diagnostic-tree"), false);
  data.filter(item => item.parentId === "vibration-tools").forEach(item => {
    assert.equal(item.toolConfig.scope, "method", item.id);
  });
});

test("оба атласа ВД полностью заполнены учебными изображениями", () => {
  const faults = data.filter(item => item.parentId === "vibration-fault-atlas");
  const spectra = data.filter(item => item.parentId === "vibration-spectrum-atlas");
  assert.equal(faults.length, 29);
  assert.equal(spectra.length, 20);
  assert.ok(faults.every(item => item.mediaLayout === "atlas-fault" && item.mediaSlots?.length === 4));
  assert.ok(spectra.every(item => item.mediaLayout === "atlas-spectrum" && item.mediaSlots?.length === 2));
  const slots = [...faults, ...spectra].flatMap(item => item.mediaSlots);
  assert.equal(slots.length, 156);
  assert.ok(slots.every(slot => slot.src && slot.alt && slot.caption));
  assert.ok(slots.every(slot => fs.existsSync(new URL(`../${slot.src}`, import.meta.url))), "каждый ресурс существует");
  assert.ok(slots.every(slot => /учебн|пример/i.test(slot.caption)), "каждая подпись объясняет учебный характер");
});

test("справочник ВД собран в четыре карточки без скрытых дублей", () => {
  const references = data.filter(item => item.parentId === "vibration-reference");
  assert.deepEqual(references.map(item => item.id), [
    "vibration-reference-symbols",
    "vibration-reference-unit-conversion",
    "vibration-reference-rotation-harmonics",
    "vibration-reference-standards"
  ]);
  references.forEach(item => assert.equal(item.status, "published", item.id));
  assert.equal(references.length, 4);
});

test("помощник по неисправности активирован без изменения ID и маршрута", () => {
  const tool = byId.get("vibration-tool-fault-search");
  assert.equal(tool.status, "published");
  assert.equal(tool.toolConfig.status, "available");
  assert.equal(tool.toolConfig.engine, "vibrationDiagnosticEngine");
  assert.equal(tool.id, "vibration-tool-fault-search");
});

test("автоматическая перелинковка связывает тему подшипников с разными видами материалов", () => {
  const source = byId.get("vibration-bearing-supports");
  const automatic = getAutomaticVibrationRelated(source, data, { limit: 8 });
  const types = new Set(automatic.map(item => item.metadata.materialType));

  assert.ok(types.has("fault"));
  assert.ok(types.has("spectrum"));
  assert.ok(types.has("scenario"));
  const enriched = withAutomaticVibrationRelated(source, data, 8);
  const related = enriched.sections.find(section => section.type === "related");
  assert.ok(related.items.length > 0);
  assert.equal(new Set(related.items.map(item => item.id)).size, related.items.length);
});

test("поиск учитывает оборудование, неисправности и диагностические признаки из metadata", () => {
  const documents = data.map(item => ({
    ...item,
    methodKey: "vibration",
    searchText: JSON.stringify([item, item.metadata])
  }));
  assert.ok(searchArticles("дымососы", documents).some(item => item.id === "vibration-diagnostics-smoke-exhausters"));
  assert.ok(searchArticles("механические ослабления", documents).some(item => item.id === "vibration-fault-mechanical-looseness"));
  assert.ok(searchArticles("широкополосный шум", documents).some(item => item.id === "vibration-spectrum-broadband-noise"));
});
