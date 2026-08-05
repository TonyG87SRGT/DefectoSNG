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

await writeFile(path, `${JSON.stringify(items, null, 2)}\n`, "utf8");
