# Установка DefectoSNG v0.9.5

## Обновление через SFTP

Перенесите из архива обновления в `/var/www/DefectoSNG` следующие файлы:

- `data/vik.json`
- `sw.js`
- `images/defects/overlap.webp`
- `CHANGELOG.md`
- `INSTALL-v0.9.5.md`
- `VERIFICATION-v0.9.5.txt`

Сохраняйте структуру каталогов.

## Проверка на VPS

```bash
cd /var/www/DefectoSNG
grep "defectosng-v0.9.5" sw.js
ls -lh images/defects/overlap.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
git status
```

## Отправка в GitHub

```bash
git add data/vik.json sw.js images/defects/overlap.webp CHANGELOG.md INSTALL-v0.9.5.md VERIFICATION-v0.9.5.txt
git commit -m "Release v0.9.5: add overlap article"
git push origin main
```

Перезапуск Nginx для статических файлов не требуется. При желании проверьте конфигурацию командой `sudo nginx -t`.

## Проверка PWA

Откройте установленное приложение, дождитесь уведомления о новой версии и нажмите «Обновить». Откройте статью «Наплыв», затем отключите интернет и повторно откройте статью и изображение.
