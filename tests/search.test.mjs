import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchIndex,
  filterSearchResults,
  getSearchMethodFacets,
  getSearchResultType,
  isSearchableArticle,
  normalizeSearch,
  searchArticles
} from "../js/search.js";

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
  assert.equal(isSearchableArticle({ status: "published", hidden: true }), false);
  assert.equal(isSearchableArticle({}), false);
});

test("результаты фильтруются независимо по методу и типу материала", () => {
  const results = [
    { id: "article", methodKey: "vik" },
    { id: "criterion", methodKey: "vik", isCriterion: true },
    { id: "reference", methodKey: "references", isReference: true },
    { id: "tool", methodKey: "vibration", isTool: true }
  ];

  assert.deepEqual(filterSearchResults(results, { method: "vik" }).map(item => item.id), ["article", "criterion"]);
  assert.deepEqual(filterSearchResults(results, { type: "criterion" }).map(item => item.id), ["criterion"]);
  assert.deepEqual(filterSearchResults(results, { method: "vik", type: "material" }).map(item => item.id), ["article"]);
  assert.equal(getSearchResultType(results[2]), "reference");
  assert.equal(getSearchResultType(results[3]), "tool");
  assert.equal(getSearchResultType({ metadata: { materialType: "tool" } }), "tool");
});

test("реальный индекс включает инструменты и дополнительные методы критериев", () => {
  const criteriaData = {
    standards: [{ id: "standard", basisDocuments: ["basis"], shortTitle: "НТД" }],
    methods: [
      { id: "mk", title: "МК" },
      { id: "uzt", title: "УЗТ" },
      { id: "ae", title: "АЭ / АЭК" },
      { id: "leak", title: "Герметичность" }
    ],
    criteria: ["mk", "uzt", "ae", "leak"].map(method => ({
      id: `criterion-${method}`,
      method,
      defect: `Критерий ${method}`,
      source: { basisDocument: "basis" },
      aliases: [],
      notes: []
    }))
  };
  const index = buildSearchIndex([], criteriaData);
  assert.equal(getSearchResultType(index.find(item => item.id === "ut-coordinates")), "tool");
  assert.deepEqual(
    getSearchMethodFacets(index.filter(item => item.isCriterion)),
    [
      { id: "mk", label: "МК" },
      { id: "uzt", label: "УЗТ" },
      { id: "ae", label: "АЭ / АЭК" },
      { id: "leak", label: "Герметичность" }
    ]
  );
});
