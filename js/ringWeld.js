import { content } from "./dom.js";
import { goBack } from "./router.js";
import { calculateRingGeometry } from "./toolCalculations.js";

const DIAMETERS = [57, 76, 89, 108, 114, 159, 219, 273, 325, 377, 426, 530];

export function calculateRingWeld(diameterValue) {
  const result = calculateRingGeometry(diameterValue);
  return result ? { ...result, millimeters: result.circumference } : null;
}

export function renderRingWeld() {
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться к инструментам">‹</button>
      <div>
        <h2 tabindex="-1">Длина кольцевого сварного шва</h2>
        <p>Расчёт длины окружности трубы</p>
      </div>
    </div>

    <div class="tool-card">
      <div class="tool-section">
        <label class="tool-label" for="ring-diameter">Диаметр трубы (мм)</label>
        <input
          id="ring-diameter"
          class="tool-input"
          type="number"
          inputmode="decimal"
          min="0"
          step="any"
          placeholder="Например: 530"
        >
      </div>

      <fieldset class="tool-section tool-fieldset">
        <legend class="tool-label">Быстрый выбор диаметра</legend>
        <div class="tool-chip-grid">
          ${DIAMETERS.map(diameter => `
            <button class="tool-chip" type="button" data-diameter="${diameter}">${diameter}</button>
          `).join("")}
        </div>
      </fieldset>

      <div class="tool-section">
        <label class="tool-label" for="ring-controlled">Фактически проконтролировано, мм — необязательно</label>
        <input id="ring-controlled" class="tool-input" type="number" inputmode="decimal" min="0" step="any" placeholder="Например: 300">
      </div>

      <div class="tool-section" aria-live="polite">
        <div class="tool-label" id="ring-result-label">Длина кольцевого шва</div>
        <div class="tool-result" aria-labelledby="ring-result-label">
          <div id="ring-result-mm" class="tool-result-value">—</div>
          <div id="ring-result-m" class="tool-result-sub">Введите диаметр трубы</div>
        </div>
        <div class="tool-metrics tool-metrics-compact">
          <div class="tool-metric"><small>1/2 периметра</small><strong id="ring-half">—</strong></div>
          <div class="tool-metric"><small>1/4 периметра</small><strong id="ring-quarter">—</strong></div>
          <div class="tool-metric"><small>1/6 периметра</small><strong id="ring-sixth">—</strong></div>
          <div class="tool-metric"><small>Доля контроля</small><strong id="ring-percent">—</strong></div>
        </div>
        <div class="tool-formula">Формула:<br><strong>L = π × D</strong></div>
      </div>
    </div>
  `;

  content.querySelector("#back-button")
    .addEventListener("click", () => goBack({ view: "tools" }));

  const input = content.querySelector("#ring-diameter");
  const resultMM = content.querySelector("#ring-result-mm");
  const resultM = content.querySelector("#ring-result-m");
  const controlled = content.querySelector("#ring-controlled");

  const calculate = () => {
    const result = calculateRingGeometry(input.value, controlled.value);
    if (!result) {
      resultMM.textContent = "—";
      resultM.textContent = "Введите диаметр трубы";
      ["ring-half", "ring-quarter", "ring-sixth", "ring-percent"].forEach(id => {
        content.querySelector(`#${id}`).textContent = "—";
      });
      return;
    }

    resultMM.textContent = `${Math.round(result.circumference)} мм`;
    resultM.textContent = `${result.meters.toFixed(3)} м`;
    content.querySelector("#ring-half").textContent = `${Math.round(result.fractions.half)} мм`;
    content.querySelector("#ring-quarter").textContent = `${Math.round(result.fractions.quarter)} мм`;
    content.querySelector("#ring-sixth").textContent = `${Math.round(result.fractions.sixth)} мм`;
    content.querySelector("#ring-percent").textContent = result.controlledPercent == null
      ? "—"
      : `${result.controlledPercent.toFixed(1)} %`;
  };

  input.addEventListener("input", calculate);
  controlled.addEventListener("input", calculate);
  content.querySelectorAll("[data-diameter]").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.dataset.diameter;
      calculate();
      input.focus();
    });
  });
}
