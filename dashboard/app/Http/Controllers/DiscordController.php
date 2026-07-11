<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiscordController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    /** Status/events are readable by any logged-in account (moderator or admin). */
    public function index(): Response
    {
        return Inertia::render('Dashboard/Discord', [
            'status' => $this->mc->discordStatus(),
            'events' => $this->mc->discordEvents(),
            // Only admins see/manage the auth-config form — mirrors the mod's
            // own DiscordEndpoint restricting that route to ADMIN accounts.
            'authConfig' => auth()->user()->isAdmin() ? $this->mc->discordAuthConfig() : null,
        ]);
    }

    public function clearEvents(): RedirectResponse
    {
        $this->mc->clearDiscordEvents();

        return back()->with('success', 'Discord event log cleared.');
    }

    public function test(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'channel' => ['nullable', 'string'],
            'message' => ['nullable', 'string'],
        ]);

        $this->mc->sendDiscordTestMessage($data['channel'] ?? null, $data['message'] ?? null);

        return back()->with('success', 'Test message sent.');
    }

    public function updateAuthConfig(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'requireLinkedAccount' => ['required', 'boolean'],
            'allowAutoRegistration' => ['required', 'boolean'],
            'defaultRole' => ['required', 'string', 'in:ADMIN,MODERATOR,VIEWER'],
            'oauth2.clientId' => ['nullable', 'string'],
            'oauth2.clientSecret' => ['nullable', 'string'],
            'oauth2.redirectUri' => ['nullable', 'string'],
        ]);

        // A blank secret field means "leave it unchanged" (the form only ever
        // shows a placeholder, never the real value) — don't forward an empty
        // string that would overwrite an already-configured secret.
        if (empty($data['oauth2']['clientSecret'])) {
            unset($data['oauth2']['clientSecret']);
        }

        $this->mc->updateDiscordAuthConfig($data);

        return back()->with('success', 'Discord auth configuration updated.');
    }
}