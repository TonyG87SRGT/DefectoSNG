const RELATION_FIELDS = Object.freeze([
  "relatedArticles", "relatedFaults", "relatedSpectra", "relatedScenarios",
  "relatedReferences", "relatedMeasurements", "relatedParameters",
  "probableFaults", "similarSpectra"
]);

export function getKnowledgeNodeKey(methodKey, id) {
  return `${methodKey}:${id}`;
}

export function inferKnowledgeStage(article) {
  const value = `${article?.id || ""} ${article?.parentId || ""} ${article?.category || ""}`.toLocaleLowerCase("ru-RU");
  if (/equipment|tool|instrument|прибор|оборуд|материал/.test(value)) return "equipment";
  if (/prepar|setup|control|measurement|scan|проведен|подготов|настрой|измер/.test(value)) return "procedure";
  if (/indication|echo|spectrum|atlas|индикац|сигнал|спектр|атлас/.test(value)) return "indication";
  if (/fault|defect|неисправ|дефект/.test(value)) return "defect";
  if (/evaluation|result|recommend|оцен|результ|заключ/.test(value)) return "evaluation";
  return "knowledge";
}

function resolveTarget(indexById, source, method, id) {
  const matches = indexById.get(id) || [];
  const direct = `${method || source.methodKey}:${id}`;
  if (matches.includes(direct)) return direct;
  return matches.length === 1 ? matches[0] : null;
}

export function buildKnowledgeGraph(items = []) {
  const nodes = new Map();
  const indexById = new Map();
  for (const item of items) {
    const key = getKnowledgeNodeKey(item.methodKey, item.id);
    nodes.set(key, { ...item, key, stage: inferKnowledgeStage(item) });
    const matches = indexById.get(item.id) || [];
    matches.push(key);
    indexById.set(item.id, matches);
  }

  const edges = [];
  const seen = new Set();
  const addEdge = (from, to, type, field = "") => {
    if (!from || !to || from === to || !nodes.has(from) || !nodes.has(to)) return;
    const key = `${from}>${to}:${type}:${field}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, type, field });
  };

  for (const source of items) {
    const from = getKnowledgeNodeKey(source.methodKey, source.id);
    if (source.parentId) {
      addEdge(getKnowledgeNodeKey(source.methodKey, source.parentId), from, "contains", "parentId");
    }
    for (const section of source.sections || []) {
      if (section?.type !== "related") continue;
      for (const target of section.items || []) {
        addEdge(from, resolveTarget(indexById, source, target.method, target.id), "related", "sections");
      }
    }
    for (const field of RELATION_FIELDS) {
      for (const targetId of source.metadata?.[field] || []) {
        addEdge(from, resolveTarget(indexById, source, source.methodKey, targetId), "related", field);
      }
    }
  }

  return Object.freeze({ nodes, edges: Object.freeze(edges) });
}

export function getKnowledgeBacklinks(graph, methodKey, id, limit = 8) {
  const target = getKnowledgeNodeKey(methodKey, id);
  const directParents = new Set(graph.edges
    .filter(edge => edge.to === target && edge.type === "contains")
    .map(edge => edge.from));
  const keys = [];
  for (const edge of graph.edges) {
    if (edge.to !== target || edge.type !== "related" || directParents.has(edge.from)) continue;
    if (!keys.includes(edge.from)) keys.push(edge.from);
  }
  return keys.slice(0, limit).map(key => graph.nodes.get(key)).filter(Boolean);
}
