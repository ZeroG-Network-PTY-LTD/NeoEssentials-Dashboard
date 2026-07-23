<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks every /dashboard/* route until the account has both a linked Minecraft account
 * (mc_uuid, via the Profile page's in-game-code widget) and a linked Discord account
 * (discord_id, via "Connect Discord" — also on Profile). Admins are exempt: the first admin
 * account, created right after /install, needs to reach Configuration to pair the mod at all
 * before either linking flow can even work — gating admins here would be a deadlock.
 */
class EnsureAccountLinked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role !== 'admin' && (! $user->mc_uuid || ! $user->discord_id)) {
            return redirect()->route('profile.edit')->with('error',
                'Link your Minecraft and Discord accounts below to unlock the dashboard.');
        }

        return $next($request);
    }
}
