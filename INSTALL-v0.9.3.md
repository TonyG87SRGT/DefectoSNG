# Установка DefectoSNG v0.9.3

## Изменённые файлы

- `data/vik.json`
- `sw.js`
- `images/defects/unfilled-crater.webp`
- `CHANGELOG.md`
- `INSTALL-v0.9.3.md`
- `VERIFICATION-v0.9.3.txt`

## Обновление через SFTP

1. Распакуйте архив `DefectoSNG-v0.9.3-update.zip`.
2. Загрузите его содержимое в `/var/www/DefectoSNG`, сохраняя структуру папок.
3. При запросе подтвердите замену существующих файлов.
4. Новый файл изображения должен оказаться по адресу `/var/www/DefectoSNG/images/defects/unfilled-crater.webp`.

## Проверка на VPS

```bash
cd /var/www/DefectoSNG
grep "defectosng-v0.9.3" sw.js
ls -lh images/defects/unfilled-crater.webp
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
```

## Отправка в GitHub

```bash
cd /var/www/DefectoSNG
git status
git add data/vik.json sw.js images/defects/unfilled-crater.webp CHANGELOG.md INSTALL-v0.9.3.md VERIFICATION-v0.9.3.txt
git commit -m "Release v0.9.3: add unfilled crater article"
git push origin main
```

## Проверка PWA

1. Откройте установленное приложение при включённом интернете.
2. Дождитесь уведомления о новой версии.
3. Нажмите «Обновить».
4. Откройте статью «Незаваренный кратер».
5. Закройте приложение, отключите интернет и снова откройте статью.
6. Убедитесь, что текст и изображение доступны офлайн.
