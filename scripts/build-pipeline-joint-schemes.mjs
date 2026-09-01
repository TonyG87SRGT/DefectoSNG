import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "images", "pipeline-welded-joints");

const metal = (d) => `<path d="${d}" class="metal"/>`;
const weld = (d) => `<path d="${d}" class="weld"/>`;
const line = (x1, y1, x2, y2, cls = "guide") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const label = (x, y, value, anchor = "middle") =>
  `<text x="${x}" y="${y}" class="label" text-anchor="${anchor}">${value}</text>`;

function dimensions(items = []) {
  return items.map(({ x1, y1, x2, y2, text, tx, ty }) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="dimension" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    ${label(tx ?? (x1 + x2) / 2, ty ?? (y1 + y2) / 2 - 8, text)}
  `).join("");
}

function svg({ designation, table, kind, body, note }) {
  const kindTitle = kind === "edge" ? "Подготовленные кромки" : "Сечение сварного шва";
  const title = `${designation}: ${kindTitle.toLowerCase()}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">Собственная техническая схема DefectoSNG по геометрии ГОСТ 16037-80, таблица ${table}. Размеры показаны условными обозначениями; изображение не в масштабе.</desc>
  <defs>
    <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="12" height="12" fill="#dbe5f2"/>
      <line x1="0" y1="0" x2="0" y2="12" stroke="#7890aa" stroke-width="3"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/>
    </marker>
  </defs>
  <style>
    .metal{fill:url(#hatch);stroke:#172033;stroke-width:4;stroke-linejoin:round}
    .weld{fill:#f6b94c;stroke:#7c4700;stroke-width:4;stroke-linejoin:round}
    .backing{fill:#a8b7c9;stroke:#172033;stroke-width:4}
    .guide{stroke:#64748b;stroke-width:2;stroke-dasharray:7 6;fill:none}
    .dimension{stroke:#334155;stroke-width:2;fill:none}
    .label{font:600 20px Arial,sans-serif;fill:#243247}
    .heading{font:700 25px Arial,sans-serif;fill:#0f172a}
    .sub{font:17px Arial,sans-serif;fill:#526174}
  </style>
  <rect width="640" height="360" rx="18" fill="#ffffff"/>
  <text x="32" y="42" class="heading">${designation} · ${kindTitle}</text>
  <text x="608" y="42" class="sub" text-anchor="end">ГОСТ 16037-80 · табл. ${table}</text>
  <g>${body}</g>
  <text x="320" y="337" class="sub" text-anchor="middle">${note || "Условная схема; фактические размеры выбирают по строке таблицы ГОСТ."}</text>
</svg>`;
}

const butt = {
  c2: {
    designation: "С2", table: 1,
    edge: `${metal("M70 140H294V242H70Z")}${metal("M346 140H570V242H346Z")}${dimensions([{x1:294,y1:110,x2:346,y2:110,text:"b"},{x1:50,y1:140,x2:50,y2:242,text:"s",tx:35,ty:198}])}`,
    weld: `${metal("M70 150H292V245H70Z")}${metal("M348 150H570V245H348Z")}${weld("M287 146Q320 118 353 146L349 245Q320 258 291 245Z")}${dimensions([{x1:286,y1:112,x2:354,y2:112,text:"e"},{x1:375,y1:150,x2:375,y2:123,text:"g",tx:392,ty:140}])}`
  },
  c17: {
    designation: "С17", table: 7,
    edge: `${metal("M70 140H268L303 238H70Z")}${metal("M372 140H570V238H337Z")}${line(320,112,320,255)}${dimensions([{x1:303,y1:258,x2:337,y2:258,text:"b"},{x1:270,y1:105,x2:320,y2:135,text:"30°",tx:270,ty:90}])}`,
    weld: `${metal("M70 150H270L303 240H70Z")}${metal("M370 150H570V240H337Z")}${weld("M266 151Q320 116 374 151L339 241Q320 255 301 241Z")}${dimensions([{x1:263,y1:108,x2:377,y2:108,text:"e"},{x1:400,y1:150,x2:400,y2:119,text:"g",tx:416,ty:138}])}`
  },
  c18: {
    designation: "С18", table: 8,
    edge: `${metal("M70 140H268L303 238H70Z")}${metal("M372 140H570V238H337Z")}<rect x="274" y="238" width="92" height="18" rx="3" class="backing"/>${dimensions([{x1:303,y1:270,x2:337,y2:270,text:"b"},{x1:270,y1:105,x2:320,y2:135,text:"30°",tx:270,ty:90}])}`,
    weld: `${metal("M70 150H270L303 240H70Z")}${metal("M370 150H570V240H337Z")}<rect x="274" y="240" width="92" height="18" rx="3" class="backing"/>${weld("M266 151Q320 116 374 151L339 241Q320 253 301 241Z")}${dimensions([{x1:263,y1:108,x2:377,y2:108,text:"e"},{x1:400,y1:150,x2:400,y2:119,text:"g",tx:416,ty:138}])}`
  },
  c19: {
    designation: "С19", table: 9,
    edge: `${metal("M70 140H268L303 238H70Z")}${metal("M372 140H570V238H337Z")}<path d="M270 239Q320 222 370 239V259Q320 244 270 259Z" class="backing"/>${dimensions([{x1:303,y1:274,x2:337,y2:274,text:"b"},{x1:270,y1:105,x2:320,y2:135,text:"30°",tx:270,ty:90}])}`,
    weld: `${metal("M70 150H270L303 240H70Z")}${metal("M370 150H570V240H337Z")}<path d="M270 240Q320 223 370 240V260Q320 245 270 260Z" class="backing"/>${weld("M266 151Q320 116 374 151L339 241Q320 253 301 241Z")}${dimensions([{x1:263,y1:108,x2:377,y2:108,text:"e"},{x1:400,y1:150,x2:400,y2:119,text:"g",tx:416,ty:138}])}`
  },
  c46: {
    designation: "С46", table: 10,
    edge: `${metal("M70 140H274L304 238H70Z")}${metal("M366 140H570V238H336Z")}${weld("M302 229Q320 211 338 229Q320 247 302 229Z")}${dimensions([{x1:280,y1:105,x2:320,y2:137,text:"30°",tx:270,ty:91}])}`,
    weld: `${metal("M70 150H274L304 240H70Z")}${metal("M366 150H570V240H336Z")}${weld("M270 151Q320 118 370 151L338 241Q320 257 302 241Z")}${dimensions([{x1:267,y1:108,x2:373,y2:108,text:"e"},{x1:397,y1:150,x2:397,y2:119,text:"g",tx:413,ty:138}])}`
  },
  c54: {
    designation: "С54", table: 18,
    edge: `${metal("M62 174L271 133L302 231L82 274Z")}${metal("M369 133L578 174L558 274L338 231Z")}${line(320,105,320,274)}${dimensions([{x1:300,y1:252,x2:340,y2:252,text:"b"},{x1:270,y1:97,x2:320,y2:132,text:"30°",tx:266,ty:83}])}`,
    weld: `${metal("M62 184L271 143L302 234L82 277Z")}${metal("M369 143L578 184L558 277L338 234Z")}${weld("M266 144Q320 106 374 144L340 236Q320 254 300 236Z")}${weld("M300 236Q320 267 340 236Q320 285 300 236Z")}${dimensions([{x1:260,y1:100,x2:380,y2:100,text:"e"},{x1:400,y1:150,x2:405,y2:119,text:"g",tx:420,ty:136}])}`
  },
  c56: {
    designation: "С56", table: 20,
    edge: `${metal("M70 140H275L304 238H70Z")}${metal("M570 140H374L337 238H570Z")}${line(320,105,320,270)}${dimensions([{x1:302,y1:260,x2:339,y2:260,text:"b"},{x1:270,y1:106,x2:320,y2:138,text:"30°",tx:265,ty:91},{x1:370,y1:250,x2:418,y2:220,text:"50°",tx:430,ty:241}])}`,
    weld: `${metal("M70 150H275L304 240H70Z")}${metal("M570 150H374L337 240H570Z")}${weld("M270 151Q320 118 377 151L340 241Q320 260 301 241Z")}${weld("M302 241Q320 273 340 241Q320 290 302 241Z")}${dimensions([{x1:266,y1:108,x2:380,y2:108,text:"e"},{x1:402,y1:150,x2:402,y2:119,text:"g",tx:418,ty:138}])}`
  }
};

const special = {
  n4: {
    designation: "Н4", table: 23,
    edge: `${metal("M60 190H580V250H60Z")}${metal("M210 135H430V190H210Z")}${line(320,118,320,272)}${dimensions([{x1:210,y1:105,x2:430,y2:105,text:"l"},{x1:458,y1:135,x2:458,y2:190,text:"s",tx:478,ty:168}])}`,
    weld: `${metal("M60 195H580V255H60Z")}${metal("M210 135H430V195H210Z")}${weld("M190 195Q210 157 236 195Z")}${weld("M404 195Q430 157 450 195Z")}${dimensions([{x1:177,y1:195,x2:177,y2:160,text:"K",tx:158,ty:181},{x1:463,y1:195,x2:463,y2:160,text:"K",tx:482,ty:181}])}`,
    note: "Нахлесточное соединение труб с муфтой; катет K выбирают по таблице 23."
  },
  u17: {
    designation: "У17", table: 29,
    edge: `${metal("M267 80H337V201H267Z")}${metal("M70 204Q320 158 570 204V282Q320 236 70 282Z")}${dimensions([{x1:338,y1:177,x2:338,y2:205,text:"b",tx:355,ty:196},{x1:248,y1:80,x2:248,y2:201,text:"s₁",tx:226,ty:146}])}`,
    weld: `${metal("M267 80H337V201H267Z")}${metal("M70 204Q320 158 570 204V282Q320 236 70 282Z")}${weld("M267 201Q235 214 267 239Z")}${weld("M337 201Q369 214 337 239Z")}${dimensions([{x1:235,y1:201,x2:235,y2:234,text:"K",tx:217,ty:222},{x1:369,y1:201,x2:369,y2:234,text:"K",tx:387,ty:222}])}`,
    note: "Ответвление Dₒ/Dₙ ≤ 0,5; показано характерное сечение А-А."
  },
  u18: {
    designation: "У18", table: 30,
    edge: `${metal("M267 72H337V204H267Z")}${metal("M82 207Q320 117 558 207V287Q320 197 82 287Z")}${dimensions([{x1:338,y1:177,x2:338,y2:205,text:"b",tx:355,ty:196},{x1:248,y1:72,x2:248,y2:204,text:"s₁",tx:226,ty:142}])}`,
    weld: `${metal("M267 72H337V204H267Z")}${metal("M82 207Q320 117 558 207V287Q320 197 82 287Z")}${weld("M267 204Q235 215 267 242Z")}${weld("M337 204Q374 207 337 249Z")}${dimensions([{x1:235,y1:204,x2:235,y2:239,text:"K",tx:217,ty:225},{x1:375,y1:204,x2:375,y2:241,text:"K",tx:394,ty:226}])}`,
    note: "Ответвление Dₒ/Dₙ > 0,5; показано характерное сечение А-А."
  },
  u19: {
    designation: "У19", table: 31,
    edge: `${metal("M248 70H338V198L284 252H248Z")}${metal("M72 205Q320 148 568 205V282Q320 225 72 282Z")}${line(284,252,380,188)}${dimensions([{x1:310,y1:245,x2:365,y2:206,text:"50°",tx:375,ty:241},{x1:227,y1:70,x2:227,y2:198,text:"s₁",tx:207,ty:141}])}`,
    weld: `${metal("M248 70H338V198L284 252H248Z")}${metal("M72 205Q320 148 568 205V282Q320 225 72 282Z")}${weld("M284 252Q342 173 386 196Q351 227 337 259Z")}${dimensions([{x1:354,y1:175,x2:398,y2:218,text:"e",tx:397,ty:180},{x1:405,y1:205,x2:405,y2:170,text:"g",tx:423,ty:191}])}`
  },
  u20: {
    designation: "У20", table: 32,
    edge: `${metal("M247 66H338V186L292 230L292 260H247Z")}${metal("M70 205H283V282H70Z")}${metal("M353 205H570V282H353Z")}${line(320,194,320,285)}${dimensions([{x1:292,y1:177,x2:353,y2:177,text:"b"},{x1:308,y1:235,x2:344,y2:209,text:"50°",tx:351,ty:242}])}`,
    weld: `${metal("M247 66H338V186L292 230L292 260H247Z")}${metal("M70 205H283V282H70Z")}${metal("M353 205H570V282H353Z")}${weld("M292 230Q340 170 382 205L353 258Q322 275 292 258Z")}${dimensions([{x1:383,y1:205,x2:383,y2:168,text:"g",tx:401,ty:189},{x1:353,y1:174,x2:403,y2:217,text:"e",tx:406,ty:173}])}`
  },
  u21: {
    designation: "У21", table: 33,
    edge: `${metal("M247 66H338V199H290V251H247Z")}${metal("M70 205H290V282H70Z")}${metal("M352 205H570V282H352Z")}${line(320,190,320,284)}${dimensions([{x1:290,y1:178,x2:352,y2:178,text:"b"},{x1:309,y1:233,x2:355,y2:205,text:"50°",tx:365,ty:242}])}`,
    weld: `${metal("M247 66H338V199H290V251H247Z")}${metal("M70 205H290V282H70Z")}${metal("M352 205H570V282H352Z")}${weld("M290 251Q337 177 382 205L352 258Q320 275 290 258Z")}${dimensions([{x1:383,y1:205,x2:383,y2:168,text:"g",tx:401,ty:189},{x1:352,y1:174,x2:402,y2:217,text:"e",tx:405,ty:173}])}`
  }
};

const schemes = { ...butt, ...special };
fs.mkdirSync(outputDir, { recursive: true });

for (const [slug, item] of Object.entries(schemes)) {
  for (const kind of ["edge", "weld"]) {
    const content = svg({
      designation: item.designation,
      table: item.table,
      kind,
      body: item[kind],
      note: item.note
    });
    fs.writeFileSync(path.join(outputDir, `${slug}-${kind}.svg`), `${content}\n`, "utf8");
  }
}

console.log(`Created ${Object.keys(schemes).length * 2} pipeline joint SVG schemes in ${outputDir}`);
