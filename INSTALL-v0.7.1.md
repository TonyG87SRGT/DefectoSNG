# Установка DefectoSNG v0.7.1

Версия оптимизирует изображение в статье «Поры».

## Изменённые файлы

- `data/vik.json`
- `sw.js`
- `images/defects/porosity.webp`
- `CHANGELOG.md`
- `INSTALL-v0.7.1.md`
- `VERIFICATION-v0.7.1.txt`

Старый файл `images/defects/porosity.png` необходимо удалить.

## Команды

```bash
cd /var/www/DefectoSNG

git add data/vik.json sw.js images/defects/porosity.webp CHANGELOG.md INSTALL-v0.7.1.md VERIFICATION-v0.7.1.txt
git rm images/defects/porosity.png
git commit -m "v0.7.1: optimize porosity image"
git push origin main
```
