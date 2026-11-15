import test from "node:test";
import assert from "node:assert/strict";
import { copyArticleShareUrl, getArticleShareUrl } from "../js/articleShare.js";

test("постоянная ссылка статьи сохраняет origin и заменяет текущий hash", () => {
  assert.equal(
    getArticleShareUrl("#article=uzk:uzk-physical-principles", "https://defecto-sng.ru/#search"),
    "https://defecto-sng.ru/#article=uzk:uzk-physical-principles"
  );
});

test("ссылка копируется через Clipboard API", async () => {
  let copied = "";
  const mode = await copyArticleShareUrl("https://defecto-sng.ru/#article=vik:vik-basics", {
    navigatorRef: { clipboard: { writeText: async text => { copied = text; } } },
    documentRef: null
  });
  assert.equal(mode, "clipboard");
  assert.equal(copied, "https://defecto-sng.ru/#article=vik:vik-basics");
});

test("при ошибке Clipboard API используется локальный fallback", async () => {
  let field;
  const documentRef = {
    body: { append(node) { field = node; } },
    createElement() {
      return {
        style: {},
        setAttribute() {},
        select() {},
        remove() { field = null; }
      };
    },
    execCommand(command) {
      assert.equal(command, "copy");
      assert.equal(field.value, "точная ссылка");
      return true;
    }
  };
  const mode = await copyArticleShareUrl("точная ссылка", {
    navigatorRef: { clipboard: { writeText: async () => { throw new Error("denied"); } } },
    documentRef
  });
  assert.equal(mode, "selection");
  assert.equal(field, null);
});
