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
const PIPELINE_CATEGORY_IDS = new Set(["butt", "lap", "corner"]);
const VIBRATION_TEMPLATE_IDS = new Set(["article", "fault", "spectrum", "scenario", "reference", "tool"]);
const MEDIA_SLOT_TYPES = new Set(["photo", "diagram", "spectrum", "table", "gallery"]);

function validateVibrationMetadata(metadata) {
  const errors = [];
  if (!isObject(metadata)) return ["metadata должен быть объектом"];
  for (const field of ["section", "group", "materialType", "status"]) {
    if (!isNonEmptyString(metadata[field])) errors.push(`metadata.${field} должен быть непустой строкой`);
  }
    for (const field of [
      "equipment", "faults", "diagnosticSigns", "keywords", "relatedArticles",
      "tags", "aliases", "measuredParameters", "relatedFaults", "relatedSpectra",
      "relatedScenarios", "relatedReferences", "normativeDocuments", "relatedMeasurements",
      "relatedParameters", "probableFaults", "similarSpectra", "additionalChecks"
    ]) {
    if (!isStringArray(metadata[field])) errors.push(`metadata.${field} должен быть массивом строк`);
  }
  if (metadata.materialType && !VIBRATION_TEMPLATE_IDS.has(metadata.materialType)) {
    errors.push(`metadata.materialType не поддерживается: ${String(metadata.materialType)}`);
  }
  if (metadata.status && !ARTICLE_STATUSES.includes(metadata.status)) {
    errors.push(`metadata.status не поддерживается: ${String(metadata.status)}`);
  }
  return errors;
}

export function validatePipelineJointShape(joint) {
  const errors = [];
  if (!isObject(joint)) return ["pipelineJoint должен быть объектом"];
  if (!isNonEmptyString(joint.designation)) errors.push("pipelineJoint.designation должен быть непустой строкой");
  if (!PIPELINE_CATEGORY_IDS.has(joint.category)) errors.push(`pipelineJoint.category не поддерживается: ${String(joint.category)}`);

  for (const field of [
    "edgePreparation", "weldCharacter", "backing", "thicknessRange", "minimumDiameter"
  ]) {
    if (joint[field] != null && typeof joint[field] !== "string") {
      errors.push(`pipelineJoint.${field} должен быть строкой или null`);
    }
  }
  if (joint.connectedElements != null &&
    !isNonEmptyString(joint.connectedElements) &&
    !isStringArray(joint.connectedElements)) {
    errors.push("pipelineJoint.connectedElements должен быть строкой, массивом строк или null");
  }
  for (const field of ["weldingMethods", "specialFilters"]) {
    if (!isStringArray(joint[field])) errors.push(`pipelineJoint.${field} должен быть массивом строк`);
  }
  if (joint.standardTable != null && !Number.isFinite(Number(joint.standardTable))) {
    errors.push("pipelineJoint.standardTable должен быть числом или null");
  }
  if (!Array.isArray(joint.parameters)) {
    errors.push("pipelineJoint.parameters должен быть массивом");
  } else {
    joint.parameters.forEach((parameter, index) => {
      if (!isObject(parameter) || !isNonEmptyString(parameter.name)) {
        errors.push(`pipelineJoint.parameters[${index}] должен содержать строковое name`);
      }
    });
  }
  if (!isObject(joint.images)) {
    errors.push("pipelineJoint.images должен быть объектом");
  } else {
    for (const field of ["edgePreparation", "weldSection"]) {
      if (joint.images[field] != null && typeof joint.images[field] !== "string") {
        errors.push(`pipelineJoint.images.${field} должен быть строкой или null`);
      }
    }
  }
  for (const field of [
    "inspectionBeforeWelding", "inspectionAfterAssembly", "inspectionAfterWelding", "typicalNonconformities"
  ]) {
    if (joint[field] != null && !isStringArray(joint[field])) {
      errors.push(`pipelineJoint.${field} должен быть массивом строк`);
    }
  }
  return errors;
}

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

  if (!isNonEmptyString(article.status)) {
    errors.push("требуется явный строковый status");
  } else if (!ARTICLE_STATUSES.includes(article.status)) {
    errors.push(`неподдерживаемый status: ${String(article.status)}`);
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
  for (const field of [
    "summary",
    "description",
    "sectionTitle",
    "additionalText",
    "developmentNotice",
    "plannedTitle",
    "warning",
    "standard"
  ]) {
    if (article[field] != null && typeof article[field] !== "string") {
      errors.push(`${field} должен быть строкой`);
    }
  }
  if (article.plannedMaterials != null && !isStringArray(article.plannedMaterials)) {
    errors.push("plannedMaterials должен быть массивом строк");
  }
  if (article.futureBlocks != null && !isStringArray(article.futureBlocks)) {
    errors.push("futureBlocks должен быть массивом строк");
  }
  if (article.futureImageLabel != null && !isNonEmptyString(article.futureImageLabel)) {
    errors.push("futureImageLabel должен быть непустой строкой");
  }
  if (article.futureImageLabels != null && !isStringArray(article.futureImageLabels)) {
    errors.push("futureImageLabels должен быть массивом строк");
  }
  if (article.template != null && !VIBRATION_TEMPLATE_IDS.has(article.template)) {
    errors.push(`неподдерживаемый template: ${String(article.template)}`);
  }
  if (article.metadata != null) errors.push(...validateVibrationMetadata(article.metadata));
  if (article.mediaSlots != null) {
    if (!Array.isArray(article.mediaSlots)) {
      errors.push("mediaSlots должен быть массивом");
    } else {
      article.mediaSlots.forEach((slot, index) => {
        if (!isObject(slot) || !MEDIA_SLOT_TYPES.has(slot.type) || !isNonEmptyString(slot.label)) {
          errors.push(`mediaSlots[${index}] должен содержать допустимые type и label`);
        }
        if (slot?.src != null && !isNonEmptyString(slot.src)) {
          errors.push(`mediaSlots[${index}].src должен быть непустой строкой`);
        }
        if (slot?.alt != null && !isNonEmptyString(slot.alt)) {
          errors.push(`mediaSlots[${index}].alt должен быть непустой строкой`);
        }
        if (slot?.caption != null && !isNonEmptyString(slot.caption)) {
          errors.push(`mediaSlots[${index}].caption должен быть непустой строкой`);
        }
      });
    }
  }
  if (article.toolConfig != null && !isObject(article.toolConfig)) {
    errors.push("toolConfig должен быть объектом");
  }
  if (article.groupKind != null && !["umbrella", "group", "catalog", "tools"].includes(article.groupKind)) {
    errors.push(`неподдерживаемый groupKind: ${String(article.groupKind)}`);
  }
  if (article.returnToMethod != null && typeof article.returnToMethod !== "boolean") {
    errors.push("returnToMethod должен быть логическим значением");
  }
  if (article.pipelineCategory != null && !PIPELINE_CATEGORY_IDS.has(article.pipelineCategory)) {
    errors.push(`неподдерживаемый pipelineCategory: ${String(article.pipelineCategory)}`);
  }
  if (article.designations != null && !isStringArray(article.designations)) {
    errors.push("designations должен быть массивом строк");
  }
  if (article.pipelineJoint != null) {
    errors.push(...validatePipelineJointShape(article.pipelineJoint));
  }

  if (type === "article" &&
    !isNonEmptyString(article.text) &&
    (!Array.isArray(article.sections) || !article.sections.length) &&
    !article.pipelineJoint) {
    errors.push("статья должна содержать text, непустой массив sections или pipelineJoint");
  }

  return errors;
}
