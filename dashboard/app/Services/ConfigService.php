<?php

namespace App\Services;

use App\Models\User;
use App\Support\WritesEnvFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Post-install runtime configuration — Discord OAuth app credentials, the MC
 * API connection, and reconciling this app's `users` table against the
 * mod's own dashboard-account store. All admin-only (see ConfigurationController).
 */
class ConfigService
{
    use WritesEnvFile;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    // --- Discord OAuth app (this app's own Socialite credentials — NOT the
    // mod-owned enabled/requireLinkedAccount/allowAutoRegistration/defaultRole
    // config, which already has its own editor on the Discord page) ---------

    public function discordAppConfig(): array
    {
        return [
            'clientId' => config('services.discord.client_id'),
            'clientSecretSet' => (bool) config('services.discord.client_secret'),
            'clientSecretMasked' => $this->maskSecret(config('services.discord.client_secret')),
            'redirect' => config('services.discord.redirect'),
        ];
    }

    public function updateDiscordAppConfig(string $clientId, ?string $clientSecret, string $redirect): void
    {
        $updates = [
            'DISCORD_CLIENT_ID' => $clientId,
            'DISCORD_REDIRECT_URI' => $redirect,
        ];

        // Blank secret in the form means "leave the existing one alone" — the
        // UI never round-trips the real secret back to the browser, so an
        // empty submit isn't "the admin wants to clear it," it's "the admin
        // didn't touch this field."
        if (filled($clientSecret)) {
            $updates['DISCORD_CLIENT_SECRET'] = $clientSecret;
        }

        $this->writeEnv($updates);
    }

    // --- Minecraft mod API connection ---------------------------------------

    public function mcApiConfig(): array
    {
        return [
            'url' => config('minecraft.api_url'),
            'username' => config('minecraft.service_username'),
            'passwordSet' => (bool) config('minecraft.service_password'),
            'passwordMasked' => $this->maskSecret(config('minecraft.service_password')),
        ];
    }

    public function updateMcApiConfig(string $url, string $username, ?string $password): void
    {
        $updates = [
            'MC_API_URL' => $url,
            'MC_SERVICE_USERNAME' => $username,
        ];

        if (filled($password)) {
            $updates['MC_SERVICE_PASSWORD'] = $password;
        }

        $this->writeEnv($updates);
    }

    public function testMcApi(string $url, string $username, string $password): array
    {
        try {
            $response = Http::timeout(6)
                ->post(rtrim($url, '/').'/api/auth/login', ['username' => $username, 'password' => $password]);

            return $response->successful()
                ? ['success' => true, 'message' => 'Connected and authenticated successfully.']
                : ['success' => false, 'message' => "Server responded with {$response->status()}."];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // --- Webhook secret (for the mod's optional DashboardUserSyncWebhook —
    // see routes/webhooks.php / WebhookController) --------------------------

    public function webhookConfig(): array
    {
        return [
            'url' => url('/webhooks/mod/user-sync'),
            'secretSet' => (bool) config('services.mod_sync.webhook_secret'),
            'secretMasked' => $this->maskSecret(config('services.mod_sync.webhook_secret')),
        ];
    }

    public function regenerateWebhookSecret(): string
    {
        $secret = Str::random(40);
        $this->writeEnv(['MOD_SYNC_WEBHOOK_SECRET' => $secret]);

        return $secret;
    }

    // --- Pull-based reconciliation: mod → Laravel ---------------------------

    /**
     * Fetches every account from the mod's own dashboard-account store and
     * upserts a local shadow User for each one (keyed by mod_username, same
     * key LoginRequest::mirrorModUser() uses) — this is what actually solves
     * "the mod has an account the dashboard doesn't know about yet" without
     * waiting for that person to log in first. Does not set a usable local
     * password (this app has never seen it) — first real login through
     * LoginRequest still authenticates against the mod and fills in a working
     * local-fallback copy at that point; this just makes sure the row (and
     * therefore the correct role) exists in the meantime.
     *
     * Deliberately does not touch: existing local password hashes, Discord
     * linkage fields, or accounts that only exist locally (Laravel-native
     * registrations with no matching mod_username) — pull-sync only ever
     * creates/updates rows it can attribute to a specific mod username.
     */
    public function syncFromMod(): array
    {
        $modUsers = $this->mc->modUsers();

        $created = 0;
        $updated = 0;

        foreach ($modUsers as $modUser) {
            $username = $modUser['username'] ?? null;
            if (! $username) {
                continue;
            }

            $role = match ($modUser['role'] ?? 'VIEWER') {
                'ADMIN' => 'admin',
                default => 'moderator', // OPERATOR / MODERATOR / VIEWER — this app only has two tiers
            };

            $existing = User::where('mod_username', $username)->first();

            if ($existing) {
                $changed = $existing->role !== $role
                    || ($modUser['email'] ?? null) && $existing->email !== $modUser['email'];

                if ($changed) {
                    $existing->role = $role;
                    if (! empty($modUser['email'])) {
                        $existing->email = $modUser['email'];
                    }
                    $existing->save();
                    $updated++;
                }

                continue;
            }

            // No local row for this mod username yet — create a shadow account
            // with an unusable random password (nobody's typed a real one into
            // THIS app yet; the mod-auth login path fills in a working local
            // fallback copy the first time this person actually logs in here).
            $user = new User();
            $user->mod_username = $username;
            $user->name = $username;
            $user->email = $modUser['email'] ?: "{$username}@mod.local";
            $user->password = bcrypt(Str::random(40));
            $user->role = $role;
            $user->save();
            $created++;
        }

        return ['success' => true, 'created' => $created, 'updated' => $updated, 'total' => count($modUsers)];
    }
}
