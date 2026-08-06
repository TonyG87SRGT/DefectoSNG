import { DIAGNOSTIC_RULES } from "./vibrationDiagnosticRules.js";

function values(value) {
  return Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
}

function matches(answer, accepted) {
  const actual = new Set(values(answer));
  return accepted.some(value => actual.has(value));
}

export function assessMeasurement(answers) {
  const risks = values(answers.measurementRisks);
  return {
    blocked: risks.length > 0 && !answers.continueAfterMeasurementWarning,
    risks,
    recommendations: [
      "Проверить датчик и его диапазон", "Проверить крепление и точку установки", "Проверить кабель и соединители",
      "Повторить измерение", "Выполнить независимое измерение", "Сравнить показания в соседней точке"
    ]
  };
}

export function assessDataQuality(answers) {
  let score = 8;
  const warnings = [];
  if (!answers.rpm && !values(answers.construction).includes("speed-known")) { score -= 2; warnings.push("Неизвестна частота вращения."); }
  if (["unknown", undefined, ""].includes(answers.operatingMode)) { score -= 1; warnings.push("Неизвестен режим работы."); }
  const checks = values(answers.measurementChecks);
  if (!checks.includes("repeated")) { score -= 1; warnings.push("Измерение не повторено."); }
  if (!checks.includes("other-point")) { score -= 1; warnings.push("Нет сравнения с соседней точкой."); }
  if (!checks.includes("sensor-correct") || !checks.includes("cable-checked")) { score -= 2; warnings.push("Измерительная цепь проверена не полностью."); }
  if (!answers.additional?.length || answers.additional.includes("no-phase")) { score -= 1; warnings.push("Отсутствуют фазовые данные."); }
  if (!answers.history?.length || answers.history.includes("unknown")) { score -= 1; warnings.push("История изменения неизвестна."); }
  if (answers.continueAfterMeasurementWarning) { score -= 3; warnings.push("Диагностика продолжена после предупреждения об измерительной цепи."); }
  const hasMeasurementRisks = values(answers.measurementRisks).length > 0;
  const level = score >= 7 ? "высокая" : score >= 4 ? "средняя" : score >= 1 || hasMeasurementRisks ? "низкая" : "недостаточно данных";
  return { score: Math.max(0, score), level, warnings };
}

export function evaluateDiagnosticAnswers(answers, rules = DIAGNOSTIC_RULES) {
  const measurement = assessMeasurement(answers);
  const quality = assessDataQuality(answers);
  if (measurement.blocked) return { blocked: true, measurement, quality, causes: [], checks: measurement.recommendations, warnings: quality.warnings };

  const causes = new Map();
  const relatedSpectra = new Set();
  const sources = [];
  const warnings = [...quality.warnings];
  for (const rule of rules) {
    const requiredMissed = rule.conditions.some(item => item.required && !matches(answers[item.field], item.values));
    if (requiredMissed) continue;
    const matched = rule.conditions.filter(item => matches(answers[item.field], item.values));
    if (!matched.length) continue;
    const score = rule.weight + matched.reduce((sum, item) => sum + item.weight, 0);
    for (const fault of rule.possibleFaults) {
      const current = causes.get(fault.id) || { ...fault, score: 0, matched: [], missing: [], checks: [], warnings: [], ruleIds: [] };
      current.score += score;
      current.matched.push(...matched.map(item => item.field));
      current.missing.push(...rule.conditions.filter(item => !matched.includes(item)).map(item => item.field));
      current.checks.push(...rule.requiredChecks);
      current.warnings.push(...rule.warnings);
      current.ruleIds.push(rule.id);
      causes.set(fault.id, current);
    }
    rule.relatedSpectra.forEach(id => relatedSpectra.add(id));
    rule.source.forEach(source => sources.push(source));
    warnings.push(...rule.warnings);
  }

  const ranked = [...causes.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  const maximum = ranked[0]?.score || 0;
  ranked.forEach((cause, index) => {
    cause.matched = [...new Set(cause.matched)]; cause.missing = [...new Set(cause.missing)]; cause.checks = [...new Set(cause.checks)];
    cause.level = maximum === 0 ? "недостаточно данных" : index === 0 && cause.score >= 8 ? "высокая согласованность признаков" : cause.score >= maximum * .65 ? "средняя согласованность признаков" : "требуется дополнительная проверка";
  });
  const checks = [...new Set(ranked.flatMap(cause => cause.checks))].slice(0, 10);
  return {
    blocked: false, measurement, quality, causes: ranked, checks,
    warnings: [...new Set(warnings)], relatedFaults: ranked.map(cause => cause.id),
    relatedSpectra: [...relatedSpectra], sources: [...new Map(sources.map(source => [`${source.document}:${source.section}`, source])).values()]
  };
}

export function formatDiagnosticReport(answers, result) {
  const causeText = result.causes.length ? result.causes.map(cause => `${cause.label} — ${cause.level}`).join("; ") : "Недостаточно данных";
  return [
    `Оборудование: ${answers.equipment || "не указано"}`,
    `Режим работы: ${answers.operatingMode || "не указан"}`,
    `Частота вращения: ${answers.rpm ? `${answers.rpm} об/мин` : "не указана"}`,
    `Точки измерения: ${answers.location || "не указаны"}`,
    `Основные признаки: ${values(answers.signs).join(", ") || "не указаны"}`,
    `Предполагаемые причины: ${causeText}`,
    `Необходимые проверки: ${result.checks.join("; ") || "требуются дополнительные данные"}`,
    `Достоверность исходных данных: ${result.quality.level}`,
    "Примечание: результат предварительный и не заменяет заключение специалиста по вибродиагностике."
  ].join("\n");
}
