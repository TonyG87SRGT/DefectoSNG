import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import test from "node:test";

function request(port, path) {
  return new Promise((resolve, reject) => {
    const call = http.get({ host: "127.0.0.1", port, path }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    call.on("error", reject);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/serve-static.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("exit", (code) => reject(new Error(`Сервер завершился с кодом ${code}: ${stderr}`)));
    child.stdout.setEncoding("utf8");
    child.stdout.once("data", (line) => {
      const match = line.match(/127\.0\.0\.1:(\d+)/);
      if (!match) {
        child.kill();
        reject(new Error(`Не удалось определить порт сервера: ${line}`));
        return;
      }
      resolve({ child, port: Number(match[1]) });
    });
  });
}

test("повреждённый URL получает 400 и не останавливает тестовый сервер", async (t) => {
  const { child, port } = await startServer();
  t.after(() => child.kill());

  assert.equal(await request(port, "/%E0%A4%A"), 400);
  assert.equal(await request(port, "/"), 200);
});
