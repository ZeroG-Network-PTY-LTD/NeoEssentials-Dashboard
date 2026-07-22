<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\JsonResponse;
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

    /**
     * Like attempt(), but returns JSON instead of a redirect — for the player profile page,
     * which fires many small independent actions and shows a toast per response rather than
     * reloading the whole Inertia page after every click.
     */
    protected function attemptJson(callable $fn, string $successMessage): JsonResponse
    {
        try {
            $result = $fn();
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        return response()->json(['success' => true, 'message' => $successMessage, 'result' => $result]);
    }

    /** Like safe(), but returns JSON — for read-only GET endpoints on the player profile page. */
    protected function safeJson(callable $fn, mixed $fallback): JsonResponse
    {
        return response()->json($this->safe($fn, $fallback));
    }
}
