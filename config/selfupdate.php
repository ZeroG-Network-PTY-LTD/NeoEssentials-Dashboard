<?php

return [

    // The GitHub repo this dashboard checks against for "update available" —
    // owner/repo form, matching this app's own origin remote by default.
    'repo' => env('UPDATE_GITHUB_REPO', 'ZeroG-Network-PTY-LTD/NeoEssentials-Dashboard'),

    // Branch to compare local HEAD against and to fast-forward-merge from
    // when applying a git-based update.
    'branch' => env('UPDATE_GITHUB_BRANCH', 'main'),

    // Optional — raises the unauthenticated GitHub API rate limit (60/hr) and
    // is required if the repo is private. A fine-grained PAT with read-only
    // "Contents" access is enough; never a token with write scopes.
    'github_token' => env('UPDATE_GITHUB_TOKEN'),

    // How long to cache the "does GitHub have something newer" check, in
    // seconds — avoids hitting the GitHub API on every Updates page load.
    'check_cache_ttl' => (int) env('UPDATE_CHECK_CACHE_TTL', 300),

    // This app (composer.json/artisan) lives in a subdirectory of the git
    // repo (siblings: forums-site/, homepage-site/, .github/) — git commands
    // for the "update via GitHub" path run here, not in base_path().
    'repo_root' => env('UPDATE_REPO_ROOT', dirname(base_path())),

    // Where uploaded installer/updater zips are staged and extracted before
    // being overlaid onto the app — never web-accessible.
    'staging_dir' => storage_path('app/updates'),

    // Relative paths (from base_path()) an installer/updater zip is never
    // allowed to overwrite, regardless of what it contains — secrets, the
    // database, and anything Laravel is actively reading from mid-request.
    // Deliberately NOT listing vendor/, public/build/, or bootstrap/cache
    // here: bin/build-installer.ps1 runs `composer install --no-dev` and
    // `npm run build` inside every installer/updater package before zipping
    // it, so those directories in the archive are already the correct,
    // matching build for that release — skipping them would silently leave
    // the target running old dependencies/frontend assets after "applying"
    // an update. packageKind() only ever accepts *_installer.zip/
    // *-updater.zip (our own CI output), so there's no arbitrary/untrusted
    // zip case this list needs to defend against.
    'protected_paths' => [
        '.env',
        '.env.example',
        'storage',
        'database/database.sqlite',
    ],

    // Max uploaded package size, in kilobytes (Laravel's 'max' validation rule unit).
    'max_upload_kb' => (int) env('UPDATE_MAX_UPLOAD_KB', 204800), // 200MB

    // Run `composer install` without dev dependencies during an applied
    // update. Leave this off for a dev/staging box that also runs `composer
    // test`/pint/pail from this same vendor tree; turn it on for a
    // production-only deployment.
    'composer_no_dev' => (bool) env('UPDATE_COMPOSER_NO_DEV', false),

    // Seconds allowed for the whole rebuild step chain (composer install +
    // npm ci + npm run build + migrate) before it's killed as hung. None of
    // these should legitimately take this long; it's a safety ceiling, not a
    // target.
    'process_timeout' => (int) env('UPDATE_PROCESS_TIMEOUT', 900),

];
