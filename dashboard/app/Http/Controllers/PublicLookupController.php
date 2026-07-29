<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public (no login required, either here or on the mod side) player moderation
 * lookup — bans/mutes/kicks/warns by player name, plus a recent-activity feed.
 * Matches ban-management plugins' public transparency page. Never exposes IP
 * bans/IP mutes, staff notes, or player reports — see
 * MinecraftApiService::publicLookup()/publicRecent() and the mod's
 * PublicModerationEndpoint for what's deliberately excluded.
 *
 * Also the host page for PlayerManagementPanel — `canManage` tells the frontend
 * whether to mount it at all; the panel's own routes (PlayerProfileController,
 * /lookup/{username}/*) enforce the same gate server-side regardless.
 */
class PublicLookupController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(Request $request): Response
    {
        $username = trim((string) $request->query('player', ''));

        return Inertia::render('PublicLookup', [
            'query' => $username !== '' ? $username : null,
            'result' => $username !== ''
                ? $this->safe(fn () => $this->mc->publicLookup($username), null)
                : null,
            'status' => $username !== ''
                ? $this->safe(fn () => $this->onlineStatus($username), null)
                : null,
            'recent' => $this->safe(fn () => $this->mc->publicRecent(), []),
            'canManage' => Gate::allows('players.profile.manage'),
        ]);
    }

    /**
     * Name-only autocomplete suggestions for the search box, sourced from the mod's online
     * + recently-active-offline rosters (the only bulk player lists the mod exposes — no
     * full historical roster/search endpoint exists yet). Deliberately reshaped to just
     * {username, uuid, online} so nothing from the authenticated players()/offlinePlayers()
     * payloads (health, position, lastSeen, etc.) leaks onto this public, unauthenticated route.
     */
    public function suggest(Request $request): JsonResponse
    {
        $query = strtolower(trim((string) $request->query('q', '')));
        if ($query === '') {
            return response()->json([]);
        }

        return $this->safeJson(function () use ($query) {
            $seen = [];
            $entries = [
                ...array_map(fn (array $p) => [...$p, 'online' => true], $this->mc->players()),
                ...array_map(fn (array $p) => [...$p, 'online' => false], $this->mc->offlinePlayers()),
            ];
            foreach ($entries as $p) {
                if (! isset($seen[$p['username']]) && str_starts_with(strtolower($p['username']), $query)) {
                    $seen[$p['username']] = ['username' => $p['username'], 'uuid' => $p['uuid'], 'online' => $p['online']];
                }
            }

            return array_slice(array_values($seen), 0, 8);
        }, []);
    }

    /**
     * Online/last-seen for a single player, sourced the same way as suggest() — needed by
     * the Overview tab for every visitor, not just staff (staff gets richer data via
     * PlayerManagementPanel's own authenticated lookup call).
     */
    private function onlineStatus(string $username): array
    {
        $needle = strtolower($username);

        foreach ($this->mc->players() as $p) {
            if (strtolower($p['username']) === $needle) {
                return ['online' => true, 'lastSeen' => null];
            }
        }

        foreach ($this->mc->offlinePlayers() as $p) {
            if (strtolower($p['username']) === $needle) {
                return ['online' => false, 'lastSeen' => $p['lastSeen'] ?? null];
            }
        }

        return ['online' => false, 'lastSeen' => null];
    }
}