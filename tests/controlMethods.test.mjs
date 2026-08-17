import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
const vik = read("vik");
const uzk = read("uzk");
const pvk = read("pvk");
const rk = read("rk");
const vibration = read("vibration");
const pipeline = read("pipeline-welded-joints");
const datasets = { vik, uzk, pvk, rk, vibration, pipeline };

test("ВИК сохраняет прежние ID и получает полный практический маршрут", () => {
  const ids = new Set(vik.map(item => item.id));
  for (const id of [
    "vik-control-object-preparation", "vik-control-lighting", "vik-control-surface-cleaning",
    "vik-control-sequence", "vik-control-measurements", "vik-tools", "vik-undercut", "vik-fistula"
  ]) assert.ok(ids.has(id), id);

  for (const id of ["vik-basics-section", "vik-control-section", "vik-evaluation-section", "vik-measuring-tools", "vik-defects", "vik-base-metal-defects"]) {
    const section = vik.find(item => item.id === id);
    assert.equal(section.type, "section", id);
    assert.equal(section.status, "published", id);
    assert.ok(vik.some(item => item.parentId === id), `${id} должен иметь материалы`);
  }
  assert.equal(vik.find(item => item.id === "vik-fractography").status, "draft");
});

test("УЗК организован по этапам от основ до оформления", () => {
  const expected = [
    "uzk-basics-section", "uzk-equipment-section", "uzk-setup-section",
    "uzk-control-section", "uzk-indications-section", "uzk-evaluation-section"
  ];
  assert.deepEqual(uzk.filter(item => !item.parentId).sort((a, b) => a.order - b.order).map(item => item.id), expected);
  assert.equal(uzk.length, 25);
  assert.ok(uzk.every(item => item.status === "published"));
  for (const id of ["uzk-1", "uzk-2", "uzk-3", "uzk-4", "uzk-5", "uzk-6"]) assert.ok(uzk.some(item => item.id === id), id);
});

test("нормативные статьи методов опубликованы и указывают дату проверки", () => {
  for (const [method, items] of Object.entries({ vik, uzk, pvk })) {
    const article = items.find(item => item.id === `${method}-normative-documents`);
    assert.equal(article?.status, "published", method);
    assert.equal(article?.parentId, `${method}-basics-section`, method);
    const text = JSON.stringify(article);
    assert.match(text, /17 августа 2026 года/, method);
    assert.match(text, /protect\.gost\.ru/, method);
    assert.match(text, /область|применим/i, method);
  }
});

test("ПВК покрывает полный технологический цикл", () => {
  assert.deepEqual(
    pvk.filter(item => !item.parentId).sort((a, b) => a.order - b.order).map(item => item.id),
    ["pvk-basics-section", "pvk-materials-section", "pvk-control-section", "pvk-evaluation-section"]
  );
  assert.ok(pvk.every(item => item.status === "published"));
  const sequence = pvk.find(item => item.id === "pvk-2");
  const text = JSON.stringify(sequence.sections);
  for (const term of ["выдержк", "удал", "суш", "проявител", "очистк"]) assert.match(text.toLowerCase(), new RegExp(term));
});

test("РК покрывает безопасный маршрут от подготовки до заключения", () => {
  assert.deepEqual(
    rk.filter(item => !item.parentId).sort((a, b) => a.order - b.order).map(item => item.id),
    ["rk-basics-section", "rk-equipment-section", "rk-preparation-section", "rk-control-section", "rk-analysis-section", "rk-evaluation-section"]
  );
  assert.ok(rk.every(item => item.status === "published"));
  const text = JSON.stringify(rk).toLowerCase();
  for (const term of ["радиационная безопасность", "индикатор качества", "схема просвечивания", "артефакт", "протокол"]) assert.match(text, new RegExp(term));
});

test("опубликованные материалы контроля не содержат служебных заглушек", () => {
  for (const [method, items] of Object.entries({ vik, uzk, pvk, rk })) {
    for (const item of items.filter(candidate => candidate.status === "published")) {
      const text = JSON.stringify(item).toLowerCase();
      assert.doesNotMatch(text, /здесь будет|раздел находится в разработке/, `${method}/${item.id}`);
      if (item.type !== "section") assert.ok((item.sections || []).length >= 7, `${method}/${item.id}`);
    }
  }
});

test("все связи и parentId методов контроля существуют", () => {
  const indexes = Object.fromEntries(Object.entries(datasets).map(([method, items]) => [method, new Set(items.map(item => item.id))]));
  for (const [method, items] of Object.entries({ vik, uzk, pvk, rk })) {
    for (const item of items) {
      if (item.parentId) assert.ok(indexes[method].has(item.parentId), `${method}/${item.id} parent ${item.parentId}`);
      for (const section of item.sections || []) {
        if (section.type !== "related") continue;
        for (const link of section.items || []) assert.ok(indexes[link.method]?.has(link.id), `${method}/${item.id} -> ${link.method}/${link.id}`);
      }
    }
  }
});

test("поисковые данные покрывают практические запросы ВИК, УЗК и ПВК", () => {
  const corpus = items => JSON.stringify(items).toLowerCase();
  for (const term of ["ушс-3", "акт вик", "коррозионные повреждения"]) assert.match(corpus(vik), new RegExp(term));
  for (const term of ["геометрический отражатель", "tcg", "акустический контакт"]) assert.match(corpus(uzk), new RegExp(term));
  for (const term of ["проявитель", "линейная индикация", "переочистка"]) assert.match(corpus(pvk), new RegExp(term));
});
