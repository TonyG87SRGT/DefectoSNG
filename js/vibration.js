import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { getChildren, getItem, getItemRoute, sortByOrder } from "./store.js";

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
  content.querySelectorAll("[data-vibration-item]").forEach(link => {
    link.addEventListener("click", event => {
      const item = getItem("vibration", link.dataset.vibrationItem);
      if (item) handleRouteLink(event, getItemRoute("vibration", item));
    });
  });
}

