import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production Nginx blocks deployment files without affecting shared routes", async () => {
  const config = await read("ops/nginx/defectosng.conf");

  assert.match(config, /location ~ \/\\\./);
  assert.match(config, /docs\|e2e\|scripts\|tests\|node_modules/);
  assert.match(config, /log\|md\|bak\|backup\|tmp\|map/);
  assert.match(config, /package\(\?:-lock\)\?/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /gzip_types application\/json/);
  assert.match(config, /location \^~ \/family\//);
  assert.match(config, /location \^~ \/game\//);
});

test("scheduled backup is atomic, verified and only rotates its own snapshots", async () => {
  const [script, service, timer] = await Promise.all([
    read("ops/backup/backup-defectosng.sh"),
    read("ops/systemd/defectosng-backup.service"),
    read("ops/systemd/defectosng-backup.timer")
  ]);

  assert.match(script, /\.scheduled-\$\{timestamp\}\.tmp/);
  assert.match(script, /sha256sum -c SHA256SUMS/);
  assert.match(script, /gzip -t site\.tar\.gz nginx\.tar\.gz/);
  assert.match(script, /"\$\{backup_root\}"\/scheduled-\*/);
  assert.doesNotMatch(script, /full-\*/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(service, /ReadWritePaths=\/var\/backups\/defectosng/);
  assert.match(timer, /Persistent=true/);
  assert.match(timer, /OnCalendar=\*-\*-\* 03:17:00/);
});
