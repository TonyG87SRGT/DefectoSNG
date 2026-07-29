const content = document.getElementById("app-content");
const searchInput = document.getElementById("search");
const navButtons = document.querySelectorAll(".nav-button");

const methods = {
  vik: {
    short: "ВИК",
    title: "Визуальный и измерительный контроль",
    icon: "⌕"
  },

  uzk: {
    short: "УЗК",
    title: "Ультразвуковой контроль",
    icon: "◉"
  },

  pvk: {
    short: "ПВК",
    title: "Капиллярный контроль",
    icon: "◌"
  },
  
  vibration: {
  short: "ВД",
  title: "Вибродиагностика",
  icon: "📈"
}
};

const database = {
  vik: [],
  uzk: [],
  pvk: [],
  vibration: []
};

let currentView = {
  type: "home",
  method: null
};


const FAVORITES_KEY = "defectosng-favorites";

const ATLAS_CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "cracks-holes", label: "Трещины и отверстия" },
  { id: "depressions", label: "Канавки и углубления" },
  { id: "excess-metal", label: "Лишний металл" },
  { id: "shape", label: "Отклонения формы" },
  { id: "internal", label: "Внутренние дефекты" }
];


function getFavorites() {
  try {
    return JSON.parse(
      localStorage.getItem(FAVORITES_KEY)
    ) || [];
  } catch {
    return [];
  }
}


function saveFavorites(favorites) {
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(favorites)
  );

  updateFavoriteBadge();
}


function isFavorite(articleId) {
  return getFavorites().includes(articleId);
}


function toggleFavorite(articleId) {
  let favorites = getFavorites();

  if (favorites.includes(articleId)) {
    favorites = favorites.filter(
      id => id !== articleId
    );
  } else {
    favorites.push(articleId);
  }

  saveFavorites(favorites);

  return favorites.includes(articleId);
}


function updateFavoriteBadge() {
  const badge =
    document.getElementById("favorite-badge");

  if (!badge) return;

  const count = getFavorites().length;

  badge.textContent = count;

  badge.classList.toggle(
    "visible",
    count > 0
  );
}


async function loadData() {
  try {
    const [vik, uzk, pvk, vibration] = await Promise.all([
  fetch("data/vik.json").then(response => response.json()),
  fetch("data/uzk.json").then(response => response.json()),
  fetch("data/pvk.json").then(response => response.json()),
  fetch("data/vibration.json").then(response => response.json())
]);
    database.vik = vik;
    database.uzk = uzk;
    database.pvk = pvk;
    database.vibration = vibration;
    

    const route = window.location.hash;

    if (route === "#atlas") {
      renderAtlas({ skipHistory: true });
    } else if (route.startsWith("#article=")) {
      const articleId = decodeURIComponent(route.slice("#article=".length));
      const article = database.vik.find(item => item.id === articleId);

      if (article?.atlas?.enabled) {
        renderArticle("vik", article, { returnTo: "atlas", skipHistory: true });
      } else {
        renderHome();
      }
    } else {
      renderHome();
    }

    updateFavoriteBadge();

  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="empty-state">
        Не удалось загрузить данные справочника.
      </div>
    `;
  }
}


function setActiveNav(action) {
  navButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.action === action
    );
  });
}


function renderHome() {
  currentView = {
    type: "home",
    method: null
  };

  setActiveNav("home");

  content.innerHTML = `
    <p class="section-label">Методы контроля и диагностики</p>

    <div class="method-grid">

      <button class="method-card vik" data-method="vik">

        <div class="method-icon">⌕</div>

        <div class="method-info">
          <h2>ВИК</h2>
          <p>Визуальный и измерительный контроль</p>
        </div>

        <div class="arrow">›</div>

      </button>


      <button class="method-card uzk" data-method="uzk">

        <div class="method-icon">◉</div>

        <div class="method-info">
          <h2>УЗК</h2>
          <p>Ультразвуковой контроль</p>
        </div>

        <div class="arrow">›</div>

      </button>


      <button class="method-card pvk" data-method="pvk">

        <div class="method-icon">◌</div>

        <div class="method-info">
          <h2>ПВК</h2>
          <p>Капиллярный контроль</p>
        </div>

        <div class="arrow">›</div>

      </button>
      
      <button
  class="method-card vibration"
  data-method="vibration">

  <div class="method-icon">📈</div>

  <div class="method-info">
    <h2>ВД</h2>
    <p>Вибродиагностика</p>
  </div>

  <div class="arrow">›</div>

</button>

    </div>


    <p class="section-label quick-title">
      Быстрый доступ
    </p>

    <div class="quick-grid">

      <button class="quick-card" data-quick="favorites">
        <span>☆</span>
        <small>Избранное</small>
      </button>

      <button class="quick-card" data-quick="tools">
    <span>🧰</span>
    <small>Инструменты</small>
</button>

      <button class="quick-card" data-quick="documents">
        <span>▤</span>
        <small>Документы</small>
      </button>

    </div>
  `;

  document
    .querySelectorAll("[data-method]")
    .forEach(button => {

      button.addEventListener("click", () => {
        renderMethod(button.dataset.method);
      });

    });


  document
  .querySelectorAll("[data-quick]")
  .forEach(button => {

    button.addEventListener("click", () => {

      if (button.dataset.quick === "tools") {
        renderTools();
        return;
      }

      renderComingSoon(button.dataset.quick);

    });

  });
}


function renderMethod(methodKey) {
  const method = methods[methodKey];
  const articles = database[methodKey].filter(article => !article.parentId);

  currentView = {
    type: "method",
    method: methodKey
  };

  content.innerHTML = `
    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>${method.short}</h2>
        <p>${method.title}</p>
      </div>

    </div>

    <div class="article-list">

      ${articles.map(article => `
        <button
          class="article-card"
          data-article="${article.id}"
        >

          <span class="article-category">
            ${article.category}
          </span>

          <h3>${article.title}</h3>

          <p>${article.summary || article.text || "Открыть материал"}</p>

        </button>
      `).join("")}

    </div>
  `;

  document
    .getElementById("back-button")
    .addEventListener("click", renderHome);


  document
    .querySelectorAll("[data-article]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const article = articles.find(
          item => item.id === button.dataset.article
        );

        openArticle(methodKey, article);

      });

    });
}


function openArticle(methodKey, article, options = {}) {
  if (!article) return;

  if (methodKey === "vik" && article.id === "vik-defects") {
    renderAtlas();
    return;
  }

  const childArticles = database[methodKey].filter(
    item => item.parentId === article.id
  );

  if (childArticles.length) {
    renderArticleGroup(methodKey, article, childArticles);
    return;
  }

  renderArticle(methodKey, article);
}


function renderArticleGroup(methodKey, groupArticle, childArticles) {
  const method = methods[methodKey];

  currentView = {
    type: "article-group",
    method: methodKey,
    groupId: groupArticle.id
  };

  content.innerHTML = `
    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>${method.short}</h2>
        <p>${method.title}</p>
      </div>

    </div>

    <div class="article-group-header">
      <span class="article-category">
        ${groupArticle.category}
      </span>

      <h2>${groupArticle.title}</h2>

      ${
        groupArticle.text || groupArticle.summary
          ? `<p>${groupArticle.summary || groupArticle.text}</p>`
          : ""
      }
    </div>

    <div class="article-list">
      ${childArticles.map(article => `
        <button
          class="article-card"
          data-group-article="${article.id}"
        >
          <span class="article-category">
            ${article.category}
          </span>

          <h3>${article.title}</h3>

          <p>${article.summary || article.text || "Открыть материал"}</p>
        </button>
      `).join("")}
    </div>
  `;

  document
    .getElementById("back-button")
    .addEventListener("click", () => renderMethod(methodKey));

  document
    .querySelectorAll("[data-group-article]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const article = childArticles.find(
          item => item.id === button.dataset.groupArticle
        );

        if (article) {
          renderArticle(methodKey, article);
        }
      });
    });
}


function getAtlasArticles() {
  return database.vik.filter(article => article.atlas?.enabled);
}

function normalizeAtlasSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function renderAtlas(initialState = {}) {
  const atlasArticles = getAtlasArticles();
  let activeCategory = initialState.category || "all";
  let query = initialState.query || "";

  currentView = {
    type: "atlas",
    method: "vik"
  };

  if (!initialState.skipHistory) {
    if (!history.state) {
      history.replaceState({ view: "method", method: "vik" }, "", "#vik");
    }
    history.pushState({ view: "atlas" }, "", "#atlas");
  }

  setActiveNav("home");

  content.innerHTML = `
    <div class="page-header atlas-page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться в раздел ВИК">‹</button>
      <div>
        <h2>Атлас дефектов сварных соединений</h2>
        <p>Сравните обнаруженный дефект с фотографиями и схемами. Нажмите на карточку, чтобы открыть подробное описание, причины возникновения и способы контроля.</p>
      </div>
    </div>

    <section class="atlas-controls" aria-label="Поиск и фильтры атласа">
      <label class="atlas-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="atlas-search"
          type="search"
          placeholder="Поиск по названию и признакам..."
          autocomplete="off"
          value="${query.replace(/"/g, "&quot;")}"
          aria-label="Поиск дефекта в атласе"
        >
      </label>

      <div class="atlas-filters" role="group" aria-label="Категории дефектов">
        ${ATLAS_CATEGORIES.map(category => `
          <button
            class="atlas-filter ${category.id === activeCategory ? "active" : ""}"
            type="button"
            data-atlas-filter="${category.id}"
            aria-pressed="${category.id === activeCategory}"
          >${category.label}</button>
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
      <div class="atlas-count">Показано дефектов: ${filtered.length}</div>
      <div class="atlas-grid">
        ${filtered.map(article => {
          const hasPhoto = Boolean(article.atlas.photo);
          const hasScheme = Boolean(article.atlas.scheme);
          const defaultKind = hasPhoto ? "photo" : "scheme";
          const defaultSrc = article.atlas[defaultKind];
          const defaultLabel = defaultKind === "photo" ? "Фотография" : "Техническая схема";

          return `
            <article
              class="atlas-card"
              data-atlas-article="${article.id}"
              role="link"
              tabindex="0"
              aria-label="Открыть статью: ${article.title}"
            >
              <div class="atlas-card-media">
                <img
                  src="${defaultSrc}"
                  alt="${defaultLabel} дефекта «${article.title}»"
                  loading="lazy"
                  decoding="async"
                  data-atlas-image
                >

                ${hasPhoto && hasScheme ? `
                  <div class="atlas-image-toggle" role="group" aria-label="Вид изображения для дефекта ${article.title}">
                    <button
                      type="button"
                      class="active"
                      data-image-kind="photo"
                      data-image-src="${article.atlas.photo}"
                      data-image-alt="Фотография дефекта «${article.title}»"
                      aria-pressed="true"
                    >Фото</button>
                    <button
                      type="button"
                      data-image-kind="scheme"
                      data-image-src="${article.atlas.scheme}"
                      data-image-alt="Техническая схема дефекта «${article.title}»"
                      aria-pressed="false"
                    >Схема</button>
                  </div>
                ` : ""}
              </div>

              <div class="atlas-card-body">
                <h3>${article.title}</h3>
                <p>${article.atlas.shortFeature}</p>
                <div class="atlas-tags">
                  ${(article.atlas.tags || []).map(tag => `<span>${tag}</span>`).join("")}
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
        if (article) renderArticle("vik", article, { returnTo: "atlas" });
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
        const toggleButtons = card.querySelectorAll("[data-image-kind]");

        image.src = button.dataset.imageSrc;
        image.alt = button.dataset.imageAlt;

        toggleButtons.forEach(item => {
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
    drawCards();
  });

  document.querySelectorAll("[data-atlas-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.atlasFilter;
      document.querySelectorAll("[data-atlas-filter]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      drawCards();
    });
  });

  document.getElementById("back-button")
    .addEventListener("click", () => history.back());

  drawCards();
}

function renderArticle(methodKey, article, options = {}) {
  const method = methods[methodKey];
  const favorite = isFavorite(article.id);

  currentView = {
    type: "article",
    method: methodKey,
    returnTo: options.returnTo || null
  };

  if (options.returnTo === "atlas" && !options.skipHistory) {
    history.pushState(
      { view: "article", method: methodKey, articleId: article.id, returnTo: "atlas" },
      "",
      `#article=${encodeURIComponent(article.id)}`
    );
  }

  const articleBody = article.sections
    ? renderStructuredArticle(article)
    : `<p>${article.text || ""}</p>`;

  content.innerHTML = `
    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>${method.short}</h2>
        <p>${method.title}</p>
      </div>

    </div>

    <article class="article-view">

      <span class="article-category">
        ${article.category}
      </span>

      <div class="article-title-row">

        <h2>${article.title}</h2>

        <button
          class="favorite-button ${favorite ? "active" : ""}"
          id="favorite-button"
          aria-label="Добавить в избранное"
        >
          ${favorite ? "★" : "☆"}
        </button>

      </div>

      ${
        article.summary
          ? `<p class="article-summary">${article.summary}</p>`
          : ""
      }

      ${articleBody}

    </article>
  `;

  document
    .getElementById("back-button")
    .addEventListener("click", () => {
      if (options.returnTo === "atlas") {
        history.back();
        return;
      }

      if (article.parentId) {
        const parentArticle = database[methodKey].find(
          item => item.id === article.parentId
        );

        if (parentArticle) {
          openArticle(methodKey, parentArticle);
          return;
        }
      }

      renderMethod(methodKey);
    });

  document
    .getElementById("favorite-button")
    .addEventListener("click", event => {

      const nowFavorite =
        toggleFavorite(article.id);

      event.currentTarget.classList.toggle(
        "active",
        nowFavorite
      );

      event.currentTarget.textContent =
        nowFavorite ? "★" : "☆";

    });

  document
    .querySelectorAll("[data-related-article]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const relatedId = button.dataset.relatedArticle;
        const relatedArticle = database[methodKey]
          .find(item => item.id === relatedId);

        if (relatedArticle) {
          renderArticle(methodKey, relatedArticle, options);
        }
      });
    });
}

function renderStructuredArticle(article) {
  return article.sections
    .map(section => {

      if (section.type === "facts") {
        return `
          <section class="article-facts">
            ${section.title ? `<h3>${section.title}</h3>` : ""}

            <dl class="article-facts-grid">
              ${(section.items || [])
                .map(item => `
                  <div class="article-fact">
                    <dt>${item.label}</dt>
                    <dd>${item.value}</dd>
                  </div>
                `)
                .join("")}
            </dl>
          </section>
        `;
      }

      if (section.type === "text") {
        return `
          <section class="article-section">
            <h3>${section.title}</h3>
            <p>${section.content}</p>
          </section>
        `;
      }

      if (section.type === "steps") {
        return `
          <section class="article-section">
            <h3>${section.title}</h3>

            <ol>
              ${section.items
                .map(item => `<li>${item}</li>`)
                .join("")}
            </ol>
          </section>
        `;
      }

      if (section.type === "list") {
        return `
          <section class="article-section">
            <h3>${section.title}</h3>

            <ul>
              ${section.items
                .map(item => `<li>${item}</li>`)
                .join("")}
            </ul>
          </section>
        `;
      }

      if (section.type === "warning") {
        return `
          <section class="article-warning">
            <h3>⚠ ${section.title}</h3>
            <p>${section.content}</p>
          </section>
        `;
      }

      if (section.type === "table") {
        return `
          <section class="article-section article-table-section">

            ${
              section.title
                ? `<h3>${section.title}</h3>`
                : ""
            }

            <div class="article-table-scroll">

              <table class="article-table">

                <thead>
                  <tr>
                    ${(section.headers || [])
                      .map(header => `<th>${header}</th>`)
                      .join("")}
                  </tr>
                </thead>

                <tbody>
                  ${(section.rows || [])
                    .map(row => `
                      <tr>
                        ${row
                          .map(cell => `<td>${cell}</td>`)
                          .join("")}
                      </tr>
                    `)
                    .join("")}
                </tbody>

              </table>

            </div>

            ${
              section.note
                ? `<p class="article-table-note">${section.note}</p>`
                : ""
            }

          </section>
        `;
      }

      if (section.type === "image") {
        return `
          <figure class="article-image">

            <img
              src="${section.src}"
              alt="${section.alt || section.title || ""}"
              loading="lazy"
              class="zoomable-image"
              data-full-image="${section.src}"
            >

            ${
              section.title || section.caption
                ? `
                  <figcaption>
                    ${
                      section.title
                        ? `<strong>${section.title}</strong>`
                        : ""
                    }

                    ${
                      section.caption
                        ? `<span>${section.caption}</span>`
                        : ""
                    }
                  </figcaption>
                `
                : ""
            }

          </figure>
        `;
      }

      if (section.type === "tip") {
        return `
          <section class="article-callout article-tip">
            <h3>💡 ${section.title}</h3>
            <p>${section.content}</p>
          </section>
        `;
      }

      if (section.type === "practice") {
        return `
          <section class="article-callout article-practice">
            <h3>🔧 ${section.title}</h3>
            <p>${section.content}</p>
          </section>
        `;
      }

      if (section.type === "related") {
        return `
          <section class="article-related">
            <h3>↗ ${section.title}</h3>

            <div class="article-related-list">
              ${(section.items || [])
                .map(item => `
                  <button
                    class="article-related-link"
                    data-related-article="${item.id}"
                  >
                    ${item.title}
                  </button>
                `)
                .join("")}
            </div>
          </section>
        `;
      }

      if (section.type === "documents") {
        return `
          <section class="article-documents">
            <h3>▤ ${section.title}</h3>

            <ul>
              ${section.items
                .map(item => `<li>${item}</li>`)
                .join("")}
            </ul>
          </section>
        `;
      }

      return "";

    })
    .join("");
}

function getSectionSearchText(sections = []) {
  return sections
    .map(section => {
      return [
        section.title || "",
        section.content || "",
        ...(section.items || [])
      ].join(" ");
    })
    .join(" ");
}


function getAllArticles() {
  return Object.entries(database).flatMap(
    ([methodKey, articles]) => {

      return articles.map(article => ({
        ...article,
        methodKey,
        searchText: [
          article.title || "",
          article.category || "",
          article.text || "",
          article.summary || "",
          ...(article.tags || []),
          article.atlas?.shortFeature || "",
          ...(article.atlas?.aliases || []),
          ...(article.atlas?.tags || []),
          getSectionSearchText(article.sections)
        ].join(" ")
      }));

    }
  );
}


function renderSearch(query) {
  const normalizedQuery = query
    .trim()
    .toLowerCase();

  if (!normalizedQuery) {
    renderHome();
    return;
  }

  currentView = {
    type: "search",
    method: null
  };

  setActiveNav("search");

  const results = getAllArticles().filter(article => {

    const searchableText = [
      article.searchText || "",
      methods[article.methodKey].short,
      methods[article.methodKey].title
    ]
      .join(" ")
      .toLowerCase();

    const normalizeSearch = value =>
      value
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/№/g, " ")
        .replace(/[^a-zа-я0-9]+/gi, " ")
        .trim();

    const normalizedText = normalizeSearch(searchableText);
    const normalizedWords = normalizedText.split(/\s+/);

    const queryWords = normalizeSearch(normalizedQuery)
      .split(/\s+/)
      .filter(Boolean);

    return queryWords.every(queryWord => {

      if (queryWord.length <= 2) {
        return normalizedWords.includes(queryWord);
      }

      const stem = queryWord.slice(
        0,
        Math.max(4, queryWord.length - 2)
      );

      return normalizedWords.some(word =>
        word === queryWord ||
        word.startsWith(stem)
      );

    });

  });


  content.innerHTML = `
    <div class="search-status">
      Найдено: ${results.length}
    </div>

    ${
      results.length

      ? `
        <div class="article-list">

          ${results.map(article => `
            <button
              class="article-card"
              data-search-article="${article.id}"
              data-search-method="${article.methodKey}"
            >

              <span class="article-category">
                ${methods[article.methodKey].short}
                ·
                ${article.category}
              </span>

              <h3>${article.title}</h3>

              <p>${article.summary || article.text || "Открыть материал"}</p>

            </button>
          `).join("")}

        </div>
      `

      : `
        <div class="empty-state">
          Ничего не найдено.<br><br>
          Попробуй изменить запрос.
        </div>
      `
    }
  `;


  document
    .querySelectorAll("[data-search-article]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const methodKey =
          button.dataset.searchMethod;

        const article =
          database[methodKey].find(
            item =>
              item.id ===
              button.dataset.searchArticle
          );

        openArticle(methodKey, article);

      });

    });
}


function renderFavorites() {
  currentView = {
    type: "favorites",
    method: null
  };

  setActiveNav("favorites");

  const favoriteIds = getFavorites();

  const favorites = getAllArticles().filter(
    article => favoriteIds.includes(article.id)
  );

  content.innerHTML = `
    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>Избранное</h2>
        <p>
          Сохранённые материалы:
          ${favorites.length}
        </p>
      </div>

    </div>

    ${
      favorites.length

      ? `
        <div class="article-list">

          ${favorites.map(article => `
            <button
              class="article-card"
              data-favorite-article="${article.id}"
              data-favorite-method="${article.methodKey}"
            >

              <div class="article-card-row">

                <div class="article-card-content">

                  <span class="article-category">
                    ${methods[article.methodKey].short}
                    ·
                    ${article.category}
                  </span>

                  <h3>${article.title}</h3>

                  <p>
                    ${
                      article.summary ||
                      article.text ||
                      "Открыть материал"
                    }
                  </p>

                </div>

                <span class="saved-star">★</span>

              </div>

            </button>
          `).join("")}

        </div>
      `

      : `
        <div class="empty-state">

          <span class="favorite-empty-icon">
            ☆
          </span>

          Здесь пока ничего нет.

          <div class="favorite-hint">
            Открой нужную карточку и нажми
            звёздочку рядом с её названием.
          </div>

        </div>
      `
    }
  `;

  document
    .getElementById("back-button")
    .addEventListener("click", renderHome);

  document
    .querySelectorAll("[data-favorite-article]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const methodKey =
          button.dataset.favoriteMethod;

        const article =
          database[methodKey].find(
            item =>
              item.id ===
              button.dataset.favoriteArticle
          );

        if (article) {
          openArticle(methodKey, article);
        }

      });

    });
}


function renderComingSoon(section) {
  const names = {
    favorites: "Избранное",
    calculators: "Калькуляторы",
    documents: "Документы"
  };

  content.innerHTML = `
    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>${names[section]}</h2>
        <p>Раздел DefectoSNG</p>
      </div>

    </div>

    <div class="empty-state">
      Этот раздел появится в одной из следующих версий.
    </div>
  `;

  document
    .getElementById("back-button")
    .addEventListener("click", renderHome);
}


searchInput.addEventListener("input", event => {
  renderSearch(event.target.value);
});


navButtons.forEach(button => {

  button.addEventListener("click", () => {

    const action = button.dataset.action;

    if (action === "home") {

      searchInput.value = "";
      renderHome();

    }

    if (action === "search") {

      setActiveNav("search");
      searchInput.focus();

      if (!searchInput.value.trim()) {

        content.innerHTML = `
          <div class="empty-state">
            Введи название дефекта, метода,
            настройки или оборудования
            в строку поиска.
          </div>
        `;

      }

    }

    if (action === "favorites") {

      renderFavorites();

    }

  });

});


loadData();

// PWA: регистрация Service Worker и управляемое обновление приложения
if ('serviceWorker' in navigator) {
  let refreshing = false;
  let updatePromptShownFor = null;

  function showPwaUpdatePrompt(worker) {
    if (!worker || updatePromptShownFor === worker) return;

    updatePromptShownFor = worker;

    const previousPrompt = document.getElementById('pwa-update-prompt');
    if (previousPrompt) previousPrompt.remove();

    const prompt = document.createElement('div');
    prompt.id = 'pwa-update-prompt';
    prompt.className = 'pwa-update-prompt';
    prompt.setAttribute('role', 'status');
    prompt.setAttribute('aria-live', 'polite');

    prompt.innerHTML = `
      <div class="pwa-update-prompt__text">
        <strong>Доступна новая версия</strong>
        <span>Обновите DefectoSNG, чтобы получить последние изменения.</span>
      </div>
      <div class="pwa-update-prompt__actions">
        <button type="button" class="pwa-update-prompt__button" data-update-pwa>
          Обновить
        </button>
        <button type="button" class="pwa-update-prompt__dismiss" data-dismiss-pwa-update aria-label="Закрыть">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(prompt);

    requestAnimationFrame(() => {
      prompt.classList.add('visible');
    });

    prompt.querySelector('[data-update-pwa]').addEventListener('click', () => {
      const updateButton = prompt.querySelector('[data-update-pwa]');
      updateButton.disabled = true;
      updateButton.textContent = 'Обновление…';
      worker.postMessage({ type: 'SKIP_WAITING' });
    });

    prompt.querySelector('[data-dismiss-pwa-update]').addEventListener('click', () => {
      prompt.classList.remove('visible');
      window.setTimeout(() => prompt.remove(), 250);
    });
  }

  function watchInstallingWorker(registration) {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showPwaUpdatePrompt(registration.waiting || worker);
      }
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);

      if (registration.waiting) {
        showPwaUpdatePrompt(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        watchInstallingWorker(registration);
      });

      // Проверяем обновление при возвращении в приложение.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(error => {
            console.warn('Service Worker update check failed:', error);
          });
        }
      });

      // И дополнительно — раз в час при долгой работе приложения.
      window.setInterval(() => {
        registration.update().catch(error => {
          console.warn('Service Worker update check failed:', error);
        });
      }, 60 * 60 * 1000);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

window.addEventListener("popstate", event => {
  const state = event.state;

  if (state?.view === "atlas" || window.location.hash === "#atlas") {
    renderAtlas({ skipHistory: true });
    return;
  }

  if (state?.view === "article" && state.articleId) {
    const article = database[state.method || "vik"]
      ?.find(item => item.id === state.articleId);

    if (article) {
      renderArticle(state.method || "vik", article, {
        returnTo: state.returnTo || null,
        skipHistory: true
      });
      return;
    }
  }

  if (state?.view === "method" && state.method) {
    renderMethod(state.method);
    return;
  }

  renderHome();
});

// Полноэкранный просмотр изображений
document.addEventListener("click", event => {

  const image = event.target.closest(".zoomable-image");

  if (image) {

    const overlay = document.createElement("div");
    overlay.className = "image-viewer";

    overlay.innerHTML = `
      <button
        class="image-viewer-close"
        aria-label="Закрыть изображение"
      >
        ×
      </button>

      <img
        src="${image.dataset.fullImage}"
        alt="${image.alt || ""}"
      >
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => {
      if (
        e.target === overlay ||
        e.target.closest(".image-viewer-close")
      ) {
        overlay.remove();
      }
    });

  }

});