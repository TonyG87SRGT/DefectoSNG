# Установка DefectoSNG v0.9.6

## Обновление через SFTP

Перенесите из архива обновления в `/var/www/DefectoSNG` следующие файлы:

- `data/vik.json`
- `sw.js`
- `images/defects/edge-misalignment.webp`
- `CHANGELOG.md`
- `INSTALL-v0.9.6.md`
- `VERIFICATION-v0.9.6.txt`

Сохраняйте структуру каталогов.

## Проверка на VPS

```bash
cd /var/www/DefectoSNG
grep "defectosng-v0.9.6" sw.js
ls -lh images/defects/edge-misalignment.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
git status
```

## Отправка в GitHub

```bash
git add data/vik.json sw.js images/defects/edge-misalignment.webp CHANGELOG.md INSTALL-v0.9.6.md VERIFICATION-v0.9.6.txt
git commit -m "Release v0.9.6: add edge misalignment article"
git push origin main
```

Перезапуск Nginx для статических файлов не требуется. При желании проверьте конфигурацию командой `sudo nginx -t`.

## Проверка PWA

Откройте установленное приложение, дождитесь уведомления о новой версии и нажмите «Обновить». Откройте статью «Смещение кромок», затем отключите интернет и повторно откройте статью и изображение.
