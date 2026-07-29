# Установка DefectoSNG v0.10.1

Обновление улучшает только интерфейс страницы «Атлас дефектов».

## Изменяемые файлы

- `css/style.css`
- `js/app.js`
- `sw.js`
- `CHANGELOG.md`
- `INSTALL-v0.10.1.md`
- `VERIFICATION-v0.10.1.txt`

## Установка

Распакуйте архив обновления поверх проекта в рабочей ветке:

```bash
cd /var/www/DefectoSNG
unzip -o DefectoSNG-v0.10.1-update.zip -d /var/www/DefectoSNG
```

Проверьте синтаксис и версию кэша:

```bash
node --check js/app.js
node --check sw.js
grep "defectosng-v0.10.1" sw.js
git status
```

Не объединяйте рабочую ветку с `main` до визуальной проверки.
