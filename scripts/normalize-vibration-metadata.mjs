import { readFile, writeFile } from "node:fs/promises";
import { VIBRATION_TAGS } from "../js/vibrationTaxonomy.js";

const path = new URL("../data/vibration.json", import.meta.url);
const items = JSON.parse(await readFile(path, "utf8"));
const byId = new Map(items.map(item => [item.id, item]));
const relationFields = Object.freeze({
  fault: "relatedFaults",
  spectrum: "relatedSpectra",
  scenario: "relatedScenarios",
  reference: "relatedReferences"
});
const universalArrays = Object.freeze([
  "tags", "aliases", "measuredParameters", "relatedFaults", "relatedSpectra",
  "relatedScenarios", "relatedReferences", "normativeDocuments", "relatedMeasurements",
  "relatedParameters", "probableFaults", "similarSpectra", "additionalChecks"
]);
const parameterRules = Object.freeze([
  ["виброперемещ", "Виброперемещение"], ["виброскорост", "Виброскорость"],
  ["виброускорен", "Виброускорение"], ["rms", "RMS"], ["среднеквадратич", "RMS"],
  ["peak-to-peak", "Peak-to-Peak"], ["размах", "Peak-to-Peak"], ["peak", "Peak"],
  ["пиков", "Peak"], ["crest factor", "Crest Factor"], ["пик-фактор", "Crest Factor"],
  ["фаз", "Фаза вибрации"], ["частот вращ", "Частота вращения"],
  ["гармоник", "Гармоники"], ["субгармоник", "Субгармоники"]
]);

function unique(values) {
  return [...new Set(values.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()))];
}

function searchable(item) {
  return [item.title, item.summary, ...(item.tags || []), ...(item.metadata?.keywords || []),
    ...(item.metadata?.equipment || []), ...(item.metadata?.faults || []),
    ...(item.metadata?.diagnosticSigns || [])].filter(Boolean).join(" ").toLocaleLowerCase("ru-RU");
}

for (const item of items.filter(item => item.type !== "section")) {
  const metadata = item.metadata || {};
  universalArrays.forEach(field => { metadata[field] = Array.isArray(metadata[field]) ? metadata[field] : []; });
  const text = searchable(item);
  const matchedTags = VIBRATION_TAGS.filter(tag =>
    item.id.split("-").includes(tag.id) ||
    [tag.label, ...tag.aliases].some(value => text.includes(value.toLocaleLowerCase("ru-RU")))
  );
  metadata.tags = unique([...metadata.tags, ...matchedTags.map(tag => tag.id)]);
  metadata.aliases = unique([...metadata.aliases, ...matchedTags.flatMap(tag => [tag.label, ...tag.aliases])]);
  metadata.measuredParameters = unique([
    ...metadata.measuredParameters,
    ...parameterRules.filter(([needle]) => text.includes(needle)).map(([, label]) => label)
  ]);
  metadata.normativeDocuments = unique([
    ...metadata.normativeDocuments,
    ...(item.sections || []).filter(section => section.type === "documents")
      .flatMap(section => section.items || []).map(value => typeof value === "string" ? value : value?.title)
  ]);
  if (item.template === "fault") metadata.faults = unique([...metadata.faults, item.title]);
  if (item.template === "spectrum") metadata.diagnosticSigns = unique([...metadata.diagnosticSigns, item.title]);
  metadata.probableFaults = unique([...metadata.probableFaults, ...(item.template === "spectrum" ? metadata.relatedFaults : [])]);
  item.metadata = metadata;
  if (item.template === "tool") item.toolConfig = { ...(item.toolConfig || {}), knowledgeApi: "vibration" };
}

for (const item of items.filter(item => item.type !== "section")) {
  for (const id of item.metadata.relatedArticles) {
    const target = byId.get(id);
    const field = relationFields[target?.template];
    if (field) item.metadata[field] = unique([...item.metadata[field], id]);
    if (target?.metadata?.group === "Измеряемые параметры") {
      item.metadata.relatedParameters = unique([...item.metadata.relatedParameters, id]);
    }
    if (target?.metadata?.group === "Проведение измерений") {
      item.metadata.relatedMeasurements = unique([...item.metadata.relatedMeasurements, id]);
    }
  }
  if (item.template === "spectrum") {
    item.metadata.probableFaults = unique([...item.metadata.probableFaults, ...item.metadata.relatedFaults]);
    item.metadata.similarSpectra = unique([...item.metadata.similarSpectra, ...item.metadata.relatedSpectra]);
  }
}

const diagnosticAssistant = byId.get("vibration-tool-fault-search");
if (diagnosticAssistant) {
  diagnosticAssistant.title = "Помощник по поиску вероятной неисправности";
  diagnosticAssistant.summary = "Пошаговая проверка исходных данных, достоверности измерений и диагностических признаков.";
  diagnosticAssistant.status = "published";
  diagnosticAssistant.metadata.status = "published";
  diagnosticAssistant.toolConfig = {
    ...diagnosticAssistant.toolConfig,
    status: "available",
    kind: "interactive-diagnostics",
    knowledgeApi: "vibration",
    engine: "vibrationDiagnosticEngine"
  };
  delete diagnosticAssistant.futureBlocks;
  delete diagnosticAssistant.futureImageLabel;
}

const calculatorDefinitions = {
  "vibration-tool-rotation-frequency": ["Калькулятор оборотной частоты", "Пересчёт оборотов, герц, периода и угловой скорости.", ["обороты", "герцы", "угловая скорость", "1×"]],
  "vibration-tool-harmonics": ["Калькулятор гармоник и субгармоник", "Расчёт гармоник, субгармоник и пользовательских порядков относительно частоты вращения.", ["гармоники", "субгармоники", "порядок", "1×"]],
  "vibration-tool-bearing-frequencies": ["Калькулятор частот подшипника качения", "Теоретические частоты FTF, BPFO, BPFI и BSF по ручному вводу геометрии.", ["BPFO", "BPFI", "BSF", "FTF", "подшипник", "наружная обойма", "внутренняя обойма"]],
  "vibration-tool-unit-conversion": ["Перевод единиц вибрации", "Частота вращения, перемещение, скорость, ускорение и гармонический пересчёт.", ["единицы", "RMS", "Peak", "Peak-to-Peak", "g", "мм/с"]],
  "vibration-tool-parameter-selection": ["Помощник по выбору измеряемого параметра", "Практическая рекомендация по параметру и датчику без постановки диагноза.", ["выбор параметра", "датчик", "виброскорость", "виброускорение", "виброперемещение"]]
};

for (const [id, [title, summary, aliases]] of Object.entries(calculatorDefinitions)) {
  const item = byId.get(id);
  if (!item) continue;
  item.title = title;
  item.summary = summary;
  item.status = "published";
  item.metadata.status = "published";
  item.metadata.aliases = unique([...item.metadata.aliases, ...aliases]);
  item.metadata.keywords = unique([...(item.metadata.keywords || []), ...aliases, "вибродиагностика", "калькулятор"]);
  item.toolConfig = { ...item.toolConfig, status: "available", kind: "calculator", engine: "vibrationCalculations", history: "local-opt-in" };
  delete item.futureBlocks;
  delete item.futureImageLabel;
}

const measurementJournal = byId.get("vibration-tool-trend-log");
if (measurementJournal) {
  measurementJournal.title = "Журнал виброизмерений";
  measurementJournal.summary = "Локальное ведение оборудования, измерительных точек, маршрутов, событий и трендов.";
  measurementJournal.status = "published";
  measurementJournal.metadata.status = "published";
  measurementJournal.metadata.aliases = unique([...measurementJournal.metadata.aliases, "журнал трендов", "журнал измерений", "анализ тренда", "маршрутный обход"]);
  measurementJournal.metadata.keywords = unique([...(measurementJournal.metadata.keywords || []), "IndexedDB", "тренд", "измерительная точка", "событие", "ремонт", "экспорт CSV", "резервная копия"]);
  measurementJournal.toolConfig = { ...measurementJournal.toolConfig, status: "available", kind: "measurement-journal", database: "DefectoSNGVibrationJournal", databaseVersion: 1, offline: true };
  delete measurementJournal.futureBlocks;
  delete measurementJournal.futureImageLabel;
}

await writeFile(path, `${JSON.stringify(items, null, 2)}\n`, "utf8");
