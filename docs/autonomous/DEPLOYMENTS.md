# Deployments

## 2026-11-14

- Production до цикла: commit `4a54e126df1ad1eb369a47e186f8c70b6ef32a71`, версия 0.58.4.
- Опубликовано малое исправление надёжности тестового статического сервера: malformed percent-encoding теперь получает HTTP 400 без падения процесса; добавлен регрессионный тест.
- Проверенный runtime-коммит: `c7fb1fc848a97436121807bcdb9ca5791dd2473b`; версия приложения остаётся 0.58.4, нормативные данные, UI и PWA-кэш не менялись.
- Pre-deploy snapshot: `/var/backups/defectosng/full-20261114-174912`, checksum и restore-check PASS.
- GitHub Actions: run `43607024561` — PASS; независимое ревью — PASS.
- Post-deploy: главная страница, JS, service worker/PWA config, ВИК, УЗК, вибродиагностика и контрольное изображение — PASS.
- Nginx и посторонний сервис `korni` остались active; production working tree чистый. Регрессий нет, откат не требовался.
