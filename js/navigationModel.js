export const MODE_DEFINITIONS = Object.freeze({
  work: Object.freeze({ label: "Работа", description: "Настройки, методики, оценка и инструменты" }),
  atlases: Object.freeze({ label: "Атласы", description: "Дефекты, индикации, сигналы и спектры" }),
  learning: Object.freeze({ label: "Обучение", description: "Основы методов и подробные объяснения" })
});

export const WORK_SECTIONS = Object.freeze({
  vik: Object.freeze([
    "vik-control-section",
    "vik-measuring-tools",
    "vik-evaluation-section"
  ]),
  uzk: Object.freeze([
    "uzk-setup-section",
    "uzk-control-section",
    "uzk-indications-section",
    "uzk-equipment-section",
    "uzk-evaluation-section"
  ]),
  pvk: Object.freeze([
    "pvk-materials-section",
    "pvk-control-section",
    "pvk-evaluation-section"
  ]),
  rk: Object.freeze([
    "rk-preparation-section",
    "rk-control-section",
    "rk-analysis-section",
    "rk-equipment-section",
    "rk-evaluation-section"
  ]),
  vibration: Object.freeze([
    "vibration-measurement-workflow",
    "vibration-diagnostics-workflow",
    "vibration-practical-diagnostics",
    "vibration-tools"
  ])
});

export const LEARNING_SECTIONS = Object.freeze({
  vik: Object.freeze(["vik-basics-section", "vik-base-metal-defects", "vik-fractography"]),
  uzk: Object.freeze(["uzk-basics-section"]),
  pvk: Object.freeze(["pvk-basics-section"]),
  rk: Object.freeze(["rk-basics-section"]),
  vibration: Object.freeze([
    "vibration-basics",
    "vibration-parameters-analysis",
    "vibration-reference"
  ])
});

export const ATLAS_ENTRIES = Object.freeze([
  Object.freeze({ method: "vik", itemId: "vik-defects", label: "Дефекты сварных соединений" }),
  Object.freeze({ method: "vik", itemId: "vik-base-metal-defects", label: "Дефекты основного металла" }),
  Object.freeze({ method: "vik", itemId: "vik-fractography", label: "Фрактография" }),
  Object.freeze({ method: "uzk", itemId: "uzk-echo-atlas", label: "Эхо-сигналы УЗК" }),
  Object.freeze({ method: "pvk", itemId: "pvk-indications-atlas", label: "Индикации ПВК" }),
  Object.freeze({ method: "rk", itemId: "rk-radiographic-atlas", label: "Радиографические индикации" }),
  Object.freeze({ method: "vibration", itemId: "vibration-fault-atlas", label: "Неисправности машин" }),
  Object.freeze({ method: "vibration", itemId: "vibration-spectrum-atlas", label: "Спектры вибрации" })
]);

export const TASK_HUBS = Object.freeze({
  setup: Object.freeze({
    title: "Настройка приборов",
    description: "Практические настройки, уже доступные в справочнике.",
    entries: Object.freeze([
      Object.freeze({ method: "uzk", itemId: "uzk-setup-section" })
    ])
  }),
  criteria: Object.freeze({
    title: "Оценка и критерии",
    description: "Переход к оценке результатов по выбранному методу и применимой НТД.",
    entries: Object.freeze([
      Object.freeze({ method: "vik", itemId: "vik-evaluation-section" }),
      Object.freeze({ method: "uzk", itemId: "uzk-evaluation-section" }),
      Object.freeze({ method: "pvk", itemId: "pvk-evaluation-section" }),
      Object.freeze({ method: "rk", itemId: "rk-evaluation-section" }),
      Object.freeze({ method: "vibration", itemId: "vibration-reference" })
    ])
  })
});

export function getModeSectionIds(methodKey, mode) {
  return mode === "learning"
    ? LEARNING_SECTIONS[methodKey] || []
    : WORK_SECTIONS[methodKey] || [];
}
