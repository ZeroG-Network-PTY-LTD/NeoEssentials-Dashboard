<?php

namespace App\Http\Controllers;

use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin-only runtime config: this app's own Discord OAuth app credentials
 * (separate from the mod-owned auth-config editor on the Discord page), the
 * MC API connection (paired via /api/pair/complete — see PairingController),
 * and manually triggering the mod-account pull-sync (see
 * ConfigService::syncFromMod() / the scheduled `dashboard:sync-mod-users`).
 */
class ConfigurationController extends Controller
{
    public function __construct(private ConfigService $config)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Configuration', [
            'discord' => $this->config->discordAppConfig(),
            'mcApi' => $this->config->mcApiConfig(),
        ]);
    }

    public function updateDiscord(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'clientId' => ['required', 'string'],
            'clientSecret' => ['nullable', 'string'],
            'redirect' => ['required', 'url'],
        ]);

        $this->config->updateDiscordAppConfig($data['clientId'], $data['clientSecret'] ?? null, $data['redirect']);

        return back()->with('success', 'Discord OAuth app credentials saved.');
    }

    public function updateMcApiUrl(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
        ]);

        $this->config->updateMcApiUrl($data['url']);

        return back()->with('success', 'Minecraft server address saved.');
    }

    public function testMcApi(): RedirectResponse
    {
        $result = $this->config->testMcApi();

        return back()->with($result['success'] ? 'success' : 'error', $result['message']);
    }

    /** Generates a one-time pairing code and re-renders the page with it in props. */
    public function startPairing(): Response
    {
        $pairing = $this->config->startPairing();

        return Inertia::render('Dashboard/Configuration', [
            'discord' => $this->config->discordAppConfig(),
            'mcApi' => $this->config->mcApiConfig(),
            'pairing' => $pairing,
        ]);
    }

    /** Polled by the frontend while a pairing code is showing — plain JSON, no CSRF needed. */
    public function pairingStatus(): JsonResponse
    {
        return response()->json(['paired' => (bool) config('minecraft.service_api_key')]);
    }

    public function unpair(): RedirectResponse
    {
        $this->config->unpair();

        return back()->with('success', 'Unpaired. Run /dashboard unpair on the server console too, to revoke its API key.');
    }

    public function syncUsers(): RedirectResponse
    {
        try {
            $result = $this->config->syncFromMod();
        } catch (\Throwable $e) {
            return back()->with('error', "Could not reach the mod's API: {$e->getMessage()}");
        }

        return back()->with('success', "Synced {$result['total']} mod account(s) — {$result['created']} created, {$result['updated']} updated.");
    }
}
