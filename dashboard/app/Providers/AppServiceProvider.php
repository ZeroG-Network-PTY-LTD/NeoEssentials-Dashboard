<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->registerDashboardGates();
    }

    /**
     * Backs the can:players.kick / players.ban / players.mute / economy.manage /
     * console.run middleware used by routes/web.php's dashboard route group.
     * Deliberately simple (this app doesn't depend on Spatie Laravel Permission
     * or any other package) — 'admin' can do everything these gate, 'moderator'
     * gets the lighter-touch mute action but not kick/ban/economy/console, which
     * have a higher blast radius if a moderator account is compromised or
     * careless. Adjust freely per-deployment; these are just sane defaults.
     */
    private function registerDashboardGates(): void
    {
        Gate::define('players.kick', fn (User $user) => $user->isAdmin());
        Gate::define('players.ban', fn (User $user) => $user->isAdmin());
        Gate::define('players.mute', fn (User $user) => $user->isAdmin() || $user->role === 'moderator');
        Gate::define('economy.manage', fn (User $user) => $user->isAdmin());
        Gate::define('console.run', fn (User $user) => $user->isAdmin());
    }
}
