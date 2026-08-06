import { content } from "./dom.js";
import { escapeAttribute, safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { getArticles, getItem, getItemRoute } from "./store.js";
import { getVibrationKnowledgeBlocks } from "./vibrationKnowledge.js";
import { assessMeasurement, evaluateDiagnosticAnswers, formatDiagnosticReport } from "./vibrationDiagnosticEngine.js";
import { getVisibleDiagnosticSteps } from "./vibrationDiagnosticQuestions.js";
import {
  clearDiagnosticDraft, clearDiagnosticHistory, deleteDiagnosticSession, loadDiagnosticDraft,
  loadDiagnosticHistory, saveDiagnosticDraft, saveDiagnosticSession
} from "./vibrationDiagnosticStorage.js";

const TOOL_ID = "vibration-tool-fault-search";
let answers = {};
let stepIndex = 0;
let result = null;
let pendingDraft = null;
let validationMessage = "";

function asArray(value) { return Array.isArray(value) ? value : []; }

function renderOption(field, choice, checked) {
  const inputId = `diagnostic-${field.id}-${choice.value}`;
  return `<label class="diagnostic-choice" for="${escapeAttribute(inputId)}">
    <input id="${escapeAttribute(inputId)}" name="${escapeAttribute(field.id)}" type="${field.type}" value="${escapeAttribute(choice.value)}" ${checked ? "checked" : ""}>
    <span><strong>${safeText(choice.label)}</strong>${choice.help ? `<small>${safeText(choice.help)}</small>` : ""}</span>
  </label>`;
}

function renderField(field) {
  if (field.type === "checkbox" || field.type === "radio") {
    const current = field.type === "checkbox" ? asArray(answers[field.id]) : answers[field.id];
    return `<fieldset class="diagnostic-field" aria-describedby="diagnostic-error" ${field.required ? "aria-required=\"true\"" : ""}>
      <legend>${safeText(field.label)}${field.required ? " *" : ""}</legend>
      <div class="diagnostic-choices">${field.options.map(choice => renderOption(field, choice,
        field.type === "checkbox" ? current.includes(choice.value) : current === choice.value)).join("")}</div>
    </fieldset>`;
  }
  const inputMode = field.type === "number" ? "decimal" : "text";
  return `<label class="diagnostic-text-field" for="diagnostic-${escapeAttribute(field.id)}">
    <span>${safeText(field.label)}</span>
    <input id="diagnostic-${escapeAttribute(field.id)}" name="${escapeAttribute(field.id)}" type="text" inputmode="${inputMode}" aria-describedby="diagnostic-error" value="${escapeAttribute(answers[field.id] || "")}" ${field.min != null ? `data-min="${field.min}"` : ""}>
  </label>`;
}

function renderHeader() {
  return `<div class="page-header">
    <button class="back-button" id="back-button" aria-label="Вернуться в инструменты ВД">‹</button>
    <div><h2 tabindex="-1">Помощник по диагностике</h2><p>Предварительный поиск вероятных причин</p></div>
  </div>
  <aside class="diagnostic-warning" role="note"><strong>Важно</strong><p>Помощник формирует только предварительный список вероятных причин. Один вибрационный признак может соответствовать нескольким неисправностям. Результат необходимо подтверждать дополнительными измерениями, рабочими параметрами, документацией изготовителя и применяемой НТД.</p></aside>`;
}

function bindBack() {
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "section", method: "vibration", itemId: "vibration-tools" }));
}

function persistDraft() { saveDiagnosticDraft({ answers, stepIndex, updatedAt: new Date().toISOString() }); }

function collectStep(step) {
  step.fields.forEach(field => {
    if (field.type === "checkbox") answers[field.id] = [...content.querySelectorAll(`input[name="${field.id}"]:checked`)].map(input => input.value);
    else if (field.type === "radio") answers[field.id] = content.querySelector(`input[name="${field.id}"]:checked`)?.value || "";
    else {
      const input = content.querySelector(`[name="${field.id}"]`);
      answers[field.id] = input?.value.trim().replace(",", ".") || "";
    }
  });
  persistDraft();
}

function validateStep(step) {
  for (const field of step.fields) {
    if (field.required && (Array.isArray(answers[field.id]) ? !answers[field.id].length : !answers[field.id])) return `Ответьте на вопрос «${field.label}».`;
    if (field.type === "number" && answers[field.id] !== "") {
      const value = Number(answers[field.id]);
      if (!Number.isFinite(value) || (field.min != null && value < field.min)) return `Проверьте числовое значение «${field.label}».`;
    }
  }
  return "";
}

function renderMeasurementStop() {
  const measurement = assessMeasurement(answers);
  content.innerHTML = `${renderHeader()}<section class="diagnostic-stop" role="alert">
    <span class="article-category">Проверка измерения</span><h2>Сначала необходимо подтвердить достоверность измерительной цепи</h2>
    <ul>${measurement.recommendations.map(item => `<li>${safeText(item)}</li>`).join("")}</ul>
    <div class="diagnostic-actions"><button type="button" data-return-measurement>Вернуться к измерению</button><button class="secondary-button" type="button" data-continue-warning>Продолжить несмотря на предупреждение</button></div>
  </section>`;
  bindBack();
  content.querySelector("[data-return-measurement]").addEventListener("click", renderStep);
  content.querySelector("[data-continue-warning]").addEventListener("click", () => { answers.continueAfterMeasurementWarning = true; stepIndex += 1; persistDraft(); renderStep(); });
}

function renderStep() {
  result = null;
  const steps = getVisibleDiagnosticSteps(answers);
  stepIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
  const step = steps[stepIndex];
  content.innerHTML = `${renderHeader()}
    <section class="diagnostic-wizard" aria-labelledby="diagnostic-step-title">
      <div class="diagnostic-progress"><span>Шаг ${stepIndex + 1} из ${steps.length}</span><progress value="${stepIndex + 1}" max="${steps.length}">${stepIndex + 1}/${steps.length}</progress></div>
      <span class="article-category">${safeText(step.title)}</span><h2 id="diagnostic-step-title">${safeText(step.title)}</h2><p>${safeText(step.description)}</p>
      <form id="diagnostic-form" novalidate>${step.fields.map(renderField).join("")}
        <p class="diagnostic-error" id="diagnostic-error" role="alert" tabindex="-1">${safeText(validationMessage)}</p>
        <div class="diagnostic-actions">${stepIndex ? `<button type="button" class="secondary-button" data-previous>Назад</button>` : ""}<button type="submit">${stepIndex === steps.length - 1 ? "Показать результат" : "Продолжить"}</button><button type="button" class="text-button" data-reset>Сбросить</button></div>
      </form>
    </section>`;
  bindBack(); validationMessage = "";
  content.querySelector("#diagnostic-form").addEventListener("change", () => collectStep(step));
  content.querySelector("#diagnostic-form").addEventListener("submit", event => {
    event.preventDefault(); collectStep(step); validationMessage = validateStep(step);
    if (validationMessage) { renderStep(); content.querySelector("#diagnostic-error")?.focus(); return; }
    if (step.id === "measurement" && assessMeasurement(answers).blocked) { renderMeasurementStop(); return; }
    if (stepIndex === steps.length - 1) { result = evaluateDiagnosticAnswers(answers); clearDiagnosticDraft(); renderResult(); return; }
    stepIndex += 1; persistDraft(); renderStep();
  });
  content.querySelector("[data-previous]")?.addEventListener("click", () => { collectStep(step); stepIndex -= 1; persistDraft(); renderStep(); });
  content.querySelector("[data-reset]").addEventListener("click", resetSession);
}

function knowledgeBlocksForResult() {
  const all = getArticles("vibration");
  const faultLabels = result.causes.map(cause => cause.label);
  const source = { id: "diagnostic-result", metadata: {
    materialType: "tool", equipment: [answers.equipment].filter(Boolean), faults: faultLabels,
    diagnosticSigns: [...asArray(answers.signs), ...asArray(answers.frequencies)], measuredParameters: [], keywords: [], tags: [],
    relatedArticles: [], relatedFaults: result.relatedFaults, relatedSpectra: result.relatedSpectra,
    relatedScenarios: [], relatedReferences: [], probableFaults: result.relatedFaults, similarSpectra: []
  }};
  return getVibrationKnowledgeBlocks(source, all, 5);
}

function renderKnowledge() {
  return knowledgeBlocksForResult().filter(block => !block.facet).map(block => `<section class="diagnostic-result-block"><h3>${safeText(block.title)}</h3><div class="diagnostic-related">${block.items.map(item => `<a href="${getRouteHash(getItemRoute("vibration", item))}" data-related-id="${escapeAttribute(item.id)}">${safeText(item.title)}</a>`).join("")}</div></section>`).join("");
}

function renderHistory() {
  const history = loadDiagnosticHistory();
  if (!history.length) return "";
  return `<section class="diagnostic-history"><div class="diagnostic-history-heading"><h3>Сохранённые сессии</h3><button type="button" class="text-button" data-clear-history>Очистить историю</button></div>${history.map(item => `<article><strong>${safeText(item.name || item.equipment || "Диагностическая сессия")}</strong><small>${safeText(new Date(item.date).toLocaleString("ru-RU"))} · ${safeText(item.quality)}</small><details><summary>Посмотреть результат</summary><pre>${safeText(item.report || "Результат не сохранён")}</pre></details><button type="button" aria-label="Удалить сессию" data-delete-session="${escapeAttribute(item.id)}">Удалить</button></article>`).join("")}</section>`;
}

function renderResult() {
  const report = formatDiagnosticReport(answers, result);
  content.innerHTML = `${renderHeader()}<section class="diagnostic-result">
    <span class="article-category">Предварительный результат</span><h2>Результат диагностического помощника</h2>
    <aside class="diagnostic-warning" role="alert">Полученный результат не является заключением о техническом состоянии и не заменяет решение специалиста по вибродиагностике.</aside>
    <section class="diagnostic-result-block"><h3>Исходные данные</h3><p>Оборудование: ${safeText(answers.equipment || "не указано")}; режим: ${safeText(answers.operatingMode || "не указан")}; признаки: ${safeText(asArray(answers.signs).join(", ") || "не указаны")}.</p></section>
    <section class="diagnostic-result-block"><h3>Качество данных</h3><p>Достоверность исходных данных: <strong>${safeText(result.quality.level)}</strong>.</p></section>
    <section class="diagnostic-result-block"><h3>Наиболее вероятные причины</h3>${result.causes.length ? result.causes.map(cause => `<article class="diagnostic-cause"><h4>${safeText(cause.label)}</h4><strong>${safeText(cause.level)}</strong><p>Совпавшие группы признаков: ${safeText(cause.matched.join(", "))}.</p><p>Не подтверждены: ${safeText(cause.missing.join(", ") || "нет дополнительных данных")}.</p><p>Что может противоречить: отсутствие ожидаемых фазовых, режимных или частотных признаков при повторной проверке.</p>${cause.warnings.length ? `<p>${safeText(cause.warnings.join(" "))}</p>` : ""}</article>`).join("") : `<p>Недостаточно независимых признаков. Уточните спектр, фазу и режим работы.</p>`}</section>
    <section class="diagnostic-result-block"><h3>Что проверить дальше</h3><ol>${result.checks.map(item => `<li>${safeText(item)}</li>`).join("")}</ol></section>
    ${result.causes.length > 1 ? `<section class="diagnostic-result-block"><h3>С чем можно перепутать</h3><p>${safeText(result.causes.slice(1).map(item => item.label).join(", "))}</p></section>` : ""}
    ${renderKnowledge()}
    <section class="diagnostic-result-block"><h3>Предупреждения</h3><ul>${[...result.warnings, "Требуется проверка по применяемой НТД.", "Изменение режима работы допускается только по согласованию с оператором."].map(item => `<li>${safeText(item)}</li>`).join("")}</ul><details><summary>Основание диагностических связей</summary>${result.sources.map(source => `<p>${safeText(source.document)}, ${safeText(source.section)}</p>`).join("")}</details></section>
    <div class="diagnostic-actions"><button type="button" data-copy>Скопировать результат</button><button type="button" class="secondary-button" data-save>Сохранить локально</button><button type="button" class="text-button" data-restart>Начать заново</button></div><p class="diagnostic-copy-status" role="status"></p>
    <textarea class="diagnostic-report-text" aria-label="Текст предварительного отчёта" readonly>${safeText(report)}</textarea>
    ${renderHistory()}
  </section>`;
  bindBack();
  content.querySelectorAll("[data-related-id]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); const item = getItem("vibration", link.dataset.relatedId); if (item) navigate(getItemRoute("vibration", item)); }));
  content.querySelector("[data-copy]").addEventListener("click", async () => { try { await navigator.clipboard.writeText(report); content.querySelector(".diagnostic-copy-status").textContent = "Результат скопирован."; } catch { const area = content.querySelector(".diagnostic-report-text"); area.select(); document.execCommand("copy"); content.querySelector(".diagnostic-copy-status").textContent = "Результат скопирован."; } });
  content.querySelector("[data-save]").addEventListener("click", () => { saveDiagnosticSession({ equipment: answers.equipment, signs: answers.signs, causes: result.causes.map(item => item.label), quality: result.quality.level, report }); renderResult(); });
  content.querySelector("[data-restart]").addEventListener("click", resetSession);
  content.querySelector("[data-clear-history]")?.addEventListener("click", () => { clearDiagnosticHistory(); renderResult(); });
  content.querySelectorAll("[data-delete-session]").forEach(button => button.addEventListener("click", () => { deleteDiagnosticSession(button.dataset.deleteSession); renderResult(); }));
}

function resetSession() { answers = {}; stepIndex = 0; result = null; pendingDraft = null; clearDiagnosticDraft(); renderStep(); }

function renderResume() {
  content.innerHTML = `${renderHeader()}<section class="diagnostic-resume"><h2>Продолжить незавершённую диагностику?</h2><p>Найдены сохранённые ответы. Они не будут восстановлены без вашего выбора.</p><div class="diagnostic-actions"><button type="button" data-resume>Продолжить</button><button type="button" class="secondary-button" data-new>Начать заново</button></div></section>`;
  bindBack();
  content.querySelector("[data-resume]").addEventListener("click", () => { answers = pendingDraft.answers || {}; stepIndex = Number(pendingDraft.stepIndex) || 0; pendingDraft = null; renderStep(); });
  content.querySelector("[data-new]").addEventListener("click", resetSession);
}

export function renderVibrationDiagnosticAssistant() {
  pendingDraft = loadDiagnosticDraft();
  answers = {}; stepIndex = 0; result = null;
  pendingDraft?.answers && Object.keys(pendingDraft.answers).length ? renderResume() : renderStep();
}

export { TOOL_ID as VIBRATION_DIAGNOSTIC_TOOL_ID };
