export const VIBRATION_TAGS = Object.freeze([
  { id: "bearings", label: "Подшипники", aliases: ["подшипник", "наружная обойма", "внутренняя обойма"] },
  { id: "pumps", label: "Насосы", aliases: ["насос", "насосный агрегат"] },
  { id: "motors", label: "Электродвигатели", aliases: ["электродвигатель", "двигатель"] },
  { id: "gearboxes", label: "Редукторы", aliases: ["редуктор", "зубчатая передача"] },
  { id: "cavitation", label: "Кавитация", aliases: ["кавитационный шум"] },
  { id: "misalignment", label: "Несоосность", aliases: ["расцентровка"] },
  { id: "unbalance", label: "Дисбаланс", aliases: ["неуравновешенность"] },
  { id: "fft", label: "FFT", aliases: ["БПФ", "быстрое преобразование фурье"] },
  { id: "rms", label: "RMS", aliases: ["СКЗ", "среднеквадратичное значение"] },
  { id: "velocity", label: "Виброскорость", aliases: ["скорость вибрации"] },
  { id: "orbit", label: "Орбита", aliases: ["орбита ротора", "орбита вала"] },
  { id: "trend", label: "Тренд", aliases: ["трендовый анализ"] },
  { id: "envelope", label: "Огибающая", aliases: ["анализ огибающей"] },
  { id: "bpfo", label: "BPFO", aliases: ["БПФО", "наружное кольцо", "наружная обойма"] },
  { id: "bpfi", label: "BPFI", aliases: ["БПФИ", "внутреннее кольцо", "внутренняя обойма"] },
  { id: "bsf", label: "BSF", aliases: ["частота тел качения"] },
  { id: "ftf", label: "FTF", aliases: ["частота сепаратора"] }
].map(tag => Object.freeze({ ...tag, aliases: Object.freeze(tag.aliases) })));

const TAG_BY_VALUE = new Map(VIBRATION_TAGS.flatMap(tag =>
  [tag.id, tag.label, ...tag.aliases].map(value => [String(value).toLocaleLowerCase("ru-RU"), tag])
));

export function getVibrationTag(value) {
  return TAG_BY_VALUE.get(String(value || "").trim().toLocaleLowerCase("ru-RU")) || null;
}

export function getVibrationAliases(values = []) {
  const aliases = new Set();
  values.forEach(value => {
    const tag = getVibrationTag(value);
    if (tag) [tag.id, tag.label, ...tag.aliases].forEach(alias => aliases.add(alias));
  });
  return [...aliases];
}
