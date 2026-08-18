import test from "node:test";
import assert from "node:assert/strict";
import { isSearchableArticle, normalizeSearch, searchArticles } from "../js/search.js";

const documents = [
  {
    id: "vik-1",
    methodKey: "vik",
    status: "published",
    searchText: "Визуальный контроль сварного соединения подрез"
  },
  {
    id: "pvk-1",
    methodKey: "pvk",
    status: "published",
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
      status: "published",
      title: "Похожий дефект",
      searchText: "Можно перепутать с подрезом"
    },
    {
      id: "exact",
      methodKey: "vik",
      status: "published",
      title: "Подрез",
      searchText: "Подрез"
    }
  ]);

  assert.deepEqual(ranked.map(item => item.id), ["exact", "mention"]);
});

test("глобальный поиск не индексирует черновики", () => {
  const results = searchArticles("скрытый материал", [
    {
      id: "draft",
      methodKey: "vik",
      status: "draft",
      title: "Скрытый материал",
      searchText: "Скрытый материал"
    },
    {
      id: "published",
      methodKey: "vik",
      status: "published",
      title: "Опубликованный материал",
      searchText: "Опубликованный материал"
    }
  ]);

  assert.deepEqual(results, []);
  assert.equal(isSearchableArticle({ status: "published" }), true);
  assert.equal(isSearchableArticle({ status: "draft" }), false);
  assert.equal(isSearchableArticle({}), false);
});
