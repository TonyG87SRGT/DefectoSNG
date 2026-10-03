import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { APP_VERSION } from "../js/pwaConfig.js";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("обновление PWA обходит HTTP-кэш и активирует новую оболочку", () => {
  const registration = read("js/pwa.js");
  const worker = read("sw.js");

  assert.match(registration, /updateViaCache:\s*"none"/);
  assert.ok(worker.includes(`WORKER_REVISION = "${APP_VERSION}"`));
  assert.match(worker, /precacheApp\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/);
});
