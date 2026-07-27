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
  }
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
    

    renderHome();
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
  const articles = database[methodKey];

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

        renderArticle(methodKey, article);

      });

    });
}


function renderArticle(methodKey, article) {
  const method = methods[methodKey];
  const favorite = isFavorite(article.id);

  currentView = {
    type: "article",
    method: methodKey
  };

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
    .addEventListener(
      "click",
      () => renderMethod(methodKey)
    );

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
}

function renderStructuredArticle(article) {
  return article.sections
    .map(section => {

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

        renderArticle(methodKey, article);

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
          renderArticle(methodKey, article);
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

// PWA: регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

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