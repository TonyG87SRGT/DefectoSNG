const KNOWN_METHODS = new Set(["vik", "rk", "uzk", "pvk", "mk"]);
const CURRENT_STATUSES = new Set(["current", "replaced", "cancelled"]);
const KNOWN_CUSTOM_RULES = new Set(["minimum", "applicability17640", "contactCorrection17640", "controlLevel17640", "frequency17640", "gost32569Table122", "gost32569Pvk", "gost32569Extended", "gost32569RootPenetration", "gost32569RootGeometry", "iso11666Amplitude", "iso11666TotalLength", "iso11666Dsr", "iso11666Grouping", "iso11666Mapping", "stoGazpromIndication"]);

export function effectiveThickness(values = {}) {
  const first = Number(values.thickness1);
  const second = Number(values.thickness2);
  if (!(first > 0)) return null;
  return second > 0 ? Math.min(first, second) : first;
}

export function circumference(diameter) {
  const value = Number(diameter);
  return value > 0 ? Math.PI * value : null;
}

export function assessmentLength(diameter) {
  const value = Number(diameter);
  if (!(value > 0)) return null;
  if (value > 530) return { value: 300, explanation: "Наружный диаметр более 530 мм: оценочный участок 300 мм." };
  const perimeter = circumference(value);
  if (value >= 100) {
    return {
      value: perimeter / 6,
      explanation: `Диаметр 100–530 мм: 1/6 длины кольцевого шва = π × ${formatNumber(value)} / 6.`
    };
  }
  return {
    value: perimeter,
    explanation: `Диаметр менее 100 мм: весь периметр = π × ${formatNumber(value)}.`
  };
}

export function formatNumber(value, digits = 3) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(Number(value));
}

function conditionMatches(condition = {}, values = {}) {
  return Object.entries(condition).every(([key, accepted]) => {
    if (key === "thicknessMin") return Number(values.effectiveThickness) >= Number(accepted);
    if (key === "thicknessMaxExclusive") return Number(values.effectiveThickness) < Number(accepted);
    const list = Array.isArray(accepted) ? accepted : [accepted];
    return list.includes(values[key]);
  });
}

export function selectVariant(criterion, values = {}) {
  const enriched = { ...values, effectiveThickness: effectiveThickness(values) };
  return (criterion.variants || []).find(variant => conditionMatches(variant.when, enriched)) || null;
}

export function evaluateExpression(expression, context) {
  if (!expression || typeof expression !== "object") return null;
  const thickness = context.thickness;
  switch (expression.type) {
    case "fixed":
      return { value: Number(expression.value), text: `${formatNumber(expression.value)} ${expression.unit || ""}`.trim() };
    case "thickness-factor": {
      if (!(thickness > 0)) return null;
      const value = thickness * Number(expression.factor);
      return { value, text: `${formatNumber(expression.factor)} × S = ${formatNumber(value)} ${expression.unit || "мм"}` };
    }
    case "thickness-factor-cap": {
      if (!(thickness > 0)) return null;
      const calculated = thickness * Number(expression.factor);
      const cap = Number(expression.cap);
      return {
        value: Math.min(calculated, cap),
        text: `${formatNumber(expression.factor)} × S = ${formatNumber(calculated)} ${expression.unit || "мм"}; ограничение — не более ${formatNumber(cap)} ${expression.unit || "мм"}`
      };
    }
    case "circumference-fraction": {
      const perimeter = circumference(context.values.diameter);
      if (!(perimeter > 0)) return null;
      const value = perimeter / Number(expression.divisor || 1);
      return { value, text: `π × D / ${expression.divisor} = ${formatNumber(value)} ${expression.unit || "мм"}` };
    }
    case "input-factor": {
      const source = Number(context.values[expression.input]);
      if (!(source >= 0)) return null;
      const value = source * Number(expression.factor);
      return { value, text: `${formatNumber(expression.factor)} × ${expression.inputLabel || expression.input} = ${formatNumber(value)} ${expression.unit || "мм"}` };
    }
    case "sto-gazprom-total": {
      const weldLength = Number(context.values.weldLength);
      if (!(weldLength > 0)) return null;
      const base = Number(expression.value);
      const value = weldLength < 300 ? base / 2 : base;
      return {
        value,
        text: weldLength < 300
          ? `Длина шва ${formatNumber(weldLength)} мм < 300 мм: Σ₃₀₀ / 2 = ${formatNumber(base)} / 2 = ${formatNumber(value)} мм`
          : `Длина шва ${formatNumber(weldLength)} мм: Σ₃₀₀ ≤ ${formatNumber(base)} мм`
      };
    }
    case "min": {
      const options = (expression.values || []).map(item => evaluateExpression(item, context)).filter(Boolean);
      if (!options.length) return null;
      const selected = options.reduce((minimum, item) => item.value < minimum.value ? item : minimum);
      return { value: selected.value, text: `Наименьший предел: ${options.map(item => item.text).join("; ")}` };
    }
    default:
      return null;
  }
}

function findRange(ranges, thickness) {
  return (ranges || []).find(range => {
    const rawMin = Number(range.min);
    const roundedMin = Math.round(rawMin);
    const encodedExclusiveMin = Math.abs(rawMin - roundedMin) > 0 && Math.abs(rawMin - roundedMin) < 0.00001;
    const minMatches = encodedExclusiveMin ? thickness > roundedMin : thickness >= rawMin;
    if (range.max == null) return minMatches;
    const rawMax = Number(range.max);
    const roundedMax = Math.round(rawMax);
    const encodedInclusiveMax = Math.abs(rawMax - roundedMax) > 0 && Math.abs(rawMax - roundedMax) < 0.00001;
    const maxMatches = encodedInclusiveMax ? thickness <= roundedMax : thickness < rawMax;
    return minMatches && maxMatches;
  }) || null;
}

function evaluatedResult({ allowed = null, decision, message, checks = [], thickness = null, values = {} }) {
  return {
    status: "evaluated",
    allowed,
    decision,
    message,
    checks,
    thickness,
    usedSmallerThickness: Number(values.thickness2) > 0,
    assessment: Number(values.diameter) > 0 ? assessmentLength(values.diameter) : null
  };
}

function iso11666LengthBand(thickness, length) {
  if (thickness < 15) return length <= thickness ? "short" : "long";
  if (length <= thickness / 2) return "short";
  if (length <= thickness) return "medium";
  return "long";
}

function evaluateCustomRule(criterion, values, thickness) {
  const rule = criterion.customRule;
  if (!rule) return null;

  if (rule.type === "minimum") {
    const measured = Number(values[rule.input]);
    const limit = Number(rule.value);
    const passed = measured >= limit;
    return evaluatedResult({
      allowed: passed,
      decision: passed ? "ТРЕБОВАНИЕ ВЫПОЛНЕНО" : "ТРЕБОВАНИЕ НЕ ВЫПОЛНЕНО",
      message: passed ? rule.success : rule.failure,
      checks: [{ input: rule.input, label: rule.label, measured, limitText: `не менее ${formatNumber(limit)} ${rule.unit}`, measuredText: `${formatNumber(measured)} ${rule.unit}`, passed, calculation: rule.calculation }],
      thickness,
      values
    });
  }

  if (rule.type === "stoGazpromIndication") {
    const size = Number(values.indicationSize);
    const isDefectSign = size > 1.6;
    return evaluatedResult({
      allowed: null,
      decision: isDefectSign ? "ПРИЗНАК ОБНАРУЖЕНИЯ ДЕФЕКТА" : "ПОРОГ ПРИЗНАКА НЕ ПРЕВЫШЕН",
      message: isDefectSign
        ? "Индикаторный рисунок превышает 1,6 мм в одном из направлений. Определите тип дефекта и оцените его по таблице 6.2; сам рисунок ещё не является отдельным решением о годности."
        : "Размер не превышает установленный п. 6.2.5 порог признака обнаружения. Это не отменяет оценку других выявленных признаков и требований технологии контроля.",
      checks: [{
        input: "indicationSize",
        label: "Максимальный размер индикаторного рисунка",
        measured: size,
        limit: 1.6,
        unit: "мм",
        passed: !isDefectSign,
        calculation: "Признак обнаружения дефекта: максимальный размер в любом направлении > 1,6 мм"
      }],
      thickness,
      values
    });
  }

  if (rule.type === "applicability17640") {
    const temperature = Number(values.temperature);
    const passed = thickness >= 8 && temperature >= 0 && temperature <= 60;
    return evaluatedResult({
      allowed: passed,
      decision: passed ? "В ОБЩЕЙ ОБЛАСТИ ПРИМЕНЕНИЯ" : "ТРЕБУЕТСЯ СПЕЦИАЛЬНАЯ ПРОЦЕДУРА",
      message: passed
        ? "Толщина и температура входят в общую область ГОСТ Р ИСО 17640-2016. Дополнительно подтвердите материал, полное проплавление и применимость ручного УЗК."
        : "Для толщины менее 8 мм или температуры вне 0–60 °C стандарт относит применение к особым условиям уровня D/письменной процедуре.",
      checks: [
        { label: "Толщина", measured: thickness, limitText: "S ≥ 8 мм", measuredText: `${formatNumber(thickness)} мм`, passed: thickness >= 8, calculation: "ГОСТ Р ИСО 17640-2016, раздел 1" },
        { label: "Температура объекта", measured: temperature, limitText: "от 0 до 60 °C", measuredText: `${formatNumber(temperature)} °C`, passed: temperature >= 0 && temperature <= 60, calculation: "ГОСТ Р ИСО 17640-2016, раздел 1" }
      ],
      thickness,
      values
    });
  }

  if (rule.type === "contactCorrection17640") {
    const loss = Number(values.contactLoss);
    const decision = loss <= 2 ? "ПОПРАВКА НЕ ТРЕБУЕТСЯ" : loss <= 12 ? "ВВЕСТИ ПОПРАВКУ" : "ОСТАНОВИТЬ И УСТРАНИТЬ ПРИЧИНУ";
    const message = loss <= 2
      ? "Разница условий акустического контакта не превышает 2 дБ."
      : loss <= 12
        ? "Разницу более 2 и не более 12 дБ следует компенсировать."
        : "При разнице более 12 дБ необходимо выяснить причины потерь и, если возможно, дополнительно подготовить поверхность.";
    return evaluatedResult({ allowed: loss <= 12 ? true : false, decision, message, checks: [], thickness, values });
  }

  if (rule.type === "controlLevel17640") {
    const level = String(values.controlLevel);
    const messages = {
      A: "Уровень A — базовый объём контроля; рекомендуемая связь по таблице 5: уровни качества C и D.",
      B: "Уровень B — повышенная вероятность обнаружения; рекомендуемая связь по таблице 5: уровень качества B.",
      C: "Уровень C назначают по соглашению сторон; конкретные дополнительные сканирования должны быть определены процедурой.",
      D: "Уровень D применяется только в особых случаях по спецификации на продукцию и требует письменной процедуры."
    };
    return evaluatedResult({ allowed: null, decision: `УРОВЕНЬ КОНТРОЛЯ ${level}`, message: messages[level], checks: [], thickness, values });
  }

  if (rule.type === "frequency17640") {
    const frequency = Number(values.frequency);
    const passed = frequency >= 2 && frequency <= 5;
    return evaluatedResult({ allowed: passed, decision: passed ? "ОБЫЧНЫЙ ДИАПАЗОН" : "ОБОСНОВАТЬ В ПРОЦЕДУРЕ", message: passed ? "Частота находится в обычно применяемом диапазоне 2–5 МГц." : "Частота вне 2–5 МГц допускается только при обосновании с учётом затухания, разрешения и требований процедуры.", checks: [{ label: "Частота", measured: frequency, measuredText: `${formatNumber(frequency)} МГц`, limitText: "обычно 2–5 МГц", passed, calculation: "ГОСТ Р ИСО 17640-2016, п. 6.3" }], thickness, values });
  }

  if (rule.type === "gost32569Table122") {
    const range = findRange(rule.ranges, thickness);
    if (!range) return { status: "outside", message: "Для этой толщины в таблице 12.2 нет строки." };
    const checks = rule.fields.map(field => {
      const measured = Number(values[field.input]);
      const limit = Number(range[field.key]);
      return { input: field.input, label: field.label, measured, limit, unit: "мм", passed: measured <= limit, calculation: `${range.label}: допустимо ≤ ${formatNumber(limit)} мм` };
    });
    for (const fixed of rule.fixedChecks || []) {
      const measured = Number(values[fixed.input]);
      checks.push({ input: fixed.input, label: fixed.label, measured, limit: Number(fixed.limit), unit: fixed.unit, passed: measured <= Number(fixed.limit), calculation: `Допустимо ≤ ${formatNumber(fixed.limit)} ${fixed.unit}` });
    }
    const allowed = checks.every(check => check.passed);
    return evaluatedResult({ allowed, decision: allowed ? "ГОДЕН ПО ТАБЛИЦЕ 12.2" : "НЕ ДОПУСКАЕТСЯ", message: allowed ? "Все введённые размеры укладываются в строку таблицы 12.2." : "Превышено хотя бы одно ограничение таблицы 12.2.", checks, thickness, values });
  }

  if (rule.type === "gost32569Pvk") {
    const range = findRange(rule.ranges, thickness);
    if (!range) return { status: "outside", message: "Для этой толщины таблица 12.2 (группа III В) не задаёт строку." };
    const sizeLimit = 3 * Number(range.width);
    const checks = [
      { input: "width", label: "Размер округлой индикации", measured: Number(values.width), limit: sizeLimit, unit: "мм", passed: Number(values.width) <= sizeLimit, calculation: `3 × ${formatNumber(range.width)} = ${formatNumber(sizeLimit)} мм` },
      { input: "totalLength", label: "Сумма на 100 мм", measured: Number(values.totalLength), limit: Number(range.total), unit: "мм", passed: Number(values.totalLength) <= Number(range.total), calculation: `${range.label}: норма суммы таблицы 12.2 для III В — ${formatNumber(range.total)} мм` }
    ];
    const allowed = checks.every(check => check.passed);
    return evaluatedResult({ allowed, decision: allowed ? "ДОПУСТИМО" : "НЕ ДОПУСКАЕТСЯ", message: allowed ? "Одиночная округлая индикация и сумма соответствуют п. 12.3.12." : "Превышена норма п. 12.3.12.", checks, thickness, values });
  }

  if (rule.type === "gost32569Extended") {
    if (values.conditionClass === "special") return evaluatedResult({ allowed: false, decision: "НЕ ДОПУСКАЕТСЯ", message: "В особо ответственных условиях протяжённые дефекты не допускаются.", checks: [], thickness, values });
    const passed = values.halfReferenceState === "not-above";
    return evaluatedResult({ allowed: passed, decision: passed ? "ДОПУСТИМО ПО АМПЛИТУДЕ" : "НЕ ДОПУСКАЕТСЯ", message: passed ? "Сигнал не превышает 0,5 амплитуды сигнала от максимально допустимого искусственного отражателя." : "Протяжённый дефект с сигналом выше 0,5 опорной амплитуды недопустим.", checks: [], thickness, values });
  }

  if (rule.type === "gost32569RootPenetration") {
    const perimeter = circumference(values.diameter);
    if (!(perimeter > 0)) return { status: "incomplete", missing: ["diameter"], message: "Укажите наружный диаметр." };
    const alternatives = rule.alternatives?.[values.rootNormGroup] || [];
    if (!alternatives.length) return evaluatedResult({ allowed: false, decision: "НЕ ДОПУСКАЕТСЯ", message: "Для выбранной группы непровар по оси не допускается.", checks: [], thickness, values });
    const measuredDepth = Number(values.depth);
    const measuredLength = Number(values.totalLength);
    const evaluated = alternatives.map(option => {
      const depthLimit = Math.min(thickness * option.factor, option.cap);
      const lengthLimit = option.perimeterFraction == null ? Infinity : perimeter * option.perimeterFraction;
      return { depthLimit, lengthLimit, passed: measuredDepth <= depthLimit && measuredLength <= lengthLimit, label: option.label };
    });
    const accepted = evaluated.find(item => item.passed);
    const best = accepted || evaluated[0];
    const checks = [
      { label: "Глубина непровара", measured: measuredDepth, limit: best.depthLimit, unit: "мм", passed: measuredDepth <= best.depthLimit, calculation: best.label },
      { label: "Суммарная длина", measured: measuredLength, limit: best.lengthLimit, unit: "мм", passed: measuredLength <= best.lengthLimit, limitText: Number.isFinite(best.lengthLimit) ? `≤ ${formatNumber(best.lengthLimit)} мм` : "не ограничивается", calculation: best.label }
    ];
    return evaluatedResult({ allowed: Boolean(accepted), decision: accepted ? "ДОПУСТИМО" : "НЕ ДОПУСКАЕТСЯ", message: accepted ? `Выполнена строка: ${accepted.label}.` : "Не выполнена ни одна применимая строка таблицы 12.4.", checks, thickness, values });
  }

  if (rule.type === "gost32569RootGeometry") {
    if (values.rootNormGroup !== "A") {
      return evaluatedResult({ allowed: null, decision: "ЧИСЛЕННЫЙ ПРЕДЕЛ НЕ УСТАНОВЛЕН", message: "Таблица 12.4 не регламентирует эту геометрию корня для выбранной группы. Проверьте проектную и технологическую документацию.", checks: [], thickness, values });
    }
    const perimeter = circumference(values.diameter);
    if (!(perimeter > 0)) return { status: "incomplete", missing: ["diameter"], message: "Укажите наружный диаметр." };
    const depthLimit = Math.min(thickness * 0.1, Number(rule.cap));
    const lengthLimit = perimeter / 8;
    const checks = [
      { label: rule.label, measured: Number(values.depth), limit: depthLimit, unit: "мм", passed: Number(values.depth) <= depthLimit, calculation: `min(0,1 × S; ${formatNumber(rule.cap)} мм) = ${formatNumber(depthLimit)} мм` },
      { label: "Суммарная длина", measured: Number(values.totalLength), limit: lengthLimit, unit: "мм", passed: Number(values.totalLength) <= lengthLimit, calculation: `π × D / 8 = ${formatNumber(lengthLimit)} мм` }
    ];
    const allowed = checks.every(check => check.passed);
    return evaluatedResult({ allowed, decision: allowed ? "ДОПУСТИМО" : "НЕ ДОПУСКАЕТСЯ", message: allowed ? "Оба ограничения таблицы 12.4 выполнены." : "Превышен предел глубины или суммарной длины.", checks, thickness, values });
  }

  if (rule.type === "iso11666Amplitude") {
    if (!(thickness >= 8 && thickness < 100)) return { status: "outside", message: "Таблица A.1 применяется при 8 ≤ t < 100 мм." };
    const technique = String(values.referenceTechnique);
    const level = String(values.acceptanceLevel);
    const band = iso11666LengthBand(thickness, Number(values.length));
    const thicknessBand = thickness < 15 ? "8-15" : "15-100";
    const threshold = rule.thresholds?.[technique]?.[level]?.[thicknessBand]?.[band];
    if (!Number.isFinite(Number(threshold))) return { status: "outside", message: "Для выбранного способа, толщины и длины таблица A.1 не задаёт критерий." };
    const measured = Number(values.amplitudeDb);
    const passed = measured <= Number(threshold);
    return evaluatedResult({
      allowed: passed,
      decision: passed ? "ДОПУСТИМО ПО ТАБЛИЦЕ A.1" : "НЕ ДОПУСКАЕТСЯ",
      message: passed ? "Амплитуда не превышает уровень приёмки для выбранной длины." : "Амплитуда превышает уровень приёмки для выбранной длины.",
      checks: [{ input: "amplitudeDb", label: "Амплитуда относительно H₀", measured, limit: Number(threshold), unit: "дБ", passed, calculation: `Способ ${technique}; ${level}; t=${formatNumber(thickness)} мм; l=${formatNumber(values.length)} мм (${band})` }],
      thickness,
      values
    });
  }

  if (rule.type === "iso11666TotalLength") {
    if (!(thickness >= 8 && thickness < 100)) return { status: "outside", message: "Правило применяется при 8 ≤ t < 100 мм." };
    const fraction = values.acceptanceLevel === "AL2" ? 0.2 : 0.3;
    const segment = 6 * thickness;
    const limit = fraction * segment;
    const measured = Number(values.totalLength);
    const passed = measured <= limit;
    return evaluatedResult({ allowed: passed, decision: passed ? "ДОПУСТИМО" : "НЕ ДОПУСКАЕТСЯ", message: `На участке 6t суммарная длина индикаций выше уровня регистрации не должна превышать ${fraction * 100} %.`, checks: [{ input: "totalLength", label: "Суммарная длина", measured, limit, unit: "мм", passed, calculation: `${fraction * 100} % × 6 × ${formatNumber(thickness)} = ${formatNumber(limit)} мм` }], thickness, values });
  }

  if (rule.type === "iso11666Dsr") {
    if (!(thickness >= 8 && thickness < 100)) return { status: "outside", message: "Таблицы A.2/A.3 применяются при 8 ≤ t < 100 мм." };
    const frequencyBand = Number(values.frequency) < 3 ? "1.5-2.5" : "3-5";
    const thicknessBand = thickness < 15 ? "8-15" : thickness < 40 ? "15-40" : "40-100";
    const diameter = rule.values?.[values.waveType]?.[frequencyBand]?.[thicknessBand];
    if (!Number.isFinite(Number(diameter))) return { status: "outside", message: "Для выбранной комбинации таблица не устанавливает диаметр DSR." };
    return evaluatedResult({ allowed: null, decision: `D_DSR = ${formatNumber(diameter)} мм`, message: "Используйте указанное значение при настройке способа 2; это параметр опорного уровня, а не самостоятельное решение о годности.", checks: [], thickness, values });
  }

  if (rule.type === "iso11666Grouping") {
    if (!(thickness >= 8 && thickness < 100)) return { status: "outside", message: "Правило группирования применяется при 8 ≤ t < 100 мм." };
    const longest = Math.max(Number(values.length1), Number(values.length2));
    const dxLimit = 2 * longest;
    const transverseLimit = Math.min(thickness / 2, 10);
    const checks = [
      { label: "Расстояние dx", measured: Number(values.dx), limit: dxLimit, unit: "мм", passed: Number(values.dx) < dxLimit, calculation: `dx < 2 × ${formatNumber(longest)} = ${formatNumber(dxLimit)} мм` },
      { label: "Расстояние dy", measured: Number(values.dy), limit: transverseLimit, unit: "мм", passed: Number(values.dy) < transverseLimit, calculation: `dy < min(t/2; 10) = ${formatNumber(transverseLimit)} мм` },
      { label: "Расстояние dz", measured: Number(values.dz), limit: transverseLimit, unit: "мм", passed: Number(values.dz) < transverseLimit, calculation: `dz < min(t/2; 10) = ${formatNumber(transverseLimit)} мм` }
    ];
    const grouped = checks.every(check => check.passed);
    return evaluatedResult({ allowed: null, decision: grouped ? "ОБЪЕДИНИТЬ В ОДНУ ИНДИКАЦИЮ" : "ОЦЕНИВАТЬ РАЗДЕЛЬНО", message: grouped ? `Объединённая длина l₁₂ = l₁ + l₂ + dx = ${formatNumber(Number(values.length1) + Number(values.length2) + Number(values.dx))} мм; амплитуда — максимальная из двух.` : "Не выполнено хотя бы одно условие группирования.", checks, thickness, values });
  }

  if (rule.type === "iso11666Mapping") {
    const quality = String(values.weldQualityLevel);
    if (quality === "D") {
      return { status: "outside", allowed: null, decision: "ВНЕ ОБЛАСТИ ПРИМЕНЕНИЯ", message: "ГОСТ ISO 11666-2024 не устанавливает уровни приёмки для уровня качества D по ISO 5817." };
    }
    const mapping = quality === "B"
      ? { control: "не ниже B", acceptance: "AL 2", note: "" }
      : { control: "не ниже A", acceptance: "AL 3", note: "" };
    return evaluatedResult({ allowed: null, decision: `${mapping.control}; ${mapping.acceptance}`, message: `Уровень качества ${quality}: контроль ${mapping.control}, уровень приёмки ${mapping.acceptance}.${mapping.note ? ` ${mapping.note}` : ""}`, checks: [], thickness, values });
  }

  return null;
}

export function evaluateCriterion(criterion, values = {}) {
  if (!criterion) return { status: "error", message: "Критерий не найден." };
  const thickness = effectiveThickness(values);
  const context = { thickness, values };
  if (criterion.outcome === "reference-only") {
    return { status: "guidance", decision: "ОТКРОЙТЕ ПРИМЕНИМУЮ НОРМУ", message: criterion.guidance };
  }
  if (criterion.outcome === "detection-only" && !criterion.customRule) {
    return { status: "guidance", decision: "ТРЕБУЕТ ОЦЕНКИ", message: criterion.guidance };
  }

  const selectorInputs = (criterion.inputs || []).filter(input => ["quality", "category"].includes(input));
  const missingSelectors = selectorInputs.filter(input => !values[input]);
  if (missingSelectors.length) return { status: "incomplete", missing: missingSelectors, message: "Выберите условия применения нормы." };

  const variant = selectVariant(criterion, values);
  if ((criterion.variants || []).length && !variant) {
    return { status: "incomplete", message: "Для выбранных условий вариант нормы не найден." };
  }
  const active = variant || criterion;
  const requiredInputs = active.outcome === "prohibited"
    ? selectorInputs
    : (active.inputs || criterion.inputs || []);
  const missing = requiredInputs.filter(input => {
    if (input === "thickness1") return !(Number(values[input]) > 0);
    if (input === "amplitudeState") return !values[input];
    return values[input] == null || values[input] === "" || (typeof values[input] === "number" && !Number.isFinite(values[input]));
  });
  if (missing.length) return { status: "incomplete", missing, message: "Заполните обязательные параметры." };
  const customResult = evaluateCustomRule(active.customRule ? active : criterion, values, thickness);
  if (customResult) return customResult;
  if (active.outcome === "prohibited") {
    return {
      status: "evaluated",
      allowed: false,
      decision: active.directCategory || "НЕ ДОПУСКАЕТСЯ",
      message: active.message || "Дефект не допускается."
    };
  }

  const checks = [];
  if (active.rangeTable) {
    if (!(thickness > 0)) return { status: "incomplete", missing: ["thickness1"], message: "Укажите толщину." };
    const range = findRange(active.rangeTable.ranges, thickness);
    if (!range) return { status: "outside", message: "Для этой толщины в выбранной таблице нет строки." };
    const quality = values.quality;
    const limitValue = quality ? range.limits?.[quality] : range.limit;
    if (!Number.isFinite(Number(limitValue))) return { status: "outside", message: "Для выбранного уровня качества норма не задана." };
    const measured = Number(values[active.rangeTable.input]);
    checks.push({
      input: active.rangeTable.input,
      label: active.rangeTable.label,
      measured,
      limit: Number(limitValue),
      unit: active.rangeTable.unit,
      passed: measured <= Number(limitValue),
      calculation: `Диапазон S: ${range.label}; допустимо ≤ ${formatNumber(limitValue)} ${active.rangeTable.unit}`
    });
  }

  for (const limit of active.limits || []) {
    const evaluated = evaluateExpression(limit.max, context);
    if (!evaluated) return { status: "incomplete", message: `Недостаточно данных для расчёта «${limit.label}».` };
    const measured = Number(values[limit.input]);
    checks.push({
      input: limit.input,
      label: limit.label,
      measured,
      limit: evaluated.value,
      unit: limit.unit || limit.max.unit || "мм",
      passed: measured <= evaluated.value,
      calculation: evaluated.text
    });
  }

  if (active.amplitudeRule) {
    const passed = values.amplitudeState !== "above";
    checks.push({
      input: "amplitudeState",
      label: "Амплитуда эхо-сигнала",
      measuredText: values.amplitudeState === "above" ? "выше браковочного уровня" : "не выше браковочного уровня",
      limitText: "не выше браковочного уровня",
      passed,
      calculation: active.amplitudeRule
    });
  }

  const allowed = checks.length ? checks.every(check => check.passed) : true;
  return {
    status: "evaluated",
    allowed,
    decision: allowed ? "ГОДЕН ПО ВЫБРАННОМУ КРИТЕРИЮ" : "НЕ ДОПУСКАЕТСЯ",
    message: allowed
      ? "Введённые параметры не превышают выбранный нормативный предел."
      : "Превышен хотя бы один нормативный предел. Дальнейшее решение о ремонте или вырезке принимают только по правилам выбранной НТД.",
    checks,
    thickness,
    usedSmallerThickness: Number(values.thickness2) > 0,
    assessment: Number(values.diameter) > 0 ? assessmentLength(values.diameter) : null
  };
}

export function validateCriteriaData(data) {
  const errors = [];
  if (!data || !Array.isArray(data.standards) || !Array.isArray(data.documents) || !Array.isArray(data.criteria)) return ["Корневая модель criteria.json неполна."];
  const documentIds = new Set();
  const currentDocuments = new Set();
  data.documents.forEach((document, index) => {
    const location = `documents[${index}]`;
    if (!document.id) errors.push(`${location}: отсутствует id`);
    if (documentIds.has(document.id)) errors.push(`${location}: повторяющийся id ${document.id}`);
    documentIds.add(document.id);
    if (!CURRENT_STATUSES.has(document.status)) errors.push(`${location}: неизвестный status ${document.status}`);
    if (document.status === "current") currentDocuments.add(document.id);
  });

  const standardIds = new Set();
  data.standards.forEach((standard, index) => {
    const location = `standards[${index}]`;
    if (!standard.id) errors.push(`${location}: отсутствует id`);
    if (standardIds.has(standard.id)) errors.push(`${location}: повторяющийся id ${standard.id}`);
    standardIds.add(standard.id);
    if (!standard.title || !standard.description) errors.push(`${location}: отсутствует название или назначение`);
    if (!Array.isArray(standard.basisDocuments) || !standard.basisDocuments.length) errors.push(`${location}: не заданы basisDocuments`);
    (standard.basisDocuments || []).forEach(id => {
      if (!documentIds.has(id)) errors.push(`${location}: неизвестный документ ${id}`);
    });
  });

  const criterionIds = new Set();
  data.criteria.forEach((criterion, index) => {
    const location = `criteria[${index}]`;
    if (!criterion.id) errors.push(`${location}: отсутствует id`);
    if (criterionIds.has(criterion.id)) errors.push(`${location}: повторяющийся id ${criterion.id}`);
    criterionIds.add(criterion.id);
    if (!KNOWN_METHODS.has(criterion.method)) errors.push(`${location}: неизвестный метод ${criterion.method}`);
    if (!criterion.source?.basisDocument || !criterion.source?.basisClauses?.length) errors.push(`${location}: отсутствует нормативное основание`);
    if (!criterion.source?.criterionDocument || !criterion.source?.criterionTable) errors.push(`${location}: отсутствует источник критерия`);
    (criterion.inputs || []).forEach(input => {
      if (!data.inputs?.[input]) errors.push(`${location}: неизвестный вход ${input}`);
    });
    if (!["detection-only", "reference-only"].includes(criterion.outcome) && !currentDocuments.has(criterion.source?.criterionDocument)) {
      errors.push(`${location}: расчёт ссылается не на действующий документ ${criterion.source?.criterionDocument}`);
    }
    for (const variant of criterion.variants || []) {
      (variant.inputs || []).forEach(input => {
        if (!data.inputs?.[input]) errors.push(`${location}: неизвестный вход варианта ${input}`);
      });
      for (const limit of variant.limits || []) {
        if (!limit.input || !limit.unit || !limit.max?.type) errors.push(`${location}: неполное ограничение ${limit.label || "без названия"}`);
      }
    }
    [criterion, ...(criterion.variants || [])].forEach(owner => {
      if (owner.customRule && !KNOWN_CUSTOM_RULES.has(owner.customRule.type)) errors.push(`${location}: неизвестное расчётное правило ${owner.customRule.type}`);
    });
    const rangeSets = [
      ...(criterion.variants || []).map(variant => variant.rangeTable?.ranges).filter(Boolean),
      ...[criterion, ...(criterion.variants || [])].map(owner => owner.customRule?.ranges).filter(Boolean)
    ];
    rangeSets.forEach(ranges => ranges.slice(1).forEach((range, rangeIndex) => {
      const previous = ranges[rangeIndex];
      if (previous.max == null) errors.push(`${location}: открытый диапазон не является последним`);
      else if (Number(previous.max) > Number(range.min)) errors.push(`${location}: пересекающиеся диапазоны толщины`);
    }));
  });
  const guideIds = new Set();
  (data.guides || []).forEach((guide, index) => {
    const location = `guides[${index}]`;
    if (!guide.id) errors.push(`${location}: отсутствует id`);
    if (guideIds.has(guide.id)) errors.push(`${location}: повторяющийся id ${guide.id}`);
    guideIds.add(guide.id);
    if (!documentIds.has(guide.documentId)) errors.push(`${location}: неизвестный документ ${guide.documentId}`);
    if (!guide.title || !guide.description || !guide.warning) errors.push(`${location}: неполное описание связанной методики`);
    (guide.items || []).forEach(item => {
      if (!criterionIds.has(item.criterionId)) errors.push(`${location}: неизвестный критерий методики ${item.criterionId}`);
      if (!item.summary) errors.push(`${location}: отсутствует краткое требование ${item.criterionId}`);
    });
  });
  data.standards.forEach((standard, index) => {
    (standard.supportingDocuments || []).forEach(item => {
      if (!documentIds.has(item.documentId)) errors.push(`standards[${index}]: неизвестный связанный документ ${item.documentId}`);
    });
    (standard.supportingGuideIds || []).forEach(id => {
      if (!guideIds.has(id)) errors.push(`standards[${index}]: неизвестная связанная методика ${id}`);
    });
  });
  return errors;
}
