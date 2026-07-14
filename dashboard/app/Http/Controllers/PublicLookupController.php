<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public (no login required, either here or on the mod side) player moderation
 * lookup — bans/mutes/kicks/warns by player name, plus a recent-activity feed.
 * Matches ban-management plugins' public transparency page. Never exposes IP
 * bans/IP mutes, staff notes, or player reports — see
 * MinecraftApiService::publicLookup()/publicRecent() and the mod's
 * PublicModerationEndpoint for what's deliberately excluded.
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
            'recent' => $this->safe(fn () => $this->mc->publicRecent(), []),
        ]);
    }
}