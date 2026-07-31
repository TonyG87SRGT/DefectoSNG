function renderRingWeld() {
  currentView = {
    type: "tool",
    toolId: "ring-weld"
  };

  content.innerHTML = `

    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>Длина кольцевого сварного шва</h2>
        <p>Расчёт длины окружности трубы</p>
      </div>

    </div>

    <div class="tool-card">

      <div class="tool-section">

        <label class="tool-label">
          Диаметр трубы (мм)
        </label>

        <input
          id="ring-diameter"
          class="tool-input"
          type="number"
          inputmode="decimal"
          placeholder="Например: 530">

      </div>

      <div class="tool-section">

        <label class="tool-label">
          Быстрый выбор
        </label>

        <div class="tool-chip-grid">

          <button class="tool-chip" data-diameter="57">57</button>
          <button class="tool-chip" data-diameter="76">76</button>
          <button class="tool-chip" data-diameter="89">89</button>
          <button class="tool-chip" data-diameter="108">108</button>

          <button class="tool-chip" data-diameter="114">114</button>
          <button class="tool-chip" data-diameter="159">159</button>
          <button class="tool-chip" data-diameter="219">219</button>
          <button class="tool-chip" data-diameter="273">273</button>

          <button class="tool-chip" data-diameter="325">325</button>
          <button class="tool-chip" data-diameter="377">377</button>
          <button class="tool-chip" data-diameter="426">426</button>
          <button class="tool-chip" data-diameter="530">530</button>

        </div>

      </div>

      <div class="tool-section">

        <label class="tool-label">
          Длина кольцевого шва
        </label>

        <div class="tool-result">

          <div
            id="ring-result-mm"
            class="tool-result-value">
            —
          </div>

          <div
            id="ring-result-m"
            class="tool-result-sub">
            —
          </div>

        </div>

        <div class="tool-formula">

          Формула:<br>
          <strong>L = π × D</strong>

        </div>

      </div>

    </div>

  `;

  document
    .getElementById("back-button")
    .addEventListener("click", () => history.back());

  const input =
    document.getElementById("ring-diameter");

  const resultMM =
    document.getElementById("ring-result-mm");

  const resultM =
    document.getElementById("ring-result-m");
    
      function calculate() {

    const diameter =
      parseFloat(input.value.replace(",", "."));

    if (!diameter || diameter <= 0) {

      resultMM.textContent = "—";
      resultM.textContent = "Введите диаметр трубы";

      return;

    }

    const length = Math.PI * diameter;

    resultMM.textContent =
      `${Math.round(length)} мм`;

    resultM.textContent =
      `${(length / 1000).toFixed(3)} м`;

  }

  input.addEventListener("input", calculate);

  document
    .querySelectorAll("[data-diameter]")
    .forEach(button => {

      button.addEventListener("click", () => {

        input.value =
          button.dataset.diameter;

        calculate();

      });

    });

  calculate();

}