import test from "node:test";
import assert from "node:assert/strict";
import { ATLAS_COLLECTIONS, DATA_FILES } from "../js/config.js";
import { getArticles, getAtlasItems, getChildren, getItem, loadData } from "../js/store.js";

test("ошибка одного data-файла не блокирует остальные визуальные коллекции", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const method = String(url).split("/").at(-1).replace(".json", "");
    if (method === "pvk") throw new Error("network unavailable");
    const roots = ATLAS_COLLECTIONS.filter(item => item.method === method);
    return { ok: true, json: async () => roots.flatMap((root, index) => [
      { id: root.rootId, title: root.label, type: "section", order: index + 1 },
      { id: `${root.rootId}-card`, title: "Карточка", parentId: root.rootId, order: 1 }
    ]) };
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await loadData("https://example.com/app/");
    assert.deepEqual(result, { loaded: Object.keys(DATA_FILES).length - 1, failed: 1 });
    assert.ok(getArticles("vik").length > 0);
    assert.equal(getItem("vik", "vik-defects-card").title, "Карточка");
    assert.deepEqual(getChildren("vik", "vik-defects").map(item => item.id), ["vik-defects-card"]);
    assert.ok(getAtlasItems().some(item => item.id === "vik-defects-card"));
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
