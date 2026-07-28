# Установка DefectoSNG v0.7.0

## Изменённые и добавленные файлы

- `data/vik.json`
- `images/defects/porosity.png`
- `sw.js`
- `CHANGELOG.md`
- `INSTALL-v0.7.md`
- `VERIFICATION-v0.7.txt`

## Установка через Git

Распакуйте архив обновления поверх репозитория с сохранением структуры папок, затем выполните:

```bash
cd /var/www/DefectoSNG
git status
git add data/vik.json images/defects/porosity.png sw.js CHANGELOG.md INSTALL-v0.7.md VERIFICATION-v0.7.txt
git commit -m "v0.7.0: add porosity article"
git push origin main
```

Если изменения вносились не на VPS, обновите сервер:

```bash
cd /var/www/DefectoSNG
git pull --ff-only origin main
```

## Проверка PWA

1. Не удаляйте установленное приложение v0.6.0.
2. После публикации v0.7.0 полностью закройте PWA и откройте его снова.
3. При необходимости оставьте приложение открытым несколько секунд или повторно вернитесь в него.
4. Должно появиться уведомление о новой версии.
5. Нажмите «Обновить». Приложение должно один раз перезагрузиться.
6. Откройте ВИК → Типовые дефекты → Поры.
7. Проверьте статью и иллюстрацию с интернетом и в офлайн-режиме.
