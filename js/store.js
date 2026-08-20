export {
  ATLAS_CATEGORIES,
  ATLAS_CATEGORY_IDS,
  DATA_FILES,
  METHODS,
  TOOL_DEFINITIONS
} from "./config.js";

import { DATA_FILES } from "./config.js";

const articlesByMethod = Object.fromEntries(
  Object.keys(DATA_FILES).map(method => [method, []])
);
const itemIndexes = new Map();
const childrenIndexes = new Map();
const loadErrors = new Map();

export function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
    return orderA - orderB;
  });
}

export function isPublicItem(item) {
  if (item?.hidden === true || item?.status === "draft") return false;
  if (item?.pipelineJoint) {
    const images = item.pipelineJoint.images || {};
    return Boolean(
      images.edgePreparation &&
      images.weldSection &&
      Array.isArray(item.pipelineJoint.parameters) &&
      item.pipelineJoint.parameters.length
    );
  }
  return true;
}

function rebuildIndexes(methodKey, articles) {
  const itemIndex = new Map();
  const childrenIndex = new Map();

  for (const article of articles) {
    itemIndex.set(article.id, article);

    if (article.parentId) {
      const children = childrenIndex.get(article.parentId) || [];
      children.push(article);
      childrenIndex.set(article.parentId, children);
    }
  }

  for (const [parentId, children] of childrenIndex) {
    childrenIndex.set(parentId, sortByOrder(children));
  }

  itemIndexes.set(methodKey, itemIndex);
  childrenIndexes.set(methodKey, childrenIndex);
}

export function getArticles(methodKey) {
  return (articlesByMethod[methodKey] || []).filter(isPublicItem);
}

export function getItem(methodKey, itemId) {
  return itemIndexes.get(methodKey)?.get(itemId) || null;
}

export function getChildren(methodKey, parentId) {
  return (childrenIndexes.get(methodKey)?.get(parentId) || []).filter(isPublicItem);
}

export function getAllItems() {
  return Object.entries(articlesByMethod).flatMap(([methodKey, articles]) =>
    articles.filter(isPublicItem).map(article => ({ ...article, methodKey }))
  );
}

export function getMethodLoadError(methodKey) {
  return loadErrors.get(methodKey) || null;
}

export function getItemRoute(methodKey, article) {
  if (methodKey === "pipeline") {
    if (article.id === "pipeline-welded-joints") return { view: "pipeline" };
    if (article.pipelineCategory) {
      return { view: "pipeline", category: article.pipelineCategory };
    }
    if (article.pipelineJoint) {
      return { view: "pipelineJoint", itemId: article.id };
    }
    if (article.parentId === "pipeline-reference-materials") {
      return { view: "pipelineReference", itemId: article.id };
    }
    if (article.id === "pipeline-reference-materials") return { view: "pipeline" };
  }

  if (methodKey === "vik" && article.id === "vik-defects") {
    return { view: "atlas" };
  }

  if (article.type === "section" || getChildren(methodKey, article.id).length) {
    return {
      view: "section",
      method: methodKey,
      itemId: article.id
    };
  }

  return {
    view: "article",
    method: methodKey,
    itemId: article.id
  };
}

async function fetchJson(relativePath, baseUrl) {
  const response = await fetch(new URL(relativePath, baseUrl));
  if (!response.ok) throw new Error(`${relativePath}: HTTP ${response.status}`);

  const value = await response.json();
  if (!Array.isArray(value)) throw new Error(`${relativePath}: ожидался массив`);
  return value;
}

export async function loadData(baseUrl = document.baseURI) {
  const entries = Object.entries(DATA_FILES);
  const results = await Promise.allSettled(
    entries.map(([, relativePath]) => fetchJson(relativePath, baseUrl))
  );

  loadErrors.clear();
  let loadedCount = 0;

  results.forEach((result, index) => {
    const [methodKey] = entries[index];

    if (result.status === "fulfilled") {
      articlesByMethod[methodKey] = Object.freeze(result.value.map(Object.freeze));
      rebuildIndexes(methodKey, articlesByMethod[methodKey]);
      loadedCount += 1;
    } else {
      articlesByMethod[methodKey] = [];
      rebuildIndexes(methodKey, []);
      loadErrors.set(methodKey, result.reason);
      console.error(`Не удалось загрузить данные ${methodKey}:`, result.reason);
    }
  });

  if (!loadedCount) {
    throw new AggregateError(
      [...loadErrors.values()],
      "Не удалось загрузить ни одного раздела справочника"
    );
  }

  return {
    loaded: loadedCount,
    failed: loadErrors.size
  };
}
