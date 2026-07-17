<?php

namespace App\Console\Commands;

use App\Services\ConfigService;
use Illuminate\Console\Command;

class SyncModUsers extends Command
{
    protected $signature = 'dashboard:sync-mod-users';

    protected $description = 'Pull the mod\'s dashboard-account list and create/update matching local shadow accounts';

    public function handle(ConfigService $config): int
    {
        try {
            $result = $config->syncFromMod();
        } catch (\Throwable $e) {
            $this->error("Could not reach the mod's API: {$e->getMessage()}");

            return self::FAILURE;
        }

        $this->info("Synced {$result['total']} mod account(s) — {$result['created']} created, {$result['updated']} updated.");

        return self::SUCCESS;
    }
}
