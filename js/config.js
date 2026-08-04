export const METHODS = Object.freeze({
  vik: Object.freeze({
    short: "ВИК",
    title: "Визуальный и измерительный контроль",
    icon: "⌕"
  }),
  uzk: Object.freeze({
    short: "УЗК",
    title: "Ультразвуковой контроль",
    icon: "◉"
  }),
  pvk: Object.freeze({
    short: "ПВК",
    title: "Капиллярный контроль",
    icon: "◌"
  }),
  vibration: Object.freeze({
    short: "ВД",
    title: "Вибродиагностика",
    icon: "📈"
  })
});

export const DATA_FILES = Object.freeze({
  vik: "data/vik.json",
  uzk: "data/uzk.json",
  pvk: "data/pvk.json",
  vibration: "data/vibration.json"
});

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
    description: "Расчёт длины окружности по диаметру трубы."
  })
]);

export const ARTICLE_STATUSES = Object.freeze(["published", "draft"]);
export const ARTICLE_TYPES = Object.freeze(["article", "section"]);
