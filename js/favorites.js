import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { METHODS, getAllItems, getItem, getItemRoute } from "./store.js";

const FAVORITES_KEY = "defectosng-favorites";
const FAVORITES_VERSION = 2;

function isFavoriteRef(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof value.method === "string" &&
    typeof value.id === "string";
}

export function normalizeFavorites(value, articles = getAllItems()) {
  let items = value;

  if (value && !Array.isArray(value) && value.version === FAVORITES_VERSION) {
    items = value.items;
  }
  if (!Array.isArray(items)) return [];

  const normalized = items.flatMap(item => {
    if (isFavoriteRef(item)) return [{ method: item.method, id: item.id }];

    if (typeof item === "string") {
      const article = articles.find(candidate => candidate.id === item);
      return article ? [{ method: article.methodKey, id: article.id }] : [];
    }

    return [];
  });

  const seen = new Set();
  return normalized.filter(item => {
    const key = `${item.method}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getFavorites(storage = globalThis.localStorage) {
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(FAVORITES_KEY);
    if (!rawValue) return [];
    return normalizeFavorites(JSON.parse(rawValue));
  } catch (error) {
    console.warn("Не удалось прочитать избранное:", error);
    return [];
  }
}

export function saveFavorites(favorites, storage = globalThis.localStorage) {
  if (!storage) return false;

  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify({
      version: FAVORITES_VERSION,
      items: normalizeFavorites(favorites)
    }));
    updateFavoriteBadge();
    return true;
  } catch (error) {
    console.warn("Не удалось сохранить избранное:", error);
    return false;
  }
}

export function isFavorite(method, articleId) {
  return getFavorites().some(item => item.method === method && item.id === articleId);
}

export function toggleFavorite(method, articleId) {
  const favorites = getFavorites();
  const index = favorites.findIndex(item => item.method === method && item.id === articleId);

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push({ method, id: articleId });
  }

  saveFavorites(favorites);
  return index < 0;
}

export function updateFavoriteBadge() {
  const badge = globalThis.document?.getElementById("favorite-badge");
  if (!badge) return;

  const count = getFavorites().filter(item => getItem(item.method, item.id)).length;
  badge.textContent = count;
  badge.classList.toggle("visible", count > 0);
}

export function renderFavorites() {
  const favorites = getFavorites()
    .map(ref => ({ ...ref, article: getItem(ref.method, ref.id) }))
    .filter(item => item.article);

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">Избранное</h2><p>Сохранённые материалы: ${favorites.length}</p></div>
    </div>

    ${favorites.length ? `
      <div class="article-list">
        ${favorites.map(({ method, article }) => {
          const route = getItemRoute(method, article);
          return `
            <a
              class="article-card"
              href="${getRouteHash(route)}"
              data-favorite-article="${escapeAttribute(article.id)}"
              data-favorite-method="${escapeAttribute(method)}"
            >
              <div class="article-card-row">
                <div class="article-card-content">
                  <span class="article-category">${safeText(METHODS[method].short)} · ${safeText(article.category)}</span>
                  ${article.status === "draft" ? `<span class="draft-badge">Черновик</span>` : ""}
                  <h3>${safeText(article.title)}</h3>
                  <p>${safeText(article.summary || article.text, "Открыть материал")}</p>
                </div>
                <span class="saved-star" aria-hidden="true">★</span>
              </div>
            </a>
          `;
        }).join("")}
      </div>
    ` : `
      <div class="empty-state">
        <span class="favorite-empty-icon" aria-hidden="true">☆</span>
        Здесь пока ничего нет.
        <div class="favorite-hint">Открой нужную карточку и нажми звёздочку рядом с её названием.</div>
      </div>
    `}
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-favorite-article]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const method = link.dataset.favoriteMethod;
      const article = getItem(method, link.dataset.favoriteArticle);
      if (article) {
        event.preventDefault();
        navigate(getItemRoute(method, article));
      }
    });
  });
}
