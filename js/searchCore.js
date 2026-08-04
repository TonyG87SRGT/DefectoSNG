const RUSSIAN_ENDINGS = [
  "иями", "ями", "ами", "ого", "ему", "ому", "ыми", "ими",
  "ий", "ый", "ой", "ая", "яя", "ое", "ее", "ые", "ие",
  "ов", "ев", "ам", "ям", "ах", "ях", "ом", "ем",
  "а", "я", "ы", "и", "у", "ю", "е"
];

export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/№/g, " ")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function tokenizeSearch(value) {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(/\s+/) : [];
}

export function getSearchStem(word) {
  if (word.length <= 4) return word;

  const ending = RUSSIAN_ENDINGS.find(candidate =>
    word.endsWith(candidate) && word.length - candidate.length >= 4
  );
  return ending ? word.slice(0, -ending.length) : word;
}

export function matchesSearchTokens(documentTokens, queryTokens) {
  const tokenSet = new Set(documentTokens);
  const documentStems = documentTokens.map(getSearchStem);

  return queryTokens.every(queryToken => {
    if (queryToken.length <= 2) return tokenSet.has(queryToken);
    if (tokenSet.has(queryToken)) return true;

    const queryStem = getSearchStem(queryToken);
    return documentStems.some(stem =>
      stem === queryStem ||
      stem.startsWith(queryStem) ||
      queryStem.startsWith(stem)
    );
  });
}
