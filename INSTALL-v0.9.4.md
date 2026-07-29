# Установка DefectoSNG v0.9.4

## Обновление через SFTP

Скопируйте из архива обновления в `/var/www/DefectoSNG` с заменой:

- `data/vik.json`
- `sw.js`
- `images/defects/burn-through.webp`
- `CHANGELOG.md`
- `INSTALL-v0.9.4.md`
- `VERIFICATION-v0.9.4.txt`

## Проверка на VPS

```bash
cd /var/www/DefectoSNG
grep "defectosng-v0.9.4" sw.js
ls -lh images/defects/burn-through.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
git status
```

## Отправка в GitHub

```bash
git add data/vik.json sw.js images/defects/burn-through.webp CHANGELOG.md INSTALL-v0.9.4.md VERIFICATION-v0.9.4.txt
git commit -m "Release v0.9.4: add burn-through article"
git push origin main
```

## Проверка PWA

Откройте установленное приложение, дождитесь уведомления о новой версии, нажмите «Обновить», затем откройте статью «Прожог». После первой загрузки включите авиарежим и повторно откройте статью и изображение.
