const TOOLS = [
  {
    id: "ring-weld",
    title: "Длина кольцевого сварного шва",
    description: "Расчёт длины окружности по диаметру трубы."
  }
];


function getTool(toolId) {
  return TOOLS.find(tool => tool.id === toolId) || null;
}


function renderTools(options = {}) {
  currentView = {
    type: "tools"
  };

  if (!options.skipHistory) {
    history.pushState(
      { view: "tools" },
      "",
      "#tools"
    );
  }

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
          data-tool="${tool.id}"
        >

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
    .addEventListener("click", () => history.back());

  document
    .querySelectorAll("[data-tool]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openTool(button.dataset.tool);
      });
    });
}


function openTool(toolId, options = {}) {
  const tool = getTool(toolId);

  if (!tool) {
    if (!options.skipHistory) {
      alert("Инструмент пока находится в разработке.");
    }

    renderTools({ skipHistory: true });
    return;
  }

  if (!options.skipHistory) {
    history.pushState(
      {
        view: "tool",
        toolId
      },
      "",
      `#tool=${encodeRoutePart(toolId)}`
    );
  }

  switch (toolId) {
    case "ring-weld":
      renderRingWeld();
      return;

    default:
      renderTools({ skipHistory: true });
  }
}
