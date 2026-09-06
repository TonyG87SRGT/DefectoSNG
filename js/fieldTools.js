import { content } from "./dom.js";
import { safeText } from "./html.js";
import { goBack } from "./router.js";
import {
  amplitudeRatioToDb,
  analyzeThickness,
  applyDbCorrection,
  calculateRingPosition,
  calculateUtCoordinates,
  calculateUtScanZone,
  calculateVesselShellStrength,
  convertNdtValue,
  dbToAmplitudeRatio,
  parseThicknessSeries,
  roundValue
} from "./toolCalculations.js";

const CHECKLIST_STORAGE_KEY = "defectoSngNdtChecklists";

const CHECKLISTS = Object.freeze({
  uzk: Object.freeze({
    label: "УЗК",
    items: Object.freeze([
      "Проверены задание, объект, НТД и объём контроля",
      "Соединение идентифицировано и размечено",
      "Поверхность подготовлена, доступ и температура допустимы",
      "ПЭП и кабель соответствуют технологической карте",
      "Заданы скорость, диапазон, задержка и угол ввода",
      "Чувствительность проверена на применимом образце",
      "Учтены контактная и передаточная поправки",
      "Зона контроля перекрывается выбранной схемой сканирования",
      "Координатная привязка и нулевое положение проверены",
      "Результаты сохраняются под правильным номером соединения"
    ])
  }),
  vik: Object.freeze({
    label: "ВИК",
    items: Object.freeze([
      "Проверены объект, НТД и стадия контроля",
      "Поверхность очищена и доступна осмотру",
      "Освещённость и условия наблюдения обеспечены",
      "Средства измерения исправны и имеют действующий статус",
      "Соединение и измерительные точки идентифицированы",
      "Проверены обе доступные стороны и прилегающий металл",
      "Все размеры записаны с единицами и привязкой",
      "Результат сопоставлен с критерием конкретной НТД"
    ])
  }),
  rk: Object.freeze({
    label: "РК",
    items: Object.freeze([
      "Проверены схема, НТД и требуемый объём контроля",
      "Источник, детектор и принадлежности соответствуют технологии",
      "Соединение, кассета и снимок имеют однозначную маркировку",
      "Геометрия просвечивания и зона перекрытия проверены",
      "Установлен требуемый индикатор качества изображения",
      "Обеспечены радиационная безопасность и ограждение зоны",
      "Качество изображения проверено до расшифровки",
      "Индикации измерены и оценены по выбранной НТД"
    ])
  }),
  pvk: Object.freeze({
    label: "ПВК",
    items: Object.freeze([
      "Материал и температура допускают выбранную систему материалов",
      "Поверхность очищена, обезжирена и высушена",
      "Проверена совместимость очистителя, пенетранта и проявителя",
      "Выдержка пенетранта соответствует инструкции и технологии",
      "Избыток пенетранта удалён без вымывания из несплошностей",
      "Проявитель нанесён равномерно",
      "Освещённость или УФ-условия проверены",
      "Индикации зафиксированы и привязаны к объекту"
    ])
  }),
  mk: Object.freeze({
    label: "МПК",
    items: Object.freeze([
      "Подтверждена ферромагнитность материала",
      "Поверхность подготовлена и доступна",
      "Выбраны способ намагничивания и направление поля",
      "Обеспечено выявление несплошностей разных ориентаций",
      "Проверены индикаторный материал и контрольные образцы",
      "Напряжённость поля или эффективность намагничивания проверена",
      "Условия освещения соответствуют применяемому материалу",
      "После контроля выполнены очистка и размагничивание, если требуются"
    ])
  })
});

function numberText(value, digits = 3) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(roundValue(value, digits));
}

function page(title, subtitle, body) {
  content.innerHTML = `
    <div class="page-header">
      <button class="back-button" id="back-button" aria-label="Вернуться к инструментам">‹</button>
      <div><h2 tabindex="-1">${safeText(title)}</h2><p>${safeText(subtitle)}</p></div>
    </div>
    ${body}
  `;
  content.querySelector("#back-button").addEventListener("click", () => goBack({ view: "tools" }));
}

function metric(label, id, hint = "—") {
  return `<div class="tool-metric"><small>${safeText(label)}</small><strong id="${id}">${safeText(hint)}</strong></div>`;
}

function read(id) {
  return content.querySelector(`#${id}`)?.value ?? "";
}

function bindLive(ids, update) {
  ids.forEach(id => content.querySelector(`#${id}`)?.addEventListener("input", update));
  update();
}

export function renderUtCoordinates() {
  page("Координаты отражателя УЗК", "Геометрический расчёт по пути и углу ввода", `
    <div class="tool-card">
      <div class="tool-grid">
        <label class="tool-label">Путь по лучу L, мм<input id="utc-path" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Угол ввода α, °<input id="utc-angle" class="tool-input" type="number" min="0" max="90" step="any" inputmode="decimal" value="65"></label>
        <label class="tool-label">Толщина S, мм<input id="utc-wall" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Стрела ПЭП, мм<input id="utc-index" class="tool-input" type="number" min="0" step="any" inputmode="decimal" value="0"></label>
      </div>
      <div class="tool-metrics" aria-live="polite">
        ${metric("Глубина от поверхности ввода", "utc-depth")}
        ${metric("Проекция от точки выхода", "utc-surface")}
        ${metric("Координата от передней грани ПЭП", "utc-front")}
        ${metric("Участок хода луча", "utc-leg")}
      </div>
      <div class="tool-formula"><strong>X = L × sin α; Zразв = L × cos α.</strong> Глубина сворачивается в пределах толщины с учётом отражений от поверхностей.</div>
      <aside class="tool-notice">Геометрический помощник не учитывает реальную точку выхода, кривизну, преломление в призме, изменение скорости, смещение точки ввода и особенности конкретной методики. Координаты следует проверять по настройке прибора и образцу.</aside>
    </div>
  `);
  const update = () => {
    const result = calculateUtCoordinates({ soundPath: read("utc-path"), angle: read("utc-angle"), thickness: read("utc-wall"), probeIndex: read("utc-index") });
    content.querySelector("#utc-depth").textContent = result ? `${numberText(result.depth)} мм` : "—";
    content.querySelector("#utc-surface").textContent = result ? `${numberText(result.surfaceDistance)} мм` : "—";
    content.querySelector("#utc-front").textContent = result ? `${numberText(result.coordinateFromProbeFront)} мм` : "—";
    content.querySelector("#utc-leg").textContent = result ? `${result.leg}` : "—";
  };
  bindLive(["utc-path", "utc-angle", "utc-wall", "utc-index"], update);
}

export function renderUtScanZone() {
  page("Ход луча и зона сканирования", "Расчёт половины и полного скачка", `
    <div class="tool-card">
      <div class="tool-grid">
        <label class="tool-label">Толщина S, мм<input id="uts-wall" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Угол ввода α, °<input id="uts-angle" class="tool-input" type="number" min="0" max="90" step="any" inputmode="decimal" value="65"></label>
        <label class="tool-label">Стрела ПЭП, мм<input id="uts-index" class="tool-input" type="number" min="0" step="any" inputmode="decimal" value="0"></label>
      </div>
      <div class="tool-metrics" aria-live="polite">
        ${metric("Половина скачка по поверхности", "uts-half")}
        ${metric("Полный скачок по поверхности", "uts-full")}
        ${metric("Путь по лучу до дна", "uts-half-path")}
        ${metric("Путь полного скачка", "uts-full-path")}
      </div>
      <div class="tool-formula"><strong>x₁ = S × tg α; x₂ = 2S × tg α; L₁ = S / cos α.</strong></div>
      <aside class="tool-notice">Расчёт показывает идеальную геометрию плоской стенки. Фактическая зона сканирования, число проходов и перекрытие устанавливаются технологической картой и применимой НТД.</aside>
    </div>
  `);
  const update = () => {
    const result = calculateUtScanZone({ thickness: read("uts-wall"), angle: read("uts-angle"), probeIndex: read("uts-index") });
    content.querySelector("#uts-half").textContent = result ? `${numberText(result.halfSkip)} мм` : "—";
    content.querySelector("#uts-full").textContent = result ? `${numberText(result.fullSkip)} мм` : "—";
    content.querySelector("#uts-half-path").textContent = result ? `${numberText(result.halfPath)} мм` : "—";
    content.querySelector("#uts-full-path").textContent = result ? `${numberText(result.fullPath)} мм` : "—";
  };
  bindLive(["uts-wall", "uts-angle", "uts-index"], update);
}

export function renderDbCalculator() {
  page("Амплитуда и децибелы", "Отношение сигналов и поправки усиления", `
    <div class="tool-card">
      <label class="tool-label">Операция
        <select id="db-mode" class="tool-input tool-select">
          <option value="ratio">Две амплитуды → дБ</option>
          <option value="db">дБ → отношение амплитуд</option>
          <option value="correction">Уровень + поправка</option>
        </select>
      </label>
      <div id="db-fields" class="tool-grid"></div>
      <div class="tool-result" aria-live="polite"><div id="db-main" class="tool-result-value">—</div><div id="db-sub" class="tool-result-sub">Введите значения</div></div>
      <div id="db-formula" class="tool-formula"></div>
      <aside class="tool-notice">Используется амплитудное соотношение 20 lg(A₂/A₁). Знак и способ применения поправки сверяйте с инструкцией прибора и технологией контроля.</aside>
    </div>
  `);
  const fields = content.querySelector("#db-fields");
  const renderFields = () => {
    const mode = read("db-mode");
    fields.innerHTML = mode === "ratio" ? `
      <label class="tool-label">Опорная амплитуда A₁<input id="db-a" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
      <label class="tool-label">Измеренная амплитуда A₂<input id="db-b" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>`
      : mode === "db" ? `<label class="tool-label">Разница, дБ<input id="db-value" class="tool-input" type="number" step="any" inputmode="decimal"></label>`
      : `<label class="tool-label">Исходный уровень, дБ<input id="db-base" class="tool-input" type="number" step="any" inputmode="decimal"></label><label class="tool-label">Поправка, дБ<input id="db-correction" class="tool-input" type="number" step="any" inputmode="decimal"></label>`;
    fields.querySelectorAll("input").forEach(input => input.addEventListener("input", update));
    update();
  };
  const update = () => {
    const mode = read("db-mode");
    const main = content.querySelector("#db-main");
    const sub = content.querySelector("#db-sub");
    const formula = content.querySelector("#db-formula");
    if (mode === "ratio") {
      const result = amplitudeRatioToDb(read("db-a"), read("db-b"));
      main.textContent = result ? `${result.db >= 0 ? "+" : ""}${numberText(result.db)} дБ` : "—";
      sub.textContent = result ? `A₂/A₁ = ${numberText(result.ratio)} (${numberText(result.percent, 1)} %)` : "Введите две положительные амплитуды";
      formula.textContent = "ΔA = 20 lg(A₂/A₁)";
    } else if (mode === "db") {
      const result = dbToAmplitudeRatio(read("db-value"));
      main.textContent = result ? `${numberText(result.ratio)} раза` : "—";
      sub.textContent = result ? `${numberText(result.percent, 1)} % от опорной амплитуды` : "Введите разницу в дБ";
      formula.textContent = "A₂/A₁ = 10^(ΔA/20)";
    } else {
      const result = applyDbCorrection(read("db-base"), read("db-correction"));
      main.textContent = result ? `${numberText(result.result)} дБ` : "—";
      sub.textContent = result ? "Итоговый уровень" : "Введите исходный уровень и поправку";
      formula.textContent = "Aитог = Aисх + ΔA";
    }
  };
  content.querySelector("#db-mode").addEventListener("change", renderFields);
  renderFields();
}

export function renderRingPosition() {
  page("Координата на кольцевом шве", "Привязка расстояния к градусам и циферблату", `
    <div class="tool-card">
      <div class="tool-grid">
        <label class="tool-label">Наружный диаметр D, мм<input id="rp-diameter" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Расстояние от отметки «12 часов», мм<input id="rp-length" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
      </div>
      <div class="tool-metrics" aria-live="polite">
        ${metric("Угловая координата", "rp-angle")}
        ${metric("Положение по циферблату", "rp-clock")}
        ${metric("Нормированное расстояние", "rp-normalized")}
        ${metric("Периметр", "rp-perimeter")}
      </div>
      <div class="tool-formula"><strong>φ = 360° × l / (πD).</strong> Отсчёт принят по часовой стрелке от верхней точки.</div>
    </div>
  `);
  const update = () => {
    const result = calculateRingPosition(read("rp-diameter"), read("rp-length"));
    content.querySelector("#rp-angle").textContent = result ? `${numberText(result.degrees, 2)}°` : "—";
    content.querySelector("#rp-clock").textContent = result ? `${result.hour}:${String(result.minute).padStart(2, "0")}` : "—";
    content.querySelector("#rp-normalized").textContent = result ? `${numberText(result.normalizedLength)} мм` : "—";
    content.querySelector("#rp-perimeter").textContent = result ? `${numberText(result.circumference)} мм` : "—";
  };
  bindLive(["rp-diameter", "rp-length"], update);
}

export function renderThicknessAnalysis() {
  page("Анализ толщинометрии", "Сводка измерений и справочная оценка утонения", `
    <div class="tool-card">
      <label class="tool-label">Измерения, мм — через пробел, запятую с точкой или с новой строки
        <textarea id="ta-values" class="tool-input tool-textarea" rows="4" placeholder="Например: 9,8; 9,6; 9,7; 9,4"></textarea>
      </label>
      <div class="tool-grid">
        <label class="tool-label">Номинальная толщина, мм<input id="ta-nominal" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Заданная допустимая толщина, мм<input id="ta-allowable" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Предыдущая минимальная толщина, мм<input id="ta-previous" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Интервал между измерениями, лет<input id="ta-years" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
      </div>
      <div class="tool-metrics" aria-live="polite">
        ${metric("Минимум", "ta-min")}${metric("Среднее", "ta-avg")}${metric("Максимум", "ta-max")}${metric("Разброс", "ta-spread")}
        ${metric("Потеря от номинала", "ta-loss")}${metric("Запас до заданной толщины", "ta-margin")}${metric("Скорость изменения", "ta-rate")}${metric("Расчётный срок до заданной толщины", "ta-life")}
      </div>
      <aside class="tool-warning"><strong>Не является заключением о прочности.</strong> Допустимую толщину задают по расчёту, конструкции, материалу, нагрузкам и применимой документации. Линейный прогноз не учитывает изменение механизма и скорости коррозии.</aside>
    </div>
  `);
  const update = () => {
    const result = analyzeThickness(parseThicknessSeries(read("ta-values")), { nominal: read("ta-nominal"), allowable: read("ta-allowable"), previousMinimum: read("ta-previous"), intervalYears: read("ta-years") });
    const set = (id, value) => { content.querySelector(`#${id}`).textContent = value; };
    set("ta-min", result ? `${numberText(result.minimum)} мм` : "—");
    set("ta-avg", result ? `${numberText(result.average)} мм` : "—");
    set("ta-max", result ? `${numberText(result.maximum)} мм` : "—");
    set("ta-spread", result ? `${numberText(result.spread)} мм` : "—");
    set("ta-loss", result?.loss != null ? `${numberText(result.loss)} мм (${numberText(result.lossPercent, 1)} %)` : "—");
    set("ta-margin", result?.remainingToAllowable != null ? `${numberText(result.remainingToAllowable)} мм` : "—");
    set("ta-rate", result?.corrosionRate != null ? `${numberText(result.corrosionRate)} мм/год` : "—");
    set("ta-life", result?.estimatedYears != null ? `${numberText(result.estimatedYears, 1)} лет` : "—");
  };
  bindLive(["ta-values", "ta-nominal", "ta-allowable", "ta-previous", "ta-years"], update);
}

const CONVERSIONS = Object.freeze({
  "time-one-way": { input: "Время t, мкс", extra: "Скорость c, м/с", hint: "Односторонний акустический путь" },
  "time-pulse-echo": { input: "Время t, мкс", extra: "Скорость c, м/с", hint: "Глубина при эхо-методе" },
  wavelength: { input: "Частота f, МГц", extra: "Скорость c, м/с", hint: "Длина волны" },
  "area-diameter": { input: "Площадь S, мм²", hint: "Эквивалентный диаметр круглого отражателя" },
  "mm-m": { input: "Длина, мм", hint: "Миллиметры → метры" },
  "m-mm": { input: "Длина, м", hint: "Метры → миллиметры" }
});

export function renderNdtConverter() {
  page("Конвертер величин НК", "Акустический путь, длина волны и геометрические величины", `
    <div class="tool-card">
      <label class="tool-label">Преобразование<select id="cv-mode" class="tool-input tool-select">${Object.entries(CONVERSIONS).map(([id, item]) => `<option value="${id}">${safeText(item.hint)}</option>`).join("")}</select></label>
      <div id="cv-fields" class="tool-grid"></div>
      <div class="tool-result" aria-live="polite"><div id="cv-value" class="tool-result-value">—</div><div id="cv-hint" class="tool-result-sub">Введите значение</div></div>
      <div id="cv-formula" class="tool-formula"></div>
      <aside class="tool-notice">Для акустических расчётов скорость вводится пользователем. Используйте значение, установленное процедурой и проверенное для материала объекта.</aside>
    </div>
  `);
  const fields = content.querySelector("#cv-fields");
  const update = () => {
    const mode = read("cv-mode");
    const result = convertNdtValue(mode, read("cv-value-input"), read("cv-extra"));
    content.querySelector("#cv-value").textContent = result ? `${numberText(result.value)} ${result.unit}` : "—";
    content.querySelector("#cv-hint").textContent = result ? CONVERSIONS[mode].hint : "Введите необходимые значения";
    content.querySelector("#cv-formula").textContent = result?.formula || "";
  };
  const renderFields = () => {
    const item = CONVERSIONS[read("cv-mode")];
    fields.innerHTML = `<label class="tool-label">${safeText(item.input)}<input id="cv-value-input" class="tool-input" type="number" step="any" inputmode="decimal"></label>${item.extra ? `<label class="tool-label">${safeText(item.extra)}<input id="cv-extra" class="tool-input" type="number" min="0" step="any" inputmode="decimal" value="5900"></label>` : ""}`;
    fields.querySelectorAll("input").forEach(input => input.addEventListener("input", update));
    update();
  };
  content.querySelector("#cv-mode").addEventListener("change", renderFields);
  renderFields();
}

function loadChecklistState() {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || "{}") || {}; } catch { return {}; }
}

function saveChecklistState(value) {
  try { localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(value)); } catch { /* Локальное сохранение необязательно. */ }
}

export function renderNdtChecklist() {
  page("Чек-лист перед контролем", "Личная оперативная проверка — не протокол НК", `
    <div class="tool-card">
      <label class="tool-label">Метод контроля<select id="cl-method" class="tool-input tool-select">${Object.entries(CHECKLISTS).map(([id, item]) => `<option value="${id}">${safeText(item.label)}</option>`).join("")}</select></label>
      <div id="cl-list" class="tool-checklist"></div>
      <div class="tool-checklist-footer"><strong id="cl-progress">0 / 0</strong><button id="cl-reset" class="tool-secondary-button" type="button">Сбросить</button></div>
      <aside class="tool-notice">Список помогает не забыть базовые действия, но не заменяет технологическую карту, ППР, инструкцию по безопасности и обязательные операции конкретной НТД.</aside>
    </div>
  `);
  let state = loadChecklistState();
  const list = content.querySelector("#cl-list");
  const renderList = () => {
    const method = read("cl-method");
    const definition = CHECKLISTS[method];
    const selected = new Set(state[method] || []);
    list.innerHTML = definition.items.map((item, index) => `<label class="tool-check-item"><input type="checkbox" data-check-index="${index}" ${selected.has(index) ? "checked" : ""}><span>${safeText(item)}</span></label>`).join("");
    const updateProgress = () => {
      const checked = [...list.querySelectorAll("input:checked")].map(input => Number(input.dataset.checkIndex));
      state = { ...state, [method]: checked };
      saveChecklistState(state);
      content.querySelector("#cl-progress").textContent = `${checked.length} / ${definition.items.length}`;
    };
    list.querySelectorAll("input").forEach(input => input.addEventListener("change", updateProgress));
    updateProgress();
  };
  content.querySelector("#cl-method").addEventListener("change", renderList);
  content.querySelector("#cl-reset").addEventListener("click", () => {
    const method = read("cl-method");
    state = { ...state, [method]: [] };
    saveChecklistState(state);
    renderList();
  });
  renderList();
}

export function renderVesselStrength() {
  page("Прочность цилиндрической обечайки", "Внутреннее избыточное давление · поверочный расчёт", `
    <div class="tool-card">
      <aside class="tool-warning"><strong>Ограниченная расчётная модель.</strong> Рассчитывается только гладкая цилиндрическая обечайка под внутренним избыточным давлением. Результат не является заключением о годности сосуда.</aside>
      <div class="tool-grid">
        <label class="tool-label">Внутренний диаметр D, мм<input id="vs-diameter" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Исполнительная толщина s, мм<input id="vs-thickness" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Суммарная прибавка c, мм<input id="vs-allowance" class="tool-input" type="number" min="0" step="any" inputmode="decimal" value="0"></label>
        <label class="tool-label">Допускаемое напряжение [σ], МПа<input id="vs-stress" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
        <label class="tool-label">Коэффициент продольного шва φp<input id="vs-factor" class="tool-input" type="number" min="0" max="1" step="0.01" inputmode="decimal" value="1"></label>
        <label class="tool-label">Расчётное давление p, МПа — для сравнения<input id="vs-pressure" class="tool-input" type="number" min="0" step="any" inputmode="decimal"></label>
      </div>
      <div class="tool-result" aria-live="polite"><div id="vs-pressure-result" class="tool-result-value">—</div><div id="vs-status" class="tool-result-sub">Введите исходные данные</div></div>
      <div class="tool-metrics">
        ${metric("Эффективная толщина s − c", "vs-effective")}
        ${metric("Требуемая расчётная толщина sp", "vs-required")}
        ${metric("Требуемая толщина sp + c", "vs-required-total")}
        ${metric("Условие применимости (s − c)/D", "vs-ratio")}
      </div>
      <div class="tool-formula"><strong>[p] = 2[σ]φp(s − c) / (D + s − c)</strong><br>ГОСТ 34233.2-2017, п. 5.3.1, формула (3). Проектировочная формула толщины — формулы (1), (2).</div>
      <aside class="tool-notice"><strong>Перед применением:</strong> [σ], φp и c не назначаются калькулятором — их определяют по ГОСТ 34233.1, материалу, температуре, сварным соединениям, прибавкам и документации сосуда. Не учтены днища, отверстия и их укрепление, штуцеры, фланцы, опоры, наружное давление/вакуум, устойчивость, циклические, температурные, ветровые, сейсмические и локальные нагрузки, дефекты и сочетания нагрузок. Требуется полный расчёт всех элементов; определяющим является минимальный допустимый результат.</aside>
    </div>
  `);
  const update = () => {
    const result = calculateVesselShellStrength({ diameter: read("vs-diameter"), thickness: read("vs-thickness"), allowance: read("vs-allowance"), allowableStress: read("vs-stress"), weldFactor: read("vs-factor"), designPressure: read("vs-pressure") });
    const resultNode = content.querySelector("#vs-pressure-result");
    const status = content.querySelector("#vs-status");
    const set = (id, value) => { content.querySelector(`#${id}`).textContent = value; };
    resultNode.textContent = result ? `[p] = ${numberText(result.allowablePressure)} МПа` : "—";
    if (!result) status.textContent = "Проверьте: D, s, [σ] и φp должны быть положительными; c должно быть меньше s.";
    else if (!result.diameterConditionMet) status.textContent = "D < 200 мм: область применения п. 5.2.1 для цилиндрической обечайки этим помощником не подтверждается.";
    else if (!result.thicknessConditionMet) status.textContent = "Расчётное отношение толщины к диаметру вне области применения формулы 5.2.1.";
    else if (result.pressureConditionMet === true) status.textContent = "Введённое давление не превышает расчётное [p] только для этой обечайки и этой модели.";
    else if (result.pressureConditionMet === false) status.textContent = "Введённое давление превышает расчётное [p] для этой обечайки.";
    else status.textContent = "Получено допускаемое давление только по прочности цилиндрической обечайки.";
    set("vs-effective", result ? `${numberText(result.effectiveThickness)} мм` : "—");
    set("vs-required", result?.requiredCalculatedThickness != null ? `${numberText(result.requiredCalculatedThickness)} мм` : "—");
    set("vs-required-total", result?.requiredNominalThickness != null ? `${numberText(result.requiredNominalThickness)} мм` : "—");
    set("vs-ratio", result ? `D ${result.diameterConditionMet ? "≥" : "<"} 200 мм; ${numberText(result.ratio, 5)} ≤ ${numberText(result.thicknessConditionLimit, 1)} — ${result.thicknessConditionMet ? "выполнено" : "не выполнено"}` : "—");
  };
  bindLive(["vs-diameter", "vs-thickness", "vs-allowance", "vs-stress", "vs-factor", "vs-pressure"], update);
}
