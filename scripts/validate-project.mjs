import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATLAS_CATEGORY_IDS,
  DATA_FILES,
  METHODS
} from "../js/config.js";
import {
  APP_PATHS,
  APP_VERSION,
  ESSENTIAL_APP_PATHS
} from "../js/pwaConfig.js";
import {
  SECTION_TYPES,
  validateArticleShape,
  validateSectionShape
} from "../js/schema.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedAtlasCategories = new Set(ATLAS_CATEGORY_IDS);
const errors = [];
const warnings = [];
const articlesByMethod = new Map();
const globalIds = new Map();
const referencedAssets = new Set();
let articleCount = 0;
let sectionCount = 0;
let relatedLinkCount = 0;

function addError(location, message) {
  errors.push(`${location}: ${message}`);
}

function addWarning(location, message) {
  warnings.push(`${location}: ${message}`);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
  } catch (error) {
    addError(relativePath, `не удалось прочитать JSON (${error.message})`);
    return null;
  }
}

function normalizeAssetPath(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .split(/[?#]/, 1)[0];

  if (
    normalized.startsWith("/") ||
    normalized.includes("://") ||
    normalized.split("/").includes("..")
  ) {
    return null;
  }

  return normalized;
}

function validateAsset(value, location) {
  const normalized = normalizeAssetPath(value);
  if (!normalized) {
    addError(location, `путь к ресурсу должен быть относительным: ${String(value)}`);
    return;
  }

  referencedAssets.add(normalized);
  const absolutePath = path.join(rootDir, ...normalized.split("/"));
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    addError(location, `файл не найден: ${normalized}`);
  }
}

function validateAtlas(article, location) {
  if (!article.atlas?.enabled) return;
  const atlasLocation = `${location}.atlas`;
  const atlas = article.atlas;

  if (!Array.isArray(atlas.categories) || !atlas.categories.length) {
    addError(atlasLocation, "требуется непустой массив categories");
  } else {
    atlas.categories.forEach(category => {
      if (!allowedAtlasCategories.has(category)) {
        addError(atlasLocation, `неизвестная категория атласа: ${category}`);
      }
    });
  }

  if (typeof atlas.shortFeature !== "string" || !atlas.shortFeature.trim()) {
    addError(atlasLocation, "требуется непустой строковый shortFeature");
  }
  for (const field of ["aliases", "tags"]) {
    if (atlas[field] != null &&
      (!Array.isArray(atlas[field]) || atlas[field].some(item => typeof item !== "string"))) {
      addError(atlasLocation, `${field} должен быть массивом строк`);
    }
  }

  if (!atlas.photo && !atlas.scheme) {
    addError(atlasLocation, "нужно указать photo или scheme");
  }
  if (atlas.photo) validateAsset(atlas.photo, `${atlasLocation}.photo`);
  if (atlas.scheme) validateAsset(atlas.scheme, `${atlasLocation}.scheme`);
}

for (const [method, relativePath] of Object.entries(DATA_FILES)) {
  const articles = readJson(relativePath);
  if (!Array.isArray(articles)) {
    addError(relativePath, "корневое значение должно быть массивом");
    continue;
  }

  const methodIndex = new Map();
  articlesByMethod.set(method, methodIndex);

  for (const [articleIndex, article] of articles.entries()) {
    const location = `${relativePath}[${articleIndex}]`;
    articleCount += 1;

    for (const message of validateArticleShape(article)) {
      addError(location, message);
    }
    if (!article || typeof article !== "object" || Array.isArray(article)) continue;
    if (typeof article.id !== "string" || !article.id.trim()) continue;

    if (methodIndex.has(article.id)) {
      addError(location, `повторяющийся id внутри метода: ${article.id}`);
    } else {
      methodIndex.set(article.id, article);
    }

    if (globalIds.has(article.id)) {
      addError(
        location,
        `глобально повторяющийся id ${article.id}; первое объявление: ${globalIds.get(article.id)}`
      );
    } else {
      globalIds.set(article.id, location);
    }

    const sections = Array.isArray(article.sections) ? article.sections : [];
    for (const [sectionIndex, section] of sections.entries()) {
      const sectionLocation = `${location}.sections[${sectionIndex}]`;
      sectionCount += 1;

      for (const message of validateSectionShape(section)) {
        addError(sectionLocation, message);
      }
      if (!section || typeof section !== "object" || Array.isArray(section)) continue;

      if (section.type === "image") {
        validateAsset(section.src, `${sectionLocation}.src`);
        if (!section.alt) addWarning(sectionLocation, "для изображения желательно добавить alt");
      }
    }

    validateAtlas(article, location);
  }
}

for (const [method, articles] of articlesByMethod.entries()) {
  for (const article of articles.values()) {
    const location = `${DATA_FILES[method]}:${article.id}`;

    if (article.parentId) {
      const parent = articles.get(article.parentId);
      if (!parent) {
        addError(location, `parentId не найден в методе ${method}: ${article.parentId}`);
      } else if ((parent.type || "article") !== "section") {
        addError(location, `parentId должен указывать на section: ${article.parentId}`);
      }

      const visited = new Set([article.id]);
      let cursor = parent;
      while (cursor?.parentId) {
        if (visited.has(cursor.id)) {
          addError(location, `обнаружен цикл parentId через ${cursor.id}`);
          break;
        }
        visited.add(cursor.id);
        cursor = articles.get(cursor.parentId);
      }
    }

    const sections = Array.isArray(article.sections) ? article.sections : [];
    for (const [sectionIndex, section] of sections.entries()) {
      if (section?.type !== "related" || !Array.isArray(section.items)) continue;

      section.items.forEach((item, itemIndex) => {
        const linkLocation = `${location}.sections[${sectionIndex}].items[${itemIndex}]`;
        relatedLinkCount += 1;
        if (!item || typeof item.method !== "string" || typeof item.id !== "string") return;

        const targetMethod = articlesByMethod.get(item.method);
        const target = targetMethod?.get(item.id);
        if (!targetMethod) {
          addError(linkLocation, `неизвестный метод: ${item.method}`);
        } else if (!target) {
          addError(linkLocation, `материал не найден: ${item.method}/${item.id}`);
        } else if (item.title != null && item.title !== target.title) {
          addError(
            linkLocation,
            `title не совпадает с целевой статьёй: «${item.title}» / «${target.title}»`
          );
        }
      });
    }
  }
}

const manifest = readJson("manifest.json");
if (!manifest || !Array.isArray(manifest.icons) || !manifest.icons.length) {
  addError("manifest.json", "требуется непустой массив icons");
} else {
  manifest.icons.forEach((icon, index) => {
    validateAsset(icon.src, `manifest.json.icons[${index}].src`);
  });
}
validateAsset("icons/apple-touch-icon.png", "index.html apple-touch-icon");

const packageJson = readJson("package.json");
if (packageJson?.version !== APP_VERSION) {
  addError(
    "package.json",
    `version ${String(packageJson?.version)} не совпадает с APP_VERSION ${APP_VERSION}`
  );
}

const cachedPaths = new Set();
for (const originalPath of APP_PATHS) {
  if (originalPath === "./") continue;
  const normalized = normalizeAssetPath(originalPath);
  if (!normalized) {
    addError("APP_PATHS", `недопустимый путь: ${originalPath}`);
    continue;
  }
  if (cachedPaths.has(normalized)) {
    addError("APP_PATHS", `повторяющийся путь: ${normalized}`);
    continue;
  }

  cachedPaths.add(normalized);
  const absolutePath = path.join(rootDir, ...normalized.split("/"));
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    addError("APP_PATHS", `файл не найден: ${normalized}`);
  }
}

const requiredCachedPaths = new Set([
  "index.html",
  ...fs.readdirSync(path.join(rootDir, "css"), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".css"))
    .map(entry => `css/${entry.name}`),
  ...fs.readdirSync(path.join(rootDir, "js"), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
    .map(entry => `js/${entry.name}`),
  "manifest.json",
  ...Object.values(DATA_FILES),
  ...referencedAssets
]);

for (const requiredPath of requiredCachedPaths) {
  if (!cachedPaths.has(requiredPath)) {
    addError("APP_PATHS", `ресурс приложения не добавлен в офлайн-кэш: ${requiredPath}`);
  }
}

for (const essentialPath of ESSENTIAL_APP_PATHS) {
  if (!APP_PATHS.includes(essentialPath)) {
    addError("ESSENTIAL_APP_PATHS", `обязательный ресурс отсутствует в APP_PATHS: ${essentialPath}`);
  }
}

for (const method of Object.keys(DATA_FILES)) {
  if (!METHODS[method]) addError("config.js", `для data-файла нет метода: ${method}`);
}
if (!SECTION_TYPES.length) addError("schema.js", "список SECTION_TYPES пуст");

if (warnings.length) {
  console.warn(`Предупреждения (${warnings.length}):`);
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error(`Проверка завершилась с ошибками (${errors.length}):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Проверка DefectoSNG пройдена.");
  console.log(`Материалы: ${articleCount}`);
  console.log(`Секции: ${sectionCount}`);
  console.log(`Связанные ссылки: ${relatedLinkCount}`);
  console.log(`Ресурсы офлайн-кэша: ${cachedPaths.size + 1}`);
}
