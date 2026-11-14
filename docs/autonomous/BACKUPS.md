# Backups

## 2026-11-14 — перед публикацией 0.58.6

- Snapshot: `/var/backups/defectosng/full-20261114-215557`
- Исходный production-коммит: `eef1631bbad4a9b9a636d63eb8fe2279e7672e78`, версия 0.58.5.
- Размер: 74 МБ.
- `SHA256SUMS`: PASS; тестовая распаковка: PASS.
- Snapshot расположен вне `/var/www/DefectoSNG`; откат не требовался на момент создания.

## full-20261114-184922

- Создан: 2026-11-14 18:49–18:51 UTC+03:00 (20:49–20:51 Asia/Yekaterinburg).
- VPS: `/var/backups/defectosng/full-20261114-184922`.
- Размер: 74 МБ.
- Версия до публикации: 0.58.4; commit `48ac6455c7f58a134a08c6c01a4b151c3991a661`; production working tree был чистым.
- Назначение: pre-deploy snapshot для версии 0.58.5.
- Проверки: SHA-256 всех файлов, `gzip -t`, чтение архивов и тестовая распаковка — PASS (`RESTORE_CHECK=passed`).
- Восстановление: следовать `RESTORE.md` внутри каталога snapshot; перед reload выполнить `nginx -t`.

## full-20261114-175837

- Создан: 2026-11-14 17:58–18:00 UTC+03:00 (19:58–20:00 Asia/Yekaterinburg).
- VPS: `/var/backups/defectosng/full-20261114-175837`.
- Размер: 74 МБ.
- Версия: 0.58.4; commit `c7fb1fc848a97436121807bcdb9ca5791dd2473b`; production working tree был чистым.
- Назначение: контрольная точка перед финальной синхронизацией журналов автономного цикла.
- Проверки: SHA-256 всех файлов, `gzip -t`, чтение архивов и тестовая распаковка — PASS (`RESTORE_CHECK=passed`).
- Восстановление: следовать `RESTORE.md` внутри каталога snapshot; перед reload выполнить `nginx -t`.

## full-20261114-174912

- Создан: 2026-11-14 17:49–17:50 UTC+03:00 (19:49–19:50 Asia/Yekaterinburg).
- VPS: `/var/backups/defectosng/full-20261114-174912`.
- Размер: 74 МБ.
- Версия до публикации: 0.58.4; commit `4a54e126df1ad1eb369a47e186f8c70b6ef32a71`; production working tree был чистым.
- Состав и права соответствуют предыдущему полному snapshot; backup находится вне web-root.
- Проверки: SHA-256 всех файлов, `gzip -t`, чтение архивов и тестовая распаковка с проверкой ключевых файлов — PASS (`RESTORE_CHECK=passed`).
- Восстановление: следовать `RESTORE.md` внутри каталога snapshot; перед reload выполнить `nginx -t`.

## full-20261114-162700

- Создан: 2026-11-14 16:27–16:29 UTC+03:00 (18:27–18:29 Asia/Yekaterinburg).
- VPS: `/var/backups/defectosng/full-20261114-162700`.
- Размер: 74 МБ.
- Состав: `site.tar.gz` с `/var/www/DefectoSNG` и `.git`; `nginx.tar.gz` с конфигурацией DefectoSNG; `METADATA.txt`; `RESTORE.md`; `SHA256SUMS`.
- Версия: 0.58.4; commit `4a54e126df1ad1eb369a47e186f8c70b6ef32a71`; ветка main; production working tree был чистым.
- Права: каталог 0700, файлы 0600; backup не находится в web-root.
- Проверки: `gzip -t`, чтение tar, SHA-256, тестовая распаковка, наличие ключевых файлов, совпадение Git-коммита и контрольных файлов — PASS.
- Закрытые ключи TLS намеренно не архивировались; записаны только метаданные сертификатов. Сертификаты управляются системным хранилищем/certbot.
- Восстановление: следовать `RESTORE.md` внутри каталога snapshot; перед reload выполнить `nginx -t`.
