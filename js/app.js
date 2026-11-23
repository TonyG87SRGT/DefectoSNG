import { loadCriteriaData, renderCriteriaFinder } from "./criteria.js";
import { content, navButtons, searchInput, setActiveNav } from "./dom.js";
import { renderFavorites, updateFavoriteBadge } from "./favorites.js";
import { setupImageViewer } from "./imageViewer.js";
import { registerPwa } from "./pwa.js";
import { navigate, replaceRoute, startRouter } from "./router.js";
import { buildSearchIndex, renderSearch } from "./search.js";
import { getChildren, getItem, isAtlasItem, loadData } from "./store.js";
import { renderAtlasGroup, renderAtlasHome, renderDefect, renderHome, renderNotFound } from "./views.js";

let criteriaData = null;

function focusView(route) {
  if (route.view === "home" || route.view === "search") return;
  requestAnimationFrame(() => {
    const heading = content.querySelector("h2[tabindex='-1']");
    if (heading && !content.contains(document.activeElement)) heading.focus();
  });
}

function renderRoute(route) {
  searchInput.value = route.view === "search" ? route.query || "" : "";
  if (route.view === "home") { setActiveNav(""); renderHome(criteriaData); }
  else if (route.view === "atlas") { setActiveNav("atlas"); renderAtlasHome(); }
  else if (route.view === "criteria") { setActiveNav("criteria"); renderCriteriaFinder({ criterionId: route.criterionId, query: route.query }); }
  else if (route.view === "favorites") { setActiveNav("favorites"); renderFavorites(); }
  else if (route.view === "search") { setActiveNav(""); renderSearch(route.query || ""); }
  else if (route.view === "atlasItem") {
    setActiveNav("atlas");
    const item = getItem(route.method, route.itemId);
    if (!item || !isAtlasItem(route.method, route.itemId)) renderNotFound("Визуальная карточка не найдена");
    else if (getChildren(route.method, route.itemId).length) renderAtlasGroup(route.method, item);
    else renderDefect(route.method, item, criteriaData);
  } else renderNotFound();
  focusView(route);
}

function setupNavigation() {
  document.getElementById("brand-home")?.addEventListener("click", () => navigate({ view: "home" }));
  searchInput.addEventListener("input", event => replaceRoute({ view: "search", query: event.target.value }));
  navButtons.forEach(button => button.addEventListener("click", () => {
    if (button.dataset.action === "atlas") navigate({ view: "atlas" });
    if (button.dataset.action === "criteria") navigate({ view: "criteria", query: "" });
    if (button.dataset.action === "favorites") navigate({ view: "favorites" });
  }));
}

async function bootstrap() {
  registerPwa();
  setupImageViewer();
  setupNavigation();
  try {
    await loadData();
    criteriaData = await loadCriteriaData();
    buildSearchIndex(criteriaData);
    updateFavoriteBadge();
    startRouter(renderRoute);
  } catch (error) {
    console.error(error);
    content.innerHTML = `<div class="empty-state" role="alert">Не удалось загрузить атлас или нормативные критерии.</div>`;
  }
}

bootstrap();
