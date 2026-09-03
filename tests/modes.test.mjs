import test from "node:test";
import assert from "node:assert/strict";
import { renderMethodIcon } from "../js/methodIcons.js";
import { ATLAS_ENTRIES, TASK_HUBS, getModeSectionIds } from "../js/navigationModel.js";
import { isPublicItem } from "../js/store.js";

test("рабочий и учебный режимы не смешивают базовые разделы УЗК", () => {
  assert.ok(getModeSectionIds("uzk", "work").includes("uzk-setup-section"));
  assert.ok(!getModeSectionIds("uzk", "work").includes("uzk-basics-section"));
  assert.deepEqual(getModeSectionIds("uzk", "learning"), ["uzk-basics-section"]);
});

test("быстрые действия и атласы используют существующие разделы", () => {
  assert.ok(TASK_HUBS.setup.entries.some(entry => entry.itemId === "uzk-setup-section"));
  assert.ok(TASK_HUBS.criteria.entries.length >= 4);
  assert.ok(ATLAS_ENTRIES.some(entry => entry.itemId === "rk-radiographic-atlas"));
});

test("черновики и скрытые карточки не считаются публичными", () => {
  assert.equal(isPublicItem({ status: "published" }), true);
  assert.equal(isPublicItem({ status: "draft" }), false);
  assert.equal(isPublicItem({ status: "published", hidden: true }), false);
});

test("каждый метод получает собственную векторную пиктограмму", () => {
  const icons = ["vik", "uzk", "pvk", "rk", "vibration"].map(renderMethodIcon);
  assert.ok(icons.every(icon => icon.includes("<svg") && icon.includes("</svg>")));
  assert.equal(new Set(icons).size, icons.length);
});
