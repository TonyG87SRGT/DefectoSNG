import test from "node:test";
import assert from "node:assert/strict";
import {
  getArticles,
  getChildren,
  getItem,
  getMethodLoadError,
  getAllItems,
  loadData
} from "../js/store.js";
import { DATA_FILES } from "../js/config.js";

test("ошибка одного data-файла не блокирует остальные методы", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const file = String(url).split("/").at(-1).replace(".json", "");
    if (file === "pvk") throw new Error("network unavailable");
    const method = file === "pipeline-welded-joints" ? "pipeline" : file;

    return {
      ok: true,
      json: async () => [
        { id: `${method}-section`, title: "Раздел", category: "Тест", type: "section", status: "published" },
        { id: `${method}-test`, title: "Тест", category: "Тест", text: "Текст", status: "published", parentId: `${method}-section` },
        { id: `${method}-hidden`, title: "Скрыто", category: "Тест", text: "Текст", status: "draft", hidden: true, parentId: `${method}-section` }
      ]
    };
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await loadData("https://example.com/app/");
    assert.deepEqual(result, { loaded: Object.keys(DATA_FILES).length - 1, failed: 1 });
    assert.equal(getArticles("vik").length, 2);
    assert.equal(getItem("vik", "vik-test").title, "Тест");
    assert.equal(getItem("vik", "vik-hidden").hidden, true);
    assert.deepEqual(getChildren("vik", "vik-section").map(item => item.id), ["vik-test"]);
    assert.ok(!getAllItems().some(item => item.id.endsWith("-hidden")));
    assert.match(getMethodLoadError("pvk").message, /network unavailable/);
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
