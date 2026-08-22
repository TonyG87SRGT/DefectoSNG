import { content } from "./dom.js";
import { getArticleTocEntries } from "./articleNavigation.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { escapeAttribute, safeText } from "./html.js";
import { buildKnowledgeGraph, getKnowledgeBacklinks } from "./knowledgeGraph.js";
import { getReference } from "./references.js";
import { renderStructuredArticle } from "./renderers.js";
import { getVibrationKnowledgeBlocks } from "./vibrationKnowledge.js";
import {
  ATLAS_ENTRIES,
  MODE_DEFINITIONS,
  TASK_HUBS,
  getModeSectionIds
} from "./navigationModel.js";
import { getRecentItems, rememberRecentItem } from "./recent.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import {
  METHODS,
  getArticles,
  getAllItems,
  getChildren,
  getItem,
  getItemRoute,
  getMethodLoadError,
  sortByOrder
} from "./store.js";

function renderDraftBadge(article) {
  return article.status === "draft"
    ? `<span class="draft-badge">${article.parentId === "vibration-tools" ? "В разработке" : "Черновик"}</span>`
    : "";
}

function handleRouteLink(event, route) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  navigate(route);
}

function renderModeSwitcher(activeMode) {
  const routes = {
    work: { view: "home" },
    atlases: { view: "atlases" },
    learning: { view: "learning" }
  };
  return `
    <nav class="mode-switcher" aria-label="Режим справочника">
      ${Object.entries(MODE_DEFINITIONS).map(([mode, definition]) => `
        <a class="${mode === activeMode ? "active" : ""}" href="${getRouteHash(routes[mode])}" data-mode-link="${escapeAttribute(mode)}" ${mode === activeMode ? 'aria-current="page"' : ""}>${safeText(definition.label)}</a>
      `).join("")}
    </nav>
  `;
}

function bindModeLinks() {
  const routes = {
    work: { view: "home" },
    atlases: { view: "atlases" },
    learning: { view: "learning" }
  };
  content.querySelectorAll("[data-mode-link]").forEach(link => {
    link.addEventListener("click", event => handleRouteLink(event, routes[link.dataset.modeLink]));
  });
}

function renderMethodModeCards(mode) {
  return Object.entries(METHODS)
    .filter(([, method]) => !method.hiddenFromMethodGrid)
    .map(([methodKey, method]) => {
      const route = { view: "modeMethod", mode, method: methodKey };
      return `
        <a class="mode-method-card ${escapeAttribute(methodKey)}" href="${getRouteHash(route)}" data-mode-method="${escapeAttribute(methodKey)}">
          <div class="method-icon" aria-hidden="true">${safeText(method.icon)}</div>
          <div>
            <strong>${safeText(method.short)} · ${safeText(method.title)}</strong>
            <small>${safeText(MODE_DEFINITIONS[mode].description)}</small>
          </div>
        </a>
      `;
    }).join("");
}

export function renderHome() {
  const recentItems = getRecentItems().slice(0, 5);
  content.innerHTML = `
    ${renderModeSwitcher("work")}
    <p class="mode-intro">Быстрый доступ к действиям, которые нужны непосредственно при контроле.</p>

    <p class="section-label">Что нужно сделать</p>
    <div class="work-actions">
      <a class="work-action" href="#task=setup" data-work-route="setup"><span aria-hidden="true">⚙</span><strong>Настроить прибор</strong></a>
      <a class="work-action" href="#task=criteria" data-work-route="criteria"><span aria-hidden="true">✓</span><strong>Найти критерий</strong></a>
      <a class="work-action" href="#atlases" data-work-route="atlases"><span aria-hidden="true">▦</span><strong>Открыть атлас</strong></a>
      <a class="work-action" href="#tools" data-work-route="tools"><span aria-hidden="true">⌗</span><strong>Инструменты</strong></a>
    </div>

    <p class="section-label">Рабочие материалы по методу</p>
    <div class="mode-method-grid">
      ${renderMethodModeCards("work")}
    </div>

    ${recentItems.length ? `
      <p class="section-label quick-title">Недавно открытые</p>
      <div class="recent-list">
        ${recentItems.map((item, index) => `
          <a class="recent-card" href="${getRouteHash(item.route)}" data-recent-index="${index}">
            <small>${safeText(item.subtitle, "Материал")}</small>
            <strong>${safeText(item.title)}</strong>
          </a>
        `).join("")}
      </div>
    ` : ""}

    <p class="section-label quick-title">Личное</p>
    <div class="quick-grid">
      <a class="quick-card" href="#favorites" data-quick="favorites"><span aria-hidden="true">☆</span><small>Избранное</small></a>
      <a class="quick-card" href="#references" data-quick="references"><span aria-hidden="true">⌘</span><small>Таблицы</small></a>
      <a class="quick-card" href="#search" data-quick="search"><span aria-hidden="true">⌕</span><small>Поиск</small></a>
    </div>
  `;

  bindModeLinks();
  content.querySelectorAll("[data-mode-method]").forEach(link => {
    link.addEventListener("click", event => {
      handleRouteLink(event, { view: "modeMethod", mode: "work", method: link.dataset.modeMethod });
    });
  });
  const workRoutes = {
    setup: { view: "task", task: "setup" },
    criteria: { view: "task", task: "criteria" },
    atlases: { view: "atlases" },
    tools: { view: "tools" }
  };
  content.querySelectorAll("[data-work-route]").forEach(link => {
    link.addEventListener("click", event => handleRouteLink(event, workRoutes[link.dataset.workRoute]));
  });

  const quickRoutes = {
    favorites: { view: "favorites" },
    references: { view: "references" },
    search: { view: "search", query: "" }
  };
  content.querySelectorAll("[data-quick]").forEach(link => {
    link.addEventListener("click", event => {
      handleRouteLink(event, quickRoutes[link.dataset.quick] || { view: "home" });
    });
  });
  content.querySelectorAll("[data-recent-index]").forEach(link => {
    link.addEventListener("click", event => {
      const item = recentItems[Number(link.dataset.recentIndex)];
      if (item) handleRouteLink(event, item.route);
    });
  });
}

export function renderAtlasesHome() {
  const entries = ATLAS_ENTRIES.map(entry => ({ ...entry, item: getItem(entry.method, entry.itemId) }))
    .filter(entry => entry.item);
  content.innerHTML = `
    ${renderModeSwitcher("atlases")}
    <p class="mode-intro">Начните с наблюдаемого дефекта, индикации, эхо-сигнала или спектра.</p>
    <div class="mode-card-list">
      ${entries.map((entry, index) => `
        <a class="mode-entry-card" href="${getRouteHash(getItemRoute(entry.method, entry.item))}" data-atlas-entry="${index}">
          <small>${safeText(METHODS[entry.method]?.short)}</small>
          <strong>${safeText(entry.label)}</strong>
          <p>${safeText(entry.item.summary || entry.item.description, "Открыть атлас")}</p>
        </a>
      `).join("")}
    </div>
  `;
  bindModeLinks();
  content.querySelectorAll("[data-atlas-entry]").forEach(link => {
    link.addEventListener("click", event => {
      const entry = entries[Number(link.dataset.atlasEntry)];
      if (entry) handleRouteLink(event, getItemRoute(entry.method, entry.item));
    });
  });
}

export function renderLearningHome() {
  content.innerHTML = `
    ${renderModeSwitcher("learning")}
    <p class="mode-intro">Основы методов, подробные объяснения и справочные материалы для обучения.</p>
    <div class="mode-method-grid">${renderMethodModeCards("learning")}</div>
    <p class="section-label quick-title">Общие материалы</p>
    <div class="mode-card-list">
      <a class="mode-entry-card" href="#references" data-learning-references>
        <small>Справочник</small><strong>Таблицы, единицы и терминология</strong>
      </a>
    </div>
  `;
  bindModeLinks();
  content.querySelectorAll("[data-mode-method]").forEach(link => {
    link.addEventListener("click", event => handleRouteLink(event, {
      view: "modeMethod",
      mode: "learning",
      method: link.dataset.modeMethod
    }));
  });
  content.querySelector("[data-learning-references]").addEventListener("click", event => {
    handleRouteLink(event, { view: "references" });
  });
}

export function renderModeMethod(methodKey, mode = "work") {
  const method = METHODS[methodKey];
  if (!method) return renderNotFound("Метод контроля не найден");
  const items = getModeSectionIds(methodKey, mode).map(id => getItem(methodKey, id)).filter(Boolean);
  const fallbackRoute = mode === "learning" ? { view: "learning" } : { view: "home" };
  content.innerHTML = `
    <div class="page-header mode-method-header">
      <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
      <div><h2 tabindex="-1">${safeText(method.short)} · ${safeText(MODE_DEFINITIONS[mode]?.label)}</h2><p>${safeText(method.title)}</p></div>
    </div>
    <div class="mode-card-list">
      ${items.map((item, index) => `
        <a class="mode-entry-card" href="${getRouteHash(getItemRoute(methodKey, item))}" data-mode-entry="${index}">
          <small>${safeText(item.category, method.short)}</small>
          <strong>${safeText(item.sectionTitle || item.title)}</strong>
          <p>${safeText(item.summary || item.description, "Открыть материалы")}</p>
        </a>
      `).join("")}
    </div>
    ${mode === "learning" ? `
      <p class="section-label quick-title">Полная структура метода</p>
      <a class="mode-entry-card" href="${getRouteHash({ view: "method", method: methodKey })}" data-full-method>
        <small>${safeText(method.short)}</small><strong>Все материалы метода</strong>
        <p>Открыть полное содержание, включая рабочие и справочные статьи.</p>
      </a>
    ` : ""}
  `;
  content.querySelector("#back-button").addEventListener("click", () => goBack(fallbackRoute));
  content.querySelectorAll("[data-mode-entry]").forEach(link => {
    link.addEventListener("click", event => {
      const item = items[Number(link.dataset.modeEntry)];
      if (item) handleRouteLink(event, getItemRoute(methodKey, item));
    });
  });
  content.querySelector("[data-full-method]")?.addEventListener("click", event => {
    handleRouteLink(event, { view: "method", method: methodKey });
  });
}

export function renderTaskHub(taskKey) {
  const task = TASK_HUBS[taskKey];
  if (!task) return renderNotFound("Рабочий раздел не найден");
  const entries = task.entries.map(entry => ({ ...entry, item: getItem(entry.method, entry.itemId) })).filter(entry => entry.item);
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться к рабочему экрану">‹</button>
      <div><h2 tabindex="-1">${safeText(task.title)}</h2><p>${safeText(task.description)}</p></div>
    </div>
    <div class="mode-card-list">
      ${entries.map((entry, index) => `
        <a class="mode-entry-card" href="${getRouteHash(getItemRoute(entry.method, entry.item))}" data-task-entry="${index}">
          <small>${safeText(METHODS[entry.method]?.short)}</small>
          <strong>${safeText(entry.item.sectionTitle || entry.item.title)}</strong>
          <p>${safeText(entry.item.summary || entry.item.description, "Открыть материал")}</p>
        </a>
      `).join("")}
    </div>
  `;
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-task-entry]").forEach(link => {
    link.addEventListener("click", event => {
      const entry = entries[Number(link.dataset.taskEntry)];
      if (entry) handleRouteLink(event, getItemRoute(entry.method, entry.item));
    });
  });
}

export function renderMethod(methodKey) {
  const method = METHODS[methodKey];
  if (!method) {
    renderNotFound("Метод контроля не найден");
    return;
  }

  const articles = sortByOrder(getArticles(methodKey).filter(article => !article.parentId));
  const loadError = getMethodLoadError(methodKey);

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">${safeText(method.short)}</h2><p>${safeText(method.title)}</p></div>
    </div>

    ${loadError ? `
      <div class="empty-state" role="alert">Не удалось загрузить материалы этого метода.</div>
    ` : `
      <div class="article-list">
        ${articles.map(article => {
          const route = getItemRoute(methodKey, article);
          return `
            <a class="article-card" href="${getRouteHash(route)}" data-article="${escapeAttribute(article.id)}">
              <span class="article-category">${safeText(article.category)}</span>
              ${renderDraftBadge(article)}
              <h3>${safeText(article.title)}</h3>
              <p>${safeText(article.summary || article.text, "Открыть материал")}</p>
            </a>
          `;
        }).join("")}
      </div>
    `}
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-article]").forEach(link => {
    link.addEventListener("click", event => {
      const article = getItem(methodKey, link.dataset.article);
      if (article) handleRouteLink(event, getItemRoute(methodKey, article));
    });
  });
}

export function renderArticleGroup(methodKey, groupArticle) {
  const method = METHODS[methodKey];
  const childArticles = getChildren(methodKey, groupArticle.id);
  rememberRecentItem({
    route: getItemRoute(methodKey, groupArticle),
    title: groupArticle.sectionTitle || groupArticle.title,
    subtitle: method.short
  });

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться в раздел ${escapeAttribute(method.short)}">‹</button>
      <div><h2>${safeText(method.short)}</h2><p>${safeText(method.title)}</p></div>
    </div>

    <div class="article-group-header">
      <span class="article-category">${safeText(groupArticle.category)}</span>
      ${renderDraftBadge(groupArticle)}
      <h2 tabindex="-1">${safeText(groupArticle.sectionTitle || groupArticle.title)}</h2>
      ${groupArticle.description || groupArticle.summary || groupArticle.text
        ? `<p>${safeText(groupArticle.description || groupArticle.summary || groupArticle.text)}</p>`
        : ""}
      ${groupArticle.additionalText ? `<p>${safeText(groupArticle.additionalText)}</p>` : ""}
    </div>

    ${childArticles.length ? `
      <div class="article-list">
        ${childArticles.map(article => {
          const route = getItemRoute(methodKey, article);
          return `
            <a class="article-card" href="${getRouteHash(route)}" data-group-article="${escapeAttribute(article.id)}">
              ${article.coverImage ? `<img class="article-card-cover" src="${escapeAttribute(article.coverImage)}" alt="${escapeAttribute(article.coverAlt || article.title)}" loading="lazy" decoding="async">` : ""}
              <span class="article-category">${safeText(article.category)}</span>
              ${renderDraftBadge(article)}
              <h3>${safeText(article.title)}</h3>
              <p>${safeText(article.summary || article.text, "Открыть материал")}</p>
            </a>
          `;
        }).join("")}
      </div>
    ` : `
      <div class="empty-state">
        ${safeText(groupArticle.developmentNotice, "Раздел находится в разработке.")}
      </div>
      ${Array.isArray(groupArticle.plannedMaterials) && groupArticle.plannedMaterials.length ? `
        <section class="article-section article-list-section">
          <h3>${safeText(groupArticle.plannedTitle, "Планируемые материалы")}</h3>
          <ul>
            ${groupArticle.plannedMaterials.map(item => `<li>${safeText(item)}</li>`).join("")}
          </ul>
        </section>
      ` : ""}
    `}
  `;

  content.querySelector("#back-button").addEventListener("click", () => {
    goBack(groupArticle.parentId
      ? { view: "section", method: methodKey, itemId: groupArticle.parentId }
      : { view: "method", method: methodKey });
  });
  content.querySelectorAll("[data-group-article]").forEach(link => {
    link.addEventListener("click", event => {
      const article = getItem(methodKey, link.dataset.groupArticle);
      if (article) handleRouteLink(event, getItemRoute(methodKey, article));
    });
  });
}

export function renderArticle(methodKey, article) {
  const method = METHODS[methodKey];
  const favorite = isFavorite(methodKey, article.id);
  rememberRecentItem({
    route: getItemRoute(methodKey, article),
    title: article.title,
    subtitle: method.short
  });
  const normativeReference = article.normativeView
    ? getReference(article.normativeView.referenceId)
    : null;
  const normativeSectionIds = new Set(article.normativeView?.sectionIds || []);
  const projectedSections = normativeReference
    ? (normativeReference.sections || []).filter(section => normativeSectionIds.has(section.id))
    : [];
  const articleWithProjection = projectedSections.length
    ? { ...article, sections: [...(article.sections || []), ...projectedSections] }
    : article;
  const displayedArticle = methodKey === "vibration"
    ? { ...articleWithProjection, sections: (articleWithProjection.sections || []).filter(section => section.type !== "related") }
    : articleWithProjection;
  const articleBody = displayedArticle.sections
    ? renderStructuredArticle(displayedArticle, {
        resolveRelated: getItem,
        getRelatedHref: (relatedMethod, relatedId) => {
          const relatedArticle = getItem(relatedMethod, relatedId);
          return relatedArticle
            ? getRouteHash(getItemRoute(relatedMethod, relatedArticle))
            : "#";
        }
      })
    : `<p>${safeText(article.text)}</p>`;
  const tocEntries = getArticleTocEntries(methodKey, displayedArticle);
  const tocHtml = tocEntries.length ? `
    <details class="article-toc">
      <summary>Содержание статьи · ${tocEntries.length}</summary>
      <nav aria-label="Содержание статьи">
        <ol>${tocEntries.map(entry => `
          <li><button type="button" data-article-anchor="${escapeAttribute(entry.id)}">${safeText(entry.title)}</button></li>
        `).join("")}</ol>
      </nav>
    </details>
  ` : "";
  const normativeSourceHtml = normativeReference ? `
    <section class="article-related article-normative-source">
      <h3>▤ Единый нормативный источник</h3>
      <div class="article-related-list">
        <a class="article-related-link" href="${getRouteHash({ view: "reference", referenceId: normativeReference.id })}">
          ${safeText(normativeReference.title)}
        </a>
      </div>
    </section>
  ` : "";
  const futureImageLabels = Array.isArray(article.mediaSlots) && article.mediaSlots.length
    ? []
    : Array.isArray(article.futureImageLabels)
    ? article.futureImageLabels
    : article.futureImageLabel
      ? [article.futureImageLabel]
      : [];
  const futureImage = futureImageLabels
    .map(label => `<div class="article-future-image" role="img" aria-label="${escapeAttribute(label)}">${safeText(label)}</div>`)
    .join("");
  const visibleMediaSlots = Array.isArray(article.mediaSlots)
    ? article.mediaSlots.filter(slot => slot.src || article.status === "draft")
    : [];
  const mediaSlots = visibleMediaSlots.length
    ? visibleMediaSlots.map(slot => slot.src ? `
        <figure class="article-media-slot article-media-slot-${escapeAttribute(slot.type)} article-media-slot-${escapeAttribute(slot.orientation || "default")} article-media-slot-loaded">
          <img src="${escapeAttribute(slot.src)}" alt="${escapeAttribute(slot.alt || slot.label)}" loading="lazy" decoding="async">
          ${slot.caption ? `<figcaption>${safeText(slot.caption)}</figcaption>` : ""}
        </figure>
      ` : `
        <div class="article-media-slot article-media-slot-${escapeAttribute(slot.type)}" role="img" aria-label="${escapeAttribute(slot.label)}">
          <span>${safeText(slot.label)}</span>
        </div>
      `).join("")
    : "";
  const knowledgeBlocks = methodKey === "vibration"
    ? getVibrationKnowledgeBlocks(article, getArticles("vibration"))
    : [];
  const knowledgeHtml = knowledgeBlocks.length ? `
    <section class="vibration-knowledge-blocks" aria-label="Навигация по базе знаний">
      ${knowledgeBlocks.map(block => `
        <section class="vibration-knowledge-block vibration-knowledge-${escapeAttribute(block.id)}">
          <h3>${safeText(block.title)}</h3>
          <div class="vibration-knowledge-links">
            ${block.facet
              ? block.items.map(value => `
                  <a href="${getRouteHash({ view: "vibrationKnowledge", [block.facet]: value })}" data-vibration-facet="${escapeAttribute(block.facet)}" data-vibration-facet-value="${escapeAttribute(value)}">${safeText(value)}</a>
                `).join("")
              : block.items.map(item => `
                  <a href="${getRouteHash(getItemRoute("vibration", item))}" data-related-article="${escapeAttribute(item.id)}" data-related-method="vibration">${safeText(item.title)}</a>
                `).join("")}
          </div>
        </section>
      `).join("")}
    </section>
  ` : "";
  const graph = buildKnowledgeGraph(getAllItems());
  const backlinks = getKnowledgeBacklinks(graph, methodKey, article.id);
  const backlinksHtml = backlinks.length ? `
    <section class="article-backlinks" aria-labelledby="article-backlinks-title">
      <h3 id="article-backlinks-title">На этот материал ссылаются</h3>
      <div>${backlinks.map(item => `
        <a href="${getRouteHash(getItemRoute(item.methodKey, item))}" data-related-article="${escapeAttribute(item.id)}" data-related-method="${escapeAttribute(item.methodKey)}">
          <span>${safeText(METHODS[item.methodKey]?.short, item.methodKey)}</span>${safeText(item.title)}
        </a>
      `).join("")}</div>
    </section>
  ` : "";
  const futureOutline = article.status === "draft" && Array.isArray(article.futureBlocks) && article.futureBlocks.length
    ? `
      <section class="article-future-outline">
        <h3>Структура будущего материала</h3>
        <ul>${article.futureBlocks.map(item => `<li>${safeText(item)}</li>`).join("")}</ul>
      </section>
    `
    : "";

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
      <div><h2>${safeText(method.short)}</h2><p>${safeText(method.title)}</p></div>
    </div>

    <article class="article-view">
      <span class="article-category">${safeText(article.category)}</span>
      ${renderDraftBadge(article)}
      <div class="article-title-row">
        <h2 tabindex="-1">${safeText(article.title)}</h2>
        <button
          class="favorite-button ${favorite ? "active" : ""}"
          id="favorite-button"
          aria-label="${favorite ? "Удалить статью из избранного" : "Добавить статью в избранное"}"
          aria-pressed="${favorite}"
        >${favorite ? "★" : "☆"}</button>
      </div>
      ${article.summary ? `<p class="article-summary">${safeText(article.summary)}</p>` : ""}
      ${tocHtml}
      ${normativeSourceHtml}
      ${futureImage}
      ${mediaSlots ? `<section class="article-media-slots${article.mediaLayout ? ` article-media-slots-${escapeAttribute(article.mediaLayout)}` : ""}" aria-label="Иллюстрации материала">${mediaSlots}</section>` : ""}
      ${articleBody}
      ${futureOutline}
      ${knowledgeHtml}
      ${backlinksHtml}
    </article>
  `;

  content.querySelector("#back-button").addEventListener("click", () => {
    goBack(article.parentId
      ? { view: "section", method: methodKey, itemId: article.parentId }
      : { view: "method", method: methodKey });
  });

  content.querySelector("#favorite-button").addEventListener("click", event => {
    const nowFavorite = toggleFavorite(methodKey, article.id);
    event.currentTarget.classList.toggle("active", nowFavorite);
    event.currentTarget.textContent = nowFavorite ? "★" : "☆";
    event.currentTarget.setAttribute("aria-pressed", String(nowFavorite));
    event.currentTarget.setAttribute(
      "aria-label",
      nowFavorite ? "Удалить статью из избранного" : "Добавить статью в избранное"
    );
  });

  content.querySelectorAll("[data-article-anchor]").forEach(button => {
    button.addEventListener("click", () => {
      const target = content.querySelector(`#${CSS.escape(button.dataset.articleAnchor)}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    });
  });

  content.querySelectorAll("[data-related-article]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const relatedMethod = link.dataset.relatedMethod;
      const relatedArticle = getItem(relatedMethod, link.dataset.relatedArticle);
      if (relatedArticle) {
        event.preventDefault();
        navigate(getItemRoute(relatedMethod, relatedArticle));
      }
    });
  });
  content.querySelectorAll("[data-vibration-facet]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({
        view: "vibrationKnowledge",
        [link.dataset.vibrationFacet]: link.dataset.vibrationFacetValue
      });
    });
  });
}

export function renderComingSoon(section) {
  const names = { documents: "Документы" };
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">${safeText(names[section], "Раздел")}</h2><p>Раздел DefectoSNG</p></div>
    </div>
    <div class="empty-state">Этот раздел появится в одной из следующих версий.</div>
  `;
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
}

export function renderNotFound(message = "Материал не найден") {
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">${safeText(message)}</h2><p>Проверьте адрес или откройте главную страницу.</p></div>
    </div>
    <div class="empty-state">Запрошенная страница недоступна.</div>
  `;
  content.querySelector("#back-button")
    .addEventListener("click", () => navigate({ view: "home" }, { replace: true }));
}
