import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearch, searchArticles } from "../js/search.js";

const documents = [
  { id: "mention", title: "Похожий дефект", searchText: "Можно перепутать с подрезом" },
  { id: "exact", title: "Подрез", searchText: "Визуальный контроль сварного соединения подрез" },
  { id: "pvk", title: "Проявитель", searchText: "Капиллярный контроль пенетрант проявитель" }
];

test("поиск нормализует регистр, ё и знаки", () => {
  assert.equal(normalizeSearch("  Ёмкость № 12! "), "емкость 12");
});

test("поиск учитывает все слова и простые словоформы", () => {
  assert.deepEqual(searchArticles("визуального подреза", documents).map(item => item.id), ["exact"]);
  assert.deepEqual(searchArticles("контроль проявитель", documents).map(item => item.id), ["pvk"]);
});

test("совпадение в заголовке располагается выше упоминания в тексте", () => {
  assert.deepEqual(searchArticles("подрез", documents).map(item => item.id), ["exact", "mention"]);
});

test("пустой запрос не возвращает весь индекс", () => {
  assert.deepEqual(searchArticles("   ", documents), []);
});
