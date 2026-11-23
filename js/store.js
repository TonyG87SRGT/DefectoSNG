import { ATLAS_COLLECTIONS, DATA_FILES } from "./config.js";

const articlesByMethod = Object.fromEntries(Object.keys(DATA_FILES).map(method => [method, []]));
const itemIndexes = new Map();
const childrenIndexes = new Map();
const loadErrors = new Map();

export function sortByOrder(items) {
  return [...items].sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
}

export function isPublicItem(item) {
  return item?.hidden !== true && item?.status !== "draft";
}

function rebuildIndexes(methodKey, articles) {
  const itemIndex = new Map();
  const childrenIndex = new Map();
  articles.forEach(article => {
    itemIndex.set(article.id, article);
    if (article.parentId) {
      const children = childrenIndex.get(article.parentId) || [];
      children.push(article);
      childrenIndex.set(article.parentId, children);
    }
  });
  for (const [parentId, children] of childrenIndex) childrenIndex.set(parentId, sortByOrder(children));
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

function collectDescendants(methodKey, rootId) {
  const result = [];
  const queue = [rootId];
  const seen = new Set();
  while (queue.length) {
    const itemId = queue.shift();
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    const item = getItem(methodKey, itemId);
    if (!item || !isPublicItem(item)) continue;
    result.push({ ...item, methodKey });
    getChildren(methodKey, itemId).forEach(child => queue.push(child.id));
  }
  return result;
}

export function getAtlasItems() {
  const seen = new Set();
  return ATLAS_COLLECTIONS.flatMap(collection => collectDescendants(collection.method, collection.rootId))
    .filter(item => {
      const key = `${item.methodKey}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function getAtlasLeafItems() {
  return getAtlasItems().filter(item => !getChildren(item.methodKey, item.id).length);
}

export function isAtlasItem(methodKey, itemId) {
  return getAtlasItems().some(item => item.methodKey === methodKey && item.id === itemId);
}

export function getAtlasItemRoute(methodKey, itemId) {
  return { view: "atlasItem", method: methodKey, itemId };
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
  const results = await Promise.allSettled(entries.map(([, path]) => fetchJson(path, baseUrl)));
  loadErrors.clear();
  let loaded = 0;
  results.forEach((result, index) => {
    const methodKey = entries[index][0];
    if (result.status === "fulfilled") {
      articlesByMethod[methodKey] = Object.freeze(result.value.map(Object.freeze));
      loaded += 1;
    } else {
      articlesByMethod[methodKey] = [];
      loadErrors.set(methodKey, result.reason);
      console.error(`Не удалось загрузить данные ${methodKey}:`, result.reason);
    }
    rebuildIndexes(methodKey, articlesByMethod[methodKey]);
  });
  if (!loaded) throw new AggregateError([...loadErrors.values()], "Не удалось загрузить атласы");
  return { loaded, failed: loadErrors.size };
}
