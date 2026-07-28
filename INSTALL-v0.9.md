# Установка DefectoSNG v0.9.0

## Обновление изменёнными файлами

Скопируйте содержимое архива обновления в корень проекта `/var/www/DefectoSNG` с сохранением структуры каталогов.

Затем выполните:

```bash
cd /var/www/DefectoSNG

git add data/vik.json \
        images/defects/lack-of-fusion.webp \
        sw.js \
        CHANGELOG.md \
        INSTALL-v0.9.md \
        VERIFICATION-v0.9.txt

git commit -m "v0.9.0: add lack of fusion article"
git push origin main
```

Если изменения уже находятся в GitHub:

```bash
cd /var/www/DefectoSNG
git pull --ff-only origin main
```

## Проверка PWA

Не удаляйте установленное приложение. Закройте его и откройте снова. После обнаружения новой версии нажмите «Обновить».

Откройте: **ВИК → Типовые дефекты → Непровар**.
