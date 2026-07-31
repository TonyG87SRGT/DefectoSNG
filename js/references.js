const REFERENCES_DATA_URL = "data/references.json";
let referencesCache = null;

async function loadReferences() {
  if (referencesCache) return referencesCache;

  const response = await fetch(REFERENCES_DATA_URL);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить справочные материалы: ${response.status}`);
  }

  referencesCache = await response.json();
  return referencesCache;
}

function escapeReferenceHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function renderReferences(options = {}) {
  currentView = { type: "references", method: null };
  setActiveNav("home");

  if (!options.skipHistory) {
    history.pushState({ view: "references" }, "", "#references");
  }

  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
      <div>
        <h2>Справочные материалы</h2>
        <p>Таблицы и инженерные данные для практической работы</p>
      </div>
    </div>

    <div class="empty-state">Загрузка справочных материалов…</div>
  `;

  document.getElementById("back-button")
    .addEventListener("click", () => history.back());

  try {
    const references = await loadReferences();

    content.innerHTML = `
      <div class="page-header">
        <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
        <div>
          <h2>Справочные материалы</h2>
          <p>Таблицы и инженерные данные для практической работы</p>
        </div>
      </div>

      <div class="article-list">
        ${references.map(reference => `
          <button class="article-card" data-reference="${escapeReferenceHtml(reference.id)}">
            <span class="article-category">Справочник</span>
            <h3>${escapeReferenceHtml(reference.title)}</h3>
            <p>${escapeReferenceHtml(reference.description || "Открыть справочный материал")}</p>
          </button>
        `).join("")}
      </div>
    `;

    document.getElementById("back-button")
      .addEventListener("click", () => history.back());

    document.querySelectorAll("[data-reference]").forEach(button => {
      button.addEventListener("click", () => {
        renderReference(button.dataset.reference);
      });
    });
  } catch (error) {
    console.error(error);
    content.innerHTML = `
      <div class="page-header">
        <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
        <div>
          <h2>Справочные материалы</h2>
          <p>Таблицы и инженерные данные для практической работы</p>
        </div>
      </div>
      <div class="empty-state">Не удалось загрузить справочные материалы.</div>
    `;
    document.getElementById("back-button")
      .addEventListener("click", () => history.back());
  }
}

async function renderReference(referenceId, options = {}) {
  currentView = { type: "reference", referenceId };
  setActiveNav("home");

  if (!options.skipHistory) {
    history.pushState(
      { view: "reference", referenceId },
      "",
      `#reference=${encodeRoutePart(referenceId)}`
    );
  }

  try {
    const references = await loadReferences();
    const reference = references.find(item => item.id === referenceId);

    if (!reference) {
      renderReferences({ skipHistory: true });
      return;
    }

    content.innerHTML = `
      <div class="page-header reference-page-header">
        <button class="back-button" id="back-button" aria-label="Вернуться к справочным материалам">‹</button>
        <div>
          <h2>${escapeReferenceHtml(reference.title)}</h2>
          <p>${escapeReferenceHtml(reference.description || "Справочные данные")}</p>
        </div>
      </div>

      ${reference.notice ? `
        <section class="reference-notice">
          <strong>Важно</strong>
          <p>${escapeReferenceHtml(reference.notice)}</p>
        </section>
      ` : ""}

      <label class="reference-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="reference-search"
          type="search"
          placeholder="${escapeReferenceHtml(reference.searchPlaceholder || "Поиск...")}"
          autocomplete="off"
          aria-label="Поиск по таблице"
        >
      </label>

      <div class="reference-table-wrap">
        <table class="reference-table">
          <thead>
            <tr>
              ${reference.columns.map(column => `<th>${escapeReferenceHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody id="reference-table-body"></tbody>
        </table>
      </div>

      <div class="reference-empty" id="reference-empty" hidden>
        Материал не найден.
      </div>
    `;

    document.getElementById("back-button")
      .addEventListener("click", () => history.back());

    const input = document.getElementById("reference-search");
    const tableBody = document.getElementById("reference-table-body");
    const emptyState = document.getElementById("reference-empty");

    const renderRows = query => {
      const normalizedQuery = query.trim().toLowerCase().replace(/ё/g, "е");
      const rows = reference.rows.filter(row => {
        const searchable = reference.columns
          .map(column => row[column.key] ?? "")
          .join(" ")
          .toLowerCase()
          .replace(/ё/g, "е");

        return searchable.includes(normalizedQuery);
      });

      tableBody.innerHTML = rows.map(row => `
        <tr>
          ${reference.columns.map(column => `
            <td>${escapeReferenceHtml(row[column.key] ?? "—")}</td>
          `).join("")}
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
        <button class="back-button" id="back-button" aria-label="Вернуться назад">‹</button>
        <div>
          <h2>Справочный материал</h2>
          <p>DefectoSNG</p>
        </div>
      </div>
      <div class="empty-state">Не удалось загрузить справочный материал.</div>
    `;
    document.getElementById("back-button")
      .addEventListener("click", () => history.back());
  }
}
