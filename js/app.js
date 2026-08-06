import { renderAtlas } from "./atlas.js";
import { TOOL_DEFINITIONS } from "./config.js";
import { content, navButtons, searchInput, setActiveNav } from "./dom.js";
import { renderFavorites, updateFavoriteBadge } from "./favorites.js";
import { setupImageViewer } from "./imageViewer.js";
import { registerPwa } from "./pwa.js";
import {
  renderPipelineAtlas,
  renderPipelineJoint,
  renderPipelineReference
} from "./pipelineJoints.js";
import { renderReference, renderReferences } from "./references.js";
import { renderRingWeld } from "./ringWeld.js";
import { navigate, replaceRoute, startRouter } from "./router.js";
import { buildSearchIndex, renderSearch } from "./search.js";
import { METHODS, getItem, getItemRoute, loadData } from "./store.js";
import { renderTools } from "./tools.js";
import { renderVibrationKnowledge, renderVibrationOverview } from "./vibration.js";
import { renderVibrationDiagnosticAssistant, VIBRATION_DIAGNOSTIC_TOOL_ID } from "./vibrationDiagnosticAssistant.js";
import { isVibrationCalculator, renderVibrationCalculator } from "./vibrationCalculators.js";
import { renderVibrationJournal, VIBRATION_JOURNAL_TOOL_ID } from "./vibrationJournal.js";
import {
  renderArticle,
  renderArticleGroup,
  renderComingSoon,
  renderHome,
  renderMethod,
  renderNotFound
} from "./views.js";

const TOOL_RENDERERS = Object.freeze({
  "ring-weld": renderRingWeld
});

function focusRenderedView(route) {
  if (route.view === "home" || route.view === "search") return;

  requestAnimationFrame(() => {
    const heading = content.querySelector("h2[tabindex='-1']");
    if (heading && !content.contains(document.activeElement)) heading.focus();
  });
}

function renderRoute(route) {
  if (route.view === "search") {
    searchInput.value = route.query || "";
    setActiveNav("search");
    renderSearch(route.query || "");
    return true;
  }

  searchInput.value = "";
  if (route.view === "favorites") {
    setActiveNav("favorites");
    renderFavorites();
    return true;
  }

  setActiveNav("home");

  const staticRenderers = {
    home: renderHome,
    references: renderReferences,
    tools: renderTools,
    documents: () => renderComingSoon("documents"),
    atlas: () => renderAtlas(route),
    pipeline: () => renderPipelineAtlas(route)
  };
  if (staticRenderers[route.view]) {
    staticRenderers[route.view]();
    return true;
  }

  if (route.view === "reference") {
    renderReference(route.referenceId);
    return true;
  }

  if (route.view === "pipelineJoint") {
    renderPipelineJoint(route.itemId);
    return true;
  }

  if (route.view === "pipelineReference") {
    renderPipelineReference(route.itemId);
    return true;
  }

  if (route.view === "vibrationKnowledge") {
    renderVibrationKnowledge(route);
    return true;
  }

  if (route.view === "tool") {
    const toolExists = TOOL_DEFINITIONS.some(tool => tool.id === route.tool);
    const renderer = toolExists ? TOOL_RENDERERS[route.tool] : null;
    renderer ? renderer() : renderNotFound("Инструмент не найден");
    return true;
  }

  if (route.view === "method") {
    if (!METHODS[route.method]) {
      renderNotFound("Метод контроля не найден");
    } else if (route.method === "vibration") {
      renderVibrationOverview();
    } else {
      renderMethod(route.method);
    }
    return true;
  }

  if ((route.view === "section" || route.view === "article") && METHODS[route.method]) {
    const article = getItem(route.method, route.itemId);
    if (!article) {
      renderNotFound();
      return true;
    }

    const canonicalRoute = getItemRoute(route.method, article);
    if (canonicalRoute.view !== route.view ||
      canonicalRoute.method !== route.method ||
      canonicalRoute.itemId !== route.itemId) {
      replaceRoute(canonicalRoute);
      return false;
    }

      if (route.view === "article" && route.method === "vibration" && article.id === VIBRATION_DIAGNOSTIC_TOOL_ID) {
        renderVibrationDiagnosticAssistant();
        return true;
      }

      if (route.view === "article" && route.method === "vibration" && isVibrationCalculator(article.id)) {
        renderVibrationCalculator(article);
        return true;
      }

      if (route.view === "article" && route.method === "vibration" && article.id === VIBRATION_JOURNAL_TOOL_ID) {
        renderVibrationJournal(article);
        return true;
      }

    route.view === "section"
      ? renderArticleGroup(route.method, article)
      : renderArticle(route.method, article);
    return true;
  }

  renderNotFound();
  return true;
}

function applyRoute(route) {
  if (renderRoute(route)) focusRenderedView(route);
}

function setupNavigation() {
  searchInput.addEventListener("input", event => {
    replaceRoute({ view: "search", query: event.target.value });
  });

  navButtons.forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "home") navigate({ view: "home" });
      if (action === "favorites") navigate({ view: "favorites" });
      if (action === "search") {
        navigate({ view: "search", query: searchInput.value });
        searchInput.focus();
      }
    });
  });
}

async function bootstrap() {
  registerPwa();
  setupImageViewer();
  setupNavigation();

  try {
    await loadData();
    buildSearchIndex();
    updateFavoriteBadge();
    startRouter(applyRoute);
  } catch (error) {
    console.error(error);
    content.innerHTML = `<div class="empty-state" role="alert">Не удалось загрузить данные справочника.</div>`;
  }
}

bootstrap();
