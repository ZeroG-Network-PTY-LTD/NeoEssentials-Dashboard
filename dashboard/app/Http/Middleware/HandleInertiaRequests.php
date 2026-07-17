<?php

namespace App\Http\Middleware;

use App\Services\MinecraftApiService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                // Full composer/npm/git command output from the last self-update
                // attempt — deliberately separate from success/error (which drive
                // the small toast) since this can be several KB of log text; only
                // the Updates page renders it.
                'updateLog' => fn () => $request->session()->get('updateLog'),
            ],
            // Reflects the outcome of whatever mod-API call this same request's
            // controller already made — see MinecraftApiService::isReachable().
            // Wrapped defensively: this must never be the thing that breaks a
            // page render (e.g. test suites that mock MinecraftApiService
            // without stubbing this one extra method shouldn't have to).
            'apiReachable' => function () use ($request) {
                if (!$request->user()) {
                    return true;
                }

                try {
                    return app(MinecraftApiService::class)->isReachable();
                } catch (\Throwable $e) {
                    return true;
                }
            },
            // Drives whether the sidebar shows the "Permissions" link at all. When the mod is
            // using an external plugin (LuckPerms, FTB Ranks, ...) instead of its own internal
            // groups, the internal permission API is inert — showing the nav item would just
            // lead to a page with nothing to manage, and could confuse an operator into thinking
            // this dashboard controls permissions when LuckPerms actually does. Defaults to false
            // (show the link) on any failure/uncertainty, so a transient API outage doesn't make
            // navigation flicker — the Permissions page itself already shows its own
            // unavailable/external-system state once you're on it.
            'permissionsUsingExternal' => function () use ($request) {
                if (!$request->user()) {
                    return false;
                }

                try {
                    return (bool) (app(MinecraftApiService::class)->permissionOverview()['usingExternal'] ?? false);
                } catch (\Throwable $e) {
                    return false;
                }
            },
        ];
    }
}
