export const METHODS = Object.freeze({
  vik: Object.freeze({
    short: "ВИК",
    title: "Визуальный и измерительный контроль"
  }),
  uzk: Object.freeze({
    short: "УЗК",
    title: "Ультразвуковой контроль"
  }),
  pvk: Object.freeze({
    short: "ПВК",
    title: "Капиллярный контроль"
  }),
  rk: Object.freeze({ short: "РК", title: "Радиографический контроль" }),
  vibration: Object.freeze({
    short: "ВД",
    title: "Вибродиагностика"
  })
});

export const DATA_FILES = Object.freeze({
  vik: "data/vik.json",
  uzk: "data/uzk.json",
  pvk: "data/pvk.json",
  rk: "data/rk.json",
  vibration: "data/vibration.json"
});

export const REFERENCE_DATA_FILE = "data/references.json";
export const CRITERIA_DATA_FILE = "data/criteria.json";

export const ATLAS_CATEGORIES = Object.freeze([
  Object.freeze({ id: "all", label: "Все" }),
  Object.freeze({ id: "cracks-holes", label: "Трещины и отверстия" }),
  Object.freeze({ id: "depressions", label: "Канавки и углубления" }),
  Object.freeze({ id: "excess-metal", label: "Лишний металл" }),
  Object.freeze({ id: "shape", label: "Отклонения формы" }),
  Object.freeze({ id: "internal", label: "Внутренние дефекты" })
]);

export const ATLAS_CATEGORY_IDS = Object.freeze(
  ATLAS_CATEGORIES
    .filter(category => category.id !== "all")
    .map(category => category.id)
);

export const TOOL_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "ring-weld",
    title: "Длина кольцевого сварного шва",
    description: "Периметр, доли шва и процент фактически проконтролированной длины.",
    category: "Геометрия",
    keywords: ["окружность", "периметр", "процент контроля", "диаметр трубы"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "ut-coordinates",
    title: "Координаты отражателя УЗК",
    description: "Глубина и координата отражателя по пути луча, углу ввода и толщине.",
    category: "УЗК",
    keywords: ["глубина дефекта", "путь по лучу", "координаты несплошности", "ПЭП"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "ut-scan-zone",
    title: "Ход луча и зона сканирования",
    description: "Половина и полный скачок наклонного преобразователя.",
    category: "УЗК",
    keywords: ["скачок луча", "зона сканирования", "угол ввода", "ПЭП"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "db-calculator",
    title: "Амплитуда и децибелы",
    description: "Пересчёт отношения амплитуд, дБ и поправок усиления.",
    category: "Сигнал",
    keywords: ["децибелы", "дБ", "амплитуда", "передаточная поправка"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "ring-position",
    title: "Координата на кольцевом шве",
    description: "Перевод расстояния по окружности в градусы и положение по циферблату.",
    category: "Геометрия",
    keywords: ["циферблат", "координата дефекта", "кольцевой шов", "разметка"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "thickness-analysis",
    title: "Анализ толщинометрии",
    description: "Минимум, среднее, утонение, скорость изменения и справочный прогноз.",
    category: "Толщинометрия",
    keywords: ["толщина", "коррозия", "утонение", "скорость коррозии", "остаточная толщина"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "ndt-converter",
    title: "Конвертер величин НК",
    description: "Акустический путь, глубина, длина волны и эквивалентный диаметр.",
    category: "Расчёты",
    keywords: ["микросекунды", "скорость ультразвука", "длина волны", "эквивалентный диаметр"],
    scope: "global",
    kind: "calculator"
  }),
  Object.freeze({
    id: "ndt-checklist",
    title: "Чек-лист перед контролем",
    description: "Личная оперативная проверка подготовки к ВИК, УЗК, РК, ПВК или МПК.",
    category: "Организация контроля",
    keywords: ["чек лист", "подготовка к контролю", "памятка", "проверка"],
    scope: "global",
    kind: "checklist"
  }),
  Object.freeze({
    id: "vessel-strength",
    title: "Прочность цилиндрической обечайки",
    description: "Допускаемое внутреннее давление гладкой цилиндрической обечайки по ГОСТ 34233.2.",
    category: "Прочность",
    keywords: ["сосуд под давлением", "обечайка", "допускаемое давление", "ГОСТ 34233.2", "толщина стенки"],
    scope: "global",
    kind: "calculator"
  })
]);

export const TOOL_MODEL = Object.freeze({
  global: Object.freeze({
    title: "Интерактивные инструменты приложения",
    description: "Общие калькуляторы и помощники, которые выполняют действие с введёнными данными."
  })
});

export const ARTICLE_STATUSES = Object.freeze(["published", "draft"]);
export const ARTICLE_TYPES = Object.freeze(["article", "section"]);
