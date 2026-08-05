import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { getArticles, getChildren, getItem, getItemRoute, sortByOrder } from "./store.js";
import {
  VIBRATION_FACETS,
  createVibrationKnowledgeApi,
  filterVibrationKnowledge,
  getVibrationFacetOptions
} from "./vibrationKnowledge.js";

export const vibrationKnowledgeApi = createVibrationKnowledgeApi(() => getArticles("vibration"));

const OVERVIEW_GROUPS = Object.freeze([
  Object.freeze({
    title: "Проведение контроля",
    ids: [
      "vibration-preparation", "vibration-equipment", "vibration-measurements",
      "vibration-parameters-group", "vibration-signal-analysis", "vibration-diagnostic-algorithm"
    ]
  }),
  Object.freeze({
    title: "Каталоги и практические материалы",
    ids: [
      "vibration-fault-atlas", "vibration-spectrum-atlas",
      "vibration-equipment-diagnostics", "vibration-practical-situations"
    ]
  }),
  Object.freeze({
    title: "Справочники и инструменты",
    ids: ["vibration-reference", "vibration-tools"]
  })
]);

function handleRouteLink(event, route) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(route);
}

function renderArticleCard(article) {
  const route = getItemRoute("vibration", article);
  return `
    <a class="article-card vibration-article-card" href="${getRouteHash(route)}" data-vibration-item="${escapeAttribute(article.id)}">
      <span class="article-category">${safeText(article.category)}</span>
      ${article.status === "draft" ? `<span class="draft-badge">В подготовке</span>` : ""}
      <h3>${safeText(article.title)}</h3>
      <p>${safeText(article.summary || article.text, "Открыть материал")}</p>
    </a>
  `;
}

function renderGroupCard(group) {
  const route = getItemRoute("vibration", group);
  const count = getChildren("vibration", group.id).length;
  return `
    <a class="article-card vibration-group-card" href="${getRouteHash(route)}" data-vibration-item="${escapeAttribute(group.id)}">
      <span class="article-category">${safeText(group.category)}</span>
      <h3>${safeText(group.sectionTitle || group.title)}</h3>
      <p>${safeText(group.description || group.summary)}</p>
      <span class="vibration-group-meta">${count} ${count === 1 ? "материал" : count < 5 ? "материала" : "материалов"}</span>
    </a>
  `;
}

export function renderVibrationOverview() {
  const basics = getItem("vibration", "vibration-basics");
  const basicArticles = basics ? sortByOrder(getChildren("vibration", basics.id)) : [];

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">ВД</h2><p>Вибродиагностика</p></div>
    </div>

    <section class="vibration-overview-intro" aria-labelledby="vibration-overview-title">
      <span class="article-category">Обзор раздела</span>
      <h2 id="vibration-overview-title">Вибродиагностика машин и оборудования</h2>
      <p>Основы измерений, анализ сигналов, алгоритм диагностирования, атласы признаков и практические ситуации.</p>
      <a class="vibration-knowledge-entry" href="#vibration-knowledge" data-vibration-knowledge>Открыть навигатор базы знаний</a>
    </section>

    <section class="vibration-overview-section" aria-labelledby="vibration-basics-title">
      <div class="vibration-overview-heading">
        <span class="article-category">Основы</span>
        <h2 id="vibration-basics-title">Основы вибродиагностики</h2>
        ${basics?.description ? `<p>${safeText(basics.description)}</p>` : ""}
      </div>
      <div class="article-list vibration-basics-list">
        ${basicArticles.map(renderArticleCard).join("")}
      </div>
    </section>

    ${OVERVIEW_GROUPS.map(overviewGroup => {
      const groups = overviewGroup.ids.map(id => getItem("vibration", id)).filter(Boolean);
      return `
        <section class="vibration-overview-section" aria-labelledby="${escapeAttribute(overviewGroup.ids[0])}-title">
          <div class="vibration-overview-heading">
            <span class="article-category">Разделы</span>
            <h2 id="${escapeAttribute(overviewGroup.ids[0])}-title">${safeText(overviewGroup.title)}</h2>
          </div>
          <div class="article-list vibration-group-list">
            ${groups.map(renderGroupCard).join("")}
          </div>
        </section>
      `;
    }).join("")}
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelector("[data-vibration-knowledge]").addEventListener("click", event => {
    handleRouteLink(event, { view: "vibrationKnowledge" });
  });
  content.querySelectorAll("[data-vibration-item]").forEach(link => {
    link.addEventListener("click", event => {
      const item = getItem("vibration", link.dataset.vibrationItem);
      if (item) handleRouteLink(event, getItemRoute("vibration", item));
    });
  });
}

export function renderVibrationKnowledge(route = {}) {
  const allItems = getArticles("vibration");
  const filters = Object.fromEntries(Object.keys(VIBRATION_FACETS).map(key => [key, route[key] || ""]));
  const results = sortByOrder(filterVibrationKnowledge(allItems, filters));

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться в раздел ВД">‹</button>
      <div><h2 tabindex="-1">База знаний ВД</h2><p>Навигация по оборудованию и диагностическим признакам</p></div>
    </div>

    <section class="vibration-knowledge-filter" aria-labelledby="vibration-knowledge-title">
      <span class="article-category">Интеллектуальная навигация</span>
      <h2 id="vibration-knowledge-title">Подбор материалов</h2>
      <p>Фильтры применяются совместно. Пустое поле не ограничивает результаты.</p>
      <div class="vibration-facet-grid">
        ${Object.entries(VIBRATION_FACETS).map(([facetId, facet]) => `
          <label for="vibration-facet-${escapeAttribute(facetId)}">
            <span>${safeText(facet.label)}</span>
            <select id="vibration-facet-${escapeAttribute(facetId)}" data-vibration-filter="${escapeAttribute(facetId)}">
              <option value="">Все</option>
              ${getVibrationFacetOptions(allItems, facetId).map(value => `
                <option value="${escapeAttribute(value)}" ${filters[facetId] === value ? "selected" : ""}>${safeText(value)}</option>
              `).join("")}
            </select>
          </label>
        `).join("")}
      </div>
      <div class="vibration-filter-summary" role="status">Найдено материалов: ${results.length}</div>
      <button class="vibration-filter-reset" type="button" data-vibration-filter-reset>Сбросить фильтры</button>
    </section>

    ${results.length ? `
      <div class="article-list vibration-knowledge-results">
        ${results.map(renderArticleCard).join("")}
      </div>
    ` : `<div class="empty-state">Для выбранного сочетания материалы пока не найдены.</div>`}
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "method", method: "vibration" }));
  content.querySelectorAll("[data-vibration-filter]").forEach(select => {
    select.addEventListener("change", () => {
      const next = { view: "vibrationKnowledge" };
      content.querySelectorAll("[data-vibration-filter]").forEach(input => {
        if (input.value) next[input.dataset.vibrationFilter] = input.value;
      });
      navigate(next, { replace: true });
    });
  });
  content.querySelector("[data-vibration-filter-reset]").addEventListener("click", () => {
    navigate({ view: "vibrationKnowledge" }, { replace: true });
  });
  content.querySelectorAll("[data-vibration-item]").forEach(link => {
    link.addEventListener("click", event => {
      const item = getItem("vibration", link.dataset.vibrationItem);
      if (item) handleRouteLink(event, getItemRoute("vibration", item));
    });
  });
}
