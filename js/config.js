export const METHODS = Object.freeze({
  vik: Object.freeze({ short: "ВИК", title: "Визуальный и измерительный контроль" }),
  uzk: Object.freeze({ short: "УЗК", title: "Ультразвуковой контроль" }),
  pvk: Object.freeze({ short: "ПВК", title: "Капиллярный контроль" }),
  rk: Object.freeze({ short: "РК", title: "Радиографический контроль" }),
  vibration: Object.freeze({ short: "ВД", title: "Вибродиагностика" })
});

export const DATA_FILES = Object.freeze({
  vik: "data/vik.json",
  uzk: "data/uzk.json",
  pvk: "data/pvk.json",
  rk: "data/rk.json",
  vibration: "data/vibration.json"
});

export const CRITERIA_DATA_FILE = "data/criteria.json";

export const ATLAS_COLLECTIONS = Object.freeze([
  Object.freeze({ method: "vik", rootId: "vik-defects", label: "Дефекты сварных соединений", description: "Внешние и внутренние несплошности, нарушения формы и геометрии шва." }),
  Object.freeze({ method: "rk", rootId: "rk-radiographic-atlas", label: "Радиографические индикации", description: "Рентгеновские снимки пор, включений, непроваров, трещин и нарушений формы." }),
  Object.freeze({ method: "pvk", rootId: "pvk-indications-atlas", label: "Индикации ПВК", description: "Истинные, нерелевантные и ложные индикации капиллярного контроля." }),
  Object.freeze({ method: "uzk", rootId: "uzk-echo-atlas", label: "Эхо-сигналы УЗК", description: "Характерные картины A‑скана и признаки, требующие уточнения." }),
  Object.freeze({ method: "vik", rootId: "vik-base-metal-defects", label: "Дефекты основного металла", description: "Коррозия, эксплуатационные трещины и признаки расслоения проката." }),
  Object.freeze({ method: "vik", rootId: "vik-fractography", label: "Фрактография", description: "Визуальные признаки вязкого, хрупкого, усталостного и коррозионного разрушения." }),
  Object.freeze({ method: "vibration", rootId: "vibration-fault-atlas", label: "Неисправности машин", description: "Визуальные модели механизмов повреждения, спектры и подтверждающие признаки." }),
  Object.freeze({ method: "vibration", rootId: "vibration-spectrum-atlas", label: "Спектры вибрации", description: "Типовые спектральные картины для первичного распознавания диагностических признаков." })
]);
