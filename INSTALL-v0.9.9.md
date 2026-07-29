# Установка DefectoSNG v0.9.9

## Обновление через SFTP

Перенесите на VPS из архива обновления следующие файлы с сохранением структуры каталогов:

- `data/vik.json`
- `sw.js`
- `images/defects/metal-spatter.webp`
- `CHANGELOG.md`
- `INSTALL-v0.9.9.md`
- `VERIFICATION-v0.9.9.txt`

Путь проекта на сервере: `/var/www/DefectoSNG`.

## Проверка на VPS

```bash
cd /var/www/DefectoSNG
grep "defectosng-v0.9.9" sw.js
ls -lh images/defects/metal-spatter.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
```

## Отправка изменений в GitHub

```bash
cd /var/www/DefectoSNG
git status
git add data/vik.json sw.js images/defects/metal-spatter.webp CHANGELOG.md INSTALL-v0.9.9.md VERIFICATION-v0.9.9.txt
git commit -m "Release v0.9.9: add metal spatter article"
git push origin main
```

## Проверка PWA

1. Откройте установленное приложение при наличии интернета.
2. Дождитесь уведомления о новой версии.
3. Нажмите «Обновить».
4. Откройте статью «Брызги металла».
5. Закройте приложение, отключите интернет и снова откройте статью.
6. Убедитесь, что текст и изображение доступны офлайн.
