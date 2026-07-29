# Установка DefectoSNG v0.9.10

## Обновление через SFTP

Перенесите из архива обновления в `/var/www/DefectoSNG` следующие файлы:

- `data/vik.json`
- `sw.js`
- `images/defects/fistula.webp`
- `CHANGELOG.md`
- `INSTALL-v0.9.10.md`
- `VERIFICATION-v0.9.10.txt`

Сохраняйте структуру каталогов.

## Проверка на VPS

```bash
cd /var/www/DefectoSNG
grep "defectosng-v0.9.10" sw.js
ls -lh images/defects/fistula.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
```

## Отправка в GitHub

```bash
cd /var/www/DefectoSNG
git status
git add data/vik.json sw.js images/defects/fistula.webp CHANGELOG.md INSTALL-v0.9.10.md VERIFICATION-v0.9.10.txt
git commit -m "Release v0.9.10: add fistula article"
git push origin main
```

## Проверка PWA

Откройте установленное приложение, дождитесь уведомления о новой версии и нажмите «Обновить». Затем откройте статью «Свищ», увеличьте изображение и повторно откройте статью при отключённом интернете.
