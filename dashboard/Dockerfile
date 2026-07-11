# Minimal single-container image: PHP built-in server + SQLite, no nginx/php-fpm
# needed. Fine for a single-admin-team dashboard; swap to php-fpm+nginx yourself
# if you need to serve many concurrent users.
FROM php:8.3-cli AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
        unzip git libsqlite3-dev libzip-dev \
    && docker-php-ext-install pdo_sqlite zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

# Node is only needed to build the frontend assets; the final image doesn't need it.
FROM node:22-slim AS assets
WORKDIR /app
COPY --from=build /app ./
RUN npm ci --legacy-peer-deps && npm run build

FROM php:8.3-cli
RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-dev \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=assets /app ./

RUN touch database/database.sqlite \
    && php artisan key:generate --force \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 8000
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000