#!/bin/sh
set -eu

cd /var/www/app

if [ ! -f .env ]; then
    cp .env.example .env
fi

if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist
fi

if ! grep -q '^APP_KEY=base64:' .env; then
    php artisan key:generate --force
fi

if [ ! -L public/storage ]; then
    php artisan storage:link
fi

php artisan migrate --seed --force
cd public
exec php -S 0.0.0.0:8000 /var/www/app/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
