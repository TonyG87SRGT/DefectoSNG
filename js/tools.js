const TOOLS = [
  {
    id: "ring-weld",
    title: "Длина кольцевого сварного шва",
    description: "Расчёт длины окружности по диаметру трубы."
  }
];

function renderTools() {

  currentView = {
    type: "tools"
  };

  content.innerHTML = `
    <div class="page-header">

      <button class="back-button" id="back-button">
        ‹
      </button>

      <div>
        <h2>Инструменты</h2>
        <p>Практические помощники дефектоскописта</p>
      </div>

    </div>

    <div class="article-list">

      ${TOOLS.map(tool => `
       <button
    class="article-card"
    data-tool="${tool.id}">

          <span class="article-category">
            Инструмент
          </span>

          <h3>${tool.title}</h3>

          <p>${tool.description}</p>

        </button>
      `).join("")}

    </div>
  `;

  document
    .getElementById("back-button")
    .addEventListener("click", renderHome);
    document
  .querySelectorAll("[data-tool]")
  .forEach(button => {

    button.addEventListener("click", () => {
      openTool(button.dataset.tool);
    });

  });

}

  function openTool(id) {

  switch (id) {

    case "ring-weld":
      renderRingWeld();
      break;

    default:
      alert("Инструмент пока находится в разработке.");

  }

}

