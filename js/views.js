import { content } from "./dom.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { escapeAttribute, safeText } from "./html.js";
import { renderStructuredArticle } from "./renderers.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import {
  METHODS,
  getArticles,
  getChildren,
  getItem,
  getItemRoute,
  getMethodLoadError,
  sortByOrder
} from "./store.js";

function renderDraftBadge(article) {
  return article.status === "draft"
    ? `<span class="draft-badge">Черновик</span>`
    : "";
}

function handleRouteLink(event, route) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  navigate(route);
}

export function renderHome() {
  content.innerHTML = `
    <p class="section-label">Методы контроля и диагностики</p>
    <div class="method-grid">
      ${Object.entries(METHODS).filter(([, method]) => !method.hiddenFromMethodGrid).map(([methodKey, method]) => {
        const route = { view: "method", method: methodKey };
        return `
          <a class="method-card ${escapeAttribute(methodKey)}" href="${getRouteHash(route)}" data-method="${escapeAttribute(methodKey)}">
            <div class="method-icon" aria-hidden="true">${safeText(method.icon)}</div>
            <div class="method-info">
              <h2>${safeText(method.short)}</h2>
              <p>${safeText(method.title)}</p>
            </div>
            <div class="arrow" aria-hidden="true">›</div>
          </a>
        `;
      }).join("")}
    </div>

    <p class="section-label quick-title">Атласы и справочники</p>
    <a class="article-card home-feature-card" href="#pipeline" data-home-pipeline>
      <span class="article-category">ГОСТ 16037-80</span>
      <h2>Сварные соединения трубопроводов</h2>
      <p>Типы соединений, подготовка кромок и контролируемые размеры</p>
      <span class="home-feature-arrow" aria-hidden="true">›</span>
    </a>

    <p class="section-label quick-title">Быстрый доступ</p>
    <div class="quick-grid">
      <a class="quick-card" href="#favorites" data-quick="favorites">
        <span aria-hidden="true">☆</span><small>Избранное</small>
      </a>
      <a class="quick-card" href="#tools" data-quick="tools">
        <span aria-hidden="true">🧰</span><small>Инструменты</small>
      </a>
      <a class="quick-card" href="#references" data-quick="references">
        <span aria-hidden="true">📚</span><small>Справочные материалы</small>
      </a>
      <a class="quick-card" href="#documents" data-quick="documents">
        <span aria-hidden="true">▤</span><small>Документы</small>
      </a>
    </div>
  `;

  content.querySelectorAll("[data-method]").forEach(link => {
    link.addEventListener("click", event => {
      handleRouteLink(event, { view: "method", method: link.dataset.method });
    });
  });

  content.querySelector("[data-home-pipeline]").addEventListener("click", event => {
    handleRouteLink(event, { view: "pipeline" });
  });

  const quickRoutes = {
    favorites: { view: "favorites" },
    references: { view: "references" },
    tools: { view: "tools" },
    documents: { view: "documents" }
  };
  content.querySelectorAll("[data-quick]").forEach(link => {
    link.addEventListener("click", event => {
      handleRouteLink(event, quickRoutes[link.dataset.quick] || { view: "home" });
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
    goBack({ view: "method", method: methodKey });
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
  const articleBody = article.sections
    ? renderStructuredArticle(article, {
        resolveRelated: getItem,
        getRelatedHref: (relatedMethod, relatedId) => {
          const relatedArticle = getItem(relatedMethod, relatedId);
          return relatedArticle
            ? getRouteHash(getItemRoute(relatedMethod, relatedArticle))
            : "#";
        }
      })
    : `<p>${safeText(article.text)}</p>`;

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
      ${articleBody}
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
