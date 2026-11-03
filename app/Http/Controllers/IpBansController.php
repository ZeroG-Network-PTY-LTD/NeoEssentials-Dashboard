<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * IP-level bans/mutes — separate from per-player moderation (PlayerProfileController),
 * broader in effect since they apply to anyone connecting from that address, so every
 * route here is admin-only (ip-moderation.manage), unlike the more granular
 * players.ban/players.mute gates used elsewhere.
 */
class IpBansController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(Request $request): Response
    {
        $all = $request->boolean('all');

        return Inertia::render('Dashboard/IpBans', [
            'bans' => $this->safe(fn () => $this->mc->ipBans($all), []),
            'showingAll' => $all,
            'mutes' => $this->safe(fn () => $this->mc->ipMutes(), []),
        ]);
    }

    public function ban(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ip' => ['required', 'ip'],
            'reason' => ['required', 'string', 'max:1000'],
            'duration' => ['nullable', 'integer', 'min:1'],
        ]);

        return $this->attempt(
            fn () => $this->mc->banIp($data['ip'], $data['reason'], $data['duration'] ?? null),
            "IP {$data['ip']} banned.",
        );
    }

    public function unban(string $ip): RedirectResponse
    {
        return $this->attempt(
            fn () => $this->mc->unbanIp($ip),
            "IP {$ip} unbanned.",
        );
    }

    public function mute(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ip' => ['required', 'ip'],
            'reason' => ['required', 'string', 'max:1000'],
            'duration' => ['nullable', 'integer', 'min:1'],
        ]);

        return $this->attempt(
            fn () => $this->mc->muteIp($data['ip'], $data['reason'], $data['duration'] ?? null),
            "IP {$data['ip']} muted.",
        );
    }

    public function unmute(string $ip): RedirectResponse
    {
        return $this->attempt(
            fn () => $this->mc->unmuteIp($ip),
            "IP {$ip} unmuted.",
        );
    }
}
