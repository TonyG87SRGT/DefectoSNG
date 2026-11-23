import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { goBack } from "./router.js";
import { evaluateCriterion, formatNumber, parseCriterionNumber, selectVariant, validateCriteriaData } from "./criteriaEngine.js";

let criteriaDataPromise;
const state = {
  standardId: "sp406-sp86",
  medium: "gas",
  method: "vik",
  criterionId: "",
  standardQuery: "",
  defectQuery: "",
  values: {},
  result: null
};

export function loadCriteriaData() {
  if (!criteriaDataPromise) {
    criteriaDataPromise = fetch("data/criteria.json").then(response => {
      if (!response.ok) throw new Error(`criteria.json: HTTP ${response.status}`);
      return response.json();
    }).then(data => {
      const errors = validateCriteriaData(data);
      if (errors.length) throw new Error(`Ошибка модели критериев: ${errors.join("; ")}`);
      return data;
    });
  }
  return criteriaDataPromise;
}

function currentStandard(data) {
  return data.standards.find(item => item.id === state.standardId) || data.standards[0];
}

function criteriaForStandard(data, standard = currentStandard(data)) {
  return data.criteria.filter(item => standard.basisDocuments.includes(item.source?.basisDocument));
}

function applicableCriteria(data, method = state.method, medium = state.medium) {
  const standard = currentStandard(data);
  const usesMedium = standard.dimensions.includes("medium");
  return criteriaForStandard(data, standard).filter(item =>
    item.method === method && (!usesMedium || item.medium.includes(medium) || item.medium.includes("all"))
  );
}

function currentCriterion(data) {
  const available = applicableCriteria(data);
  return available.find(item => item.id === state.criterionId) || available[0] || null;
}

function methodTitle(data, id) {
  return data.methods.find(method => method.id === id)?.title || id.toUpperCase();
}

function documentTitle(data, id) {
  return data.documents.find(document => document.id === id)?.designation || id;
}

function availableMethods(data) {
  const ids = new Set(criteriaForStandard(data).map(item => item.method));
  return data.methods.filter(method => ids.has(method.id));
}

function matchingStandards(data) {
  const query = state.standardQuery.trim().toLocaleLowerCase("ru-RU");
  if (!query) return data.standards;
  return data.standards.filter(item => [item.title, item.shortTitle, item.description, ...(item.searchAliases || [])]
    .filter(Boolean).join(" ").toLocaleLowerCase("ru-RU").includes(query));
}

function supportingHtml(data, standard) {
  const documents = (standard.supportingDocuments || []).map(item => {
    const document = data.documents.find(candidate => candidate.id === item.documentId);
    if (!document) return "";
    return `<div class="criteria-supporting-row"><b>${safeText(document.designation)}</b><span>${safeText(item.label || document.role)}</span></div>`;
  }).join("");
  const guides = (standard.supportingGuideIds || []).map(guideId => data.guides?.find(guide => guide.id === guideId)).filter(Boolean).map(guide => {
    const document = data.documents.find(candidate => candidate.id === guide.documentId);
    const items = (guide.items || []).map(item => {
      const guideCriterion = data.criteria.find(candidate => candidate.id === item.criterionId);
      return `<li><b>${safeText(guideCriterion?.defect || item.criterionId)}</b><span>${safeText(item.summary)}</span></li>`;
    }).join("");
    return `<details class="criteria-notes criteria-guide"><summary>${safeText(guide.title)}</summary><p>${safeText(guide.description)}</p><div class="criteria-guide-warning">${safeText(guide.warning)}</div><ul>${items}</ul>${document ? `<p class="criteria-guide-source">Источник: ${safeText(document.designation)}</p>` : ""}</details>`;
  }).join("");
  if (!documents && !guides) return "";
  return `<section class="criteria-supporting" aria-label="Связанные нормативные документы">${documents}${guides}</section>`;
}

function ensureSelection(data) {
  const standard = currentStandard(data);
  state.standardId = standard.id;
  if (standard.defaultMedium && !["gas", "oil"].includes(state.medium)) state.medium = standard.defaultMedium;
  const methods = availableMethods(data);
  if (!methods.some(method => method.id === state.method)) state.method = methods.some(method => method.id === "vik") ? "vik" : methods[0]?.id || "uzk";
  const criterion = currentCriterion(data);
  state.criterionId = criterion?.id || "";
  (criterion?.inputs || []).forEach(inputId => {
    const definition = data.inputs[inputId];
    if (definition?.type === "select" && !state.values[inputId]) state.values[inputId] = definition.options[0]?.value || "";
  });
}

function inputHtml(data, inputId) {
  const definition = data.inputs[inputId];
  if (!definition) return "";
  const value = state.values[inputId] ?? "";
  if (definition.type === "select") {
    return `
      <label class="criteria-field">
        <span>${safeText(definition.label)}</span>
        <select name="${escapeAttribute(inputId)}">
          ${definition.options.map(option => `<option value="${escapeAttribute(option.value)}"${value === option.value ? " selected" : ""}>${safeText(option.label)}</option>`).join("")}
        </select>
      </label>`;
  }
  return `
    <label class="criteria-field">
      <span>${safeText(definition.label)}${definition.unit ? `, ${safeText(definition.unit)}` : ""}${definition.optional ? " — необязательно" : ""}</span>
      <input name="${escapeAttribute(inputId)}" type="${currentCriterion(data)?.recommendation || currentCriterion(data)?.decimalInput ? "text" : "number"}" inputmode="decimal" value="${escapeAttribute(value)}"
        min="${escapeAttribute(definition.min ?? 0)}" step="${escapeAttribute(definition.step ?? "any")}">
    </label>`;
}

function resultHtml(data, criterion, result) {
  if (!result) return "";
  const standard = currentStandard(data);
  const source = criterion.source;
  const sourceDocument = data.documents.find(item => item.id === source.basisDocument);
  const sourceLink = sourceDocument?.url?.startsWith("https://") ? sourceDocument.url : null;
  const tone = result.allowed === true ? "success" : result.allowed === false ? "danger" : "warning";
  const checks = (result.checks || []).map(check => `
    <div class="criteria-check ${check.passed ? "passed" : "failed"}">
      <strong>${safeText(check.label)}</strong>
      <p>Допустимый предел: ${safeText(check.limitText || `≤ ${formatNumber(check.limit)} ${check.unit}`)}</p>
      <p>Расчёт: ${safeText(check.calculation)}</p>
      <p>Измерено: ${safeText(check.measuredText || `${formatNumber(check.measured)} ${check.unit}`)}</p>
      <b>${result.allowed == null ? (check.passed ? "Условие выполнено" : "Условие не выполнено") : (check.passed ? "Допустимо" : "Превышение")}</b>
    </div>`).join("");
  return `
    <section class="criteria-result ${tone}" aria-live="polite">
      <span class="criteria-result-label">Результат</span>
      <h3>${safeText(result.decision || "ПРОВЕРКА НЕ ЗАВЕРШЕНА")}</h3>
      <p>${safeText(result.message)}</p>
      ${result.usedSmallerThickness ? `<div class="criteria-calculation"><b>Разнотолщинный стык</b><br>S = min(S₁, S₂) = ${formatNumber(result.thickness)} мм — СП 406, п. 9.10.8.</div>` : ""}
      ${result.assessment ? `<div class="criteria-calculation"><b>Оценочный участок</b><br>${safeText(result.assessment.explanation)} Результат: ${formatNumber(result.assessment.value)} мм.</div>` : ""}
      ${(result.facts || []).map(fact => `<div class="criteria-calculation"><b>${safeText(fact.label)}</b><br>${safeText(fact.value)}</div>`).join("")}
      ${checks}
      ${sourceLink ? `<a class="criteria-related-link" href="${escapeAttribute(sourceLink)}" target="_blank" rel="noopener noreferrer">Открыть текст источника ↗ (внешняя ссылка, нужен интернет)</a>` : ""}
      <div class="criteria-source">
        <b>${criterion.recommendation ? "Источник рекомендуемой нормы" : "Нормативное основание"}</b>
        ${standard.applicationSource ? `<span>${safeText(standard.applicationSource.label || "Область применения")}: ${safeText(documentTitle(data, standard.applicationSource.documentId))}, ${safeText((standard.applicationSource.clauses || []).join(", "))}</span>` : ""}
        ${criterion.recommendation ? `<span>${safeText(data.documents.find(item => item.id === source.basisDocument)?.title)}</span>` : ""}
        <span>${safeText(documentTitle(data, source.basisDocument))}: ${safeText(source.basisClauses.join(", "))}</span>
        <span>Критерий: ${safeText(documentTitle(data, source.criterionDocument))}, ${safeText(source.criterionTable)}</span>
      </div>
      ${criterion.related ? `<a class="criteria-related-link" href="#${criterion.related.route === "section" ? "section" : "article"}=${escapeAttribute(criterion.related.method)}:${escapeAttribute(criterion.related.itemId)}">${safeText(criterion.related.label)}</a>` : ""}
    </section>`;
}

function searchMatches(data) {
  const query = state.defectQuery.trim().toLocaleLowerCase("ru-RU");
  if (!query) return [];
  return data.criteria.filter(item => {
    const standard = data.standards.find(candidate => candidate.basisDocuments.includes(item.source?.basisDocument));
    return [methodTitle(data, item.method), item.defect, ...(item.aliases || []),
      standard?.title, standard?.shortTitle, ...(standard?.searchAliases || [])]
      .filter(Boolean).join(" ").toLocaleLowerCase("ru-RU").includes(query);
  }).slice(0, 20);
}

function renderLoaded(data) {
  ensureSelection(data);
  const standard = currentStandard(data);
  const criterion = currentCriterion(data);
  const available = applicableCriteria(data);
  const methods = availableMethods(data);
  const usesMedium = standard.dimensions.includes("medium");
  const matches = searchMatches(data);
  const standards = matchingStandards(data);
  const activeVariant = criterion ? selectVariant(criterion, state.values) : null;
  const inputIds = criterion ? [...(activeVariant?.inputs || criterion.inputs)] : [];
  if (standard.basisDocuments.includes("sp-406-2018") && inputIds.includes("thickness1") && !inputIds.includes("thickness2")) inputIds.splice(inputIds.indexOf("thickness1") + 1, 0, "thickness2");

  content.innerHTML = `
    <div class="page-header criteria-header">
      <button class="back-button" id="back-button" aria-label="Вернуться на главную">‹</button>
      <div><span class="page-kicker">Нормативная оценка</span><h2 tabindex="-1">Критерии отбраковки</h2><p>Выберите объект, НТД, метод и контролируемый параметр</p></div>
    </div>

    <div class="criteria-warning" role="note">
      <strong>${safeText(standard.shortTitle || standard.title)}</strong>
      <p>${safeText(standard.warning)}</p>
    </div>

    ${supportingHtml(data, standard)}

    <section class="criteria-control-group" aria-labelledby="criteria-standard-title">
      <h3 id="criteria-standard-title">1. Нормативный документ</h3>
      <label class="criteria-field criteria-search-field">
        <span>Поиск НТД или объекта</span>
        <input id="criteria-standard-search" type="search" value="${escapeAttribute(state.standardQuery)}" placeholder="Например: РВС, резервуар, ГОСТ 31385">
      </label>
      <div class="criteria-standards">
        ${standards.map(item => `<button type="button" data-standard="${escapeAttribute(item.id)}" class="${standard.id === item.id ? "active" : ""}"><b>${safeText(item.shortTitle || item.title)}</b><span>${safeText(item.description)}</span></button>`).join("")}
      </div>
      ${standards.length ? "" : `<div class="empty-state">НТД или объект по запросу не найден.</div>`}
    </section>

    ${usesMedium ? `<section class="criteria-control-group" aria-labelledby="criteria-medium-title">
      <h3 id="criteria-medium-title">2. Условия по выбранной НТД</h3>
      <div class="criteria-segmented">
        <button type="button" data-medium="gas" class="${state.medium === "gas" ? "active" : ""}">Газ</button>
        <button type="button" data-medium="oil" class="${state.medium === "oil" ? "active" : ""}">Нефть / нефтепродукты</button>
      </div>
    </section>` : ""}

    <section class="criteria-control-group" aria-labelledby="criteria-method-title">
      <h3 id="criteria-method-title">${usesMedium ? "3" : "2"}. Метод контроля</h3>
      <div class="criteria-methods">
        ${methods.map(method => `<button type="button" data-method="${method.id}" class="${state.method === method.id ? "active" : ""}"><b>${safeText(method.title)}</b><span>${safeText(method.description)}</span></button>`).join("")}
      </div>
    </section>

    <section class="criteria-control-group">
      <h3>${usesMedium ? "4" : "3"}. Критерий и параметры</h3>
      <label class="criteria-field criteria-search-field">
        <span>Поиск по дефекту</span>
        <input id="criteria-defect-search" type="search" value="${escapeAttribute(state.defectQuery)}" placeholder="Например: подрез, пора, трещина">
      </label>
      ${matches.length ? `<div class="criteria-search-results">${matches.map(match => {
        const matchStandard = data.standards.find(item => item.basisDocuments.includes(match.source?.basisDocument));
        return `<button type="button" data-match="${escapeAttribute(match.id)}" data-match-method="${escapeAttribute(match.method)}"><b>${safeText(match.defect)}</b><span>${safeText(matchStandard?.shortTitle || matchStandard?.title)} · ${safeText(methodTitle(data, match.method))}</span></button>`;
      }).join("")}</div>` : ""}
      <label class="criteria-field">
        <span>Критерий</span>
        <select id="criteria-defect" name="criterionId">
          ${available.map(item => `<option value="${escapeAttribute(item.id)}"${item.id === criterion?.id ? " selected" : ""}>${safeText(item.defect)}</option>`).join("")}
        </select>
      </label>
      ${criterion ? `<form id="criteria-form" class="criteria-form">${inputIds.map(inputId => inputHtml(data, inputId)).join("")}<button class="criteria-submit" type="submit">${criterion.outcome === "reference-only" ? "Показать нормативный маршрут" : "Проверить критерий"}</button></form>` : `<div class="empty-state">Для выбранной НТД и метода критерии пока не добавлены.</div>`}
    </section>

    ${criterion ? resultHtml(data, criterion, state.result) : ""}

    ${criterion?.notes?.length ? `<details class="criteria-notes"${criterion.recommendation ? " open" : ""}><summary>Условия и примечания к критерию</summary><ul>${criterion.notes.map(note => `<li>${safeText(note)}</li>`).join("")}</ul></details>` : ""}
    ${criterion?.relatedCriterion ? `<a href="#criterion=${escapeAttribute(criterion.relatedCriterion)}" class="criteria-related-link">Перейти к оценке фактического дефекта по ВИК</a>` : ""}

    <details class="criteria-notes"><summary>Как трактовать результат</summary>
      <p>Результат относится только к выбранной НТД и одному критерию. Нормы разных документов не объединяются автоматически.</p>
      <p>Проектная, рабочая и технологическая документация могут уточнять область применения, методы, объём контроля и критерии.</p>
    </details>
  `;

  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "home" }));
  content.querySelectorAll("[data-standard]").forEach(button => button.addEventListener("click", () => {
    state.standardId = button.dataset.standard; state.standardQuery = ""; state.method = ""; state.criterionId = ""; state.defectQuery = ""; state.result = null; state.values = {}; renderLoaded(data);
  }));
  content.querySelector("#criteria-standard-search")?.addEventListener("input", event => {
    state.standardQuery = event.target.value; renderLoaded(data);
    requestAnimationFrame(() => {
      const search = content.querySelector("#criteria-standard-search"); search?.focus(); search?.setSelectionRange(search.value.length, search.value.length);
    });
  });
  content.querySelectorAll("[data-medium]").forEach(button => button.addEventListener("click", () => {
    state.medium = button.dataset.medium; state.criterionId = ""; state.result = null; renderLoaded(data);
  }));
  content.querySelectorAll("[data-method]").forEach(button => button.addEventListener("click", () => {
    state.method = button.dataset.method; state.criterionId = ""; state.result = null; renderLoaded(data);
  }));
  content.querySelector("#criteria-defect")?.addEventListener("change", event => {
    state.criterionId = event.target.value; state.result = null; renderLoaded(data);
  });
  content.querySelector("#criteria-defect-search")?.addEventListener("input", event => {
    state.defectQuery = event.target.value; renderLoaded(data);
    requestAnimationFrame(() => {
      const search = content.querySelector("#criteria-defect-search"); search?.focus(); search?.setSelectionRange(search.value.length, search.value.length);
    });
  });
  content.querySelectorAll("[data-match]").forEach(button => button.addEventListener("click", () => {
    const match = data.criteria.find(item => item.id === button.dataset.match);
    if (!match) return;
    const matchStandard = data.standards.find(item => item.basisDocuments.includes(match.source?.basisDocument));
    if (matchStandard) state.standardId = matchStandard.id;
    state.method = match.method;
    state.medium = match.medium.includes(state.medium) ? state.medium : match.medium[0];
    state.criterionId = match.id;
    state.defectQuery = "";
    state.result = null;
    renderLoaded(data);
  }));
  content.querySelectorAll("#criteria-form input[name]").forEach(input => input.addEventListener("input", event => {
    state.values[event.currentTarget.name] = event.currentTarget.value;
    state.result = null;
    content.querySelector(".criteria-result")?.remove();
  }));
  content.querySelectorAll("#criteria-form select[name]").forEach(select => select.addEventListener("change", event => {
    state.values[event.currentTarget.name] = event.currentTarget.value;
    state.result = null;
    renderLoaded(data);
  }));
  content.querySelector("#criteria-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    inputIds.forEach(inputId => {
      const definition = data.inputs[inputId];
      const raw = formData.get(inputId);
      state.values[inputId] = definition?.type === "number" ? parseCriterionNumber(raw) : String(raw || "");
    });
    const invalid = inputIds.find(inputId => {
      const definition = data.inputs[inputId];
      const value = state.values[inputId];
      return definition?.type === "number" && value !== "" && (!Number.isFinite(value) || value < (definition.min ?? 0));
    });
    state.result = invalid ? { allowed: null, message: "Проверьте поле «" + data.inputs[invalid].label + "»: введите корректное число в допустимом диапазоне." } : evaluateCriterion(currentCriterion(data), state.values);
    renderLoaded(data);
    requestAnimationFrame(() => content.querySelector(".criteria-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
}

export async function renderCriteriaFinder(options = {}) {
  content.innerHTML = `<div class="empty-state">Загрузка нормативных критериев…</div>`;
  try {
    const data = await loadCriteriaData();
    const criterionId = typeof options === "string" ? options : options.criterionId;
    const query = typeof options === "object" ? options.query || "" : "";
    if (criterionId) {
      const selected = data.criteria.find(item => item.id === criterionId);
      const standard = selected && data.standards.find(item => item.basisDocuments.includes(selected.source.basisDocument));
      if (selected && standard) {
        state.standardId = standard.id; state.method = selected.method; state.criterionId = selected.id;
        state.values = {}; state.result = null; state.standardQuery = ""; state.defectQuery = "";
      }
    } else if (query) {
      state.defectQuery = query;
      state.criterionId = "";
      state.result = null;
    }
    renderLoaded(data);
  } catch (error) {
    console.error(error);
    content.innerHTML = `<div class="empty-state" role="alert">Не удалось загрузить или проверить нормативные критерии.</div>`;
  }
}
