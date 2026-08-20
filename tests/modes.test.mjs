import test from "node:test";
import assert from "node:assert/strict";
import { ATLAS_ENTRIES, TASK_HUBS, getModeSectionIds } from "../js/navigationModel.js";
import { clearRecentItems, getRecentItems, rememberRecentItem } from "../js/recent.js";
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
  assert.equal(isPublicItem({
    status: "published",
    pipelineJoint: { parameters: [], images: { edgePreparation: null, weldSection: null } }
  }), false);
});

test("история безопасно работает без браузерного localStorage", () => {
  clearRecentItems();
  rememberRecentItem({ route: { view: "article", method: "uzk", itemId: "uzk-1" }, title: "Настройка" });
  assert.deepEqual(getRecentItems(), []);
});
