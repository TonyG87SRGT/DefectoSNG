const option = (value, label, help = "") => Object.freeze({ value, label, help });

export const DIAGNOSTIC_STEPS = Object.freeze([
  {
    id: "equipment", title: "Оборудование", description: "Укажите тип машины и основные конструктивные признаки.",
    fields: [
      { id: "equipment", label: "Тип оборудования", type: "radio", required: true, options: [
        option("pump", "Насос"), option("motor", "Электродвигатель"), option("pump-unit", "Насосный агрегат"),
        option("fan", "Вентилятор"), option("smoke-exhauster", "Дымосос"), option("compressor", "Компрессор"),
        option("gearbox", "Редуктор"), option("turbine", "Турбина"), option("generator", "Генератор"),
        option("vertical", "Вертикальная машина"), option("other", "Другое вращающееся оборудование"), option("unknown", "Тип неизвестен")
      ]},
      { id: "construction", label: "Конструктивные признаки", type: "checkbox", options: [
        option("rolling-bearing", "Подшипники качения"), option("journal-bearing", "Гидродинамические подшипники"),
        option("gears", "Зубчатая передача"), option("speed-known", "Частота вращения известна")
      ]}
    ]
  },
  {
    id: "operating", title: "Рабочий режим", description: "Режим нужен для сопоставимости измерений. Числовые поля необязательны.",
    fields: [
      { id: "machineState", label: "Состояние машины", type: "radio", required: true, options: [option("running", "Работает"), option("stopped", "Остановлена")] },
      { id: "operatingMode", label: "Режим", type: "radio", required: true, options: [
        option("steady", "Установившийся"), option("runup", "Разгон"), option("coastdown", "Выбег"), option("idle", "Холостой ход"),
        option("nominal", "Номинальная нагрузка"), option("partial", "Частичная нагрузка"), option("unknown", "Неизвестен")
      ]},
      { id: "rpm", label: "Частота вращения, об/мин", type: "number", min: 0 },
      { id: "load", label: "Нагрузка", type: "text" }, { id: "bearingTemperature", label: "Температура подшипника, °C", type: "number" },
      { id: "pressure", label: "Давление", type: "text" }, { id: "flow", label: "Расход", type: "text" },
      { id: "oilTemperature", label: "Температура масла, °C", type: "number" }
    ]
  },
  {
    id: "measurement", title: "Достоверность измерения", description: "До поиска причин исключите ошибку измерительной цепи.",
    fields: [
      { id: "measurementChecks", label: "Что подтверждено", type: "checkbox", options: [
        option("sensor-correct", "Тип датчика выбран правильно"), option("mount-secure", "Датчик закреплён надёжно"),
        option("surface-clean", "Точка очищена"), option("cable-checked", "Кабель проверен"),
        option("cable-free", "Кабель не натянут"), option("repeated", "Измерение повторено"),
        option("other-point", "Проверена соседняя точка"), option("other-direction", "Проверено другое направление")
      ]},
      { id: "measurementRisks", label: "Подозрительные признаки", type: "checkbox", options: [
        option("single-channel", "Аномалия только на одном канале"), option("low-frequency-noise", "Необычный низкочастотный шум"),
        option("overload", "Возможна перегрузка или насыщение канала"), option("weak-mount", "Крепление датчика ненадёжно")
      ]}
    ]
  },
  {
    id: "signs", title: "Основной признак", description: "Можно выбрать несколько наблюдаемых изменений.",
    fields: [{ id: "signs", label: "Наблюдаемые признаки", type: "checkbox", required: true, options: [
      option("overall-rise", "Вырос общий уровень"), option("one-x", "Выросла 1×", "1× — частота вращения ротора."),
      option("two-x", "Выросла 2×"), option("higher-harmonics", "Появились высшие гармоники"),
      option("subharmonics", "Появились субгармоники"), option("unknown-frequency", "Отдельная неизвестная частота"),
      option("broadband", "Широкополосный шум"), option("impulses", "Высокочастотные импульсы"),
      option("phase-change", "Изменилась фаза"), option("orbit-change", "Изменилась орбита вала"),
      option("bearing-heat", "Выросла температура подшипника"), option("unusual-noise", "Нехарактерный шум"),
      option("performance-loss", "Снизилась производительность"), option("unknown", "Признак неизвестен")
    ]}]
  },
  {
    id: "frequencies", title: "Частотные составляющие", description: "Заполняйте только при наличии спектральных данных.",
    conditional: answers => !(answers.signs || []).every(value => ["overall-rise", "bearing-heat", "unusual-noise", "performance-loss", "unknown"].includes(value)),
    fields: [{ id: "frequencies", label: "Составляющие спектра", type: "checkbox", options: [
      option("dominant-1x", "Доминирует 1×"), option("one-two-x", "Присутствуют 1× и 2×"), option("dominant-2x", "Выражена 2×"),
      option("three-x", "Присутствует 3×"), option("harmonic-series", "Ряд гармоник"), option("half-x", "0,5×"),
      option("third-x", "Около 0,33×"), option("oil-whirl", "0,4–0,47×"), option("subsynchronous", "0,6–0,95×"),
      option("blade-pass", "Лопастная частота"), option("gear-mesh", "Зубцовая частота"), option("sidebands", "Боковые полосы"),
      option("bearing-frequencies", "Частоты подшипника"), option("constant-frequency", "Частота постоянна при изменении оборотов"),
      option("speed-proportional", "Частота меняется пропорционально оборотам"), option("unknown", "Точный признак неизвестен")
    ]}]
  },
  {
    id: "location", title: "Направление и расположение", description: "Укажите, где и как проявляется аномалия.",
    fields: [
      { id: "direction", label: "Направление", type: "radio", options: [option("horizontal", "Горизонтальное"), option("vertical", "Вертикальное"), option("axial", "Осевое"), option("multiple", "Несколько направлений"), option("unknown", "Неизвестно")] },
      { id: "location", label: "Точка", type: "radio", options: [option("motor-drive", "Приводной конец двигателя"), option("motor-nondrive", "Неприводной конец двигателя"), option("pump", "Насос"), option("bearing", "Подшипниковая опора"), option("casing", "Корпус"), option("foundation", "Фундамент"), option("shaft", "Вал"), option("coupling", "Муфта"), option("gearbox", "Редуктор"), option("other", "Другая точка")] },
      { id: "distribution", label: "Распределение", type: "radio", options: [option("single", "Только одна точка"), option("nearby", "Несколько соседних точек"), option("whole", "Весь агрегат"), option("coupling-sides", "По обе стороны муфты"), option("unknown", "Неизвестно")] }
    ]
  },
  {
    id: "additional", title: "Фаза и дополнительные признаки", description: "Шаг можно пропустить, если таких данных нет.",
    fields: [{ id: "additional", label: "Дополнительные признаки", type: "checkbox", options: [
      option("phase-180-coupling", "Сдвиг фазы около 180° через муфту"), option("radial-phase-same", "Радиальная фаза примерно одинакова"),
      option("axial-antiphase", "Осевые колебания в противофазе"), option("phase-unstable", "Фаза нестабильна"),
      option("resonance-phase-jump", "Скачок фазы при резонансе"), option("clipping", "Клиппирование сигнала"),
      option("impacts", "Присутствуют удары"), option("orbit-elongated", "Орбита вытянута"),
      option("orbit-loops", "Орбита содержит петли"), option("reverse-precession", "Обратная прецессия"),
      option("directional", "Направленная вибрация"), option("no-phase", "Фазовые данные отсутствуют")
    ]}]
  },
  {
    id: "history", title: "История изменения", description: "Характер изменения помогает отделить причину от совпадающего признака.",
    fields: [
      { id: "history", label: "Что известно", type: "checkbox", options: [
        option("sudden", "Возникло внезапно"), option("gradual", "Развивалось постепенно"), option("cyclic", "Меняется циклически"),
        option("temperature-dependent", "Зависит от температуры"), option("load-dependent", "Зависит от нагрузки"),
        option("after-repair", "Появилось после ремонта"), option("after-alignment", "После центровки"),
        option("after-bearing", "После замены подшипника"), option("after-piping", "После изменения трубопровода"),
        option("speed-band", "Высоко только на определённых оборотах"), option("seen-before", "Наблюдалось ранее"), option("unknown", "История неизвестна")
      ]},
      { id: "trend", label: "Текущее развитие", type: "radio", options: [option("growing", "Рост продолжается"), option("stable", "Уровень стабилизировался"), option("history-available", "Есть тренд измерений"), option("unknown", "Неизвестно")] }
    ]
  }
]);

export function getVisibleDiagnosticSteps(answers) {
  return DIAGNOSTIC_STEPS.filter(step => !step.conditional || step.conditional(answers));
}
