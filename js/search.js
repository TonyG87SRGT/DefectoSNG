import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, navigate } from "./router.js";
import {
  matchesSearchTokens,
  normalizeSearchText,
  tokenizeSearch
} from "./searchCore.js";
import { METHODS, getAllItems, getItem, getItemRoute } from "./store.js";

let cachedDocuments = null;

export function getSearchValue(value) {
  if (Array.isArray(value)) return value.map(getSearchValue).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(getSearchValue).join(" ");
  }
  return value == null ? "" : String(value);
}

export function getSectionSearchText(sections = []) {
  return sections.map(section => {
    if (section?.type === "related") return section.title || "";
    return getSearchValue(section);
  }).join(" ");
}

export function buildSearchIndex() {
  cachedDocuments = getAllItems().map(article => {
    const searchText = [
      article.title || "",
      article.category || "",
      article.text || "",
      article.summary || "",
      article.description || "",
      article.sectionTitle || "",
      ...(article.tags || []),
      ...(article.futureBlocks || []),
      ...(article.futureImageLabels || []),
      getSearchValue(article.metadata),
      getSearchValue(article.mediaSlots),
      article.atlas?.shortFeature || "",
      ...(article.atlas?.aliases || []),
      ...(article.atlas?.tags || []),
      getSearchValue(article.pipelineJoint),
      getSectionSearchText(article.sections),
      METHODS[article.methodKey]?.short || "",
      METHODS[article.methodKey]?.title || ""
    ].join(" ");

    return {
      ...article,
      searchText,
      searchTokens: tokenizeSearch(searchText),
      titleTokens: tokenizeSearch(article.title),
      primaryTokens: tokenizeSearch([
        article.title || "",
        article.category || "",
        article.summary || "",
        ...(article.tags || [])
      ].join(" "))
    };
  });

  return cachedDocuments;
}

export function getSearchDocuments() {
  return cachedDocuments || buildSearchIndex();
}

export function normalizeSearch(value) {
  return normalizeSearchText(value);
}

export function searchArticles(query, documents = getSearchDocuments()) {
  const queryTokens = tokenizeSearch(query);
  if (!queryTokens.length) return [];

  return documents.filter(article => {
    const tokens = article.searchTokens || tokenizeSearch([
      article.searchText || "",
      METHODS[article.methodKey]?.short || "",
      METHODS[article.methodKey]?.title || ""
    ].join(" "));
    return matchesSearchTokens(tokens, queryTokens);
  }).map((article, index) => {
    const titleTokens = article.titleTokens || tokenizeSearch(article.title);
    const primaryTokens = article.primaryTokens || tokenizeSearch(article.searchText);
    const titleMatches = queryTokens.filter(token =>
      matchesSearchTokens(titleTokens, [token])
    ).length;
    const primaryMatches = queryTokens.filter(token =>
      matchesSearchTokens(primaryTokens, [token])
    ).length;

    return {
      article,
      index,
      score: titleMatches * 100 + primaryMatches * 10
    };
  }).sort((a, b) => b.score - a.score || a.index - b.index)
    .map(result => result.article);
}

export function renderSearch(query) {
  if (!normalizeSearch(query)) {
    content.innerHTML = `
      <div class="empty-state">Введите название дефекта, метода, настройки или оборудования в строку поиска.</div>
    `;
    return;
  }

  const results = searchArticles(query);
  content.innerHTML = `
    <div class="search-status" role="status" aria-live="polite">Найдено: ${results.length}</div>
    ${results.length ? `
      <div class="article-list">
        ${results.map(article => {
          const route = getItemRoute(article.methodKey, article);
          return `
            <a
              class="article-card"
              href="${getRouteHash(route)}"
              data-search-article="${escapeAttribute(article.id)}"
              data-search-method="${escapeAttribute(article.methodKey)}"
            >
              <span class="article-category">${safeText(METHODS[article.methodKey]?.short, article.methodKey)} · ${safeText(article.category)}</span>
              ${article.status === "draft" ? `<span class="draft-badge">${article.parentId === "vibration-tools" ? "В разработке" : "Черновик"}</span>` : ""}
              <h3>${safeText(article.title)}</h3>
              <p>${safeText(article.summary || article.text, "Открыть материал")}</p>
            </a>
          `;
        }).join("")}
      </div>
    ` : `<div class="empty-state">Ничего не найдено.<br><br>Попробуйте изменить запрос.</div>`}
  `;

  content.querySelectorAll("[data-search-article]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const method = link.dataset.searchMethod;
      const article = getItem(method, link.dataset.searchArticle);
      if (article) {
        event.preventDefault();
        navigate(getItemRoute(method, article));
      }
    });
  });
}
