import { content } from "./dom.js";
import { goBack } from "./router.js";

const DIAMETERS = [57, 76, 89, 108, 114, 159, 219, 273, 325, 377, 426, 530];

export function calculateRingWeld(diameterValue) {
  const diameter = Number.parseFloat(String(diameterValue).replace(",", "."));
  if (!Number.isFinite(diameter) || diameter <= 0) return null;

  const millimeters = Math.PI * diameter;
  return {
    millimeters,
    meters: millimeters / 1000
  };
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

      <div class="tool-section" aria-live="polite">
        <div class="tool-label" id="ring-result-label">Длина кольцевого шва</div>
        <div class="tool-result" aria-labelledby="ring-result-label">
          <div id="ring-result-mm" class="tool-result-value">—</div>
          <div id="ring-result-m" class="tool-result-sub">Введите диаметр трубы</div>
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

  const calculate = () => {
    const result = calculateRingWeld(input.value);
    if (!result) {
      resultMM.textContent = "—";
      resultM.textContent = "Введите диаметр трубы";
      return;
    }

    resultMM.textContent = `${Math.round(result.millimeters)} мм`;
    resultM.textContent = `${result.meters.toFixed(3)} м`;
  };

  input.addEventListener("input", calculate);
  content.querySelectorAll("[data-diameter]").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.dataset.diameter;
      calculate();
      input.focus();
    });
  });
}
