import { ARTICLE_STATUSES, ARTICLE_TYPES } from "./config.js";

export const SECTION_TYPES = Object.freeze([
  "facts",
  "text",
  "steps",
  "list",
  "warning",
  "table",
  "image",
  "tip",
  "practice",
  "note",
  "comparison",
  "methods",
  "related",
  "documents"
]);

const isObject = value => Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);
const isNonEmptyString = value => typeof value === "string" && Boolean(value.trim());
const isStringArray = value => Array.isArray(value) &&
  value.every(item => typeof item === "string");

function requireTitle(section, errors) {
  if (!isNonEmptyString(section.title)) {
    errors.push("требуется непустое строковое поле title");
  }
}

function requireContent(section, errors) {
  requireTitle(section, errors);
  if (!isNonEmptyString(section.content)) {
    errors.push("требуется непустое строковое поле content");
  }
}

function requireStringItems(section, errors) {
  requireTitle(section, errors);
  if (!isStringArray(section.items) || !section.items.length) {
    errors.push("требуется непустой массив строк items");
  }
}

export function validateSectionShape(section) {
  const errors = [];

  if (!isObject(section)) return ["секция должна быть объектом"];
  if (!SECTION_TYPES.includes(section.type)) {
    return [`неподдерживаемый тип секции: ${String(section.type)}`];
  }

  if (["text", "warning", "tip", "practice", "note"].includes(section.type)) {
    requireContent(section, errors);
  }

  if (["steps", "list", "documents"].includes(section.type)) {
    requireStringItems(section, errors);
  }

  if (section.type === "facts") {
    if (section.title != null && !isNonEmptyString(section.title)) {
      errors.push("title должен быть непустой строкой");
    }
    if (!Array.isArray(section.items) || !section.items.length) {
      errors.push("требуется непустой массив items");
    } else {
      section.items.forEach((item, index) => {
        if (!isObject(item) ||
          !isNonEmptyString(item.label) ||
          !isNonEmptyString(item.value)) {
          errors.push(`items[${index}] должен содержать строковые label и value`);
        }
      });
    }
  }

  if (section.type === "table") {
    if (section.title != null && !isNonEmptyString(section.title)) {
      errors.push("title должен быть непустой строкой");
    }
    if (!isStringArray(section.headers) || !section.headers.length) {
      errors.push("требуется непустой массив строк headers");
    }
    if (!Array.isArray(section.rows) || !section.rows.length) {
      errors.push("требуется непустой массив rows");
    } else {
      section.rows.forEach((row, index) => {
        if (!isStringArray(row)) {
          errors.push(`rows[${index}] должен быть массивом строк`);
        } else if (Array.isArray(section.headers) && row.length !== section.headers.length) {
          errors.push(`rows[${index}] должен содержать ${section.headers.length} ячеек`);
        }
      });
    }
    if (section.note != null && typeof section.note !== "string") {
      errors.push("note должен быть строкой");
    }
  }

  if (section.type === "image") {
    if (!isNonEmptyString(section.src)) errors.push("требуется непустой строковый src");
    for (const field of ["title", "alt", "caption"]) {
      if (section[field] != null && typeof section[field] !== "string") {
        errors.push(`${field} должен быть строкой`);
      }
    }
  }

  if (section.type === "comparison") {
    requireTitle(section, errors);
    if (!Array.isArray(section.items) || !section.items.length) {
      errors.push("требуется непустой массив items");
    } else {
      section.items.forEach((item, index) => {
        const validTuple = Array.isArray(item) &&
          item.length >= 2 &&
          isNonEmptyString(item[0]) &&
          isNonEmptyString(item[1]);
        const validObject = isObject(item) &&
          isNonEmptyString(item.name || item.label) &&
          isNonEmptyString(item.description || item.value);
        if (!validTuple && !validObject) {
          errors.push(`items[${index}] должен быть парой строк или объектом сравнения`);
        }
      });
    }
  }

  if (section.type === "methods") {
    requireTitle(section, errors);
    if (!Array.isArray(section.items) || !section.items.length) {
      errors.push("требуется непустой массив items");
    } else {
      section.items.forEach((item, index) => {
        if (!isObject(item) ||
          !isNonEmptyString(item.method) ||
          !isNonEmptyString(item.description)) {
          errors.push(`items[${index}] должен содержать строковые method и description`);
        }
      });
    }
  }

  if (section.type === "related") {
    requireTitle(section, errors);
    if (!Array.isArray(section.items) || !section.items.length) {
      errors.push("требуется непустой массив items");
    } else {
      section.items.forEach((item, index) => {
        if (!isObject(item) ||
          !isNonEmptyString(item.method) ||
          !isNonEmptyString(item.id)) {
          errors.push(`items[${index}] должен содержать строковые method и id`);
        }
        if (item?.title != null && !isNonEmptyString(item.title)) {
          errors.push(`items[${index}].title должен быть непустой строкой`);
        }
      });
    }
  }

  return errors;
}

export function validateArticleShape(article) {
  const errors = [];
  if (!isObject(article)) return ["материал должен быть объектом"];

  if (!isNonEmptyString(article.id)) errors.push("требуется непустой строковый id");
  if (!isNonEmptyString(article.title)) errors.push("требуется непустой строковый title");
  if (!isNonEmptyString(article.category)) errors.push("требуется непустой строковый category");

  const type = article.type || "article";
  if (!ARTICLE_TYPES.includes(type)) errors.push(`неподдерживаемый type: ${String(type)}`);

  const status = article.status || "published";
  if (!ARTICLE_STATUSES.includes(status)) {
    errors.push(`неподдерживаемый status: ${String(status)}`);
  }

  if (article.parentId != null && !isNonEmptyString(article.parentId)) {
    errors.push("parentId должен быть непустой строкой");
  }
  if (article.order != null && !Number.isFinite(Number(article.order))) {
    errors.push("order должен быть числом");
  }
  if (article.tags != null && !isStringArray(article.tags)) {
    errors.push("tags должен быть массивом строк");
  }
  if (article.sections != null && !Array.isArray(article.sections)) {
    errors.push("sections должен быть массивом");
  }
  if (article.text != null && typeof article.text !== "string") {
    errors.push("text должен быть строкой");
  }

  if (type === "article" &&
    !isNonEmptyString(article.text) &&
    (!Array.isArray(article.sections) || !article.sections.length)) {
    errors.push("статья должна содержать text или непустой массив sections");
  }

  return errors;
}
