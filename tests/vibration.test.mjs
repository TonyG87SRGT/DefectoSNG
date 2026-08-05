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
