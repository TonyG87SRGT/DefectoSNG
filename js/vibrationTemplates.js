export const VIBRATION_TEMPLATE_DEFINITIONS = Object.freeze({
  article: Object.freeze({
    label: "Обычная статья",
    sections: Object.freeze([
      "Назначение", "Основной принцип", "На практике", "Важно",
      "Типичная ошибка", "Практический совет", "Связанные материалы"
    ]),
    media: Object.freeze(["photo", "diagram", "table", "gallery"])
  }),
  fault: Object.freeze({
    label: "Карточка неисправности",
    sections: Object.freeze([
      "Описание", "Причины", "Характерные признаки", "Спектр",
      "Временной сигнал", "Проверка", "Похожие неисправности",
      "Рекомендации", "Иллюстрации"
    ]),
    media: Object.freeze(["photo", "diagram", "spectrum", "gallery"])
  }),
  spectrum: Object.freeze({
    label: "Карточка спектра",
    sections: Object.freeze([
      "Изображение", "Диагностический признак", "Возможные причины",
      "Что проверить", "Похожие спектры"
    ]),
    media: Object.freeze(["spectrum", "diagram"])
  }),
  scenario: Object.freeze({
    label: "Практический сценарий",
    sections: Object.freeze([
      "Исходная ситуация", "Возможные причины", "Последовательность проверки",
      "Дополнительные измерения", "Рекомендации"
    ]),
    media: Object.freeze(["photo", "diagram", "table"])
  }),
  reference: Object.freeze({
    label: "Справочный материал",
    sections: Object.freeze(["Назначение", "Справочная таблица", "Пример", "Важно", "Связанные материалы"]),
    media: Object.freeze(["table", "diagram"])
  }),
  tool: Object.freeze({
    label: "Интерактивный инструмент",
    sections: Object.freeze(["Назначение", "Входные данные", "Результат", "Ограничения", "Связанные материалы"]),
    media: Object.freeze(["diagram"])
  })
});

export const VIBRATION_MATERIAL_TYPES = Object.freeze(Object.keys(VIBRATION_TEMPLATE_DEFINITIONS));

export function getVibrationTemplate(type = "article") {
  return VIBRATION_TEMPLATE_DEFINITIONS[type] || VIBRATION_TEMPLATE_DEFINITIONS.article;
}
