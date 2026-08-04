import test from "node:test";
import assert from "node:assert/strict";
import {
  getArticles,
  getItem,
  getMethodLoadError,
  loadData
} from "../js/store.js";

test("ошибка одного data-файла не блокирует остальные методы", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const method = String(url).match(/\/data\/(\w+)\.json$/)?.[1];
    if (method === "pvk") throw new Error("network unavailable");

    return {
      ok: true,
      json: async () => [{ id: `${method}-test`, title: "Тест", category: "Тест", text: "Текст" }]
    };
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await loadData("https://example.com/app/");
    assert.deepEqual(result, { loaded: 3, failed: 1 });
    assert.equal(getArticles("vik").length, 1);
    assert.equal(getItem("vik", "vik-test").title, "Тест");
    assert.match(getMethodLoadError("pvk").message, /network unavailable/);
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
