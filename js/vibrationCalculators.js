import { content } from "./dom.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { safeText } from "./html.js";
import { getRouteHash, goBack, navigate } from "./router.js";
import { getArticles, getItem, getItemRoute } from "./store.js";
import { getVibrationKnowledgeBlocks } from "./vibrationKnowledge.js";
import {
  CalculationError, STANDARD_GRAVITY, calculateBearingFrequencies, calculateOrders, calculateSinusoidal,
  convertAcceleration, convertAmplitude, convertDisplacement, convertRotation, convertVelocity, formatCalculation
} from "./vibrationCalculations.js";
import { VIBRATION_CALCULATOR_IDS, recommendParameter } from "./vibrationCalculatorData.js";
import { clearCalculatorHistory, consumeToolTransfer, deleteCalculatorResult, loadCalculatorHistory, saveCalculatorResult, saveToolTransfer } from "./vibrationCalculatorStorage.js";

let currentResult = null;
let currentInputs = null;

const bearingNames = Object.freeze({ FTF: "Сепаратор", BPFO: "Наружное кольцо", BPFI: "Внутреннее кольцо", BSF: "Тела качения" });
const field = (id, label, value = "", extra = "") => `<label class="calculator-field" for="calc-${id}"><span>${label}</span><input id="calc-${id}" name="${id}" inputmode="decimal" value="${value}" aria-describedby="error-${id}" ${extra}><small class="field-error" id="error-${id}"></small></label>`;
const select = (id, label, options) => `<label class="calculator-field" for="calc-${id}"><span>${label}</span><select id="calc-${id}" name="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select><small class="field-error" id="error-${id}"></small></label>`;

function shell(article, body) {
  const favorite = isFavorite("vibration", article.id);
  return `<div class="page-header"><button class="back-button" id="back-button" aria-label="Вернуться в инструменты ВД">‹</button><div><h2 tabindex="-1">${safeText(article.title)}</h2><p>ВД · Инструменты</p></div></div>
  <article class="calculator-page"><div class="calculator-title-row"><div><span class="article-category">Расчётный инструмент</span><p>${safeText(article.summary)}</p></div><button class="favorite-button ${favorite ? "active" : ""}" id="favorite-button" aria-pressed="${favorite}" aria-label="Избранное">${favorite ? "★" : "☆"}</button></div>
  ${body}<section class="calculator-history" aria-labelledby="calculator-history-title"><div class="calculator-section-heading"><h3 id="calculator-history-title">История расчётов</h3><button class="text-button" type="button" data-clear-history>Очистить</button></div><div data-history></div></section></article>`;
}

function actions() {
  return `<div class="calculator-actions"><button type="submit">Рассчитать</button><button class="secondary-button" type="reset">Очистить</button></div><div class="calculator-form-error" data-form-error role="alert"></div>`;
}

function resultBox() { return `<section class="calculator-result" aria-live="polite" data-result hidden></section>`; }

function clearErrors(form) { form.querySelectorAll(".field-error").forEach(node => { node.textContent = ""; }); form.querySelector("[data-form-error]").textContent = ""; }
function showError(form, error) {
  const target = error instanceof CalculationError && error.field ? form.querySelector(`#error-${CSS.escape(error.field)}`) : null;
  if (target) { target.textContent = error.message; form.elements[error.field]?.focus(); } else form.querySelector("[data-form-error]").textContent = error.message || "Не удалось выполнить расчёт.";
}

function renderResult(html, report, summary, inputs) {
  const box = content.querySelector("[data-result]");
  currentResult = { report, summary };
  currentInputs = inputs;
  box.hidden = false;
  box.innerHTML = `${html}<div class="calculator-result-actions"><button type="button" data-copy>Скопировать расчёт</button><button class="secondary-button" type="button" data-save>Сохранить в историю</button></div><p class="copy-status" data-copy-status role="status"></p>`;
  box.querySelector("[data-copy]").addEventListener("click", () => copyText(report, box));
  box.querySelector("[data-save]").addEventListener("click", () => { saveCalculatorResult({ toolId: activeArticle().id, title: activeArticle().title, summary, report, inputs }); renderHistory(); box.querySelector("[data-copy-status]").textContent = "Расчёт сохранён локально."; });
}

async function copyText(text, scope = content) {
  try { await navigator.clipboard.writeText(text); scope.querySelector("[data-copy-status]").textContent = "Расчёт скопирован."; }
  catch { scope.querySelector("[data-copy-status]").textContent = "Не удалось скопировать автоматически."; }
}

function activeArticle() { return getItem("vibration", content.querySelector("[data-calculator-id]")?.dataset.calculatorId); }

function renderHistory() {
  const host = content.querySelector("[data-history]");
  if (!host) return;
  const entries = loadCalculatorHistory().filter(item => item.toolId === activeArticle()?.id);
  host.innerHTML = entries.length ? entries.map(entry => `<div class="calculator-history-item"><div><strong>${safeText(entry.summary)}</strong><small>${new Date(entry.date).toLocaleString("ru-RU")}</small></div><div><button type="button" data-history-copy="${entry.id}">Копировать</button><button type="button" class="text-button" data-history-delete="${entry.id}">Удалить</button></div></div>`).join("") : `<p class="calculator-muted">Сохранённых расчётов пока нет.</p>`;
  host.querySelectorAll("[data-history-copy]").forEach(button => button.addEventListener("click", () => { const item = entries.find(entry => entry.id === button.dataset.historyCopy); if (item) copyText(item.report, content); }));
  host.querySelectorAll("[data-history-delete]").forEach(button => button.addEventListener("click", () => { deleteCalculatorResult(button.dataset.historyDelete); renderHistory(); }));
}

function rotationView() {
  return `<form class="calculator-form" data-calculator-form data-calculator-id="vibration-tool-rotation-frequency"><section class="calculator-panel"><h3>Исходное значение</h3><div class="calculator-grid">${field("rotation", "Частота вращения", "1500")}${select("rotation-unit", "Единица", [["rpm", "об/мин"], ["hz", "Гц"], ["rad", "рад/с"]])}</div><div class="quick-values" aria-label="Быстрый ввод">${[750, 1000, 1500, 3000].map(value => `<button type="button" data-rpm="${value}">${value} об/мин</button>`).join("")}</div>${actions()}</section>${resultBox()}${formula("f = n / 60; ω = 2πf", "Пересчёт единиц частоты вращения. Быстрые значения являются примерами.")}</form>`;
}

function harmonicsView() {
  return `<form class="calculator-form" data-calculator-form data-calculator-id="vibration-tool-harmonics"><section class="calculator-panel"><h3>Оборотная частота и порядки</h3><div class="calculator-grid">${field("rotation", "Частота вращения", "1500")}${select("rotation-unit", "Единица", [["rpm", "об/мин"], ["hz", "Гц"]])}${field("maximum-order", "Гармоники до", "10")}${field("custom-order", "Пользовательский порядок, ×", "")}</div>${actions()}</section>${resultBox()}${formula("fₖ = k × fᵣ", "Линейка показывает расчётные положения, а не измеренный спектр.")}</form>`;
}

function bearingView() {
  return `<form class="calculator-form" data-calculator-form data-calculator-id="vibration-tool-bearing-frequencies"><aside class="calculator-note"><strong>Режим расчёта</strong><p>Проверенные формулы применяются при вращении внутреннего и неподвижном наружном кольце. Каталог подшипников — в разработке.</p></aside><section class="calculator-panel"><h3>Вращение</h3><div class="calculator-grid">${field("inner-rotation", "Внутреннее кольцо", "1500")}${field("outer-rotation", "Наружное кольцо", "0")}${select("rotation-unit", "Единица", [["rpm", "об/мин"], ["hz", "Гц"]])}</div></section><section class="calculator-panel"><h3>Геометрия</h3><div class="calculator-grid">${field("rolling-elements", "Количество тел N", "8")}${field("rolling-element-diameter", "Диаметр тела d", "10")}${field("pitch-diameter", "Диаметр окружности D", "50")}${field("contact-angle", "Угол контакта α, °", "0")}${field("harmonic-count", "Количество гармоник", "3")}</div>${actions()}</section>${resultBox()}${formula("FTF, BPFO, BPFI и BSF рассчитываются по N, d/D, α и относительной частоте вращения.", "ГОСТ Р ИСО 13373-3-2016, приложение D. Расчётные частоты требуют сопоставления с фактическим спектром.")}</form>`;
}

function conversionView() {
  return `<form class="calculator-form" data-calculator-form data-calculator-id="vibration-tool-unit-conversion"><section class="calculator-panel"><h3>Вид пересчёта</h3>${select("conversion-mode", "Расчёт", [["rotation", "Частота вращения"], ["displacement", "Виброперемещение"], ["velocity", "Виброскорость"], ["acceleration", "Виброускорение"], ["sinusoidal", "Перемещение ↔ скорость ↔ ускорение"]])}<div data-conversion-fields></div>${actions()}</section>${resultBox()}${formula("Единичные коэффициенты и зависимости v = 2πfx; a = (2πf)²x.", `Для ускорения принято g = ${STANDARD_GRAVITY} м/с². RMS ↔ Peak и гармонический пересчёт применимы только к синусоидальному сигналу.`)}</form>`;
}

function parameterView() {
  return `<form class="calculator-form" data-calculator-form data-calculator-id="vibration-tool-parameter-selection"><aside class="calculator-note"><strong>Важно</strong><p>Помощник рекомендует направление измерений и не задаёт нормативные границы.</p></aside><section class="calculator-panel"><div class="calculator-grid">${select("task", "Задача", [["general", "Общая оценка машины"], ["low", "Низкочастотная вибрация"], ["shaft", "Контроль вращающегося вала"], ["bearing", "Подшипник качения"], ["high-impact", "Высокочастотные удары"], ["slow", "Медленно вращающееся оборудование"], ["relative-shaft", "Относительное перемещение вала"], ["unknown", "Задача неизвестна"]])}${select("equipment", "Оборудование", [["pump", "Насос"], ["motor", "Электродвигатель"], ["fan", "Вентилятор"], ["gearbox", "Редуктор"], ["compressor", "Компрессор"], ["turbine", "Турбина"], ["other", "Другое"]])}${select("speed", "Ориентировочная скорость", [["low", "Низкая"], ["medium", "Средняя"], ["high", "Высокая"], ["unknown", "Неизвестна"]])}</div>${actions()}</section>${resultBox()}</form>`;
}

function formula(expression, note) { return `<details class="calculator-formula"><summary>Формулы и основание расчёта</summary><p><code>${expression}</code></p><p>${note}</p></details>`; }

function conversionFields(mode) {
  const unitOptions = {
    displacement: [["m", "м"], ["mm", "мм"], ["um", "мкм"], ["inch", "дюйм"], ["mil", "mil"]],
    velocity: [["m/s", "м/с"], ["mm/s", "мм/с"], ["cm/s", "см/с"], ["in/s", "дюйм/с"]],
    acceleration: [["m/s2", "м/с²"], ["mm/s2", "мм/с²"], ["g", "g"]]
  };
  if (mode === "rotation") return `<div class="calculator-grid">${field("value", "Значение", "1500")}${select("from-unit", "Исходная единица", [["rpm", "об/мин"], ["hz", "Гц"], ["rad", "рад/с"]])}</div>`;
  if (mode === "sinusoidal") return `<div class="calculator-grid">${select("known", "Известная величина", [["displacement", "Перемещение"], ["velocity", "Скорость"], ["acceleration", "Ускорение"]])}${field("value", "Значение", "1")}${select("from-unit", "Единица", unitOptions.displacement)}${select("amplitude-type", "Представление", [["peak", "Peak"], ["p2p", "Peak-to-Peak"]])}${field("frequency", "Частота", "10")}${select("frequency-unit", "Единица частоты", [["hz", "Гц"], ["rpm", "об/мин"]])}</div>`;
  const amplitude = mode === "displacement" ? [["peak", "Peak"], ["p2p", "Peak-to-Peak"]] : [["rms", "RMS"], ["peak", "Peak"]];
  return `<div class="calculator-grid">${field("value", "Значение", "1")}${select("from-unit", "Из", unitOptions[mode])}${select("to-unit", "В", [...unitOptions[mode]].reverse())}${select("from-amplitude", "Исходное представление", amplitude)}${select("to-amplitude", "Результат", amplitude)}</div>`;
}

function bindCalculator(article) {
  const form = content.querySelector("[data-calculator-form]");
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "section", method: "vibration", itemId: "vibration-tools" }));
  content.querySelector("#favorite-button").addEventListener("click", event => { const on = toggleFavorite("vibration", article.id); event.currentTarget.classList.toggle("active", on); event.currentTarget.textContent = on ? "★" : "☆"; event.currentTarget.setAttribute("aria-pressed", String(on)); });
  content.querySelector("[data-clear-history]").addEventListener("click", () => { clearCalculatorHistory(); renderHistory(); });
  if (article.id === "vibration-tool-rotation-frequency") form.querySelectorAll("[data-rpm]").forEach(button => button.addEventListener("click", () => { form.elements.rotation.value = button.dataset.rpm; form.elements["rotation-unit"].value = "rpm"; form.requestSubmit(); }));
  if (article.id === "vibration-tool-unit-conversion") {
    const mode = form.elements["conversion-mode"];
    const updateKnown = () => {
      const known = form.elements.known?.value;
      if (!known) return;
      const units = known === "displacement" ? [["m", "м"], ["mm", "мм"], ["um", "мкм"], ["inch", "дюйм"], ["mil", "mil"]] : known === "velocity" ? [["m/s", "м/с"], ["mm/s", "мм/с"], ["cm/s", "см/с"], ["in/s", "дюйм/с"]] : [["m/s2", "м/с²"], ["mm/s2", "мм/с²"], ["g", "g"]];
      form.elements["from-unit"].innerHTML = units.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
      form.elements["amplitude-type"].innerHTML = (known === "displacement" ? [["peak", "Peak"], ["p2p", "Peak-to-Peak"]] : [["rms", "RMS"], ["peak", "Peak"]]).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    };
    const update = () => { form.querySelector("[data-conversion-fields]").innerHTML = conversionFields(mode.value); form.elements.known?.addEventListener("change", updateKnown); };
    mode.addEventListener("change", update); update();
  }
  form.addEventListener("reset", () => { setTimeout(() => { content.querySelector("[data-result]").hidden = true; clearErrors(form); if (article.id === "vibration-tool-unit-conversion") { form.querySelector("[data-conversion-fields]").innerHTML = conversionFields("rotation"); } }, 0); });
  form.addEventListener("submit", event => { event.preventDefault(); clearErrors(form); try { calculate(article.id, form); } catch (error) { showError(form, error); } });
  const transfer = consumeToolTransfer(article.id);
  if (transfer?.rpm && form.elements.rotation) { form.elements.rotation.value = transfer.rpm; form.elements["rotation-unit"].value = "rpm"; form.requestSubmit(); }
  renderHistory();
}

function values(form) { return Object.fromEntries(new FormData(form).entries()); }

function calculate(id, form) {
  const input = values(form);
  if (id === "vibration-tool-rotation-frequency") {
    const r = convertRotation(input.rotation, input["rotation-unit"]);
    const report = `Калькулятор оборотной частоты\nОбороты: ${formatCalculation(r.rpm)} об/мин\nЧастота 1×: ${formatCalculation(r.hz)} Гц\nПериод: ${formatCalculation(r.periodSeconds, 6)} с\nУгловая скорость: ${formatCalculation(r.radPerSecond)} рад/с`;
    renderResult(`<h3>Результат</h3><dl class="calculator-values"><div><dt>Обороты</dt><dd>${formatCalculation(r.rpm)} об/мин</dd></div><div><dt>1×</dt><dd>${formatCalculation(r.hz)} Гц</dd></div><div><dt>Период</dt><dd>${formatCalculation(r.periodSeconds, 6)} с</dd></div><div><dt>Угловая скорость</dt><dd>${formatCalculation(r.radPerSecond)} рад/с</dd></div></dl><button type="button" class="secondary-button" data-transfer-assistant>Передать 1× в помощник</button>`, report, `${formatCalculation(r.rpm)} об/мин = ${formatCalculation(r.hz)} Гц`, input);
    content.querySelector("[data-transfer-assistant]").addEventListener("click", () => { saveToolTransfer({ target: "vibration-tool-fault-search", rpm: r.rpm, rotationHz: r.hz }); navigate({ view: "article", method: "vibration", itemId: "vibration-tool-fault-search" }); });
  } else if (id === "vibration-tool-harmonics") {
    const rows = calculateOrders(input.rotation, input["rotation-unit"], input["maximum-order"], input["custom-order"]);
    const report = `Калькулятор гармоник\n${rows.map(row => `${formatCalculation(row.order, 4)}×: ${formatCalculation(row.hz)} Гц`).join("\n")}`;
    const max = Math.max(...rows.map(row => row.hz));
    renderResult(`<h3>Расчётные составляющие</h3>${table(["Порядок", "Частота, Гц", "Циклов/мин"], rows.map(row => [`${formatCalculation(row.order, 4)}×`, formatCalculation(row.hz), formatCalculation(row.cyclesPerMinute)]))}<div class="frequency-ruler" aria-label="Расчётная линейка частот">${rows.filter(row => Number.isInteger(row.order)).map(row => `<span style="left:${row.hz / max * 100}%"><i></i><small>${row.order}×</small></span>`).join("")}</div><p class="calculator-muted">Линейка не является реальным спектром.</p>`, report, `${rows.length} расчётных порядков`, input);
  } else if (id === "vibration-tool-bearing-frequencies") {
    const r = calculateBearingFrequencies({ innerRotation: input["inner-rotation"], outerRotation: input["outer-rotation"], rotationUnit: input["rotation-unit"], rollingElements: input["rolling-elements"], rollingElementDiameter: input["rolling-element-diameter"], pitchDiameter: input["pitch-diameter"], contactAngle: input["contact-angle"], harmonicCount: input["harmonic-count"] });
    const report = `Калькулятор частот подшипника\nЧастота вращения: ${formatCalculation(r.rotation.hz)} Гц\nКоличество тел качения: ${input["rolling-elements"]}\nДиаметр тела качения: ${input["rolling-element-diameter"]}\nДиаметр окружности центров: ${input["pitch-diameter"]}\nУгол контакта: ${input["contact-angle"]}°\n${r.frequencies.map(item => `${item.code}: ${formatCalculation(item.hz)} Гц (${formatCalculation(item.order, 4)}×)`).join("\n")}\nПримечание: расчётные частоты являются теоретическими и требуют сопоставления с фактическим спектром и рабочим режимом машины.`;
    renderResult(`<h3>Характерные частоты</h3>${r.geometryWarning ? `<aside class="calculator-warning">Проверьте исходные размеры подшипника: отношение d/D выглядит нетипично высоким.</aside>` : ""}${table(["Обозначение", "Узел", "Гц", "Порядок"], r.frequencies.map(item => [item.code, bearingNames[item.code], formatCalculation(item.hz), `${formatCalculation(item.order, 4)}×`]))}<h4>Гармоники</h4>${r.frequencies.map(item => `<p><strong>${item.code}:</strong> ${item.harmonics.map(h => `${h.multiplier}× = ${formatCalculation(h.hz)} Гц`).join("; ")}</p>`).join("")}<h4>Ориентировочные боковые полосы BPFI</h4><p>${r.sidebands.map(item => `${item.label}: ${formatCalculation(item.hz)} Гц`).join("; ")}</p><aside class="calculator-warning">Реальные составляющие могут отличаться из-за проскальзывания, нагрузки, зазора, смазки и погрешности геометрии.</aside>`, report, `BPFO ${formatCalculation(r.frequencies.find(x => x.code === "BPFO").hz)} Гц · BPFI ${formatCalculation(r.frequencies.find(x => x.code === "BPFI").hz)} Гц`, input);
  } else if (id === "vibration-tool-unit-conversion") calculateConversion(input);
  else if (id === "vibration-tool-parameter-selection") {
    const r = recommendParameter(input.task, input.equipment, input.speed);
    const report = `Подбор измеряемого параметра\nРекомендация: ${r.parameter}\nДатчик: ${r.sensor}\nДополнительно: ${r.extra}\nОграничение: ${r.limits}`;
    renderResult(`<h3>Рекомендация</h3><dl class="calculator-values"><div><dt>Параметр</dt><dd>${r.parameter}</dd></div><div><dt>Тип датчика</dt><dd>${r.sensor}</dd></div><div><dt>Дополнительно</dt><dd>${r.extra}</dd></div></dl><aside class="calculator-warning">${r.limits}</aside>`, report, r.parameter, input);
  }
}

function calculateConversion(input) {
  const mode = input["conversion-mode"];
  let report; let html; let summary;
  if (mode === "rotation") { const r = convertRotation(input.value, input["from-unit"]); summary = `${formatCalculation(r.rpm)} об/мин`; html = `<dl class="calculator-values"><div><dt>об/мин</dt><dd>${formatCalculation(r.rpm)}</dd></div><div><dt>Гц / об/с</dt><dd>${formatCalculation(r.hz)}</dd></div><div><dt>рад/с</dt><dd>${formatCalculation(r.radPerSecond)}</dd></div><div><dt>Период</dt><dd>${formatCalculation(r.periodSeconds, 6)} с · ${formatCalculation(r.periodMilliseconds)} мс</dd></div></dl>`; }
  else if (mode === "sinusoidal") { const r = calculateSinusoidal({ known: input.known, value: input.value, unit: input["from-unit"], amplitudeType: input["amplitude-type"], frequency: input.frequency, frequencyUnit: input["frequency-unit"] }); summary = `f = ${formatCalculation(r.frequencyHz)} Гц`; html = `<dl class="calculator-values"><div><dt>Перемещение</dt><dd>${formatCalculation(r.displacementPeakM * 1e6)} мкм Peak · ${formatCalculation(r.displacementPeakToPeakM * 1e6)} мкм P-P</dd></div><div><dt>Скорость</dt><dd>${formatCalculation(r.velocityPeakMps * 1000)} мм/с Peak · ${formatCalculation(r.velocityRmsMps * 1000)} мм/с RMS</dd></div><div><dt>Ускорение</dt><dd>${formatCalculation(r.accelerationPeakMps2)} м/с² Peak · ${formatCalculation(r.accelerationRmsMps2)} м/с² RMS</dd></div></dl><aside class="calculator-warning">Применимо к одной синусоидальной составляющей известной частоты, а не к общему широкополосному уровню.</aside>`; }
  else { const converters = { displacement: convertDisplacement, velocity: convertVelocity, acceleration: convertAcceleration }; let result = converters[mode](input.value, input["from-unit"], input["to-unit"]); result = convertAmplitude(result, input["from-amplitude"], input["to-amplitude"]); summary = `${formatCalculation(result)} ${input["to-unit"]}`; html = `<dl class="calculator-values"><div><dt>Результат</dt><dd>${summary} · ${input["to-amplitude"].toUpperCase()}</dd></div></dl>${mode !== "displacement" && input["from-amplitude"] !== input["to-amplitude"] ? `<aside class="calculator-warning">RMS ↔ Peak рассчитан для чистого синусоидального сигнала.</aside>` : ""}`; }
  report = `Перевод единиц вибрации\nВид расчёта: ${mode}\nРезультат: ${summary}`;
  renderResult(`<h3>Результат</h3>${html}`, report, summary, input);
}

function table(headers, rows) { return `<div class="calculator-table-wrap"><table><thead><tr>${headers.map(value => `<th>${value}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }

function related(article) {
  const blocks = getVibrationKnowledgeBlocks(article, getArticles("vibration"), 4).filter(block => block.items?.length && typeof block.items[0] !== "string").slice(0, 3);
  if (!blocks.length) return "";
  return `<section class="calculator-related"><h3>Связанные материалы</h3>${blocks.map(block => `<div><h4>${safeText(block.title)}</h4>${block.items.map(item => `<a href="${getRouteHash(getItemRoute("vibration", item))}" data-related-id="${item.id}">${safeText(item.title)}</a>`).join("")}</div>`).join("")}</section>`;
}

export function renderVibrationCalculator(article) {
  currentResult = null; currentInputs = null;
  const views = { "vibration-tool-rotation-frequency": rotationView, "vibration-tool-harmonics": harmonicsView, "vibration-tool-bearing-frequencies": bearingView, "vibration-tool-unit-conversion": conversionView, "vibration-tool-parameter-selection": parameterView };
  content.innerHTML = shell(article, `${views[article.id]()}${related(article)}`);
  bindCalculator(article);
  content.querySelectorAll("[data-related-id]").forEach(link => link.addEventListener("click", event => { if (event.button !== 0 || event.metaKey || event.ctrlKey) return; const target = getItem("vibration", link.dataset.relatedId); if (target) { event.preventDefault(); navigate(getItemRoute("vibration", target)); } }));
}

export function isVibrationCalculator(id) { return VIBRATION_CALCULATOR_IDS.includes(id); }
