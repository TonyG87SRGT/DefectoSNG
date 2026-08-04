import { escapeAttribute, safeText } from "./html.js";

const renderFacts = section => `
  <section class="article-facts">
    ${section.title ? `<h3>${safeText(section.title)}</h3>` : ""}
    <dl class="article-facts-grid">
      ${(section.items || []).map(item => `
        <div class="article-fact">
          <dt>${safeText(item.label)}</dt>
          <dd>${safeText(item.value)}</dd>
        </div>
      `).join("")}
    </dl>
  </section>
`;

const renderText = section => `
  <section class="article-section">
    <h3>${safeText(section.title)}</h3>
    <p>${safeText(section.content)}</p>
  </section>
`;

const renderSteps = section => `
  <section class="article-section">
    <h3>${safeText(section.title)}</h3>
    <ol>${(section.items || []).map(item => `<li>${safeText(item)}</li>`).join("")}</ol>
  </section>
`;

const renderList = section => `
  <section class="article-section">
    <h3>${safeText(section.title)}</h3>
    <ul>${(section.items || []).map(item => `<li>${safeText(item)}</li>`).join("")}</ul>
  </section>
`;

const renderWarning = section => `
  <section class="article-warning">
    <h3>⚠ ${safeText(section.title)}</h3>
    <p>${safeText(section.content)}</p>
  </section>
`;

const renderTable = section => `
  <section class="article-section article-table-section">
    ${section.title ? `<h3>${safeText(section.title)}</h3>` : ""}
    <div class="article-table-scroll">
      <table class="article-table">
        <thead>
          <tr>${(section.headers || []).map(header => `<th>${safeText(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${(section.rows || []).map(row => `
            <tr>${row.map(cell => `<td>${safeText(cell)}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${section.note ? `<p class="article-table-note">${safeText(section.note)}</p>` : ""}
  </section>
`;

const renderImage = section => {
  const alt = section.alt || section.title || "";
  return `
    <figure class="article-image">
      <img
        src="${escapeAttribute(section.src)}"
        alt="${escapeAttribute(alt)}"
        loading="lazy"
        class="zoomable-image"
        data-full-image="${escapeAttribute(section.src)}"
        tabindex="0"
        role="button"
        aria-label="Открыть изображение: ${escapeAttribute(alt || "без описания")}"
      >
      ${section.title || section.caption ? `
        <figcaption>
          ${section.title ? `<strong>${safeText(section.title)}</strong>` : ""}
          ${section.caption ? `<span>${safeText(section.caption)}</span>` : ""}
        </figcaption>
      ` : ""}
    </figure>
  `;
};

const renderCallout = (section, className, icon) => `
  <section class="article-callout ${className}">
    <h3>${icon} ${safeText(section.title)}</h3>
    <p>${safeText(section.content)}</p>
  </section>
`;

const renderTip = section => renderCallout(section, "article-tip", "💡");
const renderPractice = section => renderCallout(section, "article-practice", "🔧");
const renderNote = section => renderCallout(section, "article-note", "✎");

const renderComparison = section => `
  <section class="article-comparison">
    <h3>${safeText(section.title)}</h3>
    <div class="article-comparison-list">
      ${(section.items || []).map(item => {
        const name = Array.isArray(item)
          ? item[0]
          : item.name || item.label || "Сравнение";
        const description = Array.isArray(item)
          ? item[1]
          : item.description || item.value || "";

        return `
          <div class="article-comparison-item">
            <strong>${safeText(name)}</strong>
            <p>${safeText(description)}</p>
          </div>
        `;
      }).join("")}
    </div>
  </section>
`;

const renderMethods = section => `
  <section class="article-methods">
    <h3>${safeText(section.title)}</h3>
    <dl class="article-methods-list">
      ${(section.items || []).map(item => `
        <div class="article-method-item">
          <dt>${safeText(item.method)}</dt>
          <dd>${safeText(item.description)}</dd>
        </div>
      `).join("")}
    </dl>
  </section>
`;

const renderRelated = (section, context = {}) => `
  <section class="article-related">
    <h3>↗ ${safeText(section.title)}</h3>
    <div class="article-related-list">
      ${(section.items || []).map(item => {
        const target = context.resolveRelated?.(item.method, item.id);
        const title = target?.title || item.title || `${item.method}/${item.id}`;
        const href = context.getRelatedHref?.(item.method, item.id) || "#";
        return `
          <a
            class="article-related-link"
            href="${escapeAttribute(href)}"
            data-related-article="${escapeAttribute(item.id)}"
            data-related-method="${escapeAttribute(item.method)}"
          >${safeText(title)}</a>
        `;
      }).join("")}
    </div>
  </section>
`;

const renderDocuments = section => `
  <section class="article-documents">
    <h3>▤ ${safeText(section.title)}</h3>
    <ul>${(section.items || []).map(item => `<li>${safeText(item)}</li>`).join("")}</ul>
  </section>
`;

export const SECTION_RENDERERS = Object.freeze({
  facts: renderFacts,
  text: renderText,
  steps: renderSteps,
  list: renderList,
  warning: renderWarning,
  table: renderTable,
  image: renderImage,
  tip: renderTip,
  practice: renderPractice,
  note: renderNote,
  comparison: renderComparison,
  methods: renderMethods,
  related: renderRelated,
  documents: renderDocuments
});

export const SUPPORTED_SECTION_TYPES = Object.freeze(Object.keys(SECTION_RENDERERS));

export function renderSection(section, index = 0, context = {}) {
  const renderer = SECTION_RENDERERS[section?.type];
  if (renderer) return renderer(section, context);

  const type = safeText(section?.type || "не указан");
  console.error(`Unsupported article section type: ${String(section?.type || "не указан")}`);
  return `
    <section class="article-render-error" role="alert">
      <h3>Не удалось показать блок статьи</h3>
      <p>Неизвестный тип секции «${type}» (позиция ${index + 1}).</p>
    </section>
  `;
}

export function renderStructuredArticle(article, context = {}) {
  return (article.sections || [])
    .map((section, index) => renderSection(section, index, context))
    .join("");
}
