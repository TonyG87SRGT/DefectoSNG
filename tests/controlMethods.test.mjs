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
  const baseMetal = vik.filter(item => item.parentId === "vik-base-metal-defects");
  assert.equal(baseMetal.length, 3);
  assert.ok(baseMetal.every(item => item.mediaSlots?.length === 3));
  assert.ok(baseMetal.flatMap(item => item.mediaSlots).every(slot => fs.existsSync(new URL(`../${slot.src}`, import.meta.url))));

  const fractography = vik.find(item => item.id === "vik-fractography");
  assert.equal(fractography.status, "published");
  const fractureCards = vik.filter(item => item.parentId === fractography.id).sort((a, b) => a.order - b.order);
  assert.deepEqual(fractureCards.map(item => item.id), [
    "vik-fractography-ductile", "vik-fractography-brittle", "vik-fractography-fatigue",
    "vik-fractography-intergranular", "vik-fractography-stress-corrosion", "vik-fractography-overload"
  ]);
  assert.ok(fractureCards.every(item => item.status === "published" && item.sections.length === 9));
  assert.ok(fractureCards.every(item => item.mediaSlots?.length === 3));
  assert.ok(fractureCards.flatMap(item => item.mediaSlots).every(slot => fs.existsSync(new URL(`../${slot.src}`, import.meta.url))));
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
    ["pvk-basics-section", "pvk-materials-section", "pvk-control-section", "pvk-evaluation-section", "pvk-indications-atlas"]
  );
  assert.ok(pvk.every(item => item.status === "published"));
  const sequence = pvk.find(item => item.id === "pvk-2");
  const text = JSON.stringify(sequence.sections);
  for (const term of ["выдержк", "удал", "суш", "проявител", "очистк"]) assert.match(text.toLowerCase(), new RegExp(term));
});

test("атлас ПВК разделяет наблюдение, происхождение и ошибку процесса", () => {
  const root = pvk.find(item => item.id === "pvk-indications-atlas");
  assert.equal(root?.status, "published");
  const groups = pvk.filter(item => item.parentId === root.id).sort((a, b) => a.order - b.order);
  assert.deepEqual(groups.map(item => item.id), ["pvk-atlas-relevant", "pvk-atlas-nonrelevant", "pvk-atlas-process"]);
  assert.ok(groups.every(item => item.coverImage && item.additionalText.includes("синтетической")));
  const cards = pvk.filter(item => groups.some(group => group.id === item.parentId));
  assert.equal(cards.length, 31);
  assert.ok(cards.every(item => item.status === "published" && item.sections.length === 8));
  assert.ok(cards.every(item => item.mediaSlots.length === 3));
  const mediaSlots = cards.flatMap(item => item.mediaSlots);
  assert.equal(mediaSlots.length, 93);
  assert.ok(mediaSlots.every(slot => slot.src && slot.alt && slot.caption));
  assert.ok(mediaSlots.every(slot => slot.caption.includes("Учебн")));
  assert.ok(mediaSlots.every(slot => fs.existsSync(new URL(`../${slot.src}`, import.meta.url))));
  const corpus = JSON.stringify(cards).toLowerCase();
  for (const term of ["разветвлённая", "несплав", "царапина", "окалина", "толстый слой проявителя", "несовместимых материалов", "недостаточное освещение"]) {
    assert.match(corpus, new RegExp(term));
  }
});

test("РК покрывает безопасный маршрут от подготовки до заключения", () => {
  assert.deepEqual(
    rk.filter(item => !item.parentId).sort((a, b) => a.order - b.order).map(item => item.id),
    ["rk-basics-section", "rk-equipment-section", "rk-preparation-section", "rk-control-section", "rk-analysis-section", "rk-radiographic-atlas", "rk-evaluation-section"]
  );
  assert.ok(rk.every(item => item.status === "published"));
  assert.equal(rk.filter(item => item.type === "article").length, 33);
  for (const id of [
    "rk-regulatory-documents", "rk-radiation-sources", "rk-detector-systems",
    "rk-image-quality-indicators", "rk-exposure-geometry", "rk-marking-iqi-placement",
    "rk-film-processing", "rk-digital-image-acquisition", "rk-indications-sizing"
  ]) assert.ok(rk.some(item => item.id === id), id);
  const text = JSON.stringify(rk).toLowerCase();
  for (const term of [
    "радиационная безопасность", "индикатор качества", "схема просвечивания",
    "геометрическая нерезкость", "оптической плотности", "цифрового изображения",
    "координату", "артефакт", "протокол", "санпин 2.6.4115-25"
  ]) assert.match(text, new RegExp(term));
  const regulatory = rk.find(item => item.id === "rk-regulatory-documents");
  assert.match(JSON.stringify(regulatory), /19 августа 2026 года/);
  assert.match(JSON.stringify(regulatory), /protect\.gost\.ru/);

  const atlasRoot = rk.find(item => item.id === "rk-radiographic-atlas");
  const atlasGroups = rk.filter(item => item.parentId === atlasRoot.id).sort((a, b) => a.order - b.order);
  assert.deepEqual(atlasGroups.map(item => item.id), [
    "rk-atlas-volumetric", "rk-atlas-planar", "rk-atlas-shape", "rk-atlas-artifacts"
  ]);
  const atlasCards = rk.filter(item => atlasGroups.some(group => group.id === item.parentId));
  assert.equal(atlasCards.length, 18);
  assert.ok(atlasCards.every(item => item.mediaSlots?.length === 2 && item.sections?.length === 9));
  assert.ok(atlasCards.flatMap(item => item.mediaSlots).every(slot => fs.existsSync(new URL(`../${slot.src}`, import.meta.url))));
  const atlasCorpus = JSON.stringify(atlasCards).toLowerCase();
  for (const term of [
    "равномерно распределённая пористость", "скопление пор", "цепочка пор", "канальная пора", "шлаковое включение",
    "непровар корня", "несплавление", "трещина", "прожог", "вогнутость корня",
    "подрез", "смещение кромок", "артефакты изображения"
  ]) assert.match(atlasCorpus, new RegExp(term));
});

test("семь справочных карточек сварных соединений опубликованы и наполнены", () => {
  const expected = [
    "pipeline-reference-designations", "pipeline-reference-dimensions",
    "pipeline-reference-different-thickness", "pipeline-reference-backings",
    "pipeline-reference-fillet-welds", "pipeline-reference-vik",
    "pipeline-reference-scope"
  ];
  const references = pipeline
    .filter(item => item.parentId === "pipeline-reference-materials")
    .sort((a, b) => a.order - b.order);
  assert.deepEqual(references.map(item => item.id), expected);
  assert.ok(references.every(item => item.status === "published"));
  assert.ok(references.every(item => item.sections?.length >= 7));
  assert.ok(references.every(item => !item.text));

  const corpus = JSON.stringify(references).toLowerCase();
  for (const term of [
    "зп", "s₁", "подкладного кольца", "расплавляемая вставка",
    "катет", "после сборки и прихватки", "нормы допустимости дефектов"
  ]) assert.match(corpus, new RegExp(term));

  const scope = pipeline.find(item => item.id === "pipeline-reference-scope");
  assert.match(JSON.stringify(scope), /19 августа 2026 года/);
  assert.match(JSON.stringify(scope), /листового или полосового материала/);
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

test("поисковые данные покрывают практические запросы методов контроля", () => {
  const corpus = items => JSON.stringify(items).toLowerCase();
  for (const term of ["ушс-3", "акт вик", "коррозионные повреждения", "усталостный излом", "stress-corrosion"]) assert.match(corpus(vik), new RegExp(term));
  for (const term of ["геометрический отражатель", "tcg", "акустический контакт"]) assert.match(corpus(uzk), new RegExp(term));
  for (const term of ["проявитель", "линейная индикация", "переочистка"]) assert.match(corpus(pvk), new RegExp(term));
  for (const term of [
    "компьютерная радиография", "размещение ики", "геометрическая нерезкость", "координаты индикации",
    "цепочка пор", "lack of fusion", "root concavity", "артефакт радиограммы"
  ]) assert.match(corpus(rk), new RegExp(term));
});
