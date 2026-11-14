# Backups

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
