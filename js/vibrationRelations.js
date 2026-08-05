const GENERIC_KEYWORDS = new Set([
  "вд", "вибрация", "вибродиагностика", "диагностика", "контроль",
  "машина", "оборудование", "материал", "статья", "техническая диагностика"
]);

function normalizedValues(values = []) {
  return new Set(values.map(value => String(value).trim().toLocaleLowerCase("ru-RU")).filter(Boolean));
}

function intersectionSize(left, right) {
  let count = 0;
  left.forEach(value => { if (right.has(value)) count += 1; });
  return count;
}

function metadataSets(article) {
  const metadata = article.metadata || {};
  return {
    equipment: normalizedValues(metadata.equipment),
    faults: normalizedValues(metadata.faults),
    signs: normalizedValues(metadata.diagnosticSigns),
    parameters: normalizedValues(metadata.measuredParameters),
    keywords: new Set([
      ...normalizedValues(metadata.keywords),
      ...normalizedValues(metadata.tags),
      ...normalizedValues(metadata.aliases)
    ].filter(value => !GENERIC_KEYWORDS.has(value)))
  };
}

export function scoreVibrationRelation(source, candidate) {
  if (!source?.metadata || !candidate?.metadata || source.id === candidate.id) return 0;
  const left = metadataSets(source);
  const right = metadataSets(candidate);
  return intersectionSize(left.equipment, right.equipment) * 12
    + intersectionSize(left.faults, right.faults) * 14
    + intersectionSize(left.signs, right.signs) * 10
    + intersectionSize(left.parameters, right.parameters) * 10
    + intersectionSize(left.keywords, right.keywords) * 2;
}

export function getAutomaticVibrationRelated(source, items, { limit = 6, excludedIds = [] } = {}) {
  const excluded = new Set([source.id, ...excludedIds]);
  const ranked = items
    .filter(item => item.type !== "section" && !excluded.has(item.id))
    .map(item => ({ item, score: scoreVibrationRelation(source, item) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.item.order || 9999) - Number(b.item.order || 9999));

  const selected = [];
  const usedTypes = new Set();
  for (const result of ranked) {
    const type = result.item.metadata?.materialType || "article";
    if (!usedTypes.has(type)) {
      selected.push(result.item);
      usedTypes.add(type);
    }
    if (selected.length === limit) return selected;
  }
  for (const result of ranked) {
    if (!selected.includes(result.item)) selected.push(result.item);
    if (selected.length === limit) break;
  }
  return selected;
}

export function withAutomaticVibrationRelated(article, items, limit = 8) {
  if (!article?.metadata || article.type === "section") return article;
  const sections = [...(article.sections || [])];
  const relatedIndex = sections.findIndex(section => section.type === "related");
  const manualItems = relatedIndex >= 0 ? [...(sections[relatedIndex].items || [])] : [];
  const automatic = getAutomaticVibrationRelated(article, items, {
    limit: Math.max(0, limit - manualItems.length),
    excludedIds: manualItems.map(item => item.id)
  }).map(item => ({ method: "vibration", id: item.id }));
  if (!automatic.length) return article;

  if (relatedIndex >= 0) {
    sections[relatedIndex] = { ...sections[relatedIndex], items: [...manualItems, ...automatic].slice(0, limit) };
  } else {
    sections.push({ type: "related", title: "Связанные материалы", items: automatic });
  }
  return { ...article, sections };
}
