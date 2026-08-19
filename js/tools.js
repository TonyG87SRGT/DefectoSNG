import { TOOL_DEFINITIONS, TOOL_MODEL } from "./config.js";
import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";

export function renderTools() {
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">Инструменты</h2><p>${safeText(TOOL_MODEL.global.title)}</p></div>
    </div>
    <section class="tool-model-note" aria-labelledby="tool-model-title">
      <h3 id="tool-model-title">${safeText(TOOL_MODEL.method.title)}</h3>
      <p>${safeText(TOOL_MODEL.method.description)}</p>
      <a href="${getRouteHash({ view: "reference", referenceId: "application-tool-model" })}" data-tool-reference>Открыть карту инструментов и оборудования</a>
    </section>
    <div class="article-list">
      ${TOOL_DEFINITIONS.map(tool => {
        const route = { view: "tool", tool: tool.id };
        return `
          <a class="article-card" href="${getRouteHash(route)}" data-tool="${escapeAttribute(tool.id)}">
            <span class="article-category">${safeText(tool.scope === "global" ? "Общий интерактивный инструмент" : "Профильный инструмент")}</span>
            <h3>${safeText(tool.title)}</h3>
            <p>${safeText(tool.description)}</p>
          </a>
        `;
      }).join("")}
    </div>
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-tool]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ view: "tool", tool: link.dataset.tool });
    });
  });
  content.querySelector("[data-tool-reference]").addEventListener("click", event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate({ view: "reference", referenceId: "application-tool-model" });
  });
}
