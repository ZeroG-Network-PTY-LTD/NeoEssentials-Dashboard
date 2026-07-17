<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PlayerController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(Request $request): Response
    {
        $lookupUsername = trim((string) $request->query('lookup', ''));

        return Inertia::render('Dashboard/Players', [
            'players' => $this->safe(fn () => $this->mc->players(), []),
            // Recently-active offline players (mod-side cap of 50) — shown by default so most
            // servers never need the lookup box below at all.
            'offlinePlayers' => $this->safe(fn () => $this->mc->offlinePlayers(), []),
            // Only for servers with more players than that cap, or anyone who hasn't played
            // recently enough to still be in it.
            'lookupQuery' => $lookupUsername ?: null,
            'lookupResult' => $lookupUsername !== ''
                ? $this->safe(fn () => $this->mc->lookupPlayer($lookupUsername), ['success' => false, 'message' => "Could not find a player named '{$lookupUsername}', or the Minecraft server API is unreachable."])
                : null,
        ]);
    }

    public function teleport(Request $request, string $uuid): RedirectResponse
    {
        $data = $request->validate([
            'target_uuid' => ['nullable', 'string'],
            'x' => ['nullable', 'numeric'],
            'y' => ['nullable', 'numeric'],
            'z' => ['nullable', 'numeric'],
        ]);

        return $this->attempt(function () use ($data, $uuid) {
            $payload = [];
            if (!empty($data['target_uuid'])) {
                $payload['targetUsername'] = $this->resolveUsername($data['target_uuid']);
            }
            if (isset($data['x'], $data['y'], $data['z'])) {
                $payload['x'] = $data['x'];
                $payload['y'] = $data['y'];
                $payload['z'] = $data['z'];
            }

            $this->mc->teleportPlayer($this->resolveUsername($uuid), $payload);
        }, 'Teleport sent.');
    }

    public function heal(string $uuid): RedirectResponse
    {
        return $this->attempt(
            fn () => $this->mc->healPlayer($this->resolveUsername($uuid)),
            'Player healed and fed.',
        );
    }

    public function kick(Request $request, string $uuid): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        return $this->attempt(
            fn () => $this->mc->kickPlayer($this->resolveUsername($uuid), $data['reason']),
            'Player kicked.',
        );
    }

    public function ban(Request $request, string $uuid): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'duration' => ['nullable', 'string'],
        ]);

        // Ban targets an online player here; the mod's ban endpoint also accepts
        // offline players by name, but this scaffold's UI only lists online players.
        return $this->attempt(
            fn () => $this->mc->banPlayer($this->resolveUsername($uuid), $data['reason'], $data['duration'] ?? null),
            'Player banned.',
        );
    }

    public function mute(Request $request, string $uuid): RedirectResponse
    {
        $data = $request->validate(['duration' => ['nullable', 'string']]);

        return $this->attempt(
            fn () => $this->mc->mutePlayer($this->resolveUsername($uuid), $data['duration'] ?? null),
            'Player muted.',
        );
    }

    /**
     * Read-only — the mod's homes lookup only works for online players (it
     * resolves live off the player object, not a stored profile), so this
     * mirrors that same online-only constraint via resolveUsername(). Returns
     * a JSON error body instead of throwing, since the frontend calls this via
     * plain fetch() and renders whatever error message comes back.
     */
    public function homes(string $uuid): JsonResponse
    {
        try {
            return response()->json(['homes' => $this->mc->homes($this->resolveUsername($uuid))]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    /**
     * The mod's player-action endpoints are keyed by username, but the frontend
     * only knows a player's uuid (that's the McPlayer primary key). Resolve via
     * the (cached) online-players list — throws if the player isn't online,
     * matching the mod's own "player is not online" behavior for these actions.
     */
    private function resolveUsername(string $uuid): string
    {
        foreach ($this->mc->players() as $player) {
            if ($player['uuid'] === $uuid) {
                return $player['username'];
            }
        }

        throw new RuntimeException("Player {$uuid} is not online.");
    }
}
