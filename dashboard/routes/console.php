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
// shared hosting without a cron job configured for it.
Schedule::command('dashboard:sync-mod-users')->hourly();
