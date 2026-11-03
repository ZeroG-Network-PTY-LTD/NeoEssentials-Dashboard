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
 * lookup — bans/mutes/kicks/warns by player name, a recent-activity feed, and the
 * active IP ban/mute lists (address redacted server-side by the mod itself — see
 * PublicModerationEndpoint::redactIp()). Matches ban-management plugins' public
 * transparency page. Never exposes staff notes or player reports — those stay behind
 * PlayerManagementPanel's own admin-gated fetch (see `canSeeReports` below), never
 * through this controller's own public props.
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
            'ipBans' => $this->safe(fn () => $this->mc->publicIpBans(), []),
            'ipMutes' => $this->safe(fn () => $this->mc->publicIpMutes(), []),
            'canManage' => Gate::allows('players.profile.manage'),
            // Staff-only — controls whether PlayerManagementPanel's Notes tab fetches and
            // shows the Reports section (via its own admin-gated /lookup/{username}/reports
            // route). An anonymous visitor or non-admin account gets false regardless of
            // what's on file for this player.
            'canSeeReports' => Gate::allows('reports.manage'),
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
     * Online/last-seen + overview stats (playtime/join date/game mode) for a single player,
     * sourced the same way as suggest() — needed by the Overview tab for every visitor, not
     * just staff (staff gets richer data via PlayerManagementPanel's own authenticated lookup
     * call). Falls back to lookupPlayer() for anyone outside the online/recent-offline rosters,
     * since that endpoint resolves any player by name.
     */
    private function onlineStatus(string $username): array
    {
        $needle = strtolower($username);
        $shape = fn (array $p, bool $online, ?string $lastSeen = null) => [
            'online' => $online,
            'lastSeen' => $lastSeen,
            'playtimeMinutes' => $p['playtimeMinutes'] ?? null,
            'firstJoined' => $p['firstJoined'] ?? null,
            'gamemode' => $p['gamemode'] ?? null,
        ];

        foreach ($this->mc->players() as $p) {
            if (strtolower($p['username']) === $needle) {
                return $shape($p, true);
            }
        }

        foreach ($this->mc->offlinePlayers() as $p) {
            if (strtolower($p['username']) === $needle) {
                return $shape($p, false, $p['lastSeen'] ?? null);
            }
        }

        $looked = $this->safe(fn () => $this->mc->lookupPlayer($username), []);

        return $shape($looked, false);
    }
}