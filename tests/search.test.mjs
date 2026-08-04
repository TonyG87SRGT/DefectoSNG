import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearch, searchArticles } from "../js/search.js";

const documents = [
  {
    id: "vik-1",
    methodKey: "vik",
    searchText: "Визуальный контроль сварного соединения подрез"
  },
  {
    id: "pvk-1",
    methodKey: "pvk",
    searchText: "Капиллярный контроль пенетрант проявитель"
  }
];

test("поиск нормализует регистр, ё и знаки", () => {
  assert.equal(normalizeSearch("  Ёмкость № 12! "), "емкость 12");
});

test("поиск учитывает все слова и простые словоформы", () => {
  assert.deepEqual(
    searchArticles("визуального подреза", documents).map(item => item.id),
    ["vik-1"]
  );
  assert.deepEqual(searchArticles("контроль проявитель", documents).map(item => item.id), ["pvk-1"]);
});

test("пустой запрос не возвращает все статьи", () => {
  assert.deepEqual(searchArticles("   ", documents), []);
});

test("совпадение в заголовке располагается выше упоминания в тексте", () => {
  const ranked = searchArticles("подрез", [
    {
      id: "mention",
      methodKey: "vik",
      title: "Похожий дефект",
      searchText: "Можно перепутать с подрезом"
    },
    {
      id: "exact",
      methodKey: "vik",
      title: "Подрез",
      searchText: "Подрез"
    }
  ]);

  assert.deepEqual(ranked.map(item => item.id), ["exact", "mention"]);
});
