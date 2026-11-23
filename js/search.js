import { METHODS } from "./config.js";
import { getCriterionContext } from "./criterionLinks.js";
import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, navigate } from "./router.js";
import { matchesSearchTokens, normalizeSearchText, tokenizeSearch } from "./searchCore.js";
import { getAtlasItemRoute, getAtlasLeafItems } from "./store.js";

let cachedDocuments = [];

function getValue(value) {
  if (Array.isArray(value)) return value.map(getValue).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(getValue).join(" ");
  return value == null ? "" : String(value);
}

export function buildSearchIndex(criteriaData = null) {
  const visuals = getAtlasLeafItems().map(item => {
    const searchText = getValue([item.title, item.summary, item.tags, item.atlas, item.metadata,
      (item.sections || []).filter(section => section.type !== "related")]);
    return { ...item, resultType: "visual", searchText, searchTokens: tokenizeSearch(searchText), titleTokens: tokenizeSearch(item.title) };
  });
  const criteria = (criteriaData?.criteria || []).map(criterion => {
    const { standard, method } = getCriterionContext(criteriaData, criterion);
    const summary = [standard?.shortTitle, method?.title, criterion.source?.criterionTable].filter(Boolean).join(" · ");
    const searchText = getValue([criterion.defect, criterion.aliases, criterion.notes, summary, standard?.searchAliases]);
    return { ...criterion, title: criterion.defect, summary, resultType: "criterion", searchText,
      searchTokens: tokenizeSearch(searchText), titleTokens: tokenizeSearch(criterion.defect) };
  });
  cachedDocuments = [...visuals, ...criteria];
  return cachedDocuments;
}

export function getSearchDocuments() { return cachedDocuments; }
export function normalizeSearch(value) { return normalizeSearchText(value); }

export function searchArticles(query, documents = cachedDocuments) {
  const queryTokens = tokenizeSearch(query);
  if (!queryTokens.length) return [];
  return documents.filter(document => matchesSearchTokens(
    document.searchTokens || tokenizeSearch(document.searchText || getValue(document)), queryTokens
  )).map((document, index) => ({ document, index, score: queryTokens.filter(token =>
    matchesSearchTokens(document.titleTokens || tokenizeSearch(document.title), [token])).length * 100 }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(result => result.document);
}

function resultCard(document) {
  if (document.resultType === "criterion") return `<a class="focused-search-card" href="#criterion=${escapeAttribute(document.id)}" data-search-criterion="${escapeAttribute(document.id)}"><span>Критерий</span><h3>${safeText(document.title)}</h3><p>${safeText(document.summary)}</p></a>`;
  const route = getAtlasItemRoute(document.methodKey, document.id);
  return `<a class="focused-search-card" href="${getRouteHash(route)}" data-search-method="${escapeAttribute(document.methodKey)}" data-search-item="${escapeAttribute(document.id)}"><span>${safeText(METHODS[document.methodKey]?.short)} · Атлас</span><h3>${safeText(document.title)}</h3><p>${safeText(document.summary, "Открыть визуальную карточку")}</p></a>`;
}

export function renderSearch(query) {
  if (!normalizeSearch(query)) {
    content.innerHTML = `<div class="focused-search-empty"><span aria-hidden="true">⌕</span><h2>Найдите дефект или критерий</h2><p>Введите название: например, «пора», «подрез», «трещина», «непровар» или обозначение НТД.</p></div>`;
    return;
  }
  const results = searchArticles(query);
  const counts = { visual: results.filter(item => item.resultType === "visual").length, criterion: results.filter(item => item.resultType === "criterion").length };
  content.innerHTML = `<div class="search-status" role="status" aria-live="polite">Найдено: ${results.length}</div>
    ${results.length ? `<div class="focused-search-summary"><span><b>${counts.visual}</b> в атласе</span><span><b>${counts.criterion}</b> критериев</span></div><div class="focused-search-results">${results.map(resultCard).join("")}</div>` : `<div class="empty-state">По запросу «${safeText(query)}» ничего не найдено.</div>`}`;
  content.querySelectorAll("[data-search-method]").forEach(link => link.addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(getAtlasItemRoute(link.dataset.searchMethod, link.dataset.searchItem));
  }));
  content.querySelectorAll("[data-search-criterion]").forEach(link => link.addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate({ view: "criteria", criterionId: link.dataset.searchCriterion });
  }));
}
