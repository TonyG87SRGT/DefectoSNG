# Установка DefectoSNG v0.10.0

Разработка атласа выполняется в ветке `feature/defects-atlas`.

Подтверждённые резервные копии перед началом работы:

- Git-ветка: `backup-before-defects-atlas-20260729-140225`
- файловая копия: `/var/www/DefectoSNG-backup-atlas-20260729-140225`

## Установка архива обновления

На сервере:

```bash
cd /var/www/DefectoSNG
git branch --show-current
git status
```

Ожидаемая ветка:

```text
feature/defects-atlas
```

Распакуйте содержимое архива обновления поверх `/var/www/DefectoSNG`, не удаляя остальные файлы проекта.

Проверьте файлы:

```bash
cd /var/www/DefectoSNG
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
node --check js/app.js
node --check sw.js
grep "defectosng-v0.10.0" sw.js
find images/atlas -maxdepth 1 -type f | sort
```

После ручной проверки в браузере изменения можно зафиксировать только в рабочей ветке:

```bash
git add css/style.css js/app.js data/vik.json sw.js images/atlas CHANGELOG.md INSTALL-v0.10.0.md VERIFICATION-v0.10.0.txt
git commit -m "Add defects atlas v0.10.0"
```

Не объединяйте ветку с `main` и не отправляйте изменения в `main` до отдельного подтверждения.
