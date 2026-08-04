import { content } from "./dom.js";
import { ATLAS_CATEGORIES } from "./config.js";
import { escapeAttribute, safeText } from "./html.js";
import { goBack, navigate, replaceRoute } from "./router.js";
import { normalizeSearchText } from "./searchCore.js";
import { getArticles, getItemRoute } from "./store.js";

export function getAtlasArticles() {
  return getArticles("vik").filter(article => article.atlas?.enabled);
}

export function normalizeAtlasSearch(value) {
  return normalizeSearchText(value);
}

export function formatDefectCount(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "дефектов";

  if (mod10 === 1 && mod100 !== 11) {
    word = "дефект";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = "дефекта";
  }

  return count === 1 ? `Показан ${count} ${word}` : `Показано ${count} ${word}`;
}

export function renderAtlas(initialState = {}) {
  const atlasArticles = getAtlasArticles();
  const requestedCategory = initialState.category || "all";
  let activeCategory = ATLAS_CATEGORIES.some(category => category.id === requestedCategory)
    ? requestedCategory
    : "all";
  let query = initialState.query || "";

  content.innerHTML = `
    <div class="page-header atlas-page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться в раздел ВИК">‹</button>
      <div>
        <h2 tabindex="-1">Атлас дефектов сварных соединений</h2>
        <p>Сравните обнаруженный дефект с фотографиями и схемами. Используйте поиск или выберите подходящую группу.</p>
      </div>
    </div>

    <section class="atlas-controls" aria-label="Поиск и фильтры атласа">
      <label class="atlas-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="atlas-search"
          type="search"
          placeholder="Найти дефект..."
          autocomplete="off"
          value="${escapeAttribute(query)}"
          aria-label="Поиск дефекта в атласе"
        >
      </label>

      <div class="atlas-filters" role="group" aria-label="Категории дефектов">
        ${ATLAS_CATEGORIES.map(category => `
          <button
            class="atlas-filter ${category.id === activeCategory ? "active" : ""}"
            type="button"
            data-atlas-filter="${escapeAttribute(category.id)}"
            aria-pressed="${category.id === activeCategory}"
          >${safeText(category.label)}</button>
        `).join("")}
      </div>
    </section>

    <div id="atlas-results" aria-live="polite"></div>

    <aside class="atlas-info-block">
      <h3>Не удалось определить дефект?</h3>
      <p>Используйте фотографии и схемы только для предварительного сравнения. Окончательная идентификация и оценка выполняются специалистом с учётом результатов контроля и требований нормативной документации.</p>
    </aside>
  `;

  const results = document.getElementById("atlas-results");
  const atlasSearch = document.getElementById("atlas-search");

  function syncRoute() {
    replaceRoute(
      { view: "atlas", category: activeCategory, query },
      { dispatch: false }
    );
  }

  function drawCards() {
    const normalizedQuery = normalizeAtlasSearch(query);
    const filtered = atlasArticles.filter(article => {
      const matchesCategory = activeCategory === "all" ||
        article.atlas.categories.includes(activeCategory);
      const searchable = normalizeAtlasSearch([
        article.title,
        article.summary,
        article.atlas.shortFeature,
        ...(article.atlas.aliases || []),
        ...(article.atlas.tags || [])
      ].join(" "));
      const matchesQuery = !normalizedQuery || normalizedQuery
        .split(/\s+/)
        .every(word => searchable.includes(word));

      return matchesCategory && matchesQuery;
    });

    results.innerHTML = filtered.length ? `
      <div class="atlas-count">${formatDefectCount(filtered.length)}</div>
      <div class="atlas-grid">
        ${filtered.map(article => {
          const hasPhoto = Boolean(article.atlas.photo);
          const hasScheme = Boolean(article.atlas.scheme);
          const defaultKind = hasPhoto ? "photo" : "scheme";
          const defaultSrc = article.atlas[defaultKind];
          const defaultLabel = defaultKind === "photo" ? "Фотография" : "Техническая схема";
          const primaryCategory = article.atlas.categories?.[0] || "other";

          return `
            <article
              class="atlas-card atlas-category-${primaryCategory}"
              data-atlas-article="${escapeAttribute(article.id)}"
              role="link"
              tabindex="0"
              aria-label="Открыть статью: ${escapeAttribute(article.title)}"
            >
              <div class="atlas-card-media">
                <img
                  src="${escapeAttribute(defaultSrc)}"
                  alt="${escapeAttribute(defaultLabel)} дефекта «${escapeAttribute(article.title)}»"
                  loading="lazy"
                  decoding="async"
                  class="atlas-media-image atlas-media-${defaultKind}"
                  data-atlas-image
                >
                ${hasPhoto && hasScheme ? `
                  <div class="atlas-image-toggle" role="group" aria-label="Вид изображения для дефекта ${escapeAttribute(article.title)}">
                    <button type="button" class="active" data-image-kind="photo" data-image-src="${escapeAttribute(article.atlas.photo)}" data-image-alt="Фотография дефекта «${escapeAttribute(article.title)}»" aria-pressed="true">Фото</button>
                    <button type="button" data-image-kind="scheme" data-image-src="${escapeAttribute(article.atlas.scheme)}" data-image-alt="Техническая схема дефекта «${escapeAttribute(article.title)}»" aria-pressed="false">Схема</button>
                  </div>
                ` : ""}
              </div>
              <div class="atlas-card-body">
                <h3>${safeText(article.title)}</h3>
                <p>${safeText(article.atlas.shortFeature)}</p>
                <div class="atlas-tags">
                  ${(article.atlas.tags || []).map(tag => `<span>${safeText(tag)}</span>`).join("")}
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    ` : `
      <div class="atlas-empty">
        <p>По вашему запросу дефекты не найдены.</p>
        <button type="button" id="atlas-reset">Сбросить поиск</button>
      </div>
    `;

    results.querySelectorAll("[data-atlas-article]").forEach(card => {
      const open = () => {
        const article = atlasArticles.find(item => item.id === card.dataset.atlasArticle);
        if (article) navigate(getItemRoute("vik", article));
      };

      card.addEventListener("click", event => {
        if (!event.target.closest("[data-image-kind]")) open();
      });
      card.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("[data-image-kind]")) {
          event.preventDefault();
          open();
        }
      });
    });

    results.querySelectorAll("[data-image-kind]").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        const card = button.closest(".atlas-card");
        const image = card.querySelector("[data-atlas-image]");

        image.src = button.dataset.imageSrc;
        image.alt = button.dataset.imageAlt;
        image.classList.toggle("atlas-media-photo", button.dataset.imageKind === "photo");
        image.classList.toggle("atlas-media-scheme", button.dataset.imageKind === "scheme");

        card.querySelectorAll("[data-image-kind]").forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
      });
    });

    const reset = document.getElementById("atlas-reset");
    if (reset) {
      reset.addEventListener("click", () => {
        query = "";
        activeCategory = "all";
        syncRoute();
        atlasSearch.value = "";
        document.querySelectorAll("[data-atlas-filter]").forEach(button => {
          const active = button.dataset.atlasFilter === "all";
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        drawCards();
        atlasSearch.focus();
      });
    }
  }

  atlasSearch.addEventListener("input", event => {
    query = event.target.value;
    syncRoute();
    drawCards();
  });

  document.querySelectorAll("[data-atlas-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.atlasFilter;
      syncRoute();
      document.querySelectorAll("[data-atlas-filter]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      drawCards();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      button.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest"
      });
    });
  });

  document.getElementById("back-button")
    .addEventListener("click", () => goBack({ view: "method", method: "vik" }));

  drawCards();
}
