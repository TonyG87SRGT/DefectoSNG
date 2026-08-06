export const VIBRATION_CALCULATOR_IDS = Object.freeze([
  "vibration-tool-rotation-frequency", "vibration-tool-harmonics", "vibration-tool-bearing-frequencies",
  "vibration-tool-unit-conversion", "vibration-tool-parameter-selection"
]);

export const PARAMETER_RECOMMENDATIONS = Object.freeze({
  general: { parameter: "Виброскорость корпуса", sensor: "Акселерометр или датчик виброскорости", extra: "Зафиксируйте обороты, нагрузку и направление измерения.", limits: "Конкретную оценку выполняют по документации для машины." },
  low: { parameter: "Виброперемещение", sensor: "Датчик перемещения или низкочастотный акселерометр", extra: "Проверьте рабочий частотный диапазон измерительной цепи.", limits: "Выбор зависит от частоты и конструкции машины." },
  shaft: { parameter: "Относительное перемещение вала", sensor: "Бесконтактный вихретоковый датчик", extra: "Дополнительно контролируйте положение вала и фазовую метку.", limits: "Не заменяет измерение абсолютной вибрации корпуса." },
  bearing: { parameter: "Высокочастотное виброускорение", sensor: "Акселерометр", extra: "Дополните анализом огибающей, температуры и смазки.", limits: "Общий уровень ускорения сам по себе не подтверждает дефект подшипника." },
  slow: { parameter: "Виброперемещение и временной сигнал", sensor: "Датчик с подходящим низкочастотным диапазоном", extra: "Увеличьте длительность записи и контролируйте оборотную метку.", limits: "Категория скорости является ориентировочной, а не нормативной." },
  unknown: { parameter: "Сначала уточните диагностическую задачу", sensor: "Подберите датчик после определения диапазона частот", extra: "Начните с оборотов, конструкции опор и ожидаемых процессов.", limits: "Универсального измеряемого параметра для всех задач нет." }
});

export function recommendParameter(task, equipment, speed) {
  let key = task || "unknown";
  if (task === "high-impact") key = "bearing";
  if (task === "relative-shaft") key = "shaft";
  if (speed === "low" && key === "general") key = "slow";
  return { key, equipment, speed, ...(PARAMETER_RECOMMENDATIONS[key] || PARAMETER_RECOMMENDATIONS.unknown) };
}
