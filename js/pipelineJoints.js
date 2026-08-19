import { content } from "./dom.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate, replaceRoute } from "./router.js";
import { normalizeSearchText } from "./searchCore.js";
import { getArticles, getItem, getItemRoute, sortByOrder } from "./store.js";
import { renderArticle, renderNotFound } from "./views.js";

export const PIPELINE_CATEGORIES = Object.freeze([
  Object.freeze({ id: "all", title: "Все тестовые карточки" }),
  Object.freeze({ id: "butt", title: "Стыковые соединения", sectionId: "pipeline-butt" }),
  Object.freeze({ id: "lap", title: "Нахлесточные и муфтовые соединения", sectionId: "pipeline-lap" }),
  Object.freeze({ id: "corner", title: "Угловые соединения", sectionId: "pipeline-corner" })
]);

export const PIPELINE_SPECIAL_FILTERS = Object.freeze([
  Object.freeze({ id: "no-bevel", label: "Без скоса кромок" }),
  Object.freeze({ id: "one-bevel", label: "Со скосом одной кромки" }),
  Object.freeze({ id: "two-bevel", label: "Со скосом двух кромок" }),
  Object.freeze({ id: "curved-bevel", label: "С криволинейным скосом" }),
  Object.freeze({ id: "boring", label: "С расточкой" }),
  Object.freeze({ id: "expansion", label: "С раздачей" }),
  Object.freeze({ id: "removable-backing", label: "На съёмной подкладке" }),
  Object.freeze({ id: "permanent-backing", label: "На остающейся подкладке" }),
  Object.freeze({ id: "consumable-insert", label: "С расплавляемой вставкой" }),
  Object.freeze({ id: "double-sided", label: "Двусторонние соединения" })
]);

const FILTER_FIELDS = Object.freeze([
  Object.freeze({ key: "jointType", label: "Тип соединения", source: joint => categoryTitle(joint.category) }),
  Object.freeze({ key: "elements", label: "Соединяемые элементы", source: joint => joint.connectedElements }),
  Object.freeze({ key: "preparation", label: "Форма подготовки", source: joint => joint.edgePreparation }),
  Object.freeze({ key: "weld", label: "Характер шва", source: joint => joint.weldCharacter }),
  Object.freeze({ key: "backing", label: "Подкладка", source: joint => joint.backing }),
  Object.freeze({ key: "method", label: "Способ сварки", source: joint => joint.weldingMethods }),
  Object.freeze({ key: "thickness", label: "Диапазон толщин", source: joint => joint.thicknessRange })
]);

const INSPECTION_BEFORE = Object.freeze([
  "Толщина стенки.", "Форма разделки.", "Угол скоса.", "Притупление.",
  "Состояние кромок.", "Размеры расточки.", "Размеры подкладки."
]);
const INSPECTION_ASSEMBLY = Object.freeze([
  "Зазор.", "Смещение кромок.", "Соосность.", "Положение подкладки.",
  "Прилегание деталей.", "Положение ответвления."
]);
const INSPECTION_AFTER = Object.freeze([
  "Ширина шва.", "Выпуклость.", "Катет.", "Плавность перехода.",
  "Форма поверхности.", "Внешние дефекты."
]);
const NONCONFORMITIES = Object.freeze([
  "Неправильный угол разделки.", "Отклонение притупления.",
  "Завышенный или заниженный зазор.", "Смещение кромок.",
  "Неправильная установка подкладки.", "Отклонение ширины шва.",
  "Чрезмерная выпуклость.", "Неправильный катет."
]);

function categoryTitle(categoryId) {
  return PIPELINE_CATEGORIES.find(category => category.id === categoryId)?.title || "";
}

function flattenValue(value) {
  if (Array.isArray(value)) return value;
  return value == null || value === "" ? [] : [value];
}

export function getPipelineJoints(items = getArticles("pipeline")) {
  return sortByOrder(items.filter(item => item.pipelineJoint));
}

export function getPipelineFilterOptions(joints, field) {
  const definition = FILTER_FIELDS.find(item => item.key === field);
  if (!definition) return [];
  return [...new Set(joints.flatMap(article =>
    flattenValue(definition.source(article.pipelineJoint)).filter(Boolean)
  ))].sort((a, b) => String(a).localeCompare(String(b), "ru"));
}

function jointSearchText(article) {
  const joint = article.pipelineJoint || {};
  return normalizeSearchText([
    article.title, article.summary, ...(article.tags || []),
    joint.designation, categoryTitle(joint.category),
    ...flattenValue(joint.connectedElements), joint.edgePreparation,
    joint.weldCharacter, joint.backing, ...flattenValue(joint.weldingMethods),
    joint.thicknessRange
  ].filter(Boolean).join(" "));
}

export function matchesPipelineJoint(article, state = {}) {
  const joint = article.pipelineJoint;
  if (!joint) return false;
  if (state.category && state.category !== "all" && joint.category !== state.category) return false;
  if (state.special && !(joint.specialFilters || []).includes(state.special)) return false;

  const selected = {
    jointType: categoryTitle(joint.category),
    elements: flattenValue(joint.connectedElements),
    preparation: joint.edgePreparation,
    weld: joint.weldCharacter,
    backing: joint.backing,
    method: flattenValue(joint.weldingMethods),
    thickness: joint.thicknessRange
  };
  for (const field of FILTER_FIELDS) {
    const expected = state[field.key];
    if (!expected) continue;
    if (!flattenValue(selected[field.key]).includes(expected)) return false;
  }

  const queryWords = normalizeSearchText(state.query).split(/\s+/).filter(Boolean);
  const searchable = jointSearchText(article);
  return queryWords.every(word => searchable.includes(word));
}

function routeFromState(state) {
  return {
    view: "pipeline",
    category: state.category || "all",
    query: state.query || "",
    ...Object.fromEntries(FILTER_FIELDS.map(field => [field.key, state[field.key] || ""])),
    special: state.special || ""
  };
}

function handleRouteLink(event, route) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  rememberPipelineScroll();
  navigate(route);
}

function rememberPipelineScroll() {
  try {
    sessionStorage.setItem("defectoSngPipelineScroll", String(window.scrollY));
  } catch {}
}

function restorePipelineScroll() {
  try {
    const value = Number(sessionStorage.getItem("defectoSngPipelineScroll"));
    if (Number.isFinite(value) && value > 0) requestAnimationFrame(() => window.scrollTo(0, value));
  } catch {}
}

function renderSelect(field, joints, state) {
  const options = getPipelineFilterOptions(joints, field.key);
  return `
    <label class="pipeline-filter-field">
      <span>${safeText(field.label)}</span>
      <select data-pipeline-filter="${escapeAttribute(field.key)}">
        <option value="">Все варианты</option>
        ${options.map(option => `
          <option value="${escapeAttribute(option)}" ${state[field.key] === option ? "selected" : ""}>${safeText(option)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderCategoryCards(categories) {
  return `
    <div class="pipeline-category-grid">
      ${categories.map(category => {
        const route = { view: "pipeline", category: category.pipelineCategory };
        return `
          <a class="pipeline-category-card" href="${getRouteHash(route)}" data-pipeline-category="${escapeAttribute(category.pipelineCategory)}">
            <h3>${safeText(category.title)}</h3>
            <p>${safeText(category.summary)}</p>
            <div class="pipeline-designations" aria-label="Обозначения">
              ${(category.designations || []).map(item => `<span>${safeText(item)}</span>`).join("")}
            </div>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function renderJointCard(article) {
  const joint = article.pipelineJoint;
  const labels = [
    categoryTitle(joint.category), joint.weldCharacter,
    joint.edgePreparation, joint.backing
  ].filter(Boolean);
  const route = getItemRoute("pipeline", article);
  return `
    <a class="pipeline-joint-card" href="${getRouteHash(route)}" data-pipeline-joint="${escapeAttribute(article.id)}">
      <div class="pipeline-joint-heading">
        <strong>${safeText(joint.designation)}</strong>
        <span>Открыть</span>
      </div>
      <h3>${safeText(article.title)}</h3>
      <p>${safeText(article.summary)}</p>
      ${labels.length ? `<div class="pipeline-tags">${labels.map(label => `<span>${safeText(label)}</span>`).join("")}</div>` : ""}
    </a>
  `;
}

export function renderPipelineAtlas(initialState = {}) {
  const root = getItem("pipeline", "pipeline-welded-joints");
  if (!root) {
    renderNotFound("Атлас сварных соединений не найден");
    return;
  }

  const joints = getPipelineJoints();
  const categoryItems = getArticles("pipeline").filter(item => item.pipelineCategory);
  const references = sortByOrder(getArticles("pipeline").filter(item =>
    item.parentId === "pipeline-reference-materials"
  ));
  const allowedCategory = PIPELINE_CATEGORIES.some(item => item.id === initialState.category)
    ? initialState.category
    : "all";
  const state = { ...routeFromState(initialState), category: allowedCategory };

  content.innerHTML = `
    <div class="page-header pipeline-page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">${safeText(root.title)}</h2><p>${safeText(root.standard)}</p></div>
    </div>
    <section class="pipeline-intro">
      <p>${safeText(root.description)}</p>
      <div class="pipeline-warning"><strong>Важно</strong><p>${safeText(root.warning)}</p></div>
    </section>

    <section aria-labelledby="pipeline-categories-title">
      <h2 class="pipeline-section-title" id="pipeline-categories-title">Категории атласа</h2>
      ${renderCategoryCards(categoryItems)}
    </section>

    <section class="pipeline-special" aria-labelledby="pipeline-special-title">
      <h2 class="pipeline-section-title" id="pipeline-special-title">Специальные конструкции</h2>
      <p>Тематические фильтры используют те же карточки и не дублируют данные.</p>
      <div class="pipeline-filter-chips" role="group" aria-label="Специальные конструкции">
        ${PIPELINE_SPECIAL_FILTERS.map(filter => `
          <button type="button" data-pipeline-special="${escapeAttribute(filter.id)}" aria-pressed="${state.special === filter.id}" class="${state.special === filter.id ? "active" : ""}">${safeText(filter.label)}</button>
        `).join("")}
      </div>
    </section>

    <section class="pipeline-controls" aria-labelledby="pipeline-filter-title">
      <h2 class="pipeline-section-title" id="pipeline-filter-title">Поиск и фильтры</h2>
      <label class="pipeline-search">
        <span>Поиск по атласу</span>
        <input type="search" id="pipeline-search" value="${escapeAttribute(state.query)}" placeholder="Например, С17 или V-образная разделка" autocomplete="off">
      </label>
      <div class="pipeline-filter-grid">
        ${FILTER_FIELDS.map(field => renderSelect(field, joints, state)).join("")}
      </div>
      <button class="pipeline-reset" type="button" id="pipeline-reset">Сбросить фильтры</button>
    </section>

    <section aria-labelledby="pipeline-results-title">
      <div id="pipeline-results" aria-live="polite"></div>
    </section>

    <section aria-labelledby="pipeline-references-title">
      <h2 class="pipeline-section-title" id="pipeline-references-title">Справочные материалы</h2>
      <div class="article-list pipeline-reference-list">
        ${references.map(article => {
          const route = getItemRoute("pipeline", article);
          return `
            <a class="article-card" href="${getRouteHash(route)}" data-pipeline-reference="${escapeAttribute(article.id)}">
              <span class="article-category">${article.status === "published" ? "Справочный материал" : "Материал в подготовке"}</span>
              <h3>${safeText(article.title)}</h3>
              <p>${safeText(article.summary)}</p>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  `;

  const results = content.querySelector("#pipeline-results");
  const search = content.querySelector("#pipeline-search");

  function syncRoute() {
    replaceRoute(routeFromState(state), { dispatch: false });
  }

  function drawResults() {
    const filtered = joints.filter(article => matchesPipelineJoint(article, state));
    const category = PIPELINE_CATEGORIES.find(item => item.id === state.category);
    results.innerHTML = `
      <div class="pipeline-results-heading">
        <h2 class="pipeline-section-title">${safeText(category?.title, "Тестовые карточки")}</h2>
        <span>${filtered.length} из ${joints.length}</span>
      </div>
      ${filtered.length
        ? `<div class="pipeline-joint-grid">${filtered.map(renderJointCard).join("")}</div>`
        : `<div class="empty-state">По выбранным условиям соединения не найдены.</div>`}
    `;
    results.querySelectorAll("[data-pipeline-joint]").forEach(link => {
      link.addEventListener("click", event => {
        const article = getItem("pipeline", link.dataset.pipelineJoint);
        if (article) handleRouteLink(event, getItemRoute("pipeline", article));
      });
    });
  }

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-pipeline-category]").forEach(link => {
    link.addEventListener("click", event => {
      handleRouteLink(event, { view: "pipeline", category: link.dataset.pipelineCategory });
    });
  });
  content.querySelectorAll("[data-pipeline-reference]").forEach(link => {
    link.addEventListener("click", event => {
      const article = getItem("pipeline", link.dataset.pipelineReference);
      if (article) handleRouteLink(event, getItemRoute("pipeline", article));
    });
  });
  content.querySelectorAll("[data-pipeline-special]").forEach(button => {
    button.addEventListener("click", () => {
      state.special = state.special === button.dataset.pipelineSpecial ? "" : button.dataset.pipelineSpecial;
      content.querySelectorAll("[data-pipeline-special]").forEach(item => {
        const active = item.dataset.pipelineSpecial === state.special;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      syncRoute();
      drawResults();
    });
  });
  content.querySelectorAll("[data-pipeline-filter]").forEach(select => {
    select.addEventListener("change", () => {
      state[select.dataset.pipelineFilter] = select.value;
      syncRoute();
      drawResults();
    });
  });
  search.addEventListener("input", () => {
    state.query = search.value;
    syncRoute();
    drawResults();
  });
  content.querySelector("#pipeline-reset").addEventListener("click", () => {
    Object.assign(state, routeFromState({ category: state.category }));
    renderPipelineAtlas(state);
  });

  drawResults();
  restorePipelineScroll();
}

function renderScheme(title, src, placeholder) {
  if (src) {
    return `
      <figure class="pipeline-scheme-placeholder">
        <h3>${safeText(title)}</h3>
        <img src="${escapeAttribute(src)}" alt="${escapeAttribute(title)}" loading="lazy" decoding="async">
      </figure>
    `;
  }
  return `
    <section class="pipeline-scheme-placeholder">
      <h3>${safeText(title)}</h3>
      <div role="img" aria-label="${escapeAttribute(placeholder)}"><span aria-hidden="true">⌁</span><p>${safeText(placeholder)}</p></div>
    </section>
  `;
}

function renderFacts(article) {
  const joint = article.pipelineJoint;
  const facts = [
    ["Тип соединения", categoryTitle(joint.category)],
    ["Соединяемые элементы", flattenValue(joint.connectedElements).join(", ")],
    ["Форма подготовки кромок", joint.edgePreparation],
    ["Характер шва", joint.weldCharacter],
    ["Подкладка", joint.backing],
    ["Способы сварки", flattenValue(joint.weldingMethods).join(", ")],
    ["Диапазон толщин", joint.thicknessRange],
    ["Минимальный наружный диаметр", joint.minimumDiameter]
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return facts.length ? `
    <dl class="pipeline-facts">
      ${facts.map(([label, value]) => `<div><dt>${safeText(label)}</dt><dd>${safeText(value)}</dd></div>`).join("")}
    </dl>
  ` : `<div class="pipeline-data-pending">Характеристики будут добавлены после проверки данных по ГОСТ.</div>`;
}

function renderSimpleList(title, items) {
  if (!Array.isArray(items) || !items.length) return "";
  return `<section class="article-section"><h3>${safeText(title)}</h3><ul>${items.map(item => `<li>${safeText(item)}</li>`).join("")}</ul></section>`;
}

export function renderPipelineJoint(itemId) {
  const article = getItem("pipeline", itemId);
  if (!article?.pipelineJoint) {
    renderNotFound("Карточка соединения не найдена");
    return;
  }
  const joint = article.pipelineJoint;
  const favorite = isFavorite("pipeline", article.id);
  const source = joint.standardTable
    ? `ГОСТ 16037-80, таблица ${joint.standardTable}`
    : "ГОСТ 16037-80. Номер таблицы будет указан после проверки данных.";

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться к атласу">‹</button>
      <div><h2>ГОСТ 16037-80</h2><p>Сварные соединения трубопроводов</p></div>
    </div>
    <article class="article-view pipeline-joint-view">
      <span class="pipeline-designation">${safeText(joint.designation)}</span>
      <div class="article-title-row">
        <h2 tabindex="-1">${safeText(article.title)}</h2>
        <button class="favorite-button ${favorite ? "active" : ""}" id="favorite-button" aria-label="${favorite ? "Удалить соединение из избранного" : "Добавить соединение в избранное"}" aria-pressed="${favorite}">${favorite ? "★" : "☆"}</button>
      </div>
      <p class="article-summary">${safeText(article.summary)}</p>
      <div class="pipeline-schemes">
        ${renderScheme("Схема подготовленных кромок", joint.images?.edgePreparation, "Схема подготовленных кромок будет добавлена позже.")}
        ${renderScheme("Схема сварного шва", joint.images?.weldSection, "Схема сварного шва будет добавлена позже.")}
      </div>
      <section class="article-section"><h3>Основные характеристики</h3>${renderFacts(article)}</section>
      <section class="article-section">
        <h3>Контролируемые размеры</h3>
        ${Array.isArray(joint.parameters) && joint.parameters.length
          ? `<dl class="pipeline-parameters">${joint.parameters.filter(item => item?.value != null).map(item => `<div><dt>${safeText(item.name)}</dt><dd>${safeText(item.value)}</dd></div>`).join("")}</dl>`
          : `<div class="pipeline-data-pending">Проверенные значения параметров s, s1, s2, b, c, e, g, K, K1 и Dн будут добавлены позднее. Неподтверждённые размеры не показываются.</div>`}
      </section>
      ${renderSimpleList("Контроль до сварки", joint.inspectionBeforeWelding || INSPECTION_BEFORE)}
      ${renderSimpleList("Контроль после сборки", joint.inspectionAfterAssembly || INSPECTION_ASSEMBLY)}
      ${renderSimpleList("Контроль после сварки", joint.inspectionAfterWelding || INSPECTION_AFTER)}
      ${renderSimpleList("Типичные несоответствия", joint.typicalNonconformities || NONCONFORMITIES)}
      <section class="article-section"><h3>Источник</h3><p>${safeText(source)}</p></section>
      <section class="article-warning"><h3>Важно</h3><p>Соединение должно назначаться проектной или технологической документацией. Наличие конструкции в ГОСТ 16037-80 не означает автоматического разрешения её применения на конкретном объекте.</p></section>
    </article>
  `;

  content.querySelector("#back-button").addEventListener("click", () => {
    goBack({ view: "pipeline", category: joint.category });
  });
  content.querySelector("#favorite-button").addEventListener("click", event => {
    const active = toggleFavorite("pipeline", article.id);
    event.currentTarget.classList.toggle("active", active);
    event.currentTarget.textContent = active ? "★" : "☆";
    event.currentTarget.setAttribute("aria-pressed", String(active));
    event.currentTarget.setAttribute("aria-label", active ? "Удалить соединение из избранного" : "Добавить соединение в избранное");
  });
}

export function renderPipelineReference(itemId) {
  const article = getItem("pipeline", itemId);
  if (!article || article.parentId !== "pipeline-reference-materials") {
    renderNotFound("Справочный материал не найден");
    return;
  }
  renderArticle("pipeline", article);
}
