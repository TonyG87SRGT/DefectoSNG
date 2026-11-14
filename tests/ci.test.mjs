import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CI устанавливает зафиксированные зависимости через npm ci", async () => {
  const [packageJson, lock, workflow] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../.github/workflows/check.yml", import.meta.url), "utf8")
  ]);

  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages[""].version, packageJson.version);
  assert.deepEqual(lock.packages[""].devDependencies, packageJson.devDependencies);
  assert.equal(lock.packages["node_modules/@playwright/test"].version, packageJson.devDependencies["@playwright/test"]);
  assert.equal((workflow.match(/run: npm ci/g) || []).length, 2);
  assert.doesNotMatch(workflow, /run: npm install(?:\s|$)/);
});
