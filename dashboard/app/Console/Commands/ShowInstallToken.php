<?php

namespace App\Console\Commands;

use App\Services\InstallService;
use Illuminate\Console\Command;

/**
 * For the minority of shared-hosting setups that DO offer shell/cron access
 * (some cPanel "Setup PHP App" configs expose a Terminal) — a faster way to
 * get the setup token than downloading storage/app/install-token.txt
 * through the file manager.
 */
class ShowInstallToken extends Command
{
    protected $signature = 'install:token';

    protected $description = 'Print the one-time /install setup token (generates one if it doesn\'t exist yet)';

    public function handle(InstallService $install): int
    {
        if ($install->isInstalled()) {
            $this->error('This dashboard is already installed — storage/installed.lock exists.');

            return self::FAILURE;
        }

        $this->info('Setup token: '.$install->ensureToken());

        return self::SUCCESS;
    }
}
