# Установка DefectoSNG v0.9.1

Технический релиз переводит шесть старых изображений раздела УЗК из PNG в WebP и обновляет офлайн-кэш PWA.

## Вариант 1. Установка полного архива

На сервере выполните:

```bash
cd /var/www
sudo cp -a DefectoSNG "DefectoSNG-backup-v0.9.0-$(date +%Y%m%d-%H%M%S)"
```

Загрузите и распакуйте полный архив `DefectoSNG-v0.9.1-full.zip` во временную папку, затем замените проект:

```bash
cd /var/www
sudo rm -rf DefectoSNG
sudo mv DefectoSNG-v0.9.1 DefectoSNG
sudo chown -R www-data:www-data /var/www/DefectoSNG
sudo find /var/www/DefectoSNG -type d -exec chmod 755 {} \;
sudo find /var/www/DefectoSNG -type f -exec chmod 644 {} \;
sudo nginx -t
sudo systemctl reload nginx
```

## Вариант 2. Установка архива изменённых файлов

Распакуйте `DefectoSNG-v0.9.1-update.zip` поверх `/var/www/DefectoSNG`, сохраняя структуру папок. Затем удалите старые PNG:

```bash
cd /var/www/DefectoSNG
sudo rm -f \
  images/articles/uzk/echo-pulse-principle.png \
  images/articles/uzk/dac-vrc-comparison.png \
  images/articles/uzk/pep-overview.png \
  images/articles/uzk/beam-input.PNG \
  images/articles/uzk/beam-zones.PNG \
  images/articles/uzk/dead-zone.PNG

sudo chown -R www-data:www-data /var/www/DefectoSNG
sudo nginx -t
sudo systemctl reload nginx
```

## Git

```bash
cd /var/www/DefectoSNG
git status
git add -A
git commit -m "Release v0.9.1: optimize UZK images to WebP"
git push origin main
git tag -a v0.9.1 -m "DefectoSNG v0.9.1"
git push origin v0.9.1
```

## Проверка обновления установленного PWA

1. Откройте DefectoSNG при наличии интернета.
2. Дождитесь уведомления о новой версии.
3. Нажмите кнопку «Обновить».
4. После перезагрузки откройте статьи УЗК с изображениями.
5. Отключите интернет или включите авиарежим.
6. Полностью закройте и снова откройте PWA.
7. Проверьте, что все шесть изображений УЗК открываются офлайн.

Если уведомление не появилось сразу, закройте PWA, откройте сайт ещё раз и подождите очередной проверки Service Worker.
