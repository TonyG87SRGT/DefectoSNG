# Production operations

## Public files

The active Nginx configuration is stored in `ops/nginx/defectosng.conf`.
It blocks Git metadata, logs, tests, internal documentation and other
deployment-only files even though production currently uses a Git checkout.

After every Nginx change, run `nginx -t`, reload Nginx and verify DefectoSNG,
`/family/` and `/game/`. Requests to `/.git/config`,
`/.github/workflows/check.yml`, `/debug.log` and `/package-lock.json` must return
404.

## Scheduled backups

`ops/backup/backup-defectosng.sh` creates an atomic, checksummed archive in
`/var/backups/defectosng`. The systemd timer runs daily and retains the seven
newest `scheduled-*` snapshots; manual `full-*` snapshots are never removed.

Install the checked-in files as root:

```bash
install -m 0750 ops/backup/backup-defectosng.sh /usr/local/sbin/backup-defectosng
install -m 0644 ops/systemd/defectosng-backup.service /etc/systemd/system/
install -m 0644 ops/systemd/defectosng-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now defectosng-backup.timer
systemctl start defectosng-backup.service
```

Check the timer, journal and latest checksum with `systemctl status`,
`journalctl -u defectosng-backup.service` and `sha256sum -c SHA256SUMS`.

Snapshots on the same VPS protect against a bad deployment but not a VPS or disk
loss. A separate encrypted offsite destination must be configured independently.
