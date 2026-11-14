# Deployments

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
