import { content } from "./dom.js";
import { TOOL_DEFINITIONS } from "./config.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, navigate } from "./router.js";
import {
  matchesSearchTokens,
  normalizeSearchText,
  tokenizeSearch
} from "./searchCore.js";
import { METHODS, getAllItems, getItem, getItemRoute } from "./store.js";

let cachedDocuments = null;

export const SEARCH_RESULT_TYPES = Object.freeze({
  material: "Материалы",
  criterion: "Критерии",
  reference: "Таблицы",
  tool: "Инструменты"
});

export function getSearchResultType(article) {
  if (article?.isCriterion) return "criterion";
  if (article?.isReference) return "reference";
  if (article?.isTool) return "tool";
  if (article?.metadata?.materialType === "tool") return "tool";
  return "material";
}

export function getSearchMethodFacets(results = []) {
  const facets = new Map();
  results.forEach(article => {
    if (!article?.methodKey || article.methodKey === "references" || article.methodKey === "tools") return;
    const label = article.methodLabel || METHODS[article.methodKey]?.short || article.methodKey.toUpperCase();
    if (!facets.has(article.methodKey)) facets.set(article.methodKey, label);
  });
  return [...facets].map(([id, label]) => ({ id, label }));
}

export function filterSearchResults(results, filters = {}) {
  const method = filters.method || "all";
  const type = filters.type || "all";
  return results.filter(article =>
    (method === "all" || article.methodKey === method) &&
    (type === "all" || getSearchResultType(article) === type)
  );
}

export function isSearchableArticle(article) {
  return article?.status === "published" && article?.hidden !== true;
}

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

export function buildSearchIndex(references = [], criteriaData = null) {
  const referencesById = new Map(references.map(reference => [reference.id, reference]));
  const articleDocuments = getAllItems().filter(isSearchableArticle).map(article => {
    const normativeReference = article.normativeView
      ? referencesById.get(article.normativeView.referenceId)
      : null;
    const normativeSectionIds = new Set(article.normativeView?.sectionIds || []);
    const normativeSections = normativeReference
      ? (normativeReference.sections || []).filter(section => normativeSectionIds.has(section.id))
      : [];
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
      getSectionSearchText(article.sections),
      getSectionSearchText(normativeSections),
      METHODS[article.methodKey]?.short || "",
      METHODS[article.methodKey]?.title || ""
    ].join(" ");

    return {
      ...article,
      methodLabel: METHODS[article.methodKey]?.short || article.methodKey?.toUpperCase(),
      searchText,
      searchTokens: tokenizeSearch(searchText),
      titleTokens: tokenizeSearch(article.title),
      primaryTokens: tokenizeSearch([
        article.title || "",
        article.category || "",
        article.summary || "",
        ...(article.tags || []),
        ...(article.metadata?.aliases || []),
        ...(article.metadata?.tags || []),
        ...(article.metadata?.equipment || []),
        ...(article.metadata?.faults || []),
        ...(article.metadata?.diagnosticSigns || []),
        ...(article.metadata?.measuredParameters || [])
      ].join(" "))
    };
  });
  const referenceDocuments = references.map(reference => {
    const searchText = getSearchValue(reference);
    return {
      ...reference,
      status: "published",
      isReference: true,
      methodKey: "references",
      category: reference.category || "Справочник",
      summary: reference.description,
      searchText,
      searchTokens: tokenizeSearch(searchText),
      titleTokens: tokenizeSearch(reference.title),
      primaryTokens: tokenizeSearch([
        reference.title || "",
        reference.description || "",
        reference.category || "",
        ...(reference.keywords || [])
      ].join(" "))
    };
  });
  const criterionDocuments = (criteriaData?.criteria || []).map(criterion => {
    const standard = criteriaData.standards.find(item => item.basisDocuments.includes(criterion.source.basisDocument));
    const method = criteriaData.methods.find(item => item.id === criterion.method);
    const title = criterion.defect;
    const summary = [standard?.shortTitle, method?.title, criterion.source.criterionTable].filter(Boolean).join(" · ");
    const searchText = getSearchValue([title, summary, criterion.aliases, standard?.searchAliases, criterion.notes]);
    return { id: criterion.id, title, summary, status: "published", isCriterion: true, methodKey: criterion.method, methodLabel: method?.title || criterion.method.toUpperCase(), category: "Критерии",
      searchText, searchTokens: tokenizeSearch(searchText), titleTokens: tokenizeSearch(title), primaryTokens: tokenizeSearch(title + " " + summary) };
  });
  const toolDocuments = TOOL_DEFINITIONS.map(tool => {
    const searchText = getSearchValue([tool.title, tool.description, tool.category, tool.keywords]);
    return {
      ...tool,
      status: "published",
      isTool: true,
      methodKey: "tools",
      category: tool.category || "Инструменты",
      summary: tool.description,
      searchText,
      searchTokens: tokenizeSearch(searchText),
      titleTokens: tokenizeSearch(tool.title),
      primaryTokens: tokenizeSearch(searchText)
    };
  });
  cachedDocuments = [...articleDocuments, ...referenceDocuments, ...criterionDocuments, ...toolDocuments];

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

  return documents.filter(isSearchableArticle).filter(article => {
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
  const methodFacets = getSearchMethodFacets(results);
  const typeFacets = Object.keys(SEARCH_RESULT_TYPES).filter(type =>
    results.some(article => getSearchResultType(article) === type)
  );
  const filters = { method: "all", type: "all" };
  content.innerHTML = `
    <div class="search-status" role="status" aria-live="polite" data-search-status>Найдено: ${results.length}</div>
    ${results.length && (methodFacets.length > 1 || typeFacets.length > 1) ? `
      <div class="search-filters" aria-label="Фильтры результатов поиска">
        ${methodFacets.length > 1 ? `
          <div class="search-filter-group" role="group" aria-label="Метод контроля">
            <span>Метод</span>
            <div class="search-filter-options">
              <button type="button" aria-pressed="true" data-search-method-filter="all">Все</button>
              ${methodFacets.map(method => `<button type="button" aria-pressed="false" data-search-method-filter="${escapeAttribute(method.id)}">${safeText(method.label, method.id)}</button>`).join("")}
            </div>
          </div>
        ` : ""}
        ${typeFacets.length > 1 ? `
          <div class="search-filter-group" role="group" aria-label="Тип материала">
            <span>Тип</span>
            <div class="search-filter-options">
              <button type="button" aria-pressed="true" data-search-type-filter="all">Все</button>
              ${typeFacets.map(type => `<button type="button" aria-pressed="false" data-search-type-filter="${escapeAttribute(type)}">${safeText(SEARCH_RESULT_TYPES[type])}</button>`).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    ` : ""}
    <div data-search-results></div>
  `;

  const resultsContainer = content.querySelector("[data-search-results]");
  const status = content.querySelector("[data-search-status]");

  function renderFilteredResults() {
    const filteredResults = filterSearchResults(results, filters);
    const hasActiveFilter = filters.method !== "all" || filters.type !== "all";
    status.textContent = hasActiveFilter
      ? `Найдено: ${filteredResults.length} из ${results.length}`
      : `Найдено: ${results.length}`;
    resultsContainer.innerHTML = filteredResults.length ? `
      <div class="article-list">
        ${filteredResults.map(article => {
          const route = article.isCriterion
            ? { view: "task", task: "criteria", criterionId: article.id }
            : article.isReference
            ? { view: "reference", referenceId: article.id }
            : article.isTool
              ? { view: "tool", tool: article.id }
              : getItemRoute(article.methodKey, article);
          return `
            <a
              class="article-card"
              href="${getRouteHash(route)}"
              data-search-article="${escapeAttribute(article.id)}"
              data-search-method="${escapeAttribute(article.methodKey)}"
              data-search-type="${escapeAttribute(getSearchResultType(article))}"
              data-search-reference="${article.isReference ? "true" : "false"}"
              data-search-tool="${article.isTool ? "true" : "false"}"
            >
              <span class="article-category">${article.isReference ? "СПРАВОЧНИК" : article.isTool ? `ИНСТРУМЕНТ · ${safeText(article.category)}` : `${safeText(article.methodLabel || METHODS[article.methodKey]?.short, article.methodKey)} · ${safeText(article.category)}`}</span>
              ${article.status === "draft" ? `<span class="draft-badge">${article.parentId === "vibration-tools" ? "В разработке" : "Черновик"}</span>` : ""}
              <h3>${safeText(article.title)}</h3>
              <p>${safeText(article.summary || article.text, "Открыть материал")}</p>
            </a>
          `;
        }).join("")}
      </div>
    ` : `<div class="empty-state">По выбранным фильтрам ничего не найдено.</div>`;

    resultsContainer.querySelectorAll("[data-search-article]").forEach(link => {
      link.addEventListener("click", event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.dataset.searchReference === "true") {
          event.preventDefault();
          navigate({ view: "reference", referenceId: link.dataset.searchArticle });
          return;
        }
        if (link.dataset.searchTool === "true") {
          event.preventDefault();
          navigate({ view: "tool", tool: link.dataset.searchArticle });
          return;
        }
        const method = link.dataset.searchMethod;
        const article = getItem(method, link.dataset.searchArticle);
        if (article) {
          event.preventDefault();
          navigate(getItemRoute(method, article));
        }
      });
    });
  }

  function bindFilter(selector, filterKey) {
    content.querySelectorAll(selector).forEach(button => {
      button.addEventListener("click", () => {
        filters[filterKey] = button.dataset[filterKey === "method" ? "searchMethodFilter" : "searchTypeFilter"];
        content.querySelectorAll(selector).forEach(option => {
          option.setAttribute("aria-pressed", String(option === button));
        });
        renderFilteredResults();
      });
    });
  }

  bindFilter("[data-search-method-filter]", "method");
  bindFilter("[data-search-type-filter]", "type");
  renderFilteredResults();
}
