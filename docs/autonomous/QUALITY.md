# Quality

## 2026-11-15 — постоянные ссылки на статьи / 0.58.7

- Read-only аудит маршрутов НК подтвердил пользу копирования точной статьи для ВИК, УЗК, РК, ПВК и вибродиагностики без изменения роутера и нормативных данных.
- Clipboard API дополнен локальным fallback через временное поле; внешние сервисы и сетевые запросы не используются.
- После замечания независимого ревью live-region сохранён в accessibility tree без `display: none`; это единственный цикл исправления.
- Синтаксис: 114 файлов, validator PASS, unit 209/209, Playwright/mobile/offline/PWA 24/24, `git diff --check` PASS.
- Версии package/manifest/PWA/service worker согласованы на 0.58.7; новый модуль входит в обязательный offline-кэш.
- Независимое повторное ревью: PASS; GitHub Actions run `43665199728`: PASS (`check` и browser).
- Pre-deploy snapshot `/var/backups/defectosng/full-20261115-045511`: checksum и тестовая распаковка PASS.

## 2026-11-15 — GitHub Actions v7 / Node.js 24 runtime

- Официальные релизы и `action.yml` подтверждены: checkout 7.0.1, setup-node 7.1.0, upload-artifact 7.0.2; все используют runtime Node.js 24.
- Workflow сохраняет события `push`/`pull_request`, `contents: read`, Node.js 22 для проекта, `npm ci`, полный check, Chromium и browser smoke; permissions и тестовые ожидания не ослаблены.
- Целевой тест CI-конфигурации: 2/2 PASS; syntax 112 файлов, validator PASS, unit 206/206, Playwright/mobile/offline/PWA 23/23, `git diff --check` PASS.
- Независимое ревью: PASS; runtime, PWA и нормативные данные не затронуты.
- GitHub Actions v7 run `43659788335`: PASS (`check` и browser); предупреждение о Node.js 20 отсутствует.
- Pre-deploy snapshot `/var/backups/defectosng/full-20261115-034707`: checksum и тестовая распаковка PASS.
- Повторный branch-run `43659971980` и main-run `43660103919`: PASS; предупреждение Node.js 20 отсутствует.
- Post-deploy HTTP и реальный браузер: главная, ВИК, УЗК, вибродиагностика, УСД-50 IPS (1280×885), JS и PWA/service worker PASS; ошибок консоли нет.
- VPS: commit `7b81b8ef61235bf03cc307467947f02293daa1f3`, чистое дерево; Nginx и `korni` active.

## 2026-11-15 — ограничение локальной параллельности Playwright

- Node.js 24: три диагностических и один финальный полный Playwright-запуск завершились 23/23 без зависания; число Node-процессов до и после запусков не изменилось.
- Локально используются два worker-процесса, CI сохраняет один; набор и ожидания browser-тестов не менялись.
- Целевой тест конфигурации: 2/2 PASS; syntax 112 файлов, validator PASS, unit 206/206, полный Playwright/mobile/offline/PWA 23/23, `git diff --check` PASS.
- Независимое ревью: PASS; runtime, PWA и нормативные данные не затронуты.
- GitHub Actions run `43639457093`: PASS (`check` и browser).
- Pre-deploy snapshot `/var/backups/defectosng/full-20261114-235010`: checksum и тестовая распаковка PASS.
- Повторный branch-run `43639682418` и main-run `43639837357`: PASS.
- Post-deploy HTTP и реальный браузер: главная, ВИК, УЗК, вибродиагностика, УСД-50 IPS (1280×885), JS и PWA/service worker PASS; ошибок консоли нет.
- VPS: commit `d7b4e9d269a6f17b045ff0f4df5506eabcb20700`, чистое дерево; Nginx и `korni` active.

## 2026-11-15 — pre-deploy контроль воспроизводимого CI

- GitHub Actions `Check project`, run `43634004283` на commit `918f0d881f3a9e88f71ce9d595ed8baebcce605e`: PASS.
- Чистая установка из `package-lock.json` и полный локальный набор syntax/validator/unit/Playwright/mobile/offline/PWA: PASS.
- Независимое ревью: PASS; нормативные данные, runtime и PWA-кэш не затронуты.
- Pre-deploy snapshot `/var/backups/defectosng/full-20261114-224929`: checksum и тестовая распаковка PASS.
- Повторный branch-run `43634267909` и main-run `43634422494`: PASS.
- Post-deploy HTTP и реальный браузер: главная, ВИК, УЗК, вибродиагностика, УСД-50 IPS (1280×885), JS и PWA/service worker PASS; ошибок консоли нет.
- VPS: commit `fec524b4e50bf811e138fefdb15519d73aff4916`, чистое дерево; Nginx и `korni` active.

## Базовая версия 0.58.4

- Синтаксис: 110 файлов, PASS.
- Валидатор: PASS; 363 материала, 3237 секций, 1964 ссылки, 500 offline-ресурсов.
- Unit: 200/200 PASS.

## Текущая ветка

- Целевой тест malformed URL: 1/1 PASS.
- Синтаксис: 111 файлов, PASS.
- Валидатор: PASS.
- Unit: 201/201 PASS.
- `git diff --check`: PASS.
- Независимое ревью: PASS.
- GitHub Actions на Node.js 22: PASS, run `43606464735` (`check` и browser/e2e).
- Прямая локальная Playwright-диагностика offline/PWA-маршрута: PASS.
- Локальный общий runner на Node.js 24 зависает после последнего offline/PWA-сценария; это зафиксировано как проблема окружения, а не runtime-регрессия. Production-гейт подтверждён штатным CI на Node.js 22.

## Ветка 0.58.5

- Контекстные переходы в атласы: unit 5/5 PASS; полный unit-контур 202/202 PASS.
- Синтаксис: 111 файлов, PASS; валидатор: PASS; `git diff --check`: PASS.
- Новый мобильный Playwright-сценарий 375 px: PASS; целевой offline/PWA-сценарий: PASS.
- Полный Playwright: 22/22 PASS, включая mobile, accessibility, изображения и offline/PWA.
- Независимое ревью: PASS; нормативные данные и формулы не изменялись.
- GitHub Actions на штатном Node.js 22: PASS, run `43612086903`.
- Финальный GitHub Actions после записи release gates: PASS, run `43612494855`.
- Production mobile/PWA smoke: УЗК, ВИК, оба перехода в атласы и offline reload — PASS; ошибок браузера не обнаружено.

## Ветка 0.58.6

- Фильтры поиска: реальные методы ВИК/УЗК/ПВК/РК/ВД/МК/УЗТ/АЭ/герметичность и типы материалов/критериев/таблиц/инструментов.
- Синтаксис: 111 файлов, PASS; валидатор: PASS; `git diff --check`: PASS.
- Unit: 204/204 PASS.
- Полный Playwright: 23/23 PASS, включая 375 px, маршруты инструментов, МК, сброс фильтров, accessibility и offline/PWA.
- Независимое ревью после одного цикла исправления: PASS; нормативные данные и формулы не изменялись.
- GitHub Actions runs `43629144479` и `43629520391`: PASS (`check` и browser).
- Production HTTP/browser smoke: поиск инструмента, МК, сброс фильтров, ВИК, УЗК, вибродиагностика, изображение и PWA/service worker — PASS.

## Воспроизводимый CI

- `package-lock.json` v3 зафиксировал `@playwright/test` 1.62.0 и транзитивные зависимости с SHA-512 integrity.
- Изолированный чистый `npm ci`: PASS; установлен `@playwright/test` 1.62.0.
- Оба задания GitHub Actions используют `npm ci`; добавлен регрессионный unit-тест конфигурации.
- Синтаксис: 112 файлов, PASS; валидатор: PASS; unit 205/205; Playwright 23/23; `git diff --check`: PASS.
- Независимое ревью: PASS; runtime, PWA, нормативные данные и формулы не изменялись.
