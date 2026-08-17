# syntax=docker/dockerfile:1
# Minimal single-container image: PHP built-in server + SQLite, no nginx/php-fpm
# needed. Fine for a single-admin-team dashboard; swap to php-fpm+nginx yourself
# if you need to serve many concurrent users.
FROM php:8.4-cli AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
        unzip git libsqlite3-dev libzip-dev \
    && docker-php-ext-install pdo_sqlite zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# composer.json/lock copied (and installed) before the rest of the source, so this layer
# only re-runs — and only re-hits GitHub's codeload — when a dependency actually changed,
# not on every source-only edit. Was previously COPY . . before composer install, which
# meant literally any file change forced a full re-download of every package on every
# build; combined with GitHub's unauthenticated codeload rate limit (60/hr), a handful of
# rebuilds in quick succession reliably 429'd every subsequent build. --mount=type=cache
# additionally persists Composer's own download cache across builds (even ones that DO
# touch composer.lock), so only genuinely new/changed packages ever re-download.
COPY composer.json composer.lock ./
# Optional: mount a GitHub token (docker build --secret id=github_token,src=<file>, or
# `docker compose build` with a matching secrets: entry) to raise Composer's GitHub API rate
# limit from the unauthenticated ~60/hr to ~5000/hr for packages that fall back to fetching
# straight from GitHub instead of Packagist's own mirror. Note this only helps the
# api.github.com/repos/.../zipball fallback path specifically — codeload.github.com's
# separate legacy-archive endpoint (used for some older/unreleased package refs) doesn't
# check auth at all, authenticated or not, so a token won't rescue every possible 429 here.
# Silently unauthenticated if the secret isn't supplied — this is a reliability improvement
# for one failure path, not a requirement.
RUN --mount=type=cache,target=/root/.composer/cache \
    --mount=type=secret,id=github_token \
    if [ -s /run/secrets/github_token ]; then \
        composer config -g github-oauth.github.com "$(cat /run/secrets/github_token)"; \
    fi; \
    composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

COPY . .
RUN composer dump-autoload --optimize --no-interaction

# Node is only needed to build the frontend assets; the final image doesn't need it.
FROM node:22-slim AS assets
WORKDIR /app
COPY --from=build /app ./
RUN npm ci --legacy-peer-deps && npm run build

FROM php:8.4-cli
RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-dev \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=assets /app ./

# .env is excluded from the build context (see .dockerignore) — never bake real secrets
# into the image. Seed from .env.example instead; APP_KEY below is baked in as a
# functional default (this app needs SOME key to boot), but every other real value
# (MC_API_URL, Reverb credentials, OAuth secrets, etc.) should come from the actual
# deployment's own environment — docker-compose.yml's environment: block, an --env-file,
# or a real .env volume-mounted over this one at runtime — none of which get overridden
# by anything baked in here, since this image never runs `config:cache`.
RUN cp .env.example .env \
    && touch database/database.sqlite \
    && php artisan key:generate --force \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 8000
# --no-reload: without it, `php artisan serve` watches .env for changes and restarts the
# whole process the moment it changes — including when a request TO THIS SERVER is the one
# writing that change (e.g. Configuration's "Save" on the Mod API URL, which writes straight
# to .env). The restart kills the in-flight response mid-request, so the save actually
# succeeds but the browser sees a network error/empty response and the admin has no way to
# tell it worked short of reloading the page and checking.
CMD php artisan migrate --force && php artisan serve --no-reload --host=0.0.0.0 --port=8000