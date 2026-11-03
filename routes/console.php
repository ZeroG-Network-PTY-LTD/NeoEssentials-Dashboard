<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Keeps local shadow accounts from drifting too far out of sync even when
// the mod's optional push webhook (see WebhookController) isn't configured —
// this pull is the guaranteed-to-work path. Silent on a normal run; errors
// (mod unreachable) go to the default log channel via the command's own
// handle(), not this schedule definition. Requires the server's cron to
// actually call `php artisan schedule:run` every minute — not automatic on
// shared hosting without a cron job configured for it. Interval is
// config('minecraft.sync_interval_minutes') (MC_SYNC_INTERVAL_MINUTES),
// default 60 — the Configuration page's "Sync now" button covers forcing one
// immediately without waiting for this.
Schedule::command('dashboard:sync-mod-users')
    ->cron('*/'.max(1, (int) config('minecraft.sync_interval_minutes')).' * * * *');

// Keeps the sidebar's "API connected/unreachable" indicator honest even when nobody's actively
// browsing the dashboard — see MinecraftApiService::checkHealth() for why the page-traffic-only
// version of this flag isn't enough on its own.
Schedule::command('dashboard:check-mc-health')->everyMinute();
