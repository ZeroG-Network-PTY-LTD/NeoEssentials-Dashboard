<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiscordController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    /** Status/events are readable by any logged-in account (moderator or admin). */
    public function index(): Response
    {
        $fallbackStatus = ['anyActive' => false, 'adapterCount' => 0, 'eventCount' => 0, 'adapters' => []];

        return Inertia::render('Dashboard/Discord', [
            'status' => $this->safe(fn () => $this->mc->discordStatus(), $fallbackStatus),
            'events' => $this->safe(fn () => $this->mc->discordEvents(), []),
            // Only admins see/manage the auth-config form — mirrors the mod's
            // own DiscordEndpoint restricting that route to ADMIN accounts.
            'authConfig' => auth()->user()->isAdmin()
                ? $this->safe(fn () => $this->mc->discordAuthConfig(), null)
                : null,
        ]);
    }

    public function clearEvents(): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->clearDiscordEvents(), 'Discord event log cleared.');
    }

    public function test(Request $request): RedirectResponse
    {
        // The mod sends this via the companion Discord bot's own channel-ID lookup — it needs
        // the actual numeric Discord channel snowflake, not a display name (Discord channel
        // names aren't unique and the bot has no "search by name" concept here).
        $data = $request->validate([
            'channel' => ['required', 'string', 'regex:/^\d{15,25}$/'],
            'message' => ['nullable', 'string'],
        ], [
            'channel.regex' => 'This must be the channel\'s numeric ID (right-click the channel in Discord with Developer Mode on, then "Copy Channel ID") — not its name.',
        ]);

        return $this->attempt(
            fn () => $this->mc->sendDiscordTestMessage($data['channel'], $data['message'] ?? null),
            'Test message sent.',
        );
    }

    public function updateAuthConfig(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'requireLinkedAccount' => ['required', 'boolean'],
            'allowAutoRegistration' => ['required', 'boolean'],
            'defaultRole' => ['required', 'string', 'in:ADMIN,OPERATOR,MODERATOR,VIEWER'],
        ]);

        return $this->attempt(
            fn () => $this->mc->updateDiscordAuthConfig($data),
            'Discord auth configuration updated.',
        );
    }
}