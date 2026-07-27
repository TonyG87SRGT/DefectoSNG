function renderRingWeld() {

  content.innerHTML = `

    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>Длина кольцевого сварного шва</h2>
        <p>Инструмент находится в разработке</p>
      </div>

    </div>

  `;

  document
    .getElementById("back-button")
    .addEventListener("click", renderTools);

}
  
