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

test("миграция удаляет ссылки на несуществующие карточки", () => {
  const articles = [{ id: "vibration-tool-fault-search", methodKey: "vibration" }];
  assert.deepEqual(normalizeFavorites([
    "vibration-tool-diagnostic-tree",
    "vibration-tool-fault-search"
  ], articles), [{ method: "vibration", id: "vibration-tool-fault-search" }]);
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
  const articles = [{ methodKey: "vik", id: "vik-1" }];
  assert.equal(saveFavorites([{ method: "vik", id: "vik-1" }], storage, articles), true);
  assert.deepEqual(JSON.parse(storage.value()), {
    version: 3,
    items: [{ method: "vik", id: "vik-1" }]
  });
});
