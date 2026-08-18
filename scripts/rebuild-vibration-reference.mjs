import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data", "vibration.json");
const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const byId = new Map(items.map(item => [item.id, item]));

const hiddenIds = new Set([
  "vibration-reference-bearing-frequencies",
  "vibration-reference-pump-frequencies",
  "vibration-reference-fan-frequencies",
  "vibration-reference-gearbox-frequencies",
  "vibration-reference-directions",
  "vibration-reference-diagnostic-signs",
  "vibration-reference-fault-sign-check",
  "vibration-reference-terms",
  "vibration-reference-units",
  "vibration-reference-abbreviations",
  "vibration-tool-diagnostic-tree"
]);

const replacements = new Map([
  ["vibration-reference-bearing-frequencies", "vibration-reference-rotation-harmonics"],
  ["vibration-reference-pump-frequencies", "vibration-reference-rotation-harmonics"],
  ["vibration-reference-fan-frequencies", "vibration-reference-rotation-harmonics"],
  ["vibration-reference-gearbox-frequencies", "vibration-reference-rotation-harmonics"],
  ["vibration-reference-terms", "vibration-reference-symbols"],
  ["vibration-reference-abbreviations", "vibration-reference-symbols"],
  ["vibration-reference-units", "vibration-reference-unit-conversion"],
  ["vibration-reference-directions", "vibration-measurement-directions"],
  ["vibration-reference-diagnostic-signs", "vibration-diagnostic-sequence"],
  ["vibration-reference-fault-sign-check", "vibration-diagnosis-confirmation"]
]);

function baseMetadata(id, keywords, aliases, relatedArticles, relatedParameters = []) {
  return {
    section: "vibration",
    group: "vibration-reference",
    materialType: "reference",
    equipment: [],
    faults: [],
    diagnosticSigns: [],
    keywords,
    relatedArticles,
    status: "published",
    tags: ["справочник", "вибродиагностика"],
    aliases,
    measuredParameters: [],
    relatedFaults: [],
    relatedSpectra: [],
    relatedScenarios: [],
    relatedReferences: [],
    normativeDocuments: [],
    relatedMeasurements: [],
    relatedParameters,
    probableFaults: [],
    similarSpectra: [],
    additionalChecks: []
  };
}

function publish(id, title, summary, sections, metadata) {
  const item = byId.get(id);
  if (!item) throw new Error(`Missing item: ${id}`);
  Object.assign(item, { title, summary, status: "published", sections, metadata });
  delete item.hidden;
  for (const field of ["developmentNotice", "futureBlocks", "futureImageLabel", "futureImageLabels", "mediaSlots"]) {
    delete item[field];
  }
}

publish(
  "vibration-reference-symbols",
  "Термины, обозначения и сокращения",
  "Краткий словарь основных терминов, буквенных обозначений и сокращений вибродиагностики.",
  [
    { type: "warning", title: "Как пользоваться", content: "Обозначение следует читать вместе с физической величиной, способом представления амплитуды, единицей, диапазоном частот и режимом машины. Одинаковая буква в документации разных приборов может иметь иной смысл." },
    { type: "table", headers: ["Обозначение", "Значение", "Практический контекст"], rows: [
      ["x, s", "виброперемещение", "мкм или мм; абсолютное движение корпуса либо относительное движение вала уточняют отдельно"],
      ["v", "виброскорость", "обычно мм/с; часто представляется как RMS"],
      ["a", "виброускорение", "м/с² или g; чувствительно к высокочастотным и ударным процессам"],
      ["f", "частота", "Гц"], ["n", "частота вращения", "об/мин"], ["φ", "фазовый угол", "градусы, относительно заданной метки"],
      ["1×, 2×, 3×", "порядки вращения", "целые кратные фактической оборотной частоты"],
      ["RMS", "среднеквадратичное значение", "способ выражения уровня выбранной физической величины"],
      ["Peak", "пиковое значение", "определение положительного или абсолютного пика проверяют по прибору"],
      ["P-P", "Peak-to-Peak", "разность максимального и минимального значения"],
      ["CF", "пик-фактор", "отношение Peak к RMS"],
      ["FFT / БПФ", "быстрое преобразование Фурье", "алгоритм получения дискретного спектра"],
      ["DE / NDE", "приводная / неприводная сторона", "обозначение положения подшипниковой опоры"],
      ["H / V / A", "горизонтальное / вертикальное / осевое направление", "ориентацию фиксируют относительно конструкции машины"],
      ["BPFO, BPFI, BSF, FTF", "расчётные частоты элементов подшипника", "совпадение одного пика с расчётом не является диагнозом"],
      ["GMF", "частота зубцового зацепления", "число зубьев × частота вращения соответствующего колеса"],
      ["VFD / ПЧ", "частотно-регулируемый привод", "учитывают фактическую выходную частоту и RPM"]
    ]},
    { type: "note", title: "Термины, которые нельзя смешивать", content: "Физическая величина (перемещение, скорость, ускорение), способ представления амплитуды (RMS, Peak, P-P), частота или порядок и единица измерения описывают разные свойства сигнала." },
    { type: "practice", title: "Корректная запись результата", content: "Пример: 4,2 мм/с RMS, 10–1000 Гц, горизонтальное направление, опора DE, 1485 об/мин. Такая запись однозначнее фразы «вибрация 4,2»." },
    { type: "related", title: "Связанные материалы", items: [
      { method: "vibration", id: "vibration-units", title: "Единицы измерения вибрации" },
      { method: "vibration", id: "vibration-basic-terms", title: "Основные термины вибродиагностики" },
      { method: "vibration", id: "vibration-measurement-directions", title: "Направления измерения" }
    ]}
  ],
  baseMetadata(
    "vibration-reference-symbols",
    ["термины вибродиагностики", "обозначения вибрации", "сокращения", "rms", "peak", "bpfo", "gmf", "de nde"],
    ["словарь вибродиагностики", "аббревиатуры", "условные обозначения"],
    ["vibration-basic-terms", "vibration-units", "vibration-measurement-directions"]
  )
);

publish(
  "vibration-reference-unit-conversion",
  "Единицы и перевод величин",
  "Сопоставление единиц виброперемещения, виброскорости, виброускорения, частоты и частоты вращения.",
  [
    { type: "warning", title: "Сначала определите величину", content: "Перевод единиц не превращает перемещение в скорость или ускорение. Такой пересчёт возможен только при известной частоте и принятой модели сигнала." },
    { type: "table", headers: ["Величина", "Основные единицы", "Полезное соотношение"], rows: [
      ["Виброперемещение", "мкм, мм", "1 мм = 1000 мкм"],
      ["Виброскорость", "мм/с, м/с", "1 м/с = 1000 мм/с"],
      ["Виброускорение", "м/с², g", "1 g = 9,80665 м/с²"],
      ["Частота", "Гц", "1 Гц = 1 цикл/с"],
      ["Частота вращения", "об/мин, Гц", "f = n / 60; n = 60f"],
      ["Фаза", "градусы, радианы", "360° = 2π рад"]
    ]},
    { type: "table", headers: ["Запись", "Что обязательно уточнить"], rows: [
      ["мм/с RMS", "частотный диапазон, точку, направление и режим"],
      ["м/с² Peak", "определение Peak, диапазон и фильтрацию"],
      ["мкм P-P", "абсолютное или относительное перемещение"],
      ["25 Гц", "источник частоты; это не обязательно 1×"],
      ["1500 об/мин", "номинальное или фактическое значение"]
    ]},
    { type: "note", title: "RMS, Peak и P-P", content: "Это способы представления амплитуды, а не единицы. Для реального сложного сигнала их нельзя переводить друг в друга универсальным коэффициентом." },
    { type: "practice", title: "Когда нужен калькулятор", content: "Для гармонического пересчёта перемещения, скорости и ускорения используйте калькулятор и обязательно задавайте частоту. Для общего широкополосного уровня такой пересчёт без спектра некорректен." },
    { type: "related", title: "Связанные материалы", items: [
      { method: "vibration", id: "vibration-tool-unit-conversion", title: "Перевод единиц вибрации" },
      { method: "vibration", id: "vibration-rms", title: "Среднеквадратичное значение RMS" },
      { method: "vibration", id: "vibration-peak", title: "Пиковое значение Peak" },
      { method: "vibration", id: "vibration-peak-to-peak", title: "Размах Peak-to-Peak" }
    ]}
  ],
  baseMetadata(
    "vibration-reference-unit-conversion",
    ["перевод единиц вибрации", "мкм мм", "мм с", "м с2", "g", "rpm hz", "rms peak"],
    ["конвертер единиц", "единицы вибрации", "пересчёт вибрации"],
    ["vibration-tool-unit-conversion", "vibration-rms", "vibration-peak", "vibration-peak-to-peak"],
    ["vibration-displacement", "vibration-velocity", "vibration-acceleration"]
  )
);

publish(
  "vibration-reference-rotation-harmonics",
  "Характерные частоты машин",
  "Краткие формулы и порядок определения оборотных, лопастных, зубцовых и подшипниковых частот.",
  [
    { type: "warning", title: "Расчётная частота не является диагнозом", content: "Сначала подтвердите фактические RPM и разрешение спектра. Пик вблизи расчётного значения становится диагностическим признаком только вместе с локализацией, гармониками, боковыми полосами, временным сигналом, трендом и режимом." },
    { type: "table", headers: ["Процесс", "Расчёт", "Что требуется знать"], rows: [
      ["Оборотная частота 1×", "f = n / 60", "фактические обороты выбранного вала"],
      ["Гармоника k×", "fk = k × f", "основную частоту и номер гармоники"],
      ["Лопастная частота", "BPF = z × f", "число лопаток z и RPM рабочего колеса"],
      ["Зубцовая частота", "GMF = z × f", "число зубьев и RPM соответствующего колеса"],
      ["Ременная частота", "по скорости ремня и его длине", "геометрию передачи и фактические скорости"],
      ["Частоты подшипника", "FTF, BPFO, BPFI, BSF", "геометрию подшипника, угол контакта, RPM и вращающееся кольцо"]
    ]},
    { type: "steps", title: "Порядок привязки спектра", items: [
      "Зафиксировать фактические RPM одновременно с вибрацией.",
      "Построить кинематическую схему и определить скорости всех валов.",
      "Рассчитать 1× и гармоники каждого значимого вала.",
      "Рассчитать лопастные, зубцовые и подшипниковые частоты только по подтверждённым исходным данным.",
      "Сопоставить расчёт со спектром с учётом разрешения, скольжения и изменения режима.",
      "Проверить гармоники, боковые полосы, waveform, огибающую, фазу и тренд в зависимости от гипотезы."
    ]},
    { type: "table", headers: ["Пример", "Результат"], rows: [
      ["1500 об/мин", "1× = 25 Гц; 2× = 50 Гц; 3× = 75 Гц"],
      ["1485 об/мин", "1× = 24,75 Гц"],
      ["6 лопаток при 1500 об/мин", "лопастная частота = 150 Гц"],
      ["23 зуба при 1485 об/мин", "GMF = 569,25 Гц"]
    ]},
    { type: "note", title: "Подшипниковые частоты", content: "Справочные каталожные значения полезны только при совпадении обозначения и внутренней геометрии подшипника. Реальная частота может немного отличаться из-за скольжения и режима." },
    { type: "related", title: "Связанные материалы и калькуляторы", items: [
      { method: "vibration", id: "vibration-rotation-frequency", title: "Частота вращения" },
      { method: "vibration", id: "vibration-characteristic-frequency", title: "Определение характерной частоты" },
      { method: "vibration", id: "vibration-tool-harmonics", title: "Калькулятор гармоник и субгармоник" },
      { method: "vibration", id: "vibration-tool-bearing-frequencies", title: "Калькулятор частот подшипника качения" }
    ]}
  ],
  baseMetadata(
    "vibration-reference-rotation-harmonics",
    ["характерные частоты", "1x 2x 3x", "частота вращения", "bpfo bpfi bsf ftf", "gmf", "blade pass", "vane pass"],
    ["таблица частот", "расчётные частоты", "частоты машин"],
    ["vibration-rotation-frequency", "vibration-characteristic-frequency", "vibration-tool-harmonics", "vibration-tool-bearing-frequencies"],
    ["vibration-rotation-frequency", "vibration-harmonics-subharmonics"]
  )
);

for (const id of hiddenIds) {
  const item = byId.get(id);
  if (!item) throw new Error(`Missing hidden item: ${id}`);
  item.hidden = true;
}

const linkFields = [
  "relatedArticles", "relatedFaults", "relatedSpectra", "relatedScenarios",
  "relatedReferences", "relatedMeasurements", "relatedParameters", "probableFaults", "similarSpectra"
];

for (const item of items) {
  for (const field of linkFields) {
    if (!Array.isArray(item.metadata?.[field])) continue;
    item.metadata[field] = [...new Set(item.metadata[field].map(id => replacements.get(id) || id))];
  }
  for (const section of item.sections || []) {
    if (section.type !== "related" || !Array.isArray(section.items)) continue;
    for (const link of section.items) {
      const targetId = replacements.get(link.id);
      if (!targetId) continue;
      const target = byId.get(targetId);
      link.id = targetId;
      if (target) link.title = target.title;
    }
    section.items = section.items.filter((link, index, links) =>
      links.findIndex(candidate => candidate.method === link.method && candidate.id === link.id) === index
    );
  }
}

fs.writeFileSync(dataPath, `${JSON.stringify(items, null, 2)}\n`);
console.log("Справочник ВД пересобран: 4 публичные карточки, 10 скрытых дублей, диагностическое дерево скрыто.");
