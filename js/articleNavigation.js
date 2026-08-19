export const ARTICLE_TOC_MIN_SECTIONS = 15;

export function getArticleTocEntries(methodKey, article, minimum = ARTICLE_TOC_MIN_SECTIONS) {
  const sections = Array.isArray(article?.sections) ? article.sections : [];
  if (methodKey !== "vik" || sections.length < minimum) return [];

  return sections.flatMap((section, index) => {
    const title = typeof section?.title === "string" ? section.title.trim() : "";
    if (!title || section.type === "image" || section.type === "related") return [];
    return [{ id: `article-section-${index + 1}`, index, title, type: section.type }];
  });
}

