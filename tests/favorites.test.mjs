import test from "node:test";
import assert from "node:assert/strict";
import { getFavorites, normalizeFavorites, saveFavorites } from "../js/favorites.js";

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    value: () => value
  };
}

test("старый массив ID мигрирует в ссылки method/id", () => {
  const articles = [{ id: "pvk-1", methodKey: "pvk" }];
  assert.deepEqual(normalizeFavorites(["pvk-1"], articles), [
    { method: "pvk", id: "pvk-1" }
  ]);
});

test("повреждённое хранилище не ломает избранное", () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(getFavorites(createStorage("{")), []);
    assert.deepEqual(getFavorites(createStorage("{}")), []);
  } finally {
    console.warn = originalWarn;
  }
});

test("избранное сохраняется с версией схемы", () => {
  const storage = createStorage();
  assert.equal(saveFavorites([{ method: "vik", id: "vik-1" }], storage), true);
  assert.deepEqual(JSON.parse(storage.value()), {
    version: 2,
    items: [{ method: "vik", id: "vik-1" }]
  });
});
