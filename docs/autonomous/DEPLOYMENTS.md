# Deployments

## 2026-11-15 — воспроизводимый CI

- Production до цикла: commit `30729448a1df1d455a2a86c5f92e697bfaecd583`, версия 0.58.6.
- Добавлен `package-lock.json`; GitHub Actions и локальная инструкция переведены на детерминированный `npm ci`; добавлен unit-тест целостности CI-конфигурации. Runtime, нормативные данные, формулы и PWA-кэш не изменялись.
- Опубликован commit `fec524b4e50bf811e138fefdb15519d73aff4916`; версия приложения остаётся 0.58.6.
- Pre-deploy snapshot: `/var/backups/defectosng/full-20261114-224929`, checksum и restore-check PASS.
- Локально: syntax/validator/unit 205/205, Playwright 23/23, mobile/offline/PWA, чистая изолированная установка и независимое ревью — PASS.
- GitHub Actions runs `43634004283`, `43634267909` и main-run `43634422494` — PASS.
- Post-deploy: главная, ВИК, УЗК, вибродиагностика, контрольное изображение УСД-50 IPS, JS и PWA/service worker — PASS; браузерная консоль без ошибок.
- Nginx и посторонний сервис `korni` active; production working tree чистый. Регрессий нет, откат не требовался.

## 2026-11-15 — 0.58.6

- Production до цикла: commit `eef1631bbad4a9b9a636d63eb8fe2279e7672e78`, версия 0.58.5.
- Опубликованы совместные фильтры глобального поиска по фактическому методу и типу результата; глобальные инструменты включены в поисковый индекс. Нормативные данные и формулы не изменялись.
- Проверенный runtime-коммит: `bc57f66ef5550e10cc3d2281587846412e40f467`; версия PWA/service worker 0.58.6.
- Pre-deploy snapshot: `/var/backups/defectosng/full-20261114-215557`, checksum и restore-check PASS.
- Локально: syntax/validator/unit 204/204, Playwright 23/23, mobile/offline/PWA и независимое ревью — PASS; GitHub Actions runs `43629144479` и `43629520391` — PASS.
- Post-deploy: реальный браузер прошёл поиск инструмента, фильтр «Инструменты», открытие калькулятора, фильтр МК и сброс фильтров; ВИК, УЗК, изображение УСД-50 IPS и вибродиагностика — PASS.
- Главная, JS, PWA/service worker и контрольное изображение отдаются с HTTP 200; Nginx и посторонний сервис `korni` active. Регрессий нет, откат не требовался.

## 2026-11-14 — 0.58.5

- Production до цикла: commit `48ac6455c7f58a134a08c6c01a4b151c3991a661`, версия 0.58.4.
- Опубликован контекстный блок «Атласы метода» на рабочих страницах ВИК, УЗК, РК, ПВК и вибродиагностики; нормативные данные и формулы не изменялись.
- Проверенный runtime-коммит: `3f2ffb138da640d566d72e409bf97bbf8ba70222`; версия PWA/service worker 0.58.5.
- Pre-deploy snapshot: `/var/backups/defectosng/full-20261114-184922`, checksum и restore-check PASS.
- Локально: syntax/validator/unit 202/202, Playwright 22/22, mobile/offline/PWA и независимое ревью — PASS; GitHub Actions runs `43612086903` и `43612494855` — PASS.
- Post-deploy: реальный mobile browser прошёл маршруты УЗК и ВИК, переходы в атласы и offline reload; главная, JS, PWA/service worker, данные ВИК/УЗК/вибродиагностики и изображение — PASS.
- Nginx и посторонний сервис `korni` остались active; регрессий нет, откат не требовался.

## 2026-11-14

- Production до цикла: commit `4a54e126df1ad1eb369a47e186f8c70b6ef32a71`, версия 0.58.4.
- Опубликовано малое исправление надёжности тестового статического сервера: malformed percent-encoding теперь получает HTTP 400 без падения процесса; добавлен регрессионный тест.
- Проверенный runtime-коммит: `c7fb1fc848a97436121807bcdb9ca5791dd2473b`; версия приложения остаётся 0.58.4, нормативные данные, UI и PWA-кэш не менялись.
- Pre-deploy snapshot: `/var/backups/defectosng/full-20261114-174912`, checksum и restore-check PASS.
- GitHub Actions: run `43607024561` — PASS; независимое ревью — PASS.
- Post-deploy: главная страница, JS, service worker/PWA config, ВИК, УЗК, вибродиагностика и контрольное изображение — PASS.
- Nginx и посторонний сервис `korni` остались active; production working tree чистый. Регрессий нет, откат не требовался.
