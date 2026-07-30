# Установка DefectoSNG v0.10.2

## 1. Проверка и резервирование

```bash
cd /var/www/DefectoSNG || exit 1
git status
git branch --show-current
git log -1 --oneline
```

Если есть незакоммиченные изменения, ничего не удаляйте и не сбрасывайте.

```bash
cd /var/www/DefectoSNG || exit 1
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_BRANCH="backup-before-vik-control-section-$TIMESTAMP"
BACKUP_DIR="/var/www/DefectoSNG-backup-vik-control-$TIMESTAMP"
WORK_BRANCH="feature/vik-control-section"

git branch "$BACKUP_BRANCH" || exit 1
cp -a /var/www/DefectoSNG "$BACKUP_DIR" || exit 1

if git show-ref --verify --quiet "refs/heads/$WORK_BRANCH"; then
  WORK_BRANCH="feature/vik-control-section-$TIMESTAMP"
fi

git switch -c "$WORK_BRANCH" || exit 1

printf 'Резервная ветка: %s\nФайловый бэкап: %s\nРабочая ветка: %s\nИсходный коммит: %s\n' \
  "$BACKUP_BRANCH" "$BACKUP_DIR" "$WORK_BRANCH" "$(git rev-parse --short HEAD)"
```

## 2. Установка

```bash
unzip -o /путь/к/DefectoSNG-v0.10.2-update.zip -d /var/www/DefectoSNG
cd /var/www/DefectoSNG
```

## 3. Проверка

```bash
python3 -m json.tool data/vik.json >/dev/null && echo "vik.json: OK"
grep -n "defectosng-v0.10.2" sw.js
grep -n '"id": "vik-control-section"' data/vik.json
grep -n '"parentId": "vik-control-section"' data/vik.json
git status
git diff --stat
```

Если Node.js установлен:

```bash
node --check js/app.js
node --check sw.js
```

## 4. Коммит

```bash
git add CHANGELOG.md css/style.css data/vik.json js/app.js sw.js \
  INSTALL-v0.10.2.md VERIFICATION-v0.10.2.txt

git commit -m "Release v0.10.2: add universal VIK control subsection"
git log -1 --oneline
git status
```

## 5. PWA

Откройте приложение онлайн, подтвердите обновление, полностью закройте PWA и откройте снова. После первого посещения проверьте подраздел в авиарежиме.
