import { content } from "./dom.js";
import { goBack } from "./router.js";

export function renderTools() {
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><h2 tabindex="-1">Инструменты</h2></div>
    </div>
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
}
