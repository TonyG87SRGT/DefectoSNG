import { normalizeSearchText, tokenizeSearch } from "./searchCore.js";

const GENERIC_TOKENS = new Set([
  "атлас", "дефект", "дефекты", "индикация", "индикации", "сигнал", "сигналы",
  "сварной", "сварного", "соединение", "соединения", "контроль", "поверхность",
  "внутренний", "внутренние", "одиночный", "одиночные", "учебный", "признак"
]);

function comparableTokens(value) {
  return tokenizeSearch(value)
    .filter(token => token.length >= 4 && !GENERIC_TOKENS.has(token))
    .map(token => token.slice(0, Math.min(token.length, 7)));
}

function itemSearchText(item) {
  return [item.title, item.summary, ...(item.tags || []), ...(item.atlas?.aliases || []),
    ...(item.metadata?.aliases || []), ...(item.metadata?.faults || [])].filter(Boolean).join(" ");
}

function criterionSearchText(criterion) {
  return [criterion.defect, ...(criterion.aliases || []), ...(criterion.notes || [])]
    .filter(Boolean).join(" ");
}

export function getCriterionSearchTerm(item) {
  const meaningful = comparableTokens(item?.title || "");
  if (meaningful.length) return meaningful[meaningful.length - 1];
  return normalizeSearchText(item?.title || "");
}

export function findRelatedCriteria(criteriaData, item, methodKey, limit = 8) {
  if (!criteriaData?.criteria || !item) return [];
  const itemTokens = comparableTokens(itemSearchText(item));
  if (!itemTokens.length) return [];
  return criteriaData.criteria.map((criterion, index) => {
    const criterionTokens = comparableTokens(criterionSearchText(criterion));
    const shared = itemTokens.filter(itemToken => criterionTokens.some(criterionToken =>
      itemToken.startsWith(criterionToken) || criterionToken.startsWith(itemToken)));
    return { criterion, index, score: shared.length * 10 + (criterion.method === methodKey ? 12 : 0) };
  }).filter(result => result.score >= 10)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(result => result.criterion);
}

export function getCriterionContext(criteriaData, criterion) {
  const standard = criteriaData?.standards?.find(item => item.basisDocuments.includes(criterion?.source?.basisDocument));
  const method = criteriaData?.methods?.find(item => item.id === criterion?.method);
  return { standard, method };
}
