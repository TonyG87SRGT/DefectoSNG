import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../data/vibration.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
const ids = new Set(data.map(item => item.id));
const T = (title, content) => ({ type: "text", title, content });
const L = (title, items) => ({ type: "list", title, items });
const W = (title, content) => ({ type: "warning", title, content });
const M = (title, items) => ({ type: "methods", title, items: items.map(([method, description]) => ({ method, description })) });
const R = list => ({ type: "related", title: "Связанные материалы", items: list.filter(id => ids.has(id)).map(id => ({ method: "vibration", id, title: data.find(item => item.id === id).title })) });
const common = ["vibration-diagnostic-sequence", "vibration-measurement-validation", "vibration-characteristic-frequency", "vibration-diagnosis-confirmation", "vibration-trend-analysis", "vibration-operating-data-record"];

const configs = {
  "vibration-diagnostics-pumps": {
    intro: "Центробежный насос рассматривают как систему двигатель → муфта → насос, иногда с редуктором. На вибрацию одновременно влияют роторная механика, подшипники, поток, трубопроводы и режим. Поршневые и объёмные насосы требуют учёта собственных циклических процессов.",
    construction: ["тип насоса и рабочего колеса", "DE/NDE двигателя и насосные опоры", "муфта, редуктор и отдельные валы", "число лопаток", "подшипники", "всасывающий и нагнетательный трубопроводы"],
    parameters: ["фактические RPM", "расход", "давление на всасывании и нагнетании", "положение арматуры", "температура среды", "ток или нагрузка двигателя"],
    map: ["двигатель DE: H / V / A", "двигатель NDE: H / V", "насос у муфты: H / V / A", "наружная насосная опора: H / V", "при необходимости: патрубки, трубопровод и рама"],
    directions: "Осевое направление особенно полезно около муфты; радиальные H/V сравнивают на всех опорах. На вертикальном насосе применяют постоянные X/Y и ось вала.",
    frequencies: ["1× и оборотные гармоники всех валов", "vane pass = число лопаток × RPM", "частоты подшипников", "GMF при наличии редуктора", "частоты пульсаций потока и возможные собственные частоты"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment", "vibration-fault-cavitation", "vibration-fault-mechanical-looseness", "vibration-fault-pipe-strain", "vibration-fault-resonance", "vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race"],
    algorithm: ["зафиксировать RPM, расход и давления", "сравнить двигатель DE/NDE и насосные опоры", "определить 1× и гармоники", "найти vane pass и подшипниковые частоты", "оценить осевую вибрацию около муфты", "проверить широкополосную и высокочастотную активность", "сопоставить признаки с режимом", "при необходимости измерить фазу и трубопровод"],
    misleading: ["широкополосный фон не обязательно означает кавитацию", "высокий 1× не доказывает дисбаланс рабочего колеса", "движение корпуса может возбуждаться трубопроводом", "рост vane pass может отражать режим, а не повреждение лопатки"],
    additional: ["фаза по обе стороны муфты", "waveform и огибающая", "давление и расход", "измерения трубопроводов", "ODS при структурном движении", "осмотр рабочего колеса и всасывающей линии"],
    trend: "Сравнивать при близких RPM, расходе, давлении и положении арматуры; отдельно вести 1×, vane pass, подшипниковые показатели и температуру.",
    advice: "Кавитационную гипотезу проверяйте гидравлическими параметрами. Механическую и процессную причины следует различать до ремонта ротора.",
    equipment: ["насосы", "насосные агрегаты"], keywords: ["насос вибрация", "вибродиагностика насоса", "pump vibration", "pump diagnostics"], measurements: ["vibration-pump-measurements"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-blade-pass", "vibration-spectrum-broadband-noise", "vibration-spectrum-cavitation"], articles: ["vibration-pump-measurements", "vibration-operating-mode-relation", "vibration-phase-analysis"]
  },
  "vibration-diagnostics-motors": {
    intro: "Электродвигатель сочетает механическую роторную систему и источник электромагнитных сил. Диагностика должна совместно учитывать DE/NDE, подшипники, ротор, статор, вентилятор, муфту, питание и VFD.",
    construction: ["тип двигателя, мощность и число полюсов", "подшипники DE/NDE", "ротор и статор", "вентилятор охлаждения", "муфта или ременная передача", "тип питания и преобразователь частоты"],
    parameters: ["RPM", "ток и нагрузка", "частота сети", "выходная частота VFD", "температура подшипников и корпуса", "рабочий режим"],
    map: ["DE: H / V / A", "NDE: H / V", "при доступе NDE: A", "рама и лапы при подозрении на soft foot", "связанный агрегат по обе стороны муфты"],
    directions: "Радиальные H/V показывают распределение роторных и структурных сил, осевое направление около муфты помогает проверять несоосность. Ориентацию сохраняют между маршрутами.",
    frequencies: ["1× и гармоники", "частоты подшипников", "частота сети и связанные электромагнитные компоненты", "pole-pass и slip-related компоненты", "частоты клетки ротора", "частота вентилятора и ремня при наличии"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment", "vibration-fault-soft-foot", "vibration-fault-mechanical-looseness", "vibration-fault-motor-electrical", "vibration-fault-rotor-cage", "vibration-fault-resonance", "vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race"],
    algorithm: ["зафиксировать RPM, ток, нагрузку и частоту питания/VFD", "сравнить DE и NDE", "сравнить H/V/A", "определить 1× и гармоники", "проверить подшипниковую активность", "рассчитать электрические частоты со slip", "сопоставить вибрацию и ток", "проверить фазу и опоры", "сравнить с базой"],
    misleading: ["100 Гц или другая электрическая линия не доказывает электрический дефект", "высокий 1× может быть резонансом или деформацией", "VFD меняет частоты и шумовой фон", "подшипниковый пик нельзя назначать без геометрии и RPM"],
    additional: ["токовый анализ", "фаза", "waveform и огибающая", "проверка soft foot и центровки", "выбег, если метод безопасен и применим", "тепловой контроль"],
    trend: "Сохранять RPM, ток, нагрузку, частоту VFD, температуры, 1×, подшипниковые и электрические компоненты.",
    advice: "Электрические гипотезы подтверждайте электрическими измерениями; виброспектр корпуса сам по себе недостаточен.",
    equipment: ["электродвигатели"], keywords: ["вибрация двигателя", "электродвигатель вибрация", "motor vibration", "motor diagnostics"], measurements: ["vibration-motor-measurements"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-2x", "vibration-spectrum-sidebands", "vibration-spectrum-modulated"], articles: ["vibration-motor-measurements", "vibration-order-analysis", "vibration-phase-analysis"]
  },
  "vibration-diagnostics-fans": {
    intro: "Вентилятор включает двигатель, муфту или ремни, вал, подшипники, рабочее колесо, корпус, воздуховоды, заслонки и основание. Роторные и аэродинамические силы часто действуют одновременно.",
    construction: ["тип колеса и число лопаток", "прямой, муфтовый или ременной привод", "положение подшипников", "воздуховоды и заслонки", "рама и гибкие соединения", "условия загрязнения колеса"],
    parameters: ["RPM", "положение заслонки/направляющего аппарата", "расход", "давление или разрежение", "нагрузка двигателя", "температура и состояние среды"],
    map: ["двигатель DE/NDE: H / V, у муфты также A", "подшипники вентилятора: H / V / A по задаче", "корпус и рама", "воздуховод и его опоры при выраженном движении"],
    directions: "Радиальные направления сравнивают на валу и корпусе; осевое полезно у муфты. Для гибкого корпуса фиксируют постоянную координатную систему.",
    frequencies: ["1× и гармоники", "blade pass и гармоники", "подшипниковые частоты", "ременная частота и RPM шкивов", "аэродинамические и структурные частоты"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-mechanical-looseness", "vibration-fault-resonance", "vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race", "vibration-fault-surge"],
    algorithm: ["зафиксировать RPM и положение регулирования", "сравнить двигатель, вал и подшипники", "оценить 1× и фазу", "рассчитать blade pass", "проверить ременную передачу при наличии", "оценить аэродинамический фон и режим", "осмотреть загрязнение и лопатки", "проверить раму и воздуховоды"],
    misleading: ["высокий 1× не обязательно вызван загрязнением колеса", "blade pass может быть нормальной рабочей линией", "гибкий кожух может усиливать локальную вибрацию", "изменение заслонки способно менять спектр без развития дефекта"],
    additional: ["фаза", "осмотр и очисточная история", "waveform", "order analysis", "ODS рамы и воздуховода", "проверка ремней и центровки"],
    trend: "Сравнивать при одинаковых RPM, положении заслонки и расходе; отслеживать 1×, blade pass, подшипники и нагрузку.",
    advice: "Налипание может расти постепенно или отпадать скачком; подтверждайте его осмотром и историей, а не только 1×.",
    equipment: ["вентиляторы"], keywords: ["fan vibration", "вибрация вентилятора", "fan diagnostics", "балансировка вентилятора"], measurements: ["vibration-fan-measurements"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-blade-pass", "vibration-spectrum-broadband-noise"], articles: ["vibration-fan-measurements", "vibration-phase-analysis", "vibration-ods"]
  },
  "vibration-diagnostics-compressors": {
    intro: "Первый шаг — определить тип компрессора. Центробежный, винтовой и поршневой компрессоры имеют разные кинематику, источники сил и ожидаемые частоты; одинаковая трактовка их спектров недопустима.",
    construction: ["тип: центробежный, винтовой или поршневой", "ступени, валы, редуктор и муфта", "тип подшипников", "число лопаток, роторов или цилиндров", "клапаны и газовый тракт", "система смазки и фундамент"],
    parameters: ["RPM всех доступных валов", "давление и расход", "нагрузка", "температура газа и подшипников", "положение регулирования", "давление и температура масла"],
    map: ["привод DE/NDE: H / V / A у муфты", "каждая подшипниковая опора компрессора", "редукторные опоры", "корпус ступеней", "газопроводы и фундамент при пульсациях"],
    directions: "Для центробежных машин важны радиальные, осевые и при probes X/Y; для поршневых — направления действия инерционных сил и фундамент; для винтовых — опоры обоих роторов.",
    frequencies: ["RPM всех валов и гармоники", "лопастные частоты центробежных ступеней", "частоты винтовых роторов и зацепления", "циклические и клапанные частоты поршневых машин", "GMF редуктора", "подшипниковые и субсинхронные компоненты"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-surge", "vibration-fault-gears", "vibration-fault-resonance", "vibration-fault-oil-whirl", "vibration-fault-rub", "vibration-fault-mechanical-looseness"],
    algorithm: ["определить тип и кинематику", "зафиксировать RPM, давление, расход и нагрузку", "построить карту валов и характерных частот", "сравнить все опоры и направления", "отделить механические линии от процессных пульсаций", "проверить подшипники и редуктор", "анализировать waveform при нестационарности", "выбрать специальные методы по типу машины"],
    misleading: ["низкочастотная пульсация не всегда является помпажом", "GMF относится только к имеющейся ступени редуктора", "корпусный спектр недостаточен для ротора на гидродинамических подшипниках", "клапанные события поршневого компрессора не следует трактовать как роторные гармоники"],
    additional: ["синхронные давление и вибрация", "waveform", "order analysis", "разгон/выбег", "орбита для journal bearings", "анализ масла", "фаза и ODS трубопроводов"],
    trend: "Раздельно вести параметры по типу компрессора и сравнивать при сопоставимом давлении, расходе, нагрузке и регулировании.",
    advice: "Без классификации компрессора диагностическая гипотеза ненадёжна: сначала кинематика и процесс, затем спектр.",
    equipment: ["компрессоры"], keywords: ["compressor vibration", "вибрация компрессора", "центробежный компрессор", "винтовой компрессор", "поршневой компрессор"], measurements: [], spectra: ["vibration-spectrum-1x", "vibration-spectrum-blade-pass", "vibration-spectrum-gear-mesh", "vibration-spectrum-modulated"], articles: ["vibration-order-analysis", "vibration-time-waveform", "vibration-shaft-orbit"]
  },
  "vibration-diagnostics-gearboxes": {
    intro: "Редуктор диагностируют через его кинематику: входной, промежуточные и выходной валы, зубчатые ступени, подшипники, корпус и смазочную систему. Обороты двигателя нельзя применять ко всем валам.",
    construction: ["RPM каждого вала", "число зубьев каждой пары", "передаточные отношения", "расположение зацеплений и подшипников", "тип зубьев и корпуса", "смазочная система"],
    parameters: ["RPM доступных валов", "нагрузка и передаваемая мощность", "температура корпуса, масла и подшипников", "уровень, давление и состояние масла", "направление вращения"],
    map: ["входной вал: H / V / A", "каждая промежуточная опора: H / V", "выходной вал: H / V / A", "корпус возле каждой ступени", "привод и ведомая машина у муфт"],
    directions: "Измерять на жёстких участках около подшипников; осевое направление особенно важно для косозубых передач и муфт.",
    frequencies: ["RPM каждого вала", "GMF каждой ступени = зубья × RPM", "гармоники GMF", "боковые полосы с шагом валов", "подшипниковые частоты", "частоты муфт и вспомогательных приводов"],
    faults: ["vibration-fault-gears", "vibration-fault-parallel-misalignment", "vibration-fault-angular-misalignment", "vibration-fault-mechanical-looseness", "vibration-fault-lubrication", "vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race"],
    algorithm: ["построить кинематическую схему", "рассчитать RPM валов и GMF ступеней", "зафиксировать нагрузку и масло", "сравнить опоры и направления", "оценить GMF, гармоники и боковые полосы", "проверить waveform на локальные удары", "отделить подшипниковые компоненты", "сравнить тренд и масло"],
    misleading: ["наличие GMF нормально для работающего зацепления", "высокий GMF не доказывает повреждение зуба", "боковые полосы требуют определения несущей и шага", "изменение нагрузки может менять амплитуду без нового дефекта"],
    additional: ["waveform", "огибающая", "order analysis", "анализ масла", "температура", "осмотр зубьев и пятна контакта", "фаза у муфт"],
    trend: "Отслеживать GMF и боковые полосы каждой ступени, оборотные компоненты валов, подшипники, нагрузку, масло и температуру.",
    advice: "Изменение боковых полос и ударности при сопоставимой нагрузке обычно информативнее абсолютной высоты GMF.",
    equipment: ["редукторы", "зубчатые передачи"], keywords: ["gearbox vibration", "вибрация редуктора", "зубчатая передача", "gear diagnostics"], measurements: ["vibration-gearbox-measurements"], spectra: ["vibration-spectrum-gear-mesh", "vibration-spectrum-sidebands", "vibration-spectrum-impulse"], articles: ["vibration-gearbox-measurements", "vibration-order-analysis", "vibration-envelope-analysis"]
  },
  "vibration-diagnostics-turbines": {
    intro: "Турбины часто являются высокоскоростными многопролётными роторами на гидродинамических подшипниках. Корпусная и относительная вибрация вала дополняют друг друга и оцениваются вместе с тепловым и переходным режимом.",
    construction: ["валопровод, диски и ступени", "гидродинамические подшипники и зазоры", "X/Y proximity probes и keyphasor", "муфты и связанный генератор/компрессор", "корпус, фундамент и трубопроводы", "маслосистема"],
    parameters: ["RPM", "нагрузка", "температуры металла и масла", "давление и расход масла", "вакуум/давление и параметры процесса", "положение вала и тепловой переход"],
    map: ["каждая опора корпуса: H / V / A по системе", "каждый journal bearing: X / Y относительного движения", "осевая позиция и keyphasor", "корпус и фундамент в контрольных точках", "все пролёты общей валопроводной системы"],
    directions: "X/Y probes анализируют как пару с известной ориентацией; корпусные направления сохраняют по схеме машины. Фаза и положение вала обязательны для ротординамического контекста.",
    frequencies: ["1× и гармоники", "субсинхронные компоненты", "лопастные/сопловые частоты", "критические скорости", "электрические компоненты связанного генератора", "структурные собственные частоты"],
    faults: ["vibration-fault-unbalance", "vibration-fault-bent-shaft", "vibration-fault-parallel-misalignment", "vibration-fault-rub", "vibration-fault-oil-whirl", "vibration-fault-resonance", "vibration-fault-babbitt", "vibration-fault-journal-bearing-misalignment"],
    algorithm: ["сверить состояние системы мониторинга", "зафиксировать RPM, нагрузку, температуры и масло", "сравнить абсолютную и относительную вибрацию", "проанализировать X/Y, орбиты и centerline", "оценить 1×, фазу и субсинхронные компоненты", "сравнить пролёты валопровода", "проанализировать разгон/выбег", "учесть тепловую историю"],
    misleading: ["субсинхронный пик не автоматически oil whirl", "корпусная вибрация не заменяет относительное движение вала", "1× может усиливаться на критической скорости", "критерии одной турбины нельзя переносить на другую"],
    additional: ["орбита и centerline", "разгон/выбег", "фаза", "анализ масла", "тепловая модель", "ODS корпуса", "проверка runout"],
    trend: "Вести амплитуду и фазу 1×, субсинхронные компоненты, положение вала, температуры, масло, нагрузку и переходные траектории.",
    advice: "Используйте критерии изготовителя и конкретной системы мониторинга; универсальные пределы для всех турбин недопустимы.",
    equipment: ["турбины", "турбомашины"], keywords: ["turbine vibration", "вибрация турбины", "ротор турбины", "turbomachinery diagnostics"], measurements: ["vibration-relative-shaft-motion"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-half", "vibration-spectrum-oil-whirl", "vibration-spectrum-resonance"], articles: ["vibration-shaft-orbit", "vibration-runup-coastdown", "vibration-coastdown-analysis", "vibration-relative-shaft-motion"]
  },
  "vibration-diagnostics-generators": {
    intro: "Генератор сочетает механическую роторную систему, подшипники и электромагнитную машину. В турбоагрегате его нельзя отделять от общего валопровода и взаимной фазы пролётов.",
    construction: ["ротор, статор и число полюсов", "подшипники и муфты", "воздушный зазор", "система охлаждения", "возбудитель", "связанный привод и общий валопровод"],
    parameters: ["RPM", "активная и реактивная нагрузка", "ток и электрические параметры", "температуры", "режим возбуждения", "параметры охлаждения"],
    map: ["DE/NDE или все опоры: H / V / A", "X/Y probes при journal bearings", "осевые измерения около муфт", "статор и корпус", "соседние пролёты турбоагрегата"],
    directions: "Направления увязывают с общей координатой валопровода; при probes сохраняют ориентацию X/Y и keyphasor.",
    frequencies: ["1× и гармоники", "электромагнитные частоты сети и полюсов", "slip-related компоненты для соответствующих машин", "подшипниковые или субсинхронные частоты", "частоты охлаждающих вентиляторов", "критические скорости валопровода"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-bent-shaft", "vibration-fault-motor-electrical", "vibration-fault-resonance", "vibration-fault-oil-whirl", "vibration-fault-rub"],
    algorithm: ["зафиксировать RPM, электрическую нагрузку и температуры", "сравнить опоры и пролёты", "проанализировать 1× и фазу", "сопоставить электрические частоты", "проверить подшипники и воздушный зазор", "сравнить изменения при нагрузке", "учесть общую динамику валопровода", "подтвердить электрические гипотезы электрическими измерениями"],
    misleading: ["электрическая линия не автоматически означает дефект генератора", "механический 1× может зависеть от резонанса", "локальный вывод нельзя делать без соседних пролётов", "нагрузка меняет электромагнитные силы"],
    additional: ["фаза", "токовый и электрический анализ", "орбита при probes", "разгон/выбег", "контроль воздушного зазора", "тепловой контроль"],
    trend: "Сопоставлять вибрацию с активной/реактивной нагрузкой, током, температурой, 1×, фазой и общей валопроводной картиной.",
    advice: "В турбоагрегате вывод формируют по системе валопровода, а не по генератору как изолированному корпусу.",
    equipment: ["генераторы"], keywords: ["generator vibration", "вибрация генератора", "генератор диагностика", "турбогенератор"], measurements: [], spectra: ["vibration-spectrum-1x", "vibration-spectrum-2x", "vibration-spectrum-sidebands", "vibration-spectrum-resonance"], articles: ["vibration-phase-analysis", "vibration-shaft-orbit", "vibration-operating-mode-relation"]
  },
  "vibration-diagnostics-vertical-machines": {
    intro: "Вертикальная машина — конструктивное исполнение, а не один тип оборудования: это может быть насос, двигатель или турбина. Диагностика учитывает вертикальную ось, гибкость верхней части и несколько уровней опор.",
    construction: ["тип машины и число валов", "уровни опор и направляющих подшипников", "жёсткость колонны и верхней части", "фундамент", "трубопроводы", "муфты и осевая опора"],
    parameters: ["RPM", "нагрузка", "расход и давление для насоса", "положение регулирования", "температуры опор", "уровень/режим среды"],
    map: ["каждый уровень опоры: X / Y", "осевое направление вдоль вала", "верх двигателя или головная часть: X / Y", "рама и фундамент", "патрубки и колонна при необходимости"],
    directions: "Не использовать неоднозначное «горизонталь/вертикаль». Радиальные направления фиксируют как X/Y и привязывают к трубопроводу, конструкции, географической оси или другой постоянной координате.",
    frequencies: ["1× и гармоники", "лопастные частоты для насосов/турбин", "подшипниковые частоты", "электрические частоты двигателя", "структурные собственные частоты колонны и рамы"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-mechanical-looseness", "vibration-fault-resonance", "vibration-fault-soft-foot", "vibration-fault-casing-deformation"],
    algorithm: ["задать постоянные X/Y", "зафиксировать режим", "измерить все уровни опор", "сравнить амплитуды и фазу по высоте", "определить 1× и специфические частоты машины", "проверить фундамент и трубопроводы", "оценить структурную форму", "сопоставить с базой"],
    misleading: ["рост наверху может быть формой конструкции, а не локальным дефектом", "несогласованные H/V обозначения делают тренд непригодным", "корпусная линия может быть резонансом колонны", "типовая карта не заменяет схему конкретной машины"],
    additional: ["фаза между уровнями", "ODS", "модальный анализ", "измерения фундамента", "разгон/выбег", "контроль трубопроводов"],
    trend: "Хранить координаты X/Y и уровень каждой точки; сравнивать форму распределения, фазу, RPM и рабочие параметры.",
    advice: "Пространственное распределение по высоте часто важнее максимума в одной точке.",
    equipment: ["вертикальные машины", "вертикальные насосы", "вертикальные двигатели"], keywords: ["vertical machine vibration", "вертикальная машина", "вертикальный насос вибрация", "вертикальный двигатель"], measurements: ["vibration-vertical-machines-measurements"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-resonance", "vibration-spectrum-blade-pass"], articles: ["vibration-vertical-machines-measurements", "vibration-phase-analysis", "vibration-ods"]
  },
  "vibration-diagnostics-rolling-bearings": {
    intro: "Это диагностическая категория машин, где подшипники качения являются значимым источником состояния. Анализ не ограничивается совпадением BPFO/BPFI и объединяет обычную вибрацию, импульсность, огибающую, тренд, температуру и смазку.",
    construction: ["обозначение и геометрия подшипника", "нагруженная зона", "посадки колец", "тип и количество смазки", "путь передачи к корпусу", "скорость каждого кольца"],
    parameters: ["RPM", "нагрузка", "температура", "тип и дата смазки", "режим машины", "история монтажа и замены"],
    map: ["каждая подшипниковая опора: H / V / A по конструкции", "жёсткая точка максимально близко к корпусу подшипника", "соседняя опора для сравнения", "дополнительная высокочастотная запись", "температурная точка"],
    directions: "Измерять по пути передачи нагрузки и сохранять ориентацию. Слабая крышка или кожух не заменяют жёсткую точку корпуса.",
    frequencies: ["1× и общая роторная картина", "BPFO", "BPFI", "BSF", "FTF", "гармоники и боковые полосы", "резонансная полоса для огибающей"],
    faults: ["vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race", "vibration-fault-bearing-rolling-elements", "vibration-fault-bearing-cage", "vibration-fault-lubrication", "vibration-fault-loose-bearing-housing", "vibration-fault-bearing-clearance"],
    algorithm: ["проверить RPM, тип подшипника и нагрузку", "сравнить общий уровень и acceleration", "осмотреть waveform, Peak и crest factor", "выбрать полосу огибающей", "рассчитать BPFO/BPFI/BSF/FTF", "проверить гармоники и боковые полосы", "сравнить опоры, температуру и смазку", "оценить тренд и альтернативы"],
    misleading: ["совпадение одного пика с расчётной частотой недостаточно", "высокочастотный фон может быть смазкой, зубьями или помехой", "пик-фактор не растёт монотонно с тяжестью", "ранняя активность может не менять общий RMS"],
    additional: ["огибающая", "длительный waveform", "температура", "анализ смазки", "ультразвуковой/акустический контроль", "осмотр посадок при ремонте"],
    trend: "Вести обычный уровень, acceleration, огибающую, расчётные линии, Peak/crest factor, температуру и события смазки при сопоставимой нагрузке.",
    advice: "На раннем этапе изменения могут лучше проявляться высокочастотно, на развитом — в общем уровне; универсальную фиксированную стадийность применять нельзя.",
    equipment: ["машины с подшипниками качения", "подшипники качения"], keywords: ["rolling bearing diagnostics", "подшипник качения диагностика", "BPFO BPFI", "bearing vibration"], measurements: ["vibration-bearing-supports"], spectra: ["vibration-spectrum-bpfo", "vibration-spectrum-bpfi", "vibration-spectrum-bsf", "vibration-spectrum-ftf", "vibration-spectrum-broadband-noise"], articles: ["vibration-envelope-analysis", "vibration-acceleration", "vibration-bearing-supports", "vibration-reference-bearing-frequencies"]
  },
  "vibration-diagnostics-journal-bearings": {
    intro: "Это категория машин с гидродинамической опорой ротора. Основные данные — относительное движение вала X/Y, орбита, centerline, зазор, фаза, масло и переходные режимы; корпусный спектр является только частью картины.",
    construction: ["тип и геометрия вкладыша", "номинальный и фактический зазор", "ориентация X/Y probes", "keyphasor", "маслосистема", "валопровод и критические скорости"],
    parameters: ["RPM", "нагрузка", "температура и давление масла", "температура вкладышей", "положение вала", "режим разгона/выбега"],
    map: ["каждый подшипник: X / Y относительного движения", "keyphasor", "корпус опоры: H / V", "осевая позиция при наличии", "масляные и температурные каналы"],
    directions: "X/Y рассматривают как согласованную пару с известной геометрией и полярностью. Орбита без корректной ориентации и runout может вводить в заблуждение.",
    frequencies: ["1× и гармоники", "субсинхронные компоненты", "критические скорости", "частоты прецессии", "фиксированные структурные частоты", "частоты технологического возбуждения"],
    faults: ["vibration-fault-oil-whirl", "vibration-fault-rotor-precession", "vibration-fault-rub", "vibration-fault-babbitt", "vibration-fault-oil-coking", "vibration-fault-journal-bearing-misalignment", "vibration-fault-unbalance", "vibration-fault-resonance"],
    algorithm: ["проверить probes, runout и keyphasor", "зафиксировать RPM, нагрузку и масло", "оценить X/Y спектры и centerline", "построить орбиту", "проанализировать 1×, фазу и субсинхронные компоненты", "сравнить все подшипники валопровода", "изучить разгон/выбег", "проверить зазор, температуру и масло"],
    misleading: ["0,42× не автоматически oil whirl", "сложная орбита не является готовым диагнозом", "электрическое и механическое биение искажают probes", "корпусная вибрация не описывает полностью движение вала"],
    additional: ["орбита и centerline", "разгон/выбег", "анализ масла", "фаза", "slow-roll/runout проверка", "ротординамический анализ"],
    trend: "Сохранять direct, 1× amplitude/phase, субсинхронные компоненты, centerline, орбиту, температуры, давление масла и нагрузку.",
    advice: "Диагноз формируют по согласованию движения вала, опор, масла и режима, а не по одной корпусной линии.",
    equipment: ["гидродинамические подшипники", "подшипники скольжения", "турбомашины"], keywords: ["journal bearing", "sleeve bearing", "подшипник скольжения", "гидродинамический подшипник"], measurements: ["vibration-relative-shaft-motion"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-half", "vibration-spectrum-oil-whirl", "vibration-spectrum-resonance"], articles: ["vibration-shaft-orbit", "vibration-relative-shaft-motion", "vibration-runup-coastdown", "vibration-coastdown-analysis"]
  },
  "vibration-diagnostics-smoke-exhausters": {
    intro: "Дымосос рассматривают как систему двигатель → передача или муфта → ротор → подшипники → корпус → газоход. Механические причины сочетаются с налипанием, эрозией, аэродинамическими пульсациями и движением газоходов.",
    construction: ["тип привода", "ротор и число лопаток", "подшипники и вал", "корпус и улитка", "заслонки/направляющий аппарат", "газоходы, компенсаторы и фундамент"],
    parameters: ["RPM", "нагрузка двигателя", "положение заслонок или направляющего аппарата", "расход и разрежение", "температура газа", "технологический режим и загрязнённость"],
    map: ["двигатель DE/NDE: H / V / A у муфты", "подшипники ротора: H / V / A по задаче", "корпус и рама", "газоход и его опоры", "заслонки и вспомогательные конструкции при выраженном движении"],
    directions: "Сравнивать радиальные направления опор, осевое у муфты и постоянные координаты корпуса/газохода. Не измерять на тонком кожухе как на основной точке.",
    frequencies: ["1× и гармоники", "blade pass", "подшипниковые частоты", "ременные/редукторные частоты при наличии", "аэродинамические пульсации", "структурные частоты корпуса и газохода"],
    faults: ["vibration-fault-unbalance", "vibration-fault-parallel-misalignment", "vibration-fault-mechanical-looseness", "vibration-fault-resonance", "vibration-fault-surge", "vibration-fault-bearing-outer-race", "vibration-fault-bearing-inner-race"],
    algorithm: ["зафиксировать RPM, нагрузку, заслонки и температуру газа", "сравнить двигатель и роторные опоры", "определить 1× и blade pass", "проверить тренд резких и постепенных изменений", "оценить аэродинамический фон", "проверить подшипники", "осмотреть налипание и эрозию по доступным данным", "измерить корпус, раму и газоход"],
    misleading: ["высокий 1× не автоматически налипание", "быстрое изменение может быть отпадением отложений или режимом", "вибрация корпуса может возбуждаться газоходом", "blade pass не обязательно означает повреждение лопатки"],
    additional: ["фаза", "waveform", "ODS корпуса и газохода", "осмотр ротора", "анализ загрязнений и эрозии", "order analysis", "контроль заслонок"],
    trend: "Сопоставлять 1×, blade pass, подшипниковые показатели с нагрузкой, заслонками, температурой газа, очистками и ремонтами.",
    advice: "Налипание и эрозия изменяют распределение массы по-разному, а аэродинамика может усиливать тот же 1×; подтверждайте причину осмотром и режимом.",
    equipment: ["дымососы"], keywords: ["дымосос вибрация", "smoke exhauster vibration", "ID fan diagnostics", "вибродиагностика дымососа"], measurements: ["vibration-fan-measurements"], spectra: ["vibration-spectrum-1x", "vibration-spectrum-blade-pass", "vibration-spectrum-broadband-noise", "vibration-spectrum-resonance"], articles: ["vibration-fan-measurements", "vibration-ods", "vibration-operating-mode-relation"]
  }
};

const articles = data.filter(item => item.parentId === "vibration-equipment-diagnostics");
if (articles.length !== Object.keys(configs).length) throw new Error(`Equipment config mismatch: ${articles.length}/${Object.keys(configs).length}`);

for (const item of articles) {
  const c = configs[item.id];
  if (!c) throw new Error(`Missing config: ${item.id}`);
  const relatedArticles = [...new Set([...common, ...c.articles])].filter(id => ids.has(id));
  const relatedFaults = c.faults.filter(id => ids.has(id));
  const relatedSpectra = c.spectra.filter(id => ids.has(id));
  const relatedMeasurements = c.measurements.filter(id => ids.has(id));
  item.summary = `Практический маршрут вибродиагностики: конструкция, режим, точки, характерные частоты и подтверждающие проверки для категории «${item.title}».`;
  item.status = "published";
  item.sections = [
    T("Назначение", c.intro),
    L("Что необходимо знать о конструкции", c.construction),
    L("Что обязательно записать", c.parameters),
    L("Типовая карта измерений", c.map),
    W("Карта не является нормативом", "Фактический набор точек и направлений определяется конструкцией машины, доступом, задачей контроля и документацией объекта."),
    T("Особенности направлений", c.directions),
    L("Характерные частоты", c.frequencies),
    M("С чего начать диагностику", c.algorithm.map((step, index) => [`${index + 1}. Шаг`, step])),
    L("Что может ввести в заблуждение", c.misleading),
    L("Когда нужны дополнительные методы", c.additional),
    T("Что сравнивать в тренде", c.trend),
    T("Практический совет", c.advice),
    W("Без автоматического диагноза", "Частый для данного оборудования признак не становится автоматической причиной. Вывод требует проверки качества данных, режима и альтернативных гипотез; допустимость оценивается по документации конкретной машины."),
    R([...relatedMeasurements, ...relatedSpectra, ...relatedFaults, ...relatedArticles])
  ];
  delete item.futureImageLabel;
  delete item.futureImageLabels;
  delete item.futureBlocks;
  item.metadata = {
    ...item.metadata,
    section: "vibration",
    group: "vibration-equipment-diagnostics",
    materialType: "article",
    status: "published",
    equipment: c.equipment,
    keywords: c.keywords,
    aliases: c.keywords.slice(1),
    diagnosticSigns: [...new Set([...c.frequencies, ...c.misleading])],
    tags: [...new Set([...(item.metadata?.tags || []), "equipment-diagnostics", "diagnostic-route"])],
    measuredParameters: c.parameters,
    relatedArticles,
    relatedMeasurements,
    relatedParameters: [],
    relatedFaults,
    probableFaults: relatedFaults,
    relatedSpectra,
    similarSpectra: relatedSpectra,
    relatedScenarios: [],
    additionalChecks: c.additional
  };
  item.tags = [...new Set([...(item.tags || []), "equipment-diagnostics", "diagnostic-route"])];
}

await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
