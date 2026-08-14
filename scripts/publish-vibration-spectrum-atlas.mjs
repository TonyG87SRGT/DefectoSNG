import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../data/vibration.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
const ids = new Set(data.map(item => item.id));
const T = (title, content) => ({ type: "text", title, content });
const L = (title, items) => ({ type: "list", title, items });
const W = (title, content) => ({ type: "warning", title, content });
const M = (title, items) => ({ type: "methods", title, items: items.map(([method, description]) => ({ method, description })) });
const R = list => ({ type: "related", title: "Связанные материалы", items: list.filter(id => ids.has(id)).map(id => ({ method: "vibration", id, title: data.find(item => item.id === id).title })) });
const common = ["vibration-spectrum-analysis", "vibration-measurement-validation", "vibration-characteristic-frequency", "vibration-diagnosis-confirmation", "vibration-trend-analysis"];

const configs = {
  "vibration-spectrum-1x": {
    seen: "Один из наиболее выраженных пиков расположен на фактической оборотной частоте ротора 1×; остальные составляющие заметно ниже либо имеют второстепенное значение.",
    determine: "Измерить RPM одновременно с вибрацией и перевести n/60 в герцы. Пик около паспортной скорости нельзя считать 1× без фактических оборотов.",
    causes: ["дисбаланс", "эксцентриситет", "несоосность", "изгиб вала", "резонанс на частоте 1×", "деформация корпуса или трубопроводная нагрузка", "технологическое возбуждение"],
    checks: ["подтвердить RPM и повторяемость", "сравнить радиальные и осевые направления", "сравнить связанные опоры", "измерить фазу 1×", "проследить изменение при RPM", "изучить историю ремонта и режим"],
    similar: ["1× вместе с 2×", "узкий резонансный пик", "фиксированная внешняя частота рядом с 1×"],
    distinguish: "Дисбаланс, изгиб, несоосность и резонанс различают по фазе, пространственному распределению, направлениям и зависимости от RPM; высота 1× сама этого не показывает.",
    informative: "Особенно полезно сравнение после очистки, ремонта, балансировки или при прохождении диапазона RPM.",
    limits: "Утечка спектра, изменение RPM и недостаточное разрешение могут смещать максимум. Линейный и логарифмический масштабы нельзя сравнивать визуально без чисел.",
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment", "vibration-fault-bent-shaft", "vibration-fault-resonance", "vibration-fault-pipe-strain"], articles: ["vibration-rotation-frequency", "vibration-phase-analysis", "vibration-runup-coastdown"], similarSpectra: ["vibration-spectrum-1x-2x", "vibration-spectrum-resonance"], keywords: ["1x", "1×", "оборотная частота", "peak at rpm", "высокий 1x"], equipment: []
  },
  "vibration-spectrum-2x": {
    seen: "Выраженная линия находится около удвоенной оборотной частоты 2×. Она может преобладать либо сопровождать 1× и другие гармоники.",
    determine: "Сначала определить фактическую 1×, затем проверить, попадает ли линия в область 2× с учётом разрешения и изменения RPM.",
    causes: ["параллельная или угловая несоосность", "изгиб вала", "механическая нелинейность", "деформация опор", "некоторые электромагнитные процессы", "конструктивная периодичность два события за оборот"],
    checks: ["сравнить осевое и радиальные направления", "измерить обе стороны муфты", "проверить фазу 1× и 2×", "оценить наличие 1× и высших гармоник", "сверить нагрузку и прогрев", "проверить фактическую центровку"],
    similar: ["электрическая линия рядом с 2×", "1×+2× при деформации", "гармонический ряд из-за ослабления"],
    distinguish: "Несоосность подтверждают геометрией, фазой и распределением около муфты; один пик 2× неспецифичен.",
    informative: "Информативность возрастает при согласованных измерениях по обе стороны муфты и известном рабочем режиме.",
    limits: "Если RPM неточны, близкая электрическая или структурная частота может ошибочно считаться 2×.",
    faults: ["vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment", "vibration-fault-bent-shaft", "vibration-fault-soft-foot", "vibration-fault-motor-electrical"], articles: ["vibration-rotation-frequency", "vibration-phase-analysis", "vibration-measurement-directions"], similarSpectra: ["vibration-spectrum-1x-2x", "vibration-spectrum-harmonic-series"], keywords: ["2x", "2×", "вторая гармоника", "second harmonic"], equipment: []
  },
  "vibration-spectrum-1x-2x": {
    seen: "В спектре одновременно выделяются оборотная составляющая 1× и её вторая гармоника 2×; их относительные амплитуды могут различаться по точкам и направлениям.",
    determine: "Проверить фактические RPM, затем измерить численные амплитуды 1× и 2× в одинаковых единицах, диапазоне и способе представления.",
    causes: ["несоосность", "мягкая или разновысокая опора", "деформация корпуса", "изгиб вала", "комбинация дисбаланса с другой нелинейностью", "особенность возбуждения конкретной машины"],
    checks: ["сравнить стороны муфты", "проверить осевое направление", "измерить фазу", "проверить опоры и soft foot", "учесть прогрев и нагрузку", "сопоставить с базовым спектром"],
    similar: ["доминирующий 1× с малой 2×", "гармонический ряд", "электрическая составляющая около 2×"],
    distinguish: "Оценивать нужно не только отношение пиков, но и пространственную картину, фазу, геометрию и изменение при режиме.",
    informative: "Картина полезна около муфтовых агрегатов после монтажа или ремонта, если имеется сопоставимая база.",
    limits: "Автоматическое преобразование RMS и Peak либо сравнение разных шкал может исказить отношение 1×/2×.",
    faults: ["vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment", "vibration-fault-soft-foot", "vibration-fault-uneven-supports", "vibration-fault-casing-deformation", "vibration-fault-bent-shaft"], articles: ["vibration-phase-analysis", "vibration-baseline-comparison", "vibration-measurement-directions"], similarSpectra: ["vibration-spectrum-1x", "vibration-spectrum-2x", "vibration-spectrum-harmonic-series"], keywords: ["1x 2x", "1× 2×", "первая и вторая гармоники", "first second harmonic"], equipment: []
  },
  "vibration-spectrum-harmonic-series": {
    seen: "Наблюдается ряд линий на целых кратных основной частоты: 1×, 2×, 3× и далее. Количество и спад гармоник различаются по точкам.",
    determine: "Установить фундаментальную частоту ряда и доказать её связь с RPM или другим периодическим процессом; визуальная кратность без расчёта недостаточна.",
    causes: ["механическое ослабление", "люфт", "периодический контакт или трение", "несоосность", "деформация и ограничение движения", "несинусоидальная нормальная рабочая сила", "клиппирование канала"],
    checks: ["посмотреть waveform", "проверить субгармоники", "осмотреть крепления и опоры", "сравнить направления и соседние точки", "проверить зависимость от нагрузки", "исключить клиппирование"],
    similar: ["ложные гармоники от перегрузки входа", "зубцовые гармоники", "модулированный спектр"],
    distinguish: "Ряд указывает на несинусоидальность или нелинейность, но физическую причину определяют по waveform, фазе, локализации и осмотру.",
    informative: "Особенно полезен совместно с временным сигналом и при сравнении до/после изменения крепления или нагрузки.",
    limits: "Количество видимых линий зависит от масштаба, шумового пола, диапазона и окна; больше гармоник не означает автоматически более тяжёлую неисправность.",
    faults: ["vibration-fault-mechanical-looseness", "vibration-fault-loose-bearing-housing", "vibration-fault-bearing-clearance", "vibration-fault-rub", "vibration-fault-parallel-misalignment"], articles: ["vibration-time-waveform", "vibration-harmonics-subharmonics", "vibration-phase-analysis"], similarSpectra: ["vibration-spectrum-1x-2x", "vibration-spectrum-half", "vibration-spectrum-clipping"], keywords: ["гармонический ряд", "harmonic series", "1x 2x 3x", "много гармоник"], equipment: []
  },
  "vibration-spectrum-half": {
    seen: "Устойчивая составляющая расположена около половины оборотной частоты — 0,5× или 1/2×. Она может сопровождаться 1×, гармониками и другими дробными порядками.",
    determine: "Необходимо стабильное и измеренное RPM. Проверить порядок во времени или order tracking, чтобы отличить 0,5× от случайного низкочастотного пика.",
    causes: ["механическая нелинейность и ослабление", "периодическое задевание", "динамическая неустойчивость", "процессы в гидродинамических подшипниках", "субгармонический резонанс"],
    checks: ["повторить запись при стабильных RPM", "проанализировать waveform", "проверить орбиту вала", "выполнить order analysis", "сравнить разгон и выбег", "проверить крепления и зазоры"],
    similar: ["пульсация внешнего процесса", "1/3× и другие дробные порядки", "частота соседней медленной машины"],
    distinguish: "Oil whirl, rubbing и ослабление различают по орбите, зависимости порядка от RPM, waveform и параметрам масла.",
    informative: "Стабильное проявление в нескольких записях и согласование с орбитой информативнее одиночной линии.",
    limits: "0,5× не является автоматическим признаком трения или масляной неустойчивости.",
    faults: ["vibration-fault-mechanical-looseness", "vibration-fault-rub", "vibration-fault-bearing-clearance", "vibration-fault-rotor-precession", "vibration-fault-oil-whirl"], articles: ["vibration-subharmonics", "vibration-time-waveform", "vibration-shaft-orbit", "vibration-order-analysis"], similarSpectra: ["vibration-spectrum-third", "vibration-spectrum-oil-whirl", "vibration-spectrum-harmonic-series"], keywords: ["0.5x", "0,5×", "1/2x", "половинная частота", "субгармоника"], equipment: []
  },
  "vibration-spectrum-third": {
    seen: "В спектре присутствует составляющая около одной трети оборотной частоты 1/3×; иногда видны и другие дробные порядки.",
    determine: "Проверить фактическую скорость и устойчивость отношения f/1× на последовательных записях или в порядковом представлении.",
    causes: ["нелинейный контакт", "периодические события раз в несколько оборотов", "роторная или структурная неустойчивость", "технологическая пульсация", "внешний низкочастотный источник"],
    checks: ["анализировать длительный waveform", "применить order tracking", "проверить орбиту", "сравнить разгон/выбег", "проверить режим и соседнее оборудование"],
    similar: ["0,5×", "низкочастотная технологическая линия", "алиасинговый артефакт"],
    distinguish: "Если линия сохраняет дробный порядок при изменении RPM, связь с вращением вероятнее; фиксированная частота требует поиска внешнего или собственного процесса.",
    informative: "Полезна устойчивость порядка и повторяемая временная последовательность событий.",
    limits: "Одиночный низкий пик при малом разрешении не доказывает субгармонику.",
    faults: ["vibration-fault-mechanical-looseness", "vibration-fault-rub", "vibration-fault-rotor-precession"], articles: ["vibration-subharmonics", "vibration-time-waveform", "vibration-order-analysis", "vibration-shaft-orbit"], similarSpectra: ["vibration-spectrum-half", "vibration-spectrum-oil-whirl"], keywords: ["1/3x", "0.33x", "субгармоника одна треть", "дробный порядок"], equipment: []
  },
  "vibration-spectrum-oil-whirl": {
    seen: "В относительном движении вала или корпусной вибрации наблюдается субсинхронная составляющая примерно в области 0,4–0,47×.",
    determine: "Рассчитать порядок по фактическим RPM и проследить его при изменении скорости. Значение диапазона ориентировочно и зависит от конструкции.",
    causes: ["гидродинамическая неустойчивость масляного клина", "другая субсинхронная прецессия", "задевание", "ослабление", "технологические пульсации"],
    checks: ["построить орбиту X/Y", "проверить положение вала", "проследить порядок при разгоне/выбеге", "сверить температуру, давление и свойства масла", "учесть зазор и нагрузку подшипника"],
    similar: ["0,5× при ослаблении или rubbing", "фиксированная собственная частота", "субсинхронный внешний источник"],
    distinguish: "Oil whirl подтверждают ротординамической картиной, орбитой и параметрами масла; один пик около 0,42× недостаточен.",
    informative: "Наиболее информативен на машинах с proximity probes при синхронной записи RPM и маслосистемы.",
    limits: "Нельзя распространять диапазон 0,4–0,47× на все подшипники и режимы или автоматически называть его oil whirl.",
    faults: ["vibration-fault-oil-whirl", "vibration-fault-rotor-precession", "vibration-fault-rub"], articles: ["vibration-shaft-orbit", "vibration-order-analysis", "vibration-runup-coastdown", "vibration-coastdown-analysis"], similarSpectra: ["vibration-spectrum-half", "vibration-spectrum-third"], keywords: ["0.4x", "0,42x", "0.47x", "oil whirl spectrum", "масляный вихрь"], equipment: ["гидродинамические подшипники", "турбомашины"]
  },
  "vibration-spectrum-broadband-noise": {
    seen: "Шумовой фон повышен в широкой полосе частот без одной доминирующей дискретной линии; на нём могут находиться отдельные пики.",
    determine: "Сравнить одинаковые физические величины, единицы, диапазон, масштаб и базовый спектр. Уточнить, где начинается и заканчивается рост энергии.",
    causes: ["кавитация или турбулентность", "трение и случайные удары", "ранние подшипниковые процессы", "зубчатые контакты", "плохое крепление датчика", "кабельный, электрический или измерительный шум"],
    checks: ["повторить измерение и проверить крепление", "осмотреть waveform", "сравнить соседние точки", "проверить огибающую", "сопоставить режим, давление и нагрузку", "проверить датчик, кабель и диапазон"],
    similar: ["кавиционный спектр", "импульсный процесс", "клиппирование", "высокий логарифмический шумовой пол"],
    distinguish: "Реальный процесс локализуется и меняется с режимом; измерительный шум часто реагирует на кабель, монтаж или канал.",
    informative: "Рост относительно устойчивой базы в той же полосе важнее абсолютного вида одного графика.",
    limits: "Высокий уровень acceleration не означает автоматически плохой подшипник, а широкий фон — кавитацию.",
    faults: ["vibration-fault-cavitation", "vibration-fault-lubrication", "vibration-fault-babbitt", "vibration-fault-rub"], articles: ["vibration-measurement-validation", "vibration-time-waveform", "vibration-envelope-analysis", "vibration-acceleration"], similarSpectra: ["vibration-spectrum-cavitation", "vibration-spectrum-impulse", "vibration-spectrum-clipping"], keywords: ["широкополосный шум", "broadband noise", "высокочастотный фон", "broadband acceleration"], equipment: []
  },
  "vibration-spectrum-blade-pass": {
    seen: "Выраженная линия находится на лопастной частоте и может сопровождаться гармониками, боковыми полосами и широкополосным фоном.",
    determine: "Лопастная частота равна числу лопаток, умноженному на фактическую частоту вращения соответствующего колеса.",
    causes: ["нормальное периодическое взаимодействие лопаток с потоком", "неравномерный входной поток", "изменение зазора", "загрязнение или повреждение лопатки", "кавитация", "гидро- или аэродинамическая нестабильность", "резонанс на лопастной частоте"],
    checks: ["уточнить число лопаток и RPM", "сравнить с базой", "оценить гармоники и боковые полосы", "сопоставить расход и давление", "проверить широкополосный фон", "осмотреть проточную часть при ремонте"],
    similar: ["зубцовая частота", "гармоника другого вала", "структурный резонанс", "пульсация давления"],
    distinguish: "Нормальную рабочую линию отличают от патологического роста по тренду, режиму, боковым полосам и состоянию проточной части.",
    informative: "Особенно полезно сравнение при одинаковом расходе, положении регулирования и RPM.",
    limits: "Высокая лопастная составляющая сама по себе не доказывает повреждение лопатки.",
    faults: ["vibration-fault-cavitation", "vibration-fault-surge"], articles: ["vibration-operating-mode-relation", "vibration-pump-measurements", "vibration-fan-measurements", "vibration-harmonics-subharmonics"], similarSpectra: ["vibration-spectrum-gear-mesh", "vibration-spectrum-sidebands", "vibration-spectrum-cavitation"], keywords: ["blade pass frequency", "vane pass frequency", "лопастная частота", "BPF", "VPF"], equipment: ["насосы", "вентиляторы", "компрессоры"]
  },
  "vibration-spectrum-gear-mesh": {
    seen: "В спектре присутствует зубцовая частота GMF, её гармоники и, возможно, боковые полосы.",
    determine: "GMF равна числу зубьев колеса, умноженному на частоту его вращения. Для многоступенчатого редуктора рассчитывают каждую ступень и скорости всех валов.",
    causes: ["нормальное зубцовое возбуждение", "износ или повреждение зубьев", "неправильное зацепление", "эксцентриситет колеса", "люфт", "несоосность валов", "резонанс корпуса"],
    checks: ["уточнить числа зубьев и RPM", "определить гармоники GMF", "измерить шаг боковых полос", "сравнить нагрузку и тренд", "посмотреть waveform", "проверить масло и зубья при ремонте"],
    similar: ["лопастная частота", "электромагнитная высокочастотная линия", "подшипниковая гармоника", "структурный резонанс"],
    distinguish: "Несущая GMF указывает на зацепление, а боковой шаг — на возможную модуляцию валом; это не автоматически означает повреждённый зуб.",
    informative: "Изменение боковых полос и waveform при сопоставимой нагрузке часто информативнее абсолютной GMF.",
    limits: "Амплитуда GMF сильно зависит от нагрузки, корпуса, точки и резонанса и не является прямой мерой тяжести дефекта.",
    faults: ["vibration-fault-gears"], articles: ["vibration-gearbox-measurements", "vibration-order-analysis", "vibration-time-waveform"], similarSpectra: ["vibration-spectrum-sidebands", "vibration-spectrum-blade-pass", "vibration-spectrum-impulse"], keywords: ["gmf", "gear mesh", "gear mesh frequency", "зубцовая частота", "частота зацепления"], equipment: ["редукторы", "зубчатые передачи"]
  },
  "vibration-spectrum-sidebands": {
    seen: "Вокруг центральной несущей частоты расположены симметричные или частично симметричные линии с примерно одинаковым интервалом.",
    determine: "Сначала определить физический источник несущей, затем измерить шаг между боковыми полосами и сопоставить его с 1×, slip, FTF или другой модулирующей частотой.",
    causes: ["амплитудная или частотная модуляция зубцового процесса", "подшипниковая модуляция", "электромагнитная модуляция", "периодическая нагрузка", "эксцентриситет или локальный дефект"],
    checks: ["точно измерить несущую и шаг", "проверить RPM и скорости валов", "посмотреть waveform на биения", "сравнить нагрузку", "применить огибающую или токовый анализ по контексту", "проверить тренд боковых полос"],
    similar: ["несколько независимых близких пиков", "утечка спектра", "частотное размытие при нестабильных RPM", "гармонический ряд"],
    distinguish: "Несущая обычно указывает на возбуждаемый процесс, шаг — на модулятор. Только совместная физическая привязка позволяет сформировать гипотезу.",
    informative: "Особенно полезны устойчивые боковые полосы с шагом известной оборотной или подшипниковой частоты.",
    limits: "Недостаточное разрешение FFT способно слить боковые линии или создать ложное впечатление симметрии.",
    faults: ["vibration-fault-gears", "vibration-fault-bearing-inner-race", "vibration-fault-motor-electrical", "vibration-fault-rotor-cage"], articles: ["vibration-time-waveform", "vibration-fft", "vibration-order-analysis", "vibration-envelope-analysis"], similarSpectra: ["vibration-spectrum-gear-mesh", "vibration-spectrum-modulated", "vibration-spectrum-bpfi"], keywords: ["боковые полосы", "sidebands", "side bands", "модуляция", "carrier frequency"], equipment: []
  },
  "vibration-spectrum-bpfo": {
    seen: "В обычном или, чаще, в спектре огибающей видны линия около расчётной BPFO и возможные гармоники.",
    determine: "Рассчитать BPFO по геометрии подшипника и фактическим RPM. Сопоставлять в пределах разрешения с учётом скольжения и допусков.",
    causes: ["локальный дефект наружного кольца", "удары от ослабленной посадки", "другой периодический импульс рядом по частоте", "зубчатый или технологический процесс"],
    checks: ["проверить гармоники BPFO", "сравнить спектр огибающей", "локализовать на ближайшей опоре", "посмотреть waveform", "проверить нагрузку и тренд", "исключить ослабление корпуса"],
    similar: ["BPFI", "BSF", "зубцовые импульсы", "механическое ослабление"],
    distinguish: "Для наружного кольца важны локализация, гармоники, импульсность и рост тренда; один пик около BPFO не подтверждает дефект.",
    informative: "Наиболее информативна огибающая в подходящей полосе и повторяемый рост на конкретной опоре.",
    limits: "Ошибка геометрии, RPM и разрешения исключает формулировку «точное совпадение».",
    faults: ["vibration-fault-bearing-outer-race", "vibration-fault-loose-bearing-housing"], articles: ["vibration-envelope-analysis", "vibration-reference-bearing-frequencies", "vibration-acceleration", "vibration-bearing-supports"], similarSpectra: ["vibration-spectrum-bpfi", "vibration-spectrum-bsf", "vibration-spectrum-impulse"], keywords: ["bpfo", "outer race", "наружное кольцо", "наружная обойма", "спектр BPFO"], equipment: ["подшипники качения"]
  },
  "vibration-spectrum-bpfi": {
    seen: "В спектре огибающей или ускорения присутствуют линия около BPFI, гармоники и иногда боковые полосы с шагом 1×.",
    determine: "Рассчитать BPFI по геометрии и фактическим RPM; проверить частоту и боковой шаг с учётом разрешения.",
    causes: ["локальный дефект внутреннего кольца", "модулированные удары другого происхождения", "зубчатый процесс", "электрическая модуляция"],
    checks: ["проверить гармоники BPFI", "измерить шаг боковых полос", "сравнить огибающую нескольких опор", "посмотреть waveform", "проверить нагрузку и тренд", "уточнить путь передачи"],
    similar: ["BPFO", "BSF", "GMF с боковыми полосами", "электромагнитная модуляция"],
    distinguish: "Боковые полосы 1× могут отражать прохождение дефекта через зону нагрузки, но не являются обязательным универсальным признаком.",
    informative: "Согласование BPFI, гармоник, модуляции и тренда повышает уверенность.",
    limits: "Одиночная линия вблизи BPFI недостаточна для вывода о внутреннем кольце.",
    faults: ["vibration-fault-bearing-inner-race"], articles: ["vibration-envelope-analysis", "vibration-reference-bearing-frequencies", "vibration-acceleration", "vibration-bearing-supports"], similarSpectra: ["vibration-spectrum-bpfo", "vibration-spectrum-bsf", "vibration-spectrum-sidebands"], keywords: ["bpfi", "inner race", "внутреннее кольцо", "внутренняя обойма", "спектр BPFI"], equipment: ["подшипники качения"]
  },
  "vibration-spectrum-bsf": {
    seen: "Наблюдаются линия около BSF, её гармоники и возможная модуляция частотой сепаратора или вращения.",
    determine: "Рассчитать BSF и FTF по геометрии подшипника и RPM; учитывать скольжение тел качения и нестабильность ориентации дефекта.",
    causes: ["дефект шарика или ролика", "загрязнение и контактные удары", "дефекты дорожек", "другой импульсный процесс"],
    checks: ["проверить гармоники BSF", "искать модуляцию FTF", "анализировать длительный waveform", "сравнить огибающую и тренд", "проверить смазку и соседние опоры"],
    similar: ["BPFO", "BPFI", "зубчатые удары", "случайная импульсность"],
    distinguish: "Непостоянство амплитуды возможно из-за вращения тела качения; нужны повторные записи и согласование с FTF.",
    informative: "Устойчивые гармоники и повторяемая модуляция в огибающей важнее одного максимума.",
    limits: "Скольжение может заметно смещать BSF относительно расчёта.",
    faults: ["vibration-fault-bearing-rolling-elements", "vibration-fault-lubrication"], articles: ["vibration-envelope-analysis", "vibration-reference-bearing-frequencies", "vibration-time-waveform"], similarSpectra: ["vibration-spectrum-bpfo", "vibration-spectrum-bpfi", "vibration-spectrum-ftf", "vibration-spectrum-impulse"], keywords: ["bsf", "rolling element", "тело качения", "частота шарика", "частота ролика"], equipment: ["подшипники качения"]
  },
  "vibration-spectrum-ftf": {
    seen: "Низкочастотная линия расположена около расчётной FTF; она может модулировать другие подшипниковые компоненты.",
    determine: "Рассчитать FTF по геометрии и RPM и проверить устойчивость отношения к оборотам.",
    causes: ["повреждение или нестабильное движение сепаратора", "модуляция нагрузки", "механическое ослабление", "субсинхронный роторный процесс", "технологическая пульсация"],
    checks: ["проверить гармоники и модуляцию", "анализировать waveform", "сравнить огибающую", "проверить RPM и нагрузку", "исключить низкочастотные внешние источники", "проверить смазку"],
    similar: ["0,5×", "oil whirl", "технологическая низкая частота", "частота соседней машины"],
    distinguish: "FTF связывают с сепаратором только при согласовании расчёта, модуляции и других подшипниковых признаков.",
    informative: "Повторяемая модуляция подшипниковых линий частотой FTF повышает информативность.",
    limits: "Низкая частота чувствительна к разрешению, длительности записи и изменению RPM.",
    faults: ["vibration-fault-bearing-cage", "vibration-fault-bearing-rolling-elements"], articles: ["vibration-envelope-analysis", "vibration-reference-bearing-frequencies", "vibration-time-waveform"], similarSpectra: ["vibration-spectrum-bsf", "vibration-spectrum-half", "vibration-spectrum-oil-whirl"], keywords: ["ftf", "cage frequency", "сепаратор", "частота сепаратора"], equipment: ["подшипники качения"]
  },
  "vibration-spectrum-resonance": {
    seen: "Один узкий пик значительно превышает соседний фон; при изменении RPM его амплитуда может резко возрастать в ограниченной области.",
    determine: "Определить, следует ли частота за RPM или остаётся фиксированной, и сопоставить её с возможной собственной частотой и возбуждающей силой.",
    causes: ["совпадение 1× с собственной частотой", "лопастное или зубцовое возбуждение около резонанса", "структурный резонанс", "роторная критическая скорость", "внешняя фиксированная сила"],
    checks: ["измерить амплитуду и фазу при RPM", "записать разгон и выбег", "выполнить bump/impact test по процедуре", "применить ODS", "проверить соседние точки", "найти источник силы"],
    similar: ["доминирующий 1× от дисбаланса", "постоянная внешняя частота", "узкий электрический пик"],
    distinguish: "Резонанс подтверждают амплитудно-фазовой зависимостью и собственной частотой, а не одной высокой линией.",
    informative: "Наиболее информативно прохождение диапазона скорости и сравнение разгона с выбегом.",
    limits: "Стационарный спектр не всегда позволяет отделить сильное возбуждение от резонансного усиления.",
    faults: ["vibration-fault-resonance", "vibration-fault-unbalance"], articles: ["vibration-resonance-analysis", "vibration-runup-coastdown", "vibration-coastdown-analysis", "vibration-phase-analysis", "vibration-ods"], similarSpectra: ["vibration-spectrum-1x", "vibration-spectrum-blade-pass", "vibration-spectrum-gear-mesh"], keywords: ["resonance spectrum", "резонансный пик", "собственная частота", "критическая скорость"], equipment: []
  },
  "vibration-spectrum-clipping": {
    seen: "Во временном сигнале вершины обрезаны по постоянному уровню; спектр содержит искусственный ряд гармоник и повышенный широкополосный фон.",
    determine: "Проверить waveform, сообщения overload и пределы входного диапазона. Спектр без временной формы может маскировать перегрузку.",
    causes: ["перегрузка входа анализатора", "неподходящий диапазон", "насыщение датчика или электроники", "реже — цифровое ограничение при экспорте"],
    checks: ["повторить запись с корректным диапазоном", "проверить канал и чувствительность", "осмотреть waveform", "сравнить амплитуды до и после настройки", "исключить повреждение кабеля и питания"],
    similar: ["реальный гармонический ряд", "ударный процесс", "ограничение движения механизма"],
    distinguish: "Плоские одинаковые вершины и исчезновение гармоник после корректировки диапазона указывают на измерительный артефакт.",
    informative: "Картина важна как контроль качества данных, а не как спектр неисправности машины.",
    limits: "Диагностировать механизм по клиппированному сигналу нельзя; запись необходимо повторить.",
    faults: [], articles: ["vibration-time-waveform", "vibration-measurement-validation", "vibration-fft", "vibration-measurement-chain-check"], similarSpectra: ["vibration-spectrum-harmonic-series", "vibration-spectrum-impulse", "vibration-spectrum-broadband-noise"], keywords: ["clipping", "клиппирование", "overload", "обрезанный сигнал", "перегрузка канала"], equipment: ["измерительная цепь"]
  },
  "vibration-spectrum-impulse": {
    seen: "Во временном сигнале присутствуют отдельные или периодические короткие импульсы; в спектре они создают широкополосную энергию и возможный ряд линий по частоте повторения.",
    determine: "Измерить интервалы между импульсами и сопоставить частоту повторения с RPM, подшипниковыми, зубцовыми или технологическими частотами.",
    causes: ["локальный дефект подшипника", "повреждение зуба", "механическое ослабление", "задевание", "технологический удар", "случайная помеха или плохой контакт датчика"],
    checks: ["анализировать длительный waveform", "проверить повторяемость", "локализовать по точкам", "применить огибающую", "сопоставить расчётные частоты", "проверить датчик и кабель"],
    similar: ["клиппирование", "широкополосный шум", "единичный случайный выброс", "модулированный сигнал"],
    distinguish: "Реальный механический импульс повторяется или локализуется; артефакт часто исчезает после переустановки или реагирует на кабель.",
    informative: "Интервал и форма событий во времени часто полезнее общей высоты спектрального фона.",
    limits: "Один выброс не является доказательством дефекта; Peak зависит от длины записи и шума.",
    faults: ["vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race", "vibration-fault-bearing-rolling-elements", "vibration-fault-gears", "vibration-fault-mechanical-looseness", "vibration-fault-rub"], articles: ["vibration-time-waveform", "vibration-envelope-analysis", "vibration-peak", "vibration-crest-factor"], similarSpectra: ["vibration-spectrum-broadband-noise", "vibration-spectrum-clipping", "vibration-spectrum-modulated"], keywords: ["impulse spectrum", "импульсный сигнал", "удары", "периодические импульсы"], equipment: []
  },
  "vibration-spectrum-modulated": {
    seen: "Амплитуда или частота несущего колебания периодически меняется; во времени видна огибающая, а в спектре — боковые полосы.",
    determine: "Определить несущую частоту и частоту модуляции по шагу боковых полос или периоду огибающей waveform.",
    causes: ["зубцовое возбуждение, модулированное вращением", "подшипниковый импульсный процесс", "электромагнитная модуляция", "периодическая нагрузка", "биения близких частот", "пульсации потока"],
    checks: ["измерить центральную частоту и боковой шаг", "посмотреть waveform", "проверить RPM и slip", "сопоставить нагрузку", "применить огибающую", "сравнить токовый спектр при электрическом контексте"],
    similar: ["несколько независимых линий", "частотное размытие", "гармонический ряд", "помпаж"],
    distinguish: "Физический смысл задаёт пара «несущая + модулятор»; одинаковый вид боковых полос может иметь механическую, электрическую или технологическую причину.",
    informative: "Устойчивый шаг, совпадающий с известной частотой процесса, существенно усиливает гипотезу.",
    limits: "Без достаточного FFT-разрешения боковые полосы могут сливаться, а нестабильные RPM — расширять линии.",
    faults: ["vibration-fault-gears", "vibration-fault-bearing-inner-race", "vibration-fault-bearing-rolling-elements", "vibration-fault-bearing-cage", "vibration-fault-motor-electrical", "vibration-fault-rotor-cage", "vibration-fault-surge"], articles: ["vibration-time-waveform", "vibration-envelope-analysis", "vibration-order-analysis"], similarSpectra: ["vibration-spectrum-sidebands", "vibration-spectrum-gear-mesh", "vibration-spectrum-bpfi"], keywords: ["modulated signal", "модулированный сигнал", "амплитудная модуляция", "частотная модуляция", "sidebands"], equipment: []
  },
  "vibration-spectrum-cavitation": {
    seen: "Повышен широкополосный высокочастотный фон; могут изменяться лопастная частота, её гармоники и случайная импульсность.",
    determine: "Спектр связывают не с одной расчётной линией, а с полосой энергии и её зависимостью от расхода, давления и положения рабочей точки.",
    causes: ["кавитация", "турбулентность", "неравномерный поток", "подшипниковые удары", "трение", "измерительный шум"],
    checks: ["измерить давление на всасывании и расход", "проверить уровень и всасывающую линию", "сопоставить положение арматуры", "сравнить шум и waveform", "проверить лопастную частоту", "исключить подшипниковые и измерительные источники"],
    similar: ["общий широкополосный шум", "ранний подшипниковый процесс", "помпаж", "зубчатые или контактные удары"],
    distinguish: "Кавитационная гипотеза подтверждается зависимостью от гидравлического режима и состоянием проточной части, а не только видом спектра.",
    informative: "Особенно информативно воспроизводимое изменение при разрешённом переходе между рабочими режимами и сопоставимый тренд.",
    limits: "Широкополосный фон не является автоматическим диагнозом кавитации; сначала проверяют качество измерения.",
    faults: ["vibration-fault-cavitation", "vibration-fault-surge", "vibration-fault-lubrication"], articles: ["vibration-pump-measurements", "vibration-operating-mode-relation", "vibration-time-waveform", "vibration-diagnostics-pumps"], similarSpectra: ["vibration-spectrum-broadband-noise", "vibration-spectrum-blade-pass", "vibration-spectrum-impulse"], keywords: ["cavitation spectrum", "спектр кавитации", "кавитационный шум", "широкополосный шум насоса"], equipment: ["насосы"]
  }
};

const spectra = data.filter(item => item.parentId === "vibration-spectrum-atlas");
if (spectra.length !== Object.keys(configs).length) {
  const missing = spectra.filter(item => !configs[item.id]).map(item => item.id);
  throw new Error(`Spectrum config mismatch: ${spectra.length}/${Object.keys(configs).length}; missing ${missing.join(", ")}`);
}

for (const item of spectra) {
  const c = configs[item.id];
  const relatedArticles = [...new Set([...common, ...c.articles])].filter(id => ids.has(id));
  const relatedFaults = c.faults.filter(id => ids.has(id));
  const similarSpectra = c.similarSpectra.filter(id => ids.has(id));
  item.summary = `Как интерпретировать спектральную картину «${item.title}», какие причины рассмотреть и какими измерениями различить варианты.`;
  item.status = "published";
  item.sections = [
    T("Что видно в спектре", c.seen),
    T("Как определить частоту", c.determine),
    L("Возможные физические причины", c.causes),
    L("Что ещё может дать такую картину", c.similar),
    M("Как проверить и различить причины", c.checks.map((check, index) => [`${index + 1}. Проверка`, check])),
    T("Как различить", c.distinguish),
    T("Когда признак особенно информативен", c.informative),
    W("Ограничения интерпретации", `${c.limits} Всегда учитывайте частотное разрешение, изменение RPM, единицы, RMS/Peak, окно, масштаб, точку, направление, рабочий режим и базовое состояние.`),
    W("Спектр не является диагнозом", "Наблюдаемая линия или форма — диагностический признак. Окончательный вывод требует независимых подтверждений и проверки альтернативных причин."),
    R([...relatedArticles, ...relatedFaults, ...similarSpectra])
  ];
  delete item.futureImageLabel;
  delete item.futureImageLabels;
  delete item.futureBlocks;
  item.metadata = {
    ...item.metadata,
    section: "vibration",
    group: "vibration-spectrum-atlas",
    materialType: "spectrum",
    status: "published",
    equipment: c.equipment,
    diagnosticSigns: [...new Set([item.title, ...c.keywords.slice(0, 3)])],
    keywords: c.keywords,
    aliases: c.keywords.slice(1),
    tags: [...new Set([...(item.metadata?.tags || []), "spectrum-atlas", "differential-diagnosis"])],
    measuredParameters: ["частота", "амплитуда", "RPM"],
    relatedArticles,
    relatedFaults,
    probableFaults: relatedFaults,
    relatedSpectra: similarSpectra,
    similarSpectra,
    relatedMeasurements: [],
    relatedParameters: [],
    relatedScenarios: [],
    additionalChecks: c.checks
  };
  item.tags = [...new Set([...(item.tags || []), "spectrum-atlas", "differential-diagnosis"])];
}

await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
