import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ATLAS_COLLECTIONS, CRITERIA_DATA_FILE, DATA_FILES, METHODS } from "../js/config.js";
import { validateCriteriaData } from "../js/criteriaEngine.js";
import { APP_PATHS, APP_VERSION, ESSENTIAL_APP_PATHS } from "../js/pwaConfig.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const referencedAssets = new Set();
const globalIds = new Map();
let itemCount = 0;

function error(location, message) { errors.push(`${location}: ${message}`); }
function readJson(relativePath) {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")); }
  catch (cause) { error(relativePath, `не удалось прочитать JSON (${cause.message})`); return null; }
}
function normalizePath(value) {
  if (typeof value !== "string") return null;
  const result = value.trim().replace(/\\/g, "/").replace(/^\.\//, "").split(/[?#]/, 1)[0];
  return !result || result.startsWith("/") || result.includes("://") || result.split("/").includes("..") ? null : result;
}
function validateFile(relativePath, location) {
  const normalized = normalizePath(relativePath);
  if (!normalized) return error(location, `недопустимый относительный путь: ${String(relativePath)}`);
  const absolute = path.join(rootDir, ...normalized.split("/"));
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) error(location, `файл не найден: ${normalized}`);
  return normalized;
}
function collectAssets(value, location) {
  if (typeof value === "string" && /^(?:images|icons)\//.test(value)) {
    const asset = validateFile(value, location);
    if (asset) referencedAssets.add(asset);
    return;
  }
  if (Array.isArray(value)) return value.forEach((item, index) => collectAssets(item, `${location}[${index}]`));
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collectAssets(item, `${location}.${key}`);
  }
}

const dataByMethod = new Map();
for (const [method, relativePath] of Object.entries(DATA_FILES)) {
  if (!METHODS[method]) error("config.js", `для ${method} не описан метод`);
  const items = readJson(relativePath);
  if (!Array.isArray(items)) { error(relativePath, "корневое значение должно быть массивом"); continue; }
  const byId = new Map();
  dataByMethod.set(method, byId);
  for (const [index, item] of items.entries()) {
    const location = `${relativePath}[${index}]`;
    itemCount += 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) { error(location, "карточка должна быть объектом"); continue; }
    if (typeof item.id !== "string" || !item.id.trim()) { error(location, "требуется непустой id"); continue; }
    if (typeof item.title !== "string" || !item.title.trim()) error(location, "требуется непустой title");
    if (byId.has(item.id)) error(location, `повторяющийся id внутри метода: ${item.id}`);
    byId.set(item.id, item);
    if (globalIds.has(item.id)) error(location, `глобально повторяющийся id; первое объявление: ${globalIds.get(item.id)}`);
    globalIds.set(item.id, location);
    collectAssets(item, location);
  }
  for (const item of items) {
    if (item.parentId && !byId.has(item.parentId)) error(`${relativePath}:${item.id}`, `parentId не найден: ${item.parentId}`);
  }
}

for (const collection of ATLAS_COLLECTIONS) {
  const root = dataByMethod.get(collection.method)?.get(collection.rootId);
  if (!root) error("ATLAS_COLLECTIONS", `корень не найден: ${collection.method}/${collection.rootId}`);
}

const criteria = readJson(CRITERIA_DATA_FILE);
for (const message of validateCriteriaData(criteria)) error(CRITERIA_DATA_FILE, message);

const manifest = readJson("manifest.json");
if (manifest?.version !== APP_VERSION) error("manifest.json", `version ${manifest?.version} не совпадает с ${APP_VERSION}`);
collectAssets(manifest, "manifest.json");
collectAssets({ appleTouchIcon: "icons/apple-touch-icon.png" }, "index.html");
const packageJson = readJson("package.json");
if (packageJson?.version !== APP_VERSION) error("package.json", `version ${packageJson?.version} не совпадает с ${APP_VERSION}`);

const cached = new Set();
for (const appPath of APP_PATHS) {
  if (appPath === "./") continue;
  const normalized = validateFile(appPath, "APP_PATHS");
  if (!normalized) continue;
  if (cached.has(normalized)) error("APP_PATHS", `повторяющийся путь: ${normalized}`);
  cached.add(normalized);
}
for (const required of ["index.html", "manifest.json", ...Object.values(DATA_FILES), CRITERIA_DATA_FILE,
  ...fs.readdirSync(path.join(rootDir, "css")).filter(name => name.endsWith(".css")).map(name => `css/${name}`),
  ...fs.readdirSync(path.join(rootDir, "js")).filter(name => name.endsWith(".js")).map(name => `js/${name}`),
  ...referencedAssets]) {
  if (!cached.has(required)) error("APP_PATHS", `ресурс не добавлен в офлайн-кэш: ${required}`);
}
for (const required of ESSENTIAL_APP_PATHS) {
  if (!APP_PATHS.includes(required)) error("ESSENTIAL_APP_PATHS", `ресурс отсутствует: ${required}`);
}

if (errors.length) {
  console.error(`Проверка завершилась с ошибками (${errors.length}):`);
  errors.forEach(item => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log("Проверка DefectoSNG пройдена.");
  console.log(`Визуальные материалы: ${itemCount}`);
  console.log(`Критерии: ${criteria.criteria.length}`);
  console.log(`Ресурсы офлайн-кэша: ${cached.size + 1}`);
}
