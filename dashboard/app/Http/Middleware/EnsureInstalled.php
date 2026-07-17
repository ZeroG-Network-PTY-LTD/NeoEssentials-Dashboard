<?php

namespace App\Http\Middleware;

use App\Services\InstallService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirects every request to /install until storage/installed.lock exists —
 * the guard that makes a freshly-uploaded, unconfigured *_installer.zip land
 * on the setup wizard instead of a broken/blank dashboard.
 */
class EnsureInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('install.*') || $request->is('up')) {
            return $next($request);
        }

        if (! app(InstallService::class)->isInstalled()) {
            return redirect()->route('install.index');
        }

        return $next($request);
    }
}
