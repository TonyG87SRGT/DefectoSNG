import test from "node:test";
import assert from "node:assert/strict";
import vibrationItems from "../data/vibration.json" with { type: "json" };
import { APP_VERSION, ESSENTIAL_APP_PATHS } from "../js/pwaConfig.js";
import { JOURNAL_DB_NAME, JOURNAL_DB_VERSION, JOURNAL_SCHEMA } from "../js/vibrationJournalDb.js";
import { compareMeasurements, createBackup, describeTrend, groupComparableMeasurements, measurementsToCsv, normalizeMeasurement, parseMeasurementsCsv, routeProgress, trendStatistics, validateBackup } from "../js/vibrationJournalCore.js";

const series = Array.from({ length: 5 }, (_, index) => normalizeMeasurement({ id: `m${index}`, pointId: "p1", measuredAt: `2026-0${index + 1}-01T00:00:00.000Z`, parameter: "Виброскорость", value: String(index + 1), unit: index === 0 ? "m/s" : "mm/s", amplitudeType: "RMS", frequencyRange: "10–1000 Гц" }));

test("существующий ID журнала активирован без смены маршрута", () => {
  const item = vibrationItems.find(value => value.id === "vibration-tool-trend-log");
  assert.equal(item.title, "Журнал виброизмерений");
  assert.equal(item.status, "published");
  assert.equal(item.toolConfig.kind, "measurement-journal");
});

test("IndexedDB v1 содержит все хранилища и требуемые индексы", () => {
  assert.equal(JOURNAL_DB_NAME, "DefectoSNGVibrationJournal"); assert.equal(JOURNAL_DB_VERSION, 1);
  ["objects", "units", "nodes", "points", "measurements", "spectralComponents", "events", "limits", "routes", "settings"].forEach(name => assert.ok(name in JOURNAL_SCHEMA));
  assert.ok(JOURNAL_SCHEMA.measurements.some(([name]) => name === "pointId"));
  assert.ok(JOURNAL_SCHEMA.measurements.some(([name]) => name === "measuredAt"));
  assert.ok(JOURNAL_SCHEMA.events.some(([name]) => name === "eventType"));
});

test("совместимые единицы нормализуются, RMS и Peak разделяются", () => {
  assert.equal(series[0].normalizedValue, 1);
  assert.equal(series[1].normalizedValue, 0.002);
  const groups = groupComparableMeasurements([...series, { ...series[1], id: "peak", amplitudeType: "Peak" }]);
  assert.equal(groups.length, 2);
  assert.throws(() => compareMeasurements([series[0], { ...series[1], amplitudeType: "Peak" }]), /несопоставимые/);
});
test("русские обозначения единиц сохраняются и нормализуются", () => {
  const item = normalizeMeasurement({ pointId: "p", parameter: "Виброскорость", value: "4,2", unit: "мм/с", amplitudeType: "RMS" });
  assert.equal(item.unit, "мм/с"); assert.ok(Math.abs(item.normalizedValue - 0.0042) < 1e-12); assert.equal(item.normalizedUnit, "m/s");
});

test("серия измерений даёт минимум, максимум и изменение", () => {
  const stats = trendStatistics(series);
  assert.equal(stats.count, 5); assert.equal(stats.minimum, 0.002); assert.equal(stats.maximum, 1); assert.equal(stats.first, 1); assert.equal(stats.last, 0.005); assert.equal(stats.absoluteChange, -0.995);
});

test("событие между измерениями отмечается в анализе", () => {
  const stats = trendStatistics(series); const trend = describeTrend(stats, series, [{ occurredAt: "2026-03-15T00:00:00.000Z", title: "Замена подшипника" }]);
  assert.equal(trend.eventBetween, true);
});

test("маршрут 7 из 10 восстанавливает прогресс", () => {
  const route = { pointIds: Array.from({ length: 10 }, (_, index) => `p${index}`), entries: Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`p${index}`, { value: String(index + 1) }])) };
  assert.deepEqual(routeProgress(route), { total: 10, completed: 7, skipped: 3, percent: 70 });
});

test("JSON резервная копия проверяется и отклоняет неизвестную версию", () => {
  const empty = Object.fromEntries(Object.keys(JOURNAL_SCHEMA).map(name => [name, []])); const backup = createBackup(empty, "0.20.0");
  assert.equal(validateBackup(backup).measurements, 0);
  assert.throws(() => validateBackup({ ...backup, formatVersion: 99 }), /не поддерживается/);
  assert.throws(() => validateBackup({ damaged: true }), /не является/);
});

test("CSV корректно экранирует кавычки, разделители и переносы", () => {
  const csv = measurementsToCsv([{ objectName: "Цех; 1", unitName: 'Насос "А"', note: "строка 1\nстрока 2" }], ";");
  assert.match(csv, /"Цех; 1"/); assert.match(csv, /"Насос ""А"""/); assert.match(csv, /"строка 1\nстрока 2"/);
});
test("CSV импорт проверяет обязательные столбцы и десятичную запятую", () => {
  const rows = parseMeasurementsCsv("Точка;Дата;Параметр;Исходное значение;Исходная единица\r\nДП-Г;2026-01-01;Виброскорость;4,2;mm/s", ";");
  assert.equal(rows[0]["Точка"], "ДП-Г"); assert.ok(Math.abs(normalizeMeasurement({ pointId: "p", parameter: rows[0]["Параметр"], value: rows[0]["Исходное значение"], unit: rows[0]["Исходная единица"] }).normalizedValue - 0.0042) < 1e-12);
  assert.throws(() => parseMeasurementsCsv("Точка;Дата\nДП-Г;2026-01-01"), /обязательные столбцы/);
});

test("20 000 измерений группируются и анализируются без зависания", () => {
  const large = Array.from({ length: 20000 }, (_, index) => ({ pointId: `p${index % 500}`, measuredAt: new Date(1700000000000 + index * 60000).toISOString(), parameter: "Виброскорость", parameterFamily: "velocity", value: index % 10, normalizedValue: (index % 10) / 1000, unit: "mm/s", normalizedUnit: "m/s", amplitudeType: "RMS", frequencyRange: "10–1000 Гц" }));
  const started = Date.now(); const groups = groupComparableMeasurements(large); groups.forEach(group => trendStatistics(group.items));
  assert.equal(groups.length, 500); assert.ok(Date.now() - started < 2500);
});

test("PWA 0.20.0 кэширует журнал и не кэширует пользовательские записи", () => {
  assert.equal(APP_VERSION, "0.20.0");
  ["css/vibration-journal.css", "js/vibrationJournalCore.js", "js/vibrationJournalDb.js", "js/vibrationJournalChart.js", "js/vibrationJournal.js"].forEach(path => assert.ok(ESSENTIAL_APP_PATHS.includes(path), path));
  assert.ok(!ESSENTIAL_APP_PATHS.some(path => path.includes("DefectoSNGVibrationJournal")));
});
