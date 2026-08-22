import { REFERENCE_DATA_FILE } from "./config.js";
import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { renderStructuredArticle } from "./renderers.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { normalizeSearchText } from "./searchCore.js";
import { getItem, getItemRoute } from "./store.js";

let referencesCache = null;

export async function loadReferences(
  baseUrl = globalThis.document?.baseURI || import.meta.url
) {
  if (referencesCache) return referencesCache;

  const response = await fetch(new URL(REFERENCE_DATA_FILE, baseUrl));
  if (!response.ok) {
    throw new Error(`Не удалось загрузить справочные материалы: HTTP ${response.status}`);
  }

  const references = await response.json();
  if (!Array.isArray(references)) {
    throw new Error("Справочные материалы должны быть массивом");
  }

  referencesCache = Object.freeze(references.map(Object.freeze));
  return referencesCache;
}

export function filterReferenceRows(reference, query) {
  const normalizedQuery = normalizeSearchText(query);
  const rows = Array.isArray(reference.rows) ? reference.rows : [];
  if (!normalizedQuery) return rows;

  return rows.filter(row => {
    const searchable = reference.columns
      .map(column => row[column.key] ?? "")
      .join(" ");
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

export function getReference(referenceId) {
  return referencesCache?.find(item => item.id === referenceId) || null;
}

function renderReferencesHeader(description = "Таблицы и инженерные данные для практической работы") {
  return `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
      <div>
        <h2 tabindex="-1">Справочные материалы</h2>
        <p>${safeText(description)}</p>
      </div>
    </div>
  `;
}

export async function renderReferences() {
  content.innerHTML = `
    ${renderReferencesHeader()}
    <div class="empty-state" role="status">Загрузка справочных материалов…</div>
  `;
  content.querySelector("#back-button")
    .addEventListener("click", () => goBack({ view: "home" }));

  try {
    const references = await loadReferences();
    content.innerHTML = `
      ${renderReferencesHeader()}
      <div class="article-list">
        ${references.map(reference => {
          const route = { view: "reference", referenceId: reference.id };
          return `
            <a
              class="article-card"
              href="${getRouteHash(route)}"
              data-reference="${escapeAttribute(reference.id)}"
            >
              <span class="article-category">${safeText(reference.category, "Справочник")}</span>
              <h3>${safeText(reference.title)}</h3>
              <p>${safeText(reference.description, "Открыть справочный материал")}</p>
            </a>
          `;
        }).join("")}
      </div>
    `;

    content.querySelector("#back-button")
      .addEventListener("click", () => goBack({ view: "home" }));
    content.querySelectorAll("[data-reference]").forEach(link => {
      link.addEventListener("click", event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate({ view: "reference", referenceId: link.dataset.reference });
      });
    });
  } catch (error) {
    console.error(error);
    content.innerHTML = `
      ${renderReferencesHeader()}
      <div class="empty-state" role="alert">Не удалось загрузить справочные материалы.</div>
    `;
    content.querySelector("#back-button")
      .addEventListener("click", () => goBack({ view: "home" }));
  }
}

export async function renderReference(referenceId) {
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться к справочным материалам">‹</button>
      <div><h2 tabindex="-1">Справочный материал</h2><p>Загрузка…</p></div>
    </div>
    <div class="empty-state" role="status">Загрузка справочного материала…</div>
  `;
  content.querySelector("#back-button")
    .addEventListener("click", () => goBack({ view: "references" }));

  try {
    const references = await loadReferences();
    const reference = references.find(item => item.id === referenceId);
    if (!reference) {
      content.innerHTML = `
        <div class="page-header">
          <button class="back-button" id="back-button" aria-label="Вернуться к справочным материалам">‹</button>
          <div><h2 tabindex="-1">Материал не найден</h2><p>Справочные материалы</p></div>
        </div>
        <div class="empty-state" role="alert">Запрошенный справочный материал отсутствует.</div>
      `;
      content.querySelector("#back-button")
        .addEventListener("click", () => goBack({ view: "references" }));
      return;
    }

    if (Array.isArray(reference.sections)) {
      content.innerHTML = `
        <div class="page-header reference-page-header">
          <button class="back-button" id="back-button" aria-label="Вернуться к справочным материалам">‹</button>
          <div>
            <h2 tabindex="-1">${safeText(reference.title)}</h2>
            <p>${safeText(reference.description, "Нормативный документ")}</p>
          </div>
        </div>

        ${reference.notice ? `
          <section class="reference-notice">
            <strong>Важно</strong>
            <p>${safeText(reference.notice)}</p>
          </section>
        ` : ""}

        <article class="article-content reference-article">
          ${renderStructuredArticle(reference, {
            resolveRelated: getItem,
            getRelatedHref: (method, id) => {
              const article = getItem(method, id);
              return article ? getRouteHash(getItemRoute(method, article)) : "#";
            }
          })}
        </article>
      `;
      content.querySelector("#back-button")
        .addEventListener("click", () => goBack({ view: "references" }));
      return;
    }

    content.innerHTML = `
      <div class="page-header reference-page-header">
        <button class="back-button" id="back-button" aria-label="Вернуться к справочным материалам">‹</button>
        <div>
          <h2 tabindex="-1">${safeText(reference.title)}</h2>
          <p>${safeText(reference.description, "Справочные данные")}</p>
        </div>
      </div>

      ${reference.notice ? `
        <section class="reference-notice">
          <strong>Важно</strong>
          <p>${safeText(reference.notice)}</p>
        </section>
      ` : ""}

      <label class="reference-search" for="reference-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="reference-search"
          type="search"
          placeholder="${escapeAttribute(reference.searchPlaceholder || "Поиск...")}"
          autocomplete="off"
        >
      </label>

      <div class="reference-table-wrap">
        <table class="reference-table">
          <thead>
            <tr>
              ${reference.columns.map(column => `<th scope="col">${safeText(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody id="reference-table-body"></tbody>
        </table>
      </div>

      <div class="reference-empty" id="reference-empty" hidden>
        Материал не найден.
      </div>
    `;

    content.querySelector("#back-button")
      .addEventListener("click", () => goBack({ view: "references" }));

    const input = content.querySelector("#reference-search");
    const tableBody = content.querySelector("#reference-table-body");
    const emptyState = content.querySelector("#reference-empty");

    const renderRows = query => {
      const rows = filterReferenceRows(reference, query);
      tableBody.innerHTML = rows.map(row => `
        <tr>
          ${reference.columns.map(column =>
            `<td>${safeText(row[column.key], "—")}</td>`
          ).join("")}
        </tr>
      `).join("");
      emptyState.hidden = rows.length > 0;
    };

    input.addEventListener("input", event => renderRows(event.target.value));
    renderRows("");
  } catch (error) {
    console.error(error);
    content.innerHTML = `
      <div class="page-header">
        <button class="back-button" id="back-button" aria-label="Вернуться к справочным материалам">‹</button>
        <div><h2 tabindex="-1">Справочный материал</h2><p>DefectoSNG</p></div>
      </div>
      <div class="empty-state" role="alert">Не удалось загрузить справочный материал.</div>
    `;
    content.querySelector("#back-button")
      .addEventListener("click", () => goBack({ view: "references" }));
  }
}
