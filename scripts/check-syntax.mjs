import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectScripts(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectScripts(absolutePath);
    return /\.(?:js|mjs)$/.test(entry.name) ? [absolutePath] : [];
  });
}

const scripts = [
  ...collectScripts(path.join(rootDir, "js")),
  ...collectScripts(path.join(rootDir, "scripts")),
  ...collectScripts(path.join(rootDir, "tests")),
  path.join(rootDir, "sw.js")
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, ["--check", script], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`Синтаксис проверен: ${scripts.length} файлов.`);
}
