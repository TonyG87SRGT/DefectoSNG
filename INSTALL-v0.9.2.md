# Установка DefectoSNG v0.9.2

## Вариант обновления через SFTP

Загрузите на VPS следующие файлы, сохраняя структуру каталогов:

- `data/vik.json` → `/var/www/DefectoSNG/data/vik.json`
- `sw.js` → `/var/www/DefectoSNG/sw.js`
- `images/defects/slag-inclusions.webp` → `/var/www/DefectoSNG/images/defects/slag-inclusions.webp`
- `CHANGELOG.md` → `/var/www/DefectoSNG/CHANGELOG.md`
- `INSTALL-v0.9.2.md` → `/var/www/DefectoSNG/INSTALL-v0.9.2.md`
- `VERIFICATION-v0.9.2.txt` → `/var/www/DefectoSNG/VERIFICATION-v0.9.2.txt`

После загрузки подключитесь к VPS и выполните:

```bash
cd /var/www/DefectoSNG

grep "defectosng-v0.9.2" sw.js
ls -lh images/defects/slag-inclusions.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
git status
```

Если проверки прошли успешно:

```bash
git add data/vik.json sw.js images/defects/slag-inclusions.webp CHANGELOG.md INSTALL-v0.9.2.md VERIFICATION-v0.9.2.txt
git commit -m "Release v0.9.2: add slag inclusions article"
git push origin main
```

Для статического сайта перезапуск Nginx не обязателен. При желании проверьте конфигурацию:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Проверка установленного PWA

1. Откройте установленное приложение DefectoSNG при включённом интернете.
2. Дождитесь уведомления о новой версии.
3. Нажмите кнопку «Обновить».
4. После перезагрузки откройте раздел дефектов и статью «Шлаковые включения».
5. Убедитесь, что иллюстрация открывается в полноэкранном режиме.
6. Закройте приложение, отключите интернет и откройте статью повторно.
7. Текст и изображение должны оставаться доступными офлайн.
