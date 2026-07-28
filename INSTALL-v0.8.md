# Установка DefectoSNG v0.8.0

## Что добавлено
- Статья «Трещины» в разделе ВИК → Типовые дефекты.
- Оптимизированная WebP-иллюстрация с двумя фотографиями и двумя схемами.
- Обновлён офлайн-кэш PWA до `defectosng-v0.8.0`.

## Установка обновления на VPS
Распакуйте архив обновления в корень сайта с заменой файлов:

```bash
cd /var/www/DefectoSNG
unzip -o DefectoSNG-v0.8.0-update-only.zip

git add data/vik.json images/defects/cracks.webp sw.js CHANGELOG.md INSTALL-v0.8.md VERIFICATION-v0.8.txt
git commit -m "v0.8.0: add cracks article"
git push origin main
```

Если изменения уже загружены в GitHub:

```bash
cd /var/www/DefectoSNG
git pull --ff-only origin main
```

## Проверка PWA
Не удаляйте установленную предыдущую версию. Закройте и снова откройте приложение. После обнаружения новой версии нажмите «Обновить», затем откройте ВИК → Типовые дефекты → Трещины.
