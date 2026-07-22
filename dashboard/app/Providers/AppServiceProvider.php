<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Discord\DiscordExtendSocialite;
use SocialiteProviders\Manager\SocialiteWasCalled;

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
        $this->registerRateLimiters();

        // Socialite has no built-in Discord driver — socialiteproviders/discord registers
        // itself via this event, the standard wiring for every socialiteproviders/* package.
        Event::listen(SocialiteWasCalled::class, DiscordExtendSocialite::class.'@handle');
    }

    /**
     * Backs the throttle:commands-run middleware on POST /dashboard/commands/run
     * (routes/web.php) — 20 commands/minute per authenticated user, not per-IP,
     * so a compromised/careless session can't hammer the mod's console but
     * multiple admins behind the same NAT/proxy don't throttle each other.
     */
    private function registerRateLimiters(): void
    {
        RateLimiter::for('commands-run', fn ($request) => Limit::perMinute(20)->by($request->user()?->id));
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
        // Same tier as kick/ban — changing a player's game mode has a comparable blast
        // radius (e.g. handing out creative mode) if a compromised/careless account uses it.
        Gate::define('players.gamemode', fn (User $user) => $user->isAdmin());
        Gate::define('economy.manage', fn (User $user) => $user->isAdmin());
        Gate::define('console.run', fn (User $user) => $user->isAdmin());

        // Managing the MOD's own dashboard accounts (UserManagementEndpoint) is
        // admin-only on the mod side too — mirror that restriction here so a
        // moderator never even sees the option in this app, rather than letting
        // them hit it and get a 403 back from the mod itself.
        Gate::define('mod-users.manage', fn (User $user) => $user->isAdmin());

        // Discord status/events are readable by any logged-in account, but
        // clearing the event log, sending a test message, and editing the
        // account-linking auth config are admin-only on the mod side
        // (DiscordEndpoint) — mirror that here.
        Gate::define('discord.manage', fn (User $user) => $user->isAdmin());

        // Every write in PermissionEndpoint requires the mod's own admin
        // session (self-escalation risk otherwise) — mirror that here too.
        Gate::define('permissions.manage', fn (User $user) => $user->isAdmin());

        // BackupEndpoint/CloudStorageEndpoint gate every mutating route behind
        // admin on the mod side; status/list/file-browsing stay readable by
        // any logged-in account.
        Gate::define('backups.manage', fn (User $user) => $user->isAdmin());

        // Self-update (git pull + rebuild, or upload an installer/updater
        // zip) can overwrite this app's own code — admin-only, no mod-side
        // equivalent to mirror since this is Laravel-app-specific.
        Gate::define('updates.manage', fn (User $user) => $user->isAdmin());

        // Discord OAuth app credentials, the MC API connection, and the
        // mod-account sync trigger — all admin-only, Laravel-app-specific
        // (no mod-side equivalent to mirror).
        Gate::define('configuration.manage', fn (User $user) => $user->isAdmin());
    }
}
