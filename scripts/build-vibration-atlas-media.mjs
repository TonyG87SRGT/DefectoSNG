import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data", "vibration.json");
const items = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const faultDir = path.join(root, "images", "vibration-atlas", "faults");
const spectrumDir = path.join(root, "images", "vibration-atlas", "spectra");
const waveformDir = path.join(root, "images", "vibration-diagnostics", "waveforms");
const equipmentDir = path.join(root, "images", "vibration-diagnostics", "equipment");
fs.mkdirSync(faultDir, { recursive: true });
fs.mkdirSync(spectrumDir, { recursive: true });
fs.mkdirSync(waveformDir, { recursive: true });
fs.mkdirSync(equipmentDir, { recursive: true });

const profiles = {
  "1x": { maxX: 6, peaks: [[1, 1, "1×"], [2, .18, "2×"], [3, .08, "3×"]] },
  "2x": { maxX: 6, peaks: [[1, .35, "1×"], [2, 1, "2×"], [3, .12, "3×"]] },
  "1x-2x": { maxX: 6, peaks: [[1, 1, "1×"], [2, .78, "2×"], [3, .16, "3×"]] },
  "harmonic-series": { maxX: 8, peaks: [[1, 1, "1×"], [2, .82, "2×"], [3, .65, "3×"], [4, .48, "4×"], [5, .34, "5×"], [6, .22, "6×"]] },
  "half": { maxX: 5, peaks: [[.5, .85, "½×"], [1, 1, "1×"], [1.5, .32, "1½×"], [2, .22, "2×"]] },
  "third": { maxX: 4, peaks: [[.33, .72, "⅓×"], [.67, .38, "⅔×"], [1, 1, "1×"], [1.33, .22, "1⅓×"]] },
  "oil-whirl": { maxX: 3, peaks: [[.43, 1, "0,43×"], [1, .52, "1×"], [2, .12, "2×"]] },
  "broadband-noise": { maxX: 12, noise: "high" },
  "blade-pass": { maxX: 14, peaks: [[1, .28, "1×"], [6, 1, "BPF"], [12, .42, "2 BPF"]] },
  "gear-mesh": { maxX: 18, peaks: [[1, .22, "1×"], [8, 1, "GMF"], [16, .46, "2 GMF"]] },
  "sidebands": { maxX: 12, peaks: [[4, .32, ""], [5, .58, ""], [6, 1, "несущая"], [7, .58, ""], [8, .32, ""]] },
  "bpfo": { maxX: 14, peaks: [[3.6, 1, "BPFO"], [7.2, .62, "2 BPFO"], [10.8, .34, "3 BPFO"]] },
  "bpfi": { maxX: 17, peaks: [[4.9, 1, "BPFI"], [3.9, .28, ""], [5.9, .28, ""], [9.8, .58, "2 BPFI"], [14.7, .31, "3 BPFI"]] },
  "bsf": { maxX: 12, peaks: [[2.4, .88, "BSF"], [4.8, 1, "2 BSF"], [7.2, .44, "3 BSF"]] },
  "ftf": { maxX: 5, peaks: [[.4, 1, "FTF"], [.8, .44, "2 FTF"], [1, .3, "1×"], [1.2, .22, "3 FTF"]] },
  "resonance": { maxX: 10, resonance: 5.2 },
  "clipping": { maxX: 9, peaks: [[1, 1, "1×"], [3, .58, "3×"], [5, .34, "5×"], [7, .2, "7×"]] },
  "impulse": { maxX: 14, noise: "impulse", peaks: [[3.4, .82, "повтор"], [6.8, .54, ""], [10.2, .32, ""]] },
  "modulated": { maxX: 12, peaks: [[5, .32, ""], [6, .62, "боковая"], [7, 1, "несущая"], [8, .62, "боковая"], [9, .32, ""]] },
  "cavitation": { maxX: 14, noise: "cavitation", peaks: [[1, .22, "1×"], [6, .42, "BPF"]] },
  "no-unique": { maxX: 8, peaks: [[1, .45, "1×"], [2, .18, "2×"]], noise: "low" }
};

const spectrumMap = {
  "vibration-spectrum-1x": "1x",
  "vibration-spectrum-2x": "2x",
  "vibration-spectrum-1x-2x": "1x-2x",
  "vibration-spectrum-harmonic-series": "harmonic-series",
  "vibration-spectrum-half": "half",
  "vibration-spectrum-third": "third",
  "vibration-spectrum-oil-whirl": "oil-whirl",
  "vibration-spectrum-broadband-noise": "broadband-noise",
  "vibration-spectrum-blade-pass": "blade-pass",
  "vibration-spectrum-gear-mesh": "gear-mesh",
  "vibration-spectrum-sidebands": "sidebands",
  "vibration-spectrum-bpfo": "bpfo",
  "vibration-spectrum-bpfi": "bpfi",
  "vibration-spectrum-bsf": "bsf",
  "vibration-spectrum-ftf": "ftf",
  "vibration-spectrum-resonance": "resonance",
  "vibration-spectrum-clipping": "clipping",
  "vibration-spectrum-impulse": "impulse",
  "vibration-spectrum-modulated": "modulated",
  "vibration-spectrum-cavitation": "cavitation"
};

const faultMedia = {
  "vibration-fault-unbalance": ["1x", "phase"],
  "vibration-fault-parallel-misalignment": ["1x-2x", "phase"],
  "vibration-fault-angular-misalignment": ["2x", "phase"],
  "vibration-fault-bent-shaft": ["1x", "phase"],
  "vibration-fault-mechanical-looseness": ["harmonic-series", "waveform"],
  "vibration-fault-loose-bearing-housing": ["harmonic-series", "waveform"],
  "vibration-fault-bearing-clearance": ["harmonic-series", "waveform"],
  "vibration-fault-soft-foot": ["1x-2x", "phase"],
  "vibration-fault-uneven-supports": ["1x", "phase"],
  "vibration-fault-inclined-foundation": ["1x", "phase"],
  "vibration-fault-casing-deformation": ["1x-2x", "phase"],
  "vibration-fault-pipe-strain": ["1x", "phase"],
  "vibration-fault-rub": ["half", "waveform"],
  "vibration-fault-resonance": ["resonance", "runup"],
  "vibration-fault-cavitation": ["cavitation", "waveform"],
  "vibration-fault-surge": ["broadband-noise", "trend"],
  "vibration-fault-gears": ["gear-mesh", "waveform"],
  "vibration-fault-motor-electrical": ["sidebands", "trend"],
  "vibration-fault-rotor-cage": ["sidebands", "waveform"],
  "vibration-fault-lubrication": ["broadband-noise", "trend"],
  "vibration-fault-bearing-outer-race": ["bpfo", "waveform"],
  "vibration-fault-bearing-inner-race": ["bpfi", "waveform"],
  "vibration-fault-bearing-rolling-elements": ["bsf", "waveform"],
  "vibration-fault-bearing-cage": ["ftf", "waveform"],
  "vibration-fault-rotor-precession": ["half", "orbit"],
  "vibration-fault-oil-whirl": ["oil-whirl", "orbit"],
  "vibration-fault-babbitt": ["broadband-noise", "orbit"],
  "vibration-fault-oil-coking": ["no-unique", "trend"],
  "vibration-fault-journal-bearing-misalignment": ["1x", "orbit"]
};

const faultWaveformIds = new Set([
  "vibration-fault-unbalance",
  "vibration-fault-parallel-misalignment",
  "vibration-fault-angular-misalignment",
  "vibration-fault-bent-shaft",
  "vibration-fault-mechanical-looseness",
  "vibration-fault-loose-bearing-housing",
  "vibration-fault-bearing-clearance",
  "vibration-fault-rub",
  "vibration-fault-cavitation",
  "vibration-fault-gears",
  "vibration-fault-rotor-cage",
  "vibration-fault-lubrication",
  "vibration-fault-bearing-outer-race",
  "vibration-fault-bearing-inner-race",
  "vibration-fault-bearing-rolling-elements",
  "vibration-fault-bearing-cage",
  "vibration-fault-oil-whirl",
  "vibration-fault-journal-bearing-misalignment"
]);

const waveformExamples = [
  ["harmonic", "Гармонический сигнал", "1x", "Почти периодическая форма с устойчивым повторением."],
  ["impact", "Повторяющиеся удары", "impulse", "Короткие импульсы, разделённые интервалом повторения."],
  ["modulation", "Амплитудная модуляция", "modulated", "Высокочастотное колебание с медленно меняющейся огибающей."],
  ["beats", "Биения", "beat", "Рост и спад амплитуды при близких частотах двух источников."],
  ["broadband", "Широкополосный сигнал", "broadband-noise", "Неповторяющаяся форма с распределённой частотной энергией."],
  ["subsync", "Субсинхронное движение", "half", "Повторяемость ниже выбранной оборотной частоты."],
  ["clipping", "Клиппирование", "clipping", "Срезанные вершины указывают на ограничение измерительного тракта."],
  ["nonlinear", "Нелинейная форма", "harmonic-series", "Несинусоидальная форма, способная формировать ряд гармоник."]
];

const equipmentGuides = {
  "vibration-diagnostics-pumps": {
    slug: "pumps", context: "RPM + расход + давления", peaks: [[1, .65, "1×"], [6, 1, "VPF"], [12, .42, "2 VPF"]]
  },
  "vibration-diagnostics-motors": {
    slug: "motors", context: "RPM + ток + нагрузка + питание", peaks: [[1, .62, "1×"], [5, 1, "2 fс"], [4.4, .35, "± slip"], [5.6, .35, "± slip"]]
  },
  "vibration-diagnostics-fans": {
    slug: "fans", context: "RPM + заслонка + расход", peaks: [[1, .76, "1×"], [7, 1, "BPF"], [14, .38, "2 BPF"]]
  },
  "vibration-diagnostics-compressors": {
    slug: "compressors", context: "Тип компрессора определяют до анализа", peaks: [[1, .52, "1×"], [4, .74, "процесс"], [8, 1, "лопасти/зацепление"]]
  },
  "vibration-diagnostics-gearboxes": {
    slug: "gearboxes", context: "RPM каждого вала + нагрузка", peaks: [[1, .28, "1× вх"], [3, .2, "1× вых"], [9, 1, "GMF"], [8, .42, "−1×"], [10, .42, "+1×"]]
  },
  "vibration-diagnostics-turbines": {
    slug: "turbines", context: "Корпус + X/Y вала + фаза", peaks: [[.43, .48, "sub×"], [1, 1, "1×"], [2, .24, "2×"]]
  },
  "vibration-diagnostics-generators": {
    slug: "generators", context: "Валопровод + нагрузка + электрические данные", peaks: [[1, .74, "1×"], [5, 1, "2 fс"], [4.5, .32, "боковая"], [5.5, .32, "боковая"]]
  },
  "vibration-diagnostics-vertical-machines": {
    slug: "vertical-machines", mode: "directions", context: "Уровень опоры + X/Y + ось", peaks: []
  },
  "vibration-diagnostics-rolling-bearings": {
    slug: "rolling-bearings", context: "Ускорение + огибающая + температура", peaks: [[3.6, 1, "BPFO"], [4.9, .82, "BPFI"], [7.2, .48, "2 BPFO"], [9.8, .38, "2 BPFI"]]
  },
  "vibration-diagnostics-journal-bearings": {
    slug: "journal-bearings", context: "X/Y + орбита + centerline + масло", peaks: [[.43, .78, "sub×"], [1, 1, "1×"], [2, .3, "2×"]]
  },
  "vibration-diagnostics-smoke-exhausters": {
    slug: "smoke-exhausters", context: "RPM + нагрузка + заслонки + газоход", peaks: [[1, .82, "1×"], [8, 1, "BPF"], [16, .35, "2 BPF"]]
  }
};

const esc = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const frame = (title, inner, footer) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-labelledby="title desc">
  <title id="title">${esc(title)}</title>
  <desc id="desc">${esc(footer)}</desc>
  <rect width="960" height="540" rx="24" fill="#0b1220"/>
  <rect x="24" y="24" width="912" height="492" rx="18" fill="#111c2d" stroke="#2b4667"/>
  <text x="52" y="64" fill="#f1f5f9" font-family="Arial,sans-serif" font-size="25" font-weight="700">${esc(title)}</text>
  ${inner}
  <text x="52" y="498" fill="#91a4bb" font-family="Arial,sans-serif" font-size="16">${esc(footer)}</text>
</svg>`;

function seeded(index, salt = 1) {
  const value = Math.sin((index + 1) * 12.9898 * salt) * 43758.5453;
  return value - Math.floor(value);
}

function renderSpectrum(title, profileName) {
  const profile = profiles[profileName] || profiles["no-unique"];
  const left = 74, right = 916, top = 92, bottom = 438;
  const width = right - left, height = bottom - top;
  const x = value => left + value / profile.maxX * width;
  const y = value => bottom - value * height * .86;
  let inner = `<path d="M${left} ${top}V${bottom}H${right}" fill="none" stroke="#7f94ac" stroke-width="2"/>`;
  for (let i = 1; i <= 4; i++) {
    const gy = bottom - i * height / 5;
    inner += `<line x1="${left}" y1="${gy}" x2="${right}" y2="${gy}" stroke="#24364d"/>`;
  }
  for (let i = 0; i <= Math.floor(profile.maxX); i++) {
    const gx = x(i);
    inner += `<line x1="${gx}" y1="${bottom}" x2="${gx}" y2="${bottom + 8}" stroke="#7f94ac"/>`;
    inner += `<text x="${gx}" y="${bottom + 29}" text-anchor="middle" fill="#91a4bb" font-family="Arial,sans-serif" font-size="14">${i}</text>`;
  }
  if (profile.resonance) {
    const points = [];
    for (let i = 0; i <= 140; i++) {
      const px = profile.maxX * i / 140;
      const py = .07 + .93 * Math.exp(-Math.pow((px - profile.resonance) / .46, 2));
      points.push(`${x(px).toFixed(1)},${y(py).toFixed(1)}`);
    }
    inner += `<polyline points="${points.join(" ")}" fill="none" stroke="#f59e0b" stroke-width="5"/>`;
    inner += `<line x1="${x(profile.resonance)}" y1="${top + 8}" x2="${x(profile.resonance)}" y2="${bottom}" stroke="#f59e0b" stroke-dasharray="6 8" opacity=".55"/>`;
  }
  if (profile.noise) {
    for (let i = 1; i < 130; i++) {
      const px = profile.maxX * i / 130;
      let level = .08 + .14 * seeded(i, 1.7);
      if (profile.noise === "high") level += px / profile.maxX * .24;
      if (profile.noise === "impulse") level += .14 + .22 * seeded(i, 2.3);
      if (profile.noise === "cavitation") level += px > profile.maxX * .35 ? .18 + .28 * seeded(i, 3.1) : .05;
      inner += `<line x1="${x(px)}" y1="${bottom}" x2="${x(px)}" y2="${y(Math.min(level, .78))}" stroke="#38bdf8" stroke-width="3" opacity=".62"/>`;
    }
  }
  for (const [frequency, amplitude, label] of profile.peaks || []) {
    inner += `<line x1="${x(frequency)}" y1="${bottom}" x2="${x(frequency)}" y2="${y(amplitude)}" stroke="#60a5fa" stroke-width="7"/>`;
    inner += `<circle cx="${x(frequency)}" cy="${y(amplitude)}" r="6" fill="#f59e0b"/>`;
    if (label) inner += `<text x="${x(frequency)}" y="${Math.max(top + 18, y(amplitude) - 14)}" text-anchor="middle" fill="#f8fafc" font-family="Arial,sans-serif" font-size="16" font-weight="700">${esc(label)}</text>`;
  }
  inner += `<text x="495" y="486" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Порядок или нормированная частота</text>`;
  inner += `<text x="24" y="278" transform="rotate(-90 24 278)" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Амплитуда</text>`;
  return frame(title, inner, "Учебная качественная модель — масштаб и амплитуды не являются нормативом");
}

function waveformValues(profileName, count = 220) {
  const profile = profiles[profileName] || profiles["no-unique"];
  const values = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    let value = 0;
    if (profileName === "clipping") value = Math.max(-.52, Math.min(.52, 1.3 * Math.sin(2 * Math.PI * 4 * t)));
    else if (profileName === "beat") value = Math.sin(2 * Math.PI * 16 * t) + .92 * Math.sin(2 * Math.PI * 17.4 * t);
    else if (profileName === "impulse") value = Array.from({ length: 7 }, (_, k) => Math.exp(-Math.pow((t - (.08 + k * .145)) / .012, 2))).reduce((a, b) => a + b, 0) * 1.2 - .15;
    else if (profileName === "modulated") value = (.35 + .6 * (1 + Math.sin(2 * Math.PI * 2 * t)) / 2) * Math.sin(2 * Math.PI * 17 * t);
    else if (["broadband-noise", "cavitation"].includes(profileName)) value = .2 * Math.sin(2 * Math.PI * 5 * t) + (seeded(i, 4.7) - .5) * 1.15;
    else for (const [frequency, amplitude] of profile.peaks || []) value += amplitude * Math.sin(2 * Math.PI * frequency * 2.2 * t);
    values.push(value);
  }
  const max = Math.max(...values.map(Math.abs), .001);
  return values.map(value => value / max);
}

function renderWaveform(title, profileName) {
  const values = waveformValues(profileName);
  const left = 62, right = 916, top = 104, bottom = 430;
  const middle = (top + bottom) / 2;
  const points = values.map((value, index) => {
    const px = left + index / (values.length - 1) * (right - left);
    const py = middle - value * (bottom - top) * .42;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });
  const inner = `
    <line x1="${left}" y1="${middle}" x2="${right}" y2="${middle}" stroke="#4c6480" stroke-width="2"/>
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#7f94ac" stroke-width="2"/>
    <polyline points="${points.join(" ")}" fill="none" stroke="#38bdf8" stroke-width="4"/>
    <text x="490" y="465" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Время</text>
    <text x="25" y="268" transform="rotate(-90 25 268)" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Амплитуда</text>`;
  return frame(title, inner, "Учебная временная форма для сопоставления со спектром");
}

function renderEvidence(title, kind, profileName) {
  if (kind === "waveform") return renderWaveform(title, profileName);
  if (kind === "orbit") {
    const points = [];
    for (let i = 0; i <= 220; i++) {
      const angle = i / 220 * Math.PI * 2;
      const wobble = profileName === "oil-whirl" ? .18 * Math.sin(3 * angle) : .08 * Math.sin(2 * angle);
      points.push(`${(490 + (235 + wobble * 80) * Math.cos(angle)).toFixed(1)},${(270 + (135 + wobble * 50) * Math.sin(angle)).toFixed(1)}`);
    }
    const inner = `<circle cx="490" cy="270" r="168" fill="none" stroke="#334d6b" stroke-width="3"/>
      <line x1="245" y1="270" x2="735" y2="270" stroke="#334d6b"/><line x1="490" y1="92" x2="490" y2="448" stroke="#334d6b"/>
      <polyline points="${points.join(" ")}" fill="none" stroke="#38bdf8" stroke-width="6"/>
      <circle cx="490" cy="270" r="8" fill="#f59e0b"/>`;
    return frame(title, inner, "Учебная орбита: интерпретировать вместе с фазой, положением вала и режимом");
  }
  if (kind === "runup") {
    const points = [];
    for (let i = 0; i <= 150; i++) {
      const t = i / 150;
      const value = .12 + .88 * Math.exp(-Math.pow((t - .58) / .09, 2));
      points.push(`${(80 + t * 820).toFixed(1)},${(430 - value * 310).toFixed(1)}`);
    }
    const inner = `<path d="M80 100V430H900" fill="none" stroke="#7f94ac" stroke-width="2"/>
      <polyline points="${points.join(" ")}" fill="none" stroke="#f59e0b" stroke-width="6"/>
      <line x1="556" y1="100" x2="556" y2="430" stroke="#60a5fa" stroke-width="3" stroke-dasharray="8 8"/>
      <text x="490" y="465" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Частота вращения</text>`;
    return frame(title, inner, "Учебная амплитудно-частотная зависимость при разгоне или выбеге");
  }
  if (kind === "trend") {
    const makeLine = (phase, scale) => Array.from({ length: 18 }, (_, i) => {
      const t = i / 17;
      const value = .18 + scale * t + .12 * Math.sin(i * .8 + phase);
      return `${(80 + t * 820).toFixed(1)},${(430 - value * 280).toFixed(1)}`;
    }).join(" ");
    const inner = `<path d="M80 100V430H900" fill="none" stroke="#7f94ac" stroke-width="2"/>
      <polyline points="${makeLine(0, .7)}" fill="none" stroke="#38bdf8" stroke-width="5"/>
      <polyline points="${makeLine(1.2, .35)}" fill="none" stroke="#f59e0b" stroke-width="5"/>
      <polyline points="${makeLine(2.1, .12)}" fill="none" stroke="#a78bfa" stroke-width="5"/>
      <text x="490" y="465" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Время и сопоставимый режим</text>`;
    return frame(title, inner, "Учебный тренд нескольких независимых параметров");
  }
  const valuesA = waveformValues(profileName, 190);
  const shift = kind === "phase" ? 26 : 12;
  const points = (values, offset, color) => {
    const coords = values.map((value, index) => `${(72 + index / (values.length - 1) * 840).toFixed(1)},${(268 + offset - value * 112).toFixed(1)}`).join(" ");
    return `<polyline points="${coords}" fill="none" stroke="${color}" stroke-width="5"/>`;
  };
  const shifted = valuesA.map((_, index) => valuesA[(index + shift) % valuesA.length]);
  const inner = `<line x1="72" y1="268" x2="912" y2="268" stroke="#4c6480" stroke-width="2"/>
    ${points(valuesA, -42, "#38bdf8")}${points(shifted, 42, "#f59e0b")}
    <text x="490" y="465" text-anchor="middle" fill="#b8c7d9" font-family="Arial,sans-serif" font-size="17">Синхронное сравнение точек</text>`;
  return frame(title, inner, "Учебное фазовое сравнение — угол относится к выбранной частоте");
}

function renderEquipmentGuide(title, guide) {
  if (guide.mode === "directions") {
    const inner = `
      <rect x="430" y="116" width="100" height="238" rx="24" fill="#1d3550" stroke="#60a5fa" stroke-width="4"/>
      <rect x="340" y="354" width="280" height="48" rx="10" fill="#263b55" stroke="#7f94ac" stroke-width="3"/>
      <line x1="480" y1="116" x2="480" y2="74" stroke="#f59e0b" stroke-width="7"/>
      <path d="M466 91L480 70L494 91" fill="none" stroke="#f59e0b" stroke-width="7"/>
      <line x1="430" y1="178" x2="300" y2="178" stroke="#38bdf8" stroke-width="7"/>
      <path d="M322 164L300 178L322 192" fill="none" stroke="#38bdf8" stroke-width="7"/>
      <line x1="530" y1="270" x2="680" y2="270" stroke="#a78bfa" stroke-width="7"/>
      <path d="M658 256L680 270L658 284" fill="none" stroke="#a78bfa" stroke-width="7"/>
      <text x="480" y="96" text-anchor="middle" fill="#f8fafc" font-family="Arial,sans-serif" font-size="18" font-weight="700">A — ось</text>
      <text x="285" y="184" text-anchor="end" fill="#f8fafc" font-family="Arial,sans-serif" font-size="18" font-weight="700">X</text>
      <text x="696" y="276" fill="#f8fafc" font-family="Arial,sans-serif" font-size="18" font-weight="700">Y</text>
      <text x="480" y="438" text-anchor="middle" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">Сравнивать уровни по высоте и сохранять постоянную систему координат</text>`;
    return frame(`${title}: точки и направления`, inner, "Обозначения X/Y/A привязывают к конструкции и сохраняют во всех повторных измерениях");
  }
  const left = 68, right = 912, top = 112, bottom = 396;
  const maxX = Math.max(...guide.peaks.map(([frequency]) => frequency), 8) * 1.08;
  const x = value => left + value / maxX * (right - left);
  const y = value => bottom - value * (bottom - top) * .82;
  let inner = `<path d="M${left} ${top}V${bottom}H${right}" fill="none" stroke="#7f94ac" stroke-width="2"/>`;
  for (let i = 1; i <= 4; i++) {
    const gy = bottom - i * (bottom - top) / 5;
    inner += `<line x1="${left}" y1="${gy}" x2="${right}" y2="${gy}" stroke="#24364d"/>`;
  }
  for (const [frequency, amplitude, label] of guide.peaks) {
    inner += `<line x1="${x(frequency)}" y1="${bottom}" x2="${x(frequency)}" y2="${y(amplitude)}" stroke="#60a5fa" stroke-width="7"/>`;
    inner += `<circle cx="${x(frequency)}" cy="${y(amplitude)}" r="6" fill="#f59e0b"/>`;
    inner += `<text x="${x(frequency)}" y="${Math.max(top + 18, y(amplitude) - 14)}" text-anchor="middle" fill="#f8fafc" font-family="Arial,sans-serif" font-size="16" font-weight="700">${esc(label)}</text>`;
  }
  inner += `<rect x="68" y="420" width="844" height="45" rx="12" fill="#18283d" stroke="#2b4667"/>`;
  inner += `<text x="490" y="449" text-anchor="middle" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">Контекст: ${esc(guide.context)}</text>`;
  return frame(`${title}: карта ожидаемых составляющих`, inner, "Частоты рассчитывают по фактической конструкции и режиму; высота линий условна");
}

const faultCards = items.filter(item => item.parentId === "vibration-fault-atlas");
const spectrumCards = items.filter(item => item.parentId === "vibration-spectrum-atlas");
if (faultCards.length !== 29 || spectrumCards.length !== 20) {
  throw new Error(`Unexpected atlas composition: faults=${faultCards.length}, spectra=${spectrumCards.length}`);
}

for (const card of faultCards) {
  const slug = card.id.replace("vibration-fault-", "");
  const [profileName, evidenceKind] = faultMedia[card.id] || ["no-unique", "trend"];
  const spectrumPath = path.join(faultDir, `${slug}-spectrum.svg`);
  const evidencePath = path.join(faultDir, `${slug}-evidence.svg`);
  fs.writeFileSync(spectrumPath, renderSpectrum(`${card.title}: возможная спектральная картина`, profileName), "utf8");
  fs.writeFileSync(evidencePath, renderEvidence(`${card.title}: подтверждающее представление`, evidenceKind, profileName), "utf8");
  card.mediaLayout = "atlas-fault";
  card.mediaSlots = [
    {
      type: "photo", orientation: "portrait", label: "Учебный вид узла",
      src: `images/vibration-atlas/faults/${slug}-photo.jpg`,
      alt: `${card.title}: учебная визуализация узла`,
      caption: "Учебная синтетическая иллюстрация внешнего вида узла; не является фотографией обследованной машины."
    },
    {
      type: "diagram", orientation: "portrait", label: "Схема механизма",
      src: `images/vibration-atlas/faults/${slug}-mechanism.jpg`,
      alt: `${card.title}: учебная схема физического механизма`,
      caption: "Учебная синтетическая схема возможного механизма; конструкция конкретной машины может отличаться."
    },
    {
      type: "spectrum", orientation: "landscape", label: "Возможная спектральная картина",
      src: `images/vibration-atlas/faults/${slug}-spectrum.svg`,
      alt: `${card.title}: качественный учебный спектр`,
      caption: "Качественный учебный пример: показанные линии являются возможными признаками, а не достаточным диагнозом."
    },
    {
      type: "gallery", orientation: "landscape", label: "Подтверждающее представление",
      src: `images/vibration-atlas/faults/${slug}-evidence.svg`,
      alt: `${card.title}: дополнительное диагностическое представление`,
      caption: "Пример дополнительной проверки. Реальный вывод требует сопоставимых измерений, режима и альтернативных гипотез."
    }
  ];
  if (faultWaveformIds.has(card.id)) {
    const waveformPath = path.join(faultDir, `${slug}-waveform.svg`);
    fs.writeFileSync(waveformPath, renderWaveform(`${card.title}: возможная временная форма`, profileName), "utf8");
    card.mediaSlots.push({
      type: "diagram", orientation: "landscape", label: "Возможная временная форма",
      src: `images/vibration-atlas/faults/${slug}-waveform.svg`,
      alt: `${card.title}: качественный учебный временной сигнал`,
      caption: "Качественная учебная временная форма. Её рассматривают вместе со спектром, режимом и независимыми проверками."
    });
  }
}

for (const card of spectrumCards) {
  const slug = card.id.replace("vibration-spectrum-", "");
  const profileName = spectrumMap[card.id] || "no-unique";
  fs.writeFileSync(path.join(spectrumDir, `${slug}-spectrum.svg`), renderSpectrum(card.title, profileName), "utf8");
  fs.writeFileSync(path.join(spectrumDir, `${slug}-diagram.svg`), renderWaveform(`${card.title}: связь со временем`, profileName), "utf8");
  card.mediaLayout = "atlas-spectrum";
  card.mediaSlots = [
    {
      type: "spectrum", orientation: "landscape", label: "Учебный спектр",
      src: `images/vibration-atlas/spectra/${slug}-spectrum.svg`,
      alt: `${card.title}: качественный учебный спектр`,
      caption: "Учебная качественная модель спектра. Частоты и амплитуды необходимо рассчитывать и измерять для конкретной машины."
    },
    {
      type: "diagram", orientation: "landscape", label: "Связь с временным сигналом",
      src: `images/vibration-atlas/spectra/${slug}-diagram.svg`,
      alt: `${card.title}: учебная временная форма`,
      caption: "Учебное пояснение связи спектральной картины с временным сигналом; не является записью реального прибора."
    }
  ];
}

const waveformArticle = items.find(item => item.id === "vibration-time-waveform");
if (!waveformArticle) throw new Error("Missing vibration-time-waveform");
waveformArticle.mediaLayout = "waveform-gallery";
waveformArticle.mediaSlots = waveformExamples.map(([slug, label, profileName, description]) => {
  fs.writeFileSync(path.join(waveformDir, `${slug}.svg`), renderWaveform(label, profileName), "utf8");
  return {
    type: "diagram", orientation: "landscape", label,
    src: `images/vibration-diagnostics/waveforms/${slug}.svg`,
    alt: `${label}: качественный учебный временной сигнал`,
    caption: `Учебный пример: ${description} Форма не является самостоятельным диагнозом.`
  };
});

const equipmentCards = items.filter(item => item.parentId === "vibration-equipment-diagnostics");
if (equipmentCards.length !== 11) throw new Error(`Unexpected equipment composition: ${equipmentCards.length}`);
for (const card of equipmentCards) {
  const guide = equipmentGuides[card.id];
  if (!guide) throw new Error(`Missing equipment guide: ${card.id}`);
  fs.writeFileSync(path.join(equipmentDir, `${guide.slug}.svg`), renderEquipmentGuide(card.title, guide), "utf8");
  card.mediaLayout = "equipment-diagnostic";
  card.mediaSlots = [{
    type: "spectrum", orientation: "landscape", label: "Карта ожидаемых составляющих",
    src: `images/vibration-diagnostics/equipment/${guide.slug}.svg`,
    alt: `${card.title}: учебная карта характерных частот и обязательного контекста`,
    caption: "Учебная карта выбора частот. Положение и высота линий условны; значения рассчитывают для конкретной машины и режима."
  }];
}

fs.writeFileSync(dataPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Vibration visuals: faults=${faultCards.length}, extra waveforms=${faultWaveformIds.size}, spectrum cards=${spectrumCards.length}, waveform examples=${waveformExamples.length}, equipment guides=${equipmentCards.length}.`);
