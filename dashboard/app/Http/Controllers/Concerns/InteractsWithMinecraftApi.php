<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;

trait InteractsWithMinecraftApi
{
    /**
     * Wraps a read-only fetch that might fail because the game server is
     * offline/misconfigured — returns $fallback instead of 500ing, so pages
     * still render (with an empty/offline state) rather than becoming
     * completely unusable whenever MC_API_URL is unreachable.
     */
    protected function safe(callable $fn, mixed $fallback): mixed
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            return $fallback;
        }
    }

    /**
     * Wraps a mutating call (create/update/delete) — if the mod API throws
     * (unreachable, rejected the service account, etc.), redirect back with
     * the error surfaced via the 'error' flash instead of a raw 500 page.
     */
    protected function attempt(callable $fn, string $successMessage): RedirectResponse
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', $successMessage);
    }
}
