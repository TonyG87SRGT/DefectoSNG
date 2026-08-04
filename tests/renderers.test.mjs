import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTION_RENDERERS,
  SUPPORTED_SECTION_TYPES,
  renderSection
} from "../js/renderers.js";
import { SECTION_TYPES } from "../js/schema.js";

test("таблица и список рендереров не расходятся", () => {
  assert.deepEqual(SUPPORTED_SECTION_TYPES, Object.keys(SECTION_RENDERERS));
  assert.deepEqual([...SUPPORTED_SECTION_TYPES].sort(), [...SECTION_TYPES].sort());
  assert.ok(SUPPORTED_SECTION_TYPES.includes("note"));
  assert.ok(SUPPORTED_SECTION_TYPES.includes("comparison"));
  assert.ok(SUPPORTED_SECTION_TYPES.includes("methods"));
});

test("связанная статья получает актуальное название из хранилища", () => {
  const html = renderSection({
    type: "related",
    title: "См. также",
    items: [{ method: "pvk", id: "pvk-1", title: "Старое название" }]
  }, 0, {
    resolveRelated: () => ({ title: "Подготовка поверхности" })
  });

  assert.match(html, /Подготовка поверхности/);
  assert.doesNotMatch(html, /Старое название/);
});

test("текст из данных экранируется", () => {
  const html = renderSection({
    type: "note",
    title: "<script>alert(1)</script>",
    content: "<img src=x onerror=alert(1)>"
  });

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;script&gt;/);
});

test("известный тип секции рендерится", () => {
  const html = renderSection({
    type: "note",
    title: "Важно",
    content: "Текст примечания"
  });

  assert.match(html, /article-note/);
  assert.match(html, /Текст примечания/);
});

test("неизвестный тип секции показывает заметную ошибку", () => {
  const originalError = console.error;
  console.error = () => {};

  try {
    const html = renderSection({ type: "mystery" }, 2);
    assert.match(html, /article-render-error/);
    assert.match(html, /role="alert"/);
    assert.match(html, /mystery/);
    assert.match(html, /позиция 3/);
  } finally {
    console.error = originalError;
  }
});
