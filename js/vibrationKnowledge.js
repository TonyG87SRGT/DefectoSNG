import { scoreVibrationRelation } from "./vibrationRelations.js";

export const VIBRATION_FACETS = Object.freeze({
  equipment: Object.freeze({ label: "Оборудование", field: "equipment" }),
  fault: Object.freeze({ label: "Неисправность", field: "faults" }),
  sign: Object.freeze({ label: "Диагностический признак", field: "diagnosticSigns" }),
  parameter: Object.freeze({ label: "Измеряемый параметр", field: "measuredParameters" })
});

const MATERIAL_BLOCKS = Object.freeze([
  { id: "articles", title: "Читайте также", types: ["article"], metadataFields: ["relatedArticles"] },
  { id: "faults", title: "Возможные неисправности", types: ["fault"], metadataFields: ["relatedFaults", "probableFaults"] },
  { id: "spectra", title: "Похожие спектры", types: ["spectrum"], metadataFields: ["relatedSpectra", "similarSpectra"] },
  { id: "scenarios", title: "Практические сценарии", types: ["scenario"], metadataFields: ["relatedScenarios"] },
  { id: "references", title: "Справочные материалы", types: ["reference"], metadataFields: ["relatedReferences"] }
]);

function normalize(value) {
  return String(value || "").trim().toLocaleLowerCase("ru-RU");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function uniqueNormalized(items) {
  const values = new Map();
  items.filter(Boolean).forEach(value => {
    const key = normalize(value);
    if (!values.has(key) || String(value)[0] === String(value)[0]?.toLocaleUpperCase("ru-RU")) {
      values.set(key, value);
    }
  });
  return [...values.values()];
}

function explicitIds(article, fields) {
  return unique(fields.flatMap(field => article.metadata?.[field] || []));
}

export function getVibrationFacetOptions(items, facetId) {
  const facet = VIBRATION_FACETS[facetId];
  if (!facet) return [];
  return uniqueNormalized(items.flatMap(item => item.metadata?.[facet.field] || []))
    .sort((a, b) => a.localeCompare(b, "ru"));
}

export function filterVibrationKnowledge(items, filters = {}) {
  return items.filter(item => {
    if (item.type === "section") return false;
    return Object.entries(VIBRATION_FACETS).every(([facetId, facet]) => {
      const selected = normalize(filters[facetId]);
      if (!selected) return true;
      return (item.metadata?.[facet.field] || []).some(value => normalize(value) === selected);
    });
  });
}

export function getVibrationKnowledgeBlocks(article, items, limit = 5) {
  if (!article?.metadata) return [];
  const byId = new Map(items.map(item => [item.id, item]));
  const ranked = items
    .filter(item => item.id !== article.id && item.type !== "section")
    .map(item => ({ item, score: scoreVibrationRelation(article, item) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.item.order || 9999) - Number(b.item.order || 9999));

  const materialBlocks = MATERIAL_BLOCKS.map(definition => {
    const explicit = explicitIds(article, definition.metadataFields).map(id => byId.get(id))
      .filter(item => item && definition.types.includes(item.metadata?.materialType));
    const automatic = ranked.filter(result => definition.types.includes(result.item.metadata?.materialType))
      .map(result => result.item);
    const blockItems = unique([...explicit, ...automatic].map(item => item.id))
      .map(id => byId.get(id)).filter(Boolean).slice(0, limit);
    return { ...definition, items: blockItems };
  }).filter(block => block.items.length);

  const facetBlocks = [
    ["equipment", "Используемое оборудование", "equipment"],
    ["signs", "Диагностические признаки", "sign"],
    ["parameters", "Измеряемые параметры", "parameter"]
  ].map(([id, title, facet]) => ({
    id, title, facet,
    items: unique(article.metadata[VIBRATION_FACETS[facet].field] || []).slice(0, limit)
  })).filter(block => block.items.length);
  materialBlocks.splice(2, 0, ...facetBlocks);
  return materialBlocks;
}

export function createVibrationKnowledgeApi(getItems) {
  return Object.freeze({
    getItems: () => getItems().filter(item => item.type !== "section"),
    getFacetOptions: facetId => getVibrationFacetOptions(getItems(), facetId),
    filter: filters => filterVibrationKnowledge(getItems(), filters),
    related: (article, limit) => getVibrationKnowledgeBlocks(article, getItems(), limit)
  });
}
