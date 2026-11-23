import { METHODS } from "./config.js";
import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { getAtlasItemRoute, getAtlasLeafItems, getItem, isAtlasItem } from "./store.js";

const FAVORITES_KEY = "defectosng-favorites";
const FAVORITES_VERSION = 3;

export function normalizeFavorites(value, articles = getAtlasLeafItems()) {
  let items = value?.items || value;
  if (!Array.isArray(items)) return [];
  const normalized = items.flatMap(item => {
    if (item && typeof item.method === "string" && typeof item.id === "string") return [{ method: item.method, id: item.id }];
    if (typeof item === "string") {
      const article = articles.find(candidate => candidate.id === item);
      return article ? [{ method: article.methodKey, id: article.id }] : [];
    }
    return [];
  });
  const available = new Set(articles.map(item => `${item.methodKey || item.method}:${item.id}`));
  const seen = new Set();
  return normalized.filter(item => {
    const key = `${item.method}:${item.id}`;
    if (seen.has(key) || !available.has(key)) return false;
    seen.add(key); return true;
  });
}

export function getFavorites(storage = globalThis.localStorage) {
  if (!storage) return [];
  try { return normalizeFavorites(JSON.parse(storage.getItem(FAVORITES_KEY) || "[]")); }
  catch (error) { console.warn("Не удалось прочитать избранное:", error); return []; }
}

export function saveFavorites(favorites, storage = globalThis.localStorage, articles = getAtlasLeafItems()) {
  if (!storage) return false;
  try { storage.setItem(FAVORITES_KEY, JSON.stringify({ version: FAVORITES_VERSION, items: normalizeFavorites(favorites, articles) })); updateFavoriteBadge(); return true; }
  catch (error) { console.warn("Не удалось сохранить избранное:", error); return false; }
}

export function isFavorite(method, articleId) { return getFavorites().some(item => item.method === method && item.id === articleId); }
export function toggleFavorite(method, articleId) {
  const favorites = getFavorites();
  const index = favorites.findIndex(item => item.method === method && item.id === articleId);
  if (index >= 0) favorites.splice(index, 1); else favorites.push({ method, id: articleId });
  saveFavorites(favorites); return index < 0;
}

export function updateFavoriteBadge() {
  const badge = globalThis.document?.getElementById("favorite-badge");
  if (!badge) return;
  const count = getFavorites().length;
  badge.textContent = count; badge.classList.toggle("visible", count > 0);
}

export function renderFavorites() {
  const favorites = getFavorites().map(ref => ({ ...ref, item: getItem(ref.method, ref.id) })).filter(entry => entry.item);
  content.innerHTML = `<div class="page-header focused-page-header"><button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button><div><span class="page-kicker">Личная подборка</span><h2 tabindex="-1">Избранное</h2><p>Сохранено визуальных карточек: ${favorites.length}</p></div></div>
    ${favorites.length ? `<div class="focused-search-results">${favorites.map(({ method, item }) => `<a class="focused-search-card" href="${getRouteHash(getAtlasItemRoute(method, item.id))}" data-favorite-method="${escapeAttribute(method)}" data-favorite-item="${escapeAttribute(item.id)}"><span>${safeText(METHODS[method]?.short)} · Атлас</span><h3>${safeText(item.title)}</h3><p>${safeText(item.summary)}</p><b class="saved-star" aria-hidden="true">★</b></a>`).join("")}</div>` : `<div class="focused-search-empty"><span aria-hidden="true">☆</span><h2>Здесь пока пусто</h2><p>Откройте визуальную карточку и нажмите звёздочку рядом с её названием.</p></div>`}`;
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-favorite-method]").forEach(link => link.addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(getAtlasItemRoute(link.dataset.favoriteMethod, link.dataset.favoriteItem));
  }));
}
