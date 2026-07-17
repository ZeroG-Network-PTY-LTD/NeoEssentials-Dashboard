<?php

namespace App\Http\Controllers;

use App\Services\ConfigService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin-only runtime config: this app's own Discord OAuth app credentials
 * (separate from the mod-owned auth-config editor on the Discord page), the
 * MC API connection, and manually triggering the mod-account pull-sync (see
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
            'webhook' => $this->config->webhookConfig(),
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

    public function testMcApi(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $result = $this->config->testMcApi($data['url'], $data['username'], $data['password']);

        return back()->with($result['success'] ? 'success' : 'error', $result['message']);
    }

    public function updateMcApi(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'username' => ['required', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        $this->config->updateMcApiConfig($data['url'], $data['username'], $data['password'] ?? null);

        return back()->with('success', 'Minecraft API connection saved.');
    }

    public function regenerateWebhookSecret(): RedirectResponse
    {
        $this->config->regenerateWebhookSecret();

        return back()->with('success', 'Webhook secret regenerated — update it in the mod\'s config.json too (webDashboard.userSyncWebhookSecret).');
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
