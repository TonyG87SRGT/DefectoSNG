# Quality

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
