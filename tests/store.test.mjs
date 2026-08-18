import test from "node:test";
import assert from "node:assert/strict";
import {
  getArticles,
  getItem,
  getMethodLoadError,
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
      json: async () => [{ id: `${method}-test`, title: "Тест", category: "Тест", text: "Текст" }]
    };
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await loadData("https://example.com/app/");
    assert.deepEqual(result, { loaded: Object.keys(DATA_FILES).length - 1, failed: 1 });
    assert.equal(getArticles("vik").length, 1);
    assert.equal(getItem("vik", "vik-test").title, "Тест");
    assert.match(getMethodLoadError("pvk").message, /network unavailable/);
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
