<?php

namespace App\Console\Commands;

use App\Services\MinecraftApiService;
use Illuminate\Console\Command;

/**
 * Independent liveness probe for the mod's API — see MinecraftApiService::checkHealth() for
 * why this can't just piggyback on whatever a page's own controller happens to call. Scheduled
 * in routes/console.php; requires the server's cron to actually call `php artisan schedule:run`
 * every minute, same caveat as dashboard:sync-mod-users.
 */
class CheckMcHealth extends Command
{
    protected $signature = 'dashboard:check-mc-health';

    protected $description = "Probe the mod's API and refresh the reachability indicator, independent of page traffic";

    public function handle(MinecraftApiService $mc): int
    {
        $reachable = $mc->checkHealth();
        $this->info($reachable ? 'Mod API reachable.' : 'Mod API unreachable.');

        return self::SUCCESS;
    }
}
