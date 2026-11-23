import { ATLAS_COLLECTIONS, METHODS } from "./config.js";
import { findRelatedCriteria, getCriterionContext, getCriterionSearchTerm } from "./criterionLinks.js";
import { content } from "./dom.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { escapeAttribute, safeText } from "./html.js";
import { renderStructuredArticle } from "./renderers.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { getAtlasItemRoute, getAtlasLeafItems, getChildren, getItem } from "./store.js";

function handleRouteLink(event, route) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(route);
}

function mediaForItem(item) {
  const entries = [];
  if (item?.atlas?.photo) entries.push({ src: item.atlas.photo, label: "Фотография", alt: `Фотография: ${item.title}` });
  if (item?.atlas?.scheme) entries.push({ src: item.atlas.scheme, label: "Схема", alt: `Схема: ${item.title}` });
  (item?.mediaSlots || []).forEach(slot => {
    if (slot.src) entries.push({ src: slot.src, label: slot.label, alt: slot.alt, caption: slot.caption });
  });
  (item?.sections || []).filter(section => section.type === "image" && section.src).forEach(section => {
    entries.push({ src: section.src, label: section.title || "Изображение", alt: section.alt, caption: section.caption });
  });
  const seen = new Set();
  return entries.filter(entry => entry.src && !seen.has(entry.src) && seen.add(entry.src));
}

function firstPreview(methodKey, item) {
  const own = mediaForItem(item)[0]?.src;
  if (own) return own;
  for (const child of getChildren(methodKey, item.id)) {
    const preview = firstPreview(methodKey, child);
    if (preview) return preview;
  }
  return "";
}

function countLeafItems(methodKey, itemId) {
  const children = getChildren(methodKey, itemId);
  return children.length ? children.reduce((sum, child) => sum + countLeafItems(methodKey, child.id), 0) : 1;
}

function bindAtlasLinks() {
  content.querySelectorAll("[data-atlas-method][data-atlas-item]").forEach(link => {
    link.addEventListener("click", event => handleRouteLink(event,
      getAtlasItemRoute(link.dataset.atlasMethod, link.dataset.atlasItem)));
  });
}

function renderMediaGallery(item) {
  const media = mediaForItem(item);
  if (!media.length) return "";
  return `<section class="visual-gallery" aria-label="Изображения материала">
    ${media.map((entry, index) => `<figure class="visual-gallery-item${index === 0 ? " visual-gallery-primary" : ""}">
      <img src="${escapeAttribute(entry.src)}" alt="${escapeAttribute(entry.alt || entry.label || item.title)}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" class="zoomable-image" data-full-image="${escapeAttribute(entry.src)}" tabindex="0" role="button">
      ${(entry.label || entry.caption) ? `<figcaption>${entry.label ? `<strong>${safeText(entry.label)}</strong>` : ""}${entry.caption ? `<span>${safeText(entry.caption)}</span>` : ""}</figcaption>` : ""}
    </figure>`).join("")}
  </section>`;
}

function renderRelatedCriteria(criteriaData, item, methodKey) {
  const matches = findRelatedCriteria(criteriaData, item, methodKey);
  const query = getCriterionSearchTerm(item);
  return `<section class="related-criteria" aria-labelledby="related-criteria-title">
    <div class="related-criteria-heading">
      <div><span>Нормативная оценка</span><h3 id="related-criteria-title">Критерии отбраковки</h3></div>
      <a href="${getRouteHash({ view: "criteria", query })}" data-criteria-query="${escapeAttribute(query)}">Найти все</a>
    </div>
    ${matches.length ? `<div class="related-criteria-list">${matches.map(criterion => {
      const { standard, method } = getCriterionContext(criteriaData, criterion);
      return `<a href="#criterion=${escapeAttribute(criterion.id)}" data-criterion="${escapeAttribute(criterion.id)}">
        <span>${safeText(method?.title || criterion.method.toUpperCase())}</span>
        <strong>${safeText(criterion.defect)}</strong>
        <small>${safeText(standard?.shortTitle || standard?.title || "Нормативный документ")} · ${safeText(criterion.source?.criterionTable)}</small>
      </a>`;
    }).join("")}</div>` : `<p class="related-criteria-empty">Прямое совпадение не найдено. Откройте поиск критериев и выберите применимый объект и НТД.</p>`}
    <p class="related-criteria-note">Визуальное сходство не является решением о годности. Применяйте критерий только после выбора объекта, документа, метода и условий контроля.</p>
  </section>`;
}

export function renderHome(criteriaData) {
  const visualCount = getAtlasLeafItems().length;
  const criteriaCount = criteriaData?.criteria?.length || 0;
  content.innerHTML = `
    <section class="focus-hero">
      <span class="focus-eyebrow">Карманный рабочий справочник</span>
      <h2 tabindex="-1">От признака на изображении — к нормативному решению</h2>
      <p>Сравните наблюдаемую картину с визуальным атласом, затем откройте критерий для конкретного объекта и НТД.</p>
      <div class="focus-stats"><span><b>${visualCount}</b> визуальных карточек</span><span><b>${criteriaCount}</b> критериев</span></div>
    </section>
    <section class="focus-primary-actions" aria-label="Основные разделы">
      <a href="#atlas" data-home-route="atlas" class="focus-action focus-action-atlas">
        <span class="focus-action-icon" aria-hidden="true">◫</span><div><small>Распознать</small><h3>Атлас дефектов</h3><p>Фотографии, радиограммы, индикации, эхо-сигналы и спектры.</p></div>
      </a>
      <a href="#criteria" data-home-route="criteria" class="focus-action focus-action-criteria">
        <span class="focus-action-icon" aria-hidden="true">✓</span><div><small>Оценить</small><h3>Критерии отбраковки</h3><p>Допустимо или брак с указанием НТД, пункта, таблицы и расчёта.</p></div>
      </a>
    </section>
    <section class="home-collections" aria-labelledby="home-collections-title">
      <div class="section-heading"><div><span>Быстрый доступ</span><h3 id="home-collections-title">Визуальные коллекции</h3></div><a href="#atlas" data-home-route="atlas">Все коллекции</a></div>
      <div class="home-collection-chips">${ATLAS_COLLECTIONS.slice(0, 5).map(collection => `<a href="${getRouteHash(getAtlasItemRoute(collection.method, collection.rootId))}" data-atlas-method="${collection.method}" data-atlas-item="${collection.rootId}">${safeText(METHODS[collection.method].short)} · ${safeText(collection.label)}</a>`).join("")}</div>
    </section>
    <aside class="focus-disclaimer"><strong>Важно</strong><p>Справочник помогает найти применимую норму, но не заменяет проектную документацию, технологию контроля и решение аттестованного специалиста.</p></aside>`;
  content.querySelectorAll("[data-home-route]").forEach(link => link.addEventListener("click", event =>
    handleRouteLink(event, { view: link.dataset.homeRoute })));
  bindAtlasLinks();
}

export function renderAtlasHome() {
  content.innerHTML = `<div class="page-header focused-page-header"><button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button><div><span class="page-kicker">Визуальная идентификация</span><h2 tabindex="-1">Атлас дефектов</h2><p>Выберите метод или вид диагностического изображения.</p></div></div>
    <div class="atlas-collection-grid">${ATLAS_COLLECTIONS.map(collection => {
      const root = getItem(collection.method, collection.rootId);
      if (!root) return "";
      const preview = firstPreview(collection.method, root);
      return `<a class="atlas-collection-card atlas-method-${collection.method}" href="${getRouteHash(getAtlasItemRoute(collection.method, collection.rootId))}" data-atlas-method="${collection.method}" data-atlas-item="${collection.rootId}">
        <div class="atlas-collection-preview">${preview ? `<img src="${escapeAttribute(preview)}" alt="" loading="lazy">` : `<span aria-hidden="true">◫</span>`}<b>${safeText(METHODS[collection.method].short)}</b></div>
        <div><h3>${safeText(collection.label)}</h3><p>${safeText(collection.description)}</p><small>${countLeafItems(collection.method, collection.rootId)} карточек</small></div>
      </a>`;
    }).join("")}</div>`;
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  bindAtlasLinks();
}

export function renderAtlasGroup(methodKey, group) {
  const children = getChildren(methodKey, group.id);
  const method = METHODS[methodKey];
  content.innerHTML = `<div class="page-header focused-page-header"><button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button><div><span class="page-kicker">${safeText(method?.short)} · визуальный атлас</span><h2 tabindex="-1">${safeText(group.title)}</h2><p>${safeText(group.summary || "Выберите визуальную карточку")}</p></div></div>
    <div class="visual-card-grid">${children.map(child => {
      const preview = firstPreview(methodKey, child);
      const nested = getChildren(methodKey, child.id).length > 0;
      return `<a class="visual-card${nested ? " visual-card-group" : ""}" href="${getRouteHash(getAtlasItemRoute(methodKey, child.id))}" data-atlas-method="${methodKey}" data-atlas-item="${child.id}">
        <div class="visual-card-image">${preview ? `<img src="${escapeAttribute(preview)}" alt="" loading="lazy" decoding="async">` : `<span aria-hidden="true">◫</span>`}${nested ? `<b>${countLeafItems(methodKey, child.id)} карточек</b>` : ""}</div>
        <div><span>${safeText(method?.short)}</span><h3>${safeText(child.title)}</h3><p>${safeText(child.summary || child.description, nested ? "Открыть группу" : "Открыть визуальную карточку")}</p></div>
      </a>`;
    }).join("")}</div>`;
  content.querySelector("#back-button").addEventListener("click", () => {
    const parent = group.parentId && getItem(methodKey, group.parentId);
    goBack(parent ? getAtlasItemRoute(methodKey, parent.id) : { view: "atlas" });
  });
  bindAtlasLinks();
}

export function renderDefect(methodKey, item, criteriaData) {
  const method = METHODS[methodKey];
  const favorite = isFavorite(methodKey, item.id);
  const focusedArticle = { ...item, sections: (item.sections || []).filter(section => !["image", "related", "documents"].includes(section.type)) };
  content.innerHTML = `<div class="page-header focused-page-header"><button class="back-button" id="back-button" aria-label="Вернуться к атласу">‹</button><div><span class="page-kicker">${safeText(method?.short)} · визуальная карточка</span><h2 tabindex="-1">${safeText(item.title)}</h2><p>${safeText(item.summary)}</p></div></div>
    <article class="defect-view">
      <div class="defect-title-actions"><span>${safeText(item.category || "Визуальная идентификация")}</span><button class="favorite-button ${favorite ? "active" : ""}" id="favorite-button" aria-label="${favorite ? "Удалить из избранного" : "Добавить в избранное"}" aria-pressed="${favorite}">${favorite ? "★" : "☆"}</button></div>
      ${renderMediaGallery(item)}
      <div class="defect-description">${renderStructuredArticle(focusedArticle, { resolveRelated: getItem })}</div>
      ${renderRelatedCriteria(criteriaData, item, methodKey)}
    </article>`;
  content.querySelector("#back-button").addEventListener("click", () => goBack(item.parentId && getItem(methodKey, item.parentId) ? getAtlasItemRoute(methodKey, item.parentId) : { view: "atlas" }));
  content.querySelector("#favorite-button").addEventListener("click", event => {
    const active = toggleFavorite(methodKey, item.id);
    event.currentTarget.classList.toggle("active", active);
    event.currentTarget.textContent = active ? "★" : "☆";
    event.currentTarget.setAttribute("aria-pressed", String(active));
    event.currentTarget.setAttribute("aria-label", active ? "Удалить из избранного" : "Добавить в избранное");
  });
  content.querySelectorAll("[data-criterion]").forEach(link => link.addEventListener("click", event =>
    handleRouteLink(event, { view: "criteria", criterionId: link.dataset.criterion })));
  content.querySelector("[data-criteria-query]")?.addEventListener("click", event =>
    handleRouteLink(event, { view: "criteria", query: event.currentTarget.dataset.criteriaQuery }));
}

export function renderNotFound(message = "Материал не найден") {
  content.innerHTML = `<div class="page-header"><button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button><div><h2 tabindex="-1">${safeText(message)}</h2><p>Откройте атлас или воспользуйтесь поиском.</p></div></div>`;
  content.querySelector("#back-button").addEventListener("click", () => navigate({ view: "home" }, { replace: true }));
}
