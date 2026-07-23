<?php

namespace App\Services;

use App\Models\McConnection;
use App\Models\User;
use App\Support\WritesEnvFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
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

    // --- Minecraft mod API connection (paired via /api/pair/complete, see
    // PairingController) -----------------------------------------------------

    public function mcApiConfig(): array
    {
        return [
            'url' => config('minecraft.api_url'),
            'paired' => McConnection::current()->isPaired(),
        ];
    }

    public function updateMcApiUrl(string $url): void
    {
        $this->writeEnv(['MC_API_URL' => $url]);
    }

    /**
     * Step 1 of /install — the admin pastes a key straight from the mod's own
     * `/apikey create` console command instead of going through the pairing-code
     * round trip (that flow still exists, unchanged, from the Configuration page for
     * anyone who also wants the mod to be able to push webhook updates). Saves the
     * key first so a fresh MinecraftApiService instance actually picks it up (its
     * constructor reads McConnection::current() once, at construction time), then
     * makes a real test call; rolls the fields back out on failure so a bad paste
     * never lingers as if it were a working connection.
     */
    public function connectWithApiKey(string $rawKey): array
    {
        $connection = McConnection::current();
        $connection->update([
            'api_key' => $rawKey,
            'api_key_id' => $this->extractKeyId($rawKey),
        ]);

        try {
            app(MinecraftApiService::class)->status();

            return ['success' => true, 'message' => 'Connected to the Minecraft server.'];
        } catch (\Throwable $e) {
            $connection->update(['api_key' => null, 'api_key_id' => null]);

            return ['success' => false, 'message' => "Could not connect with that key: {$e->getMessage()}"];
        }
    }

    /** Generates a one-time pairing code the admin pastes into `/dashboard pair` in-game. */
    public function startPairing(): array
    {
        $code = Str::upper(Str::random(8));
        Cache::put("pairing_code:{$code}", true, now()->addMinutes(10));

        $dashboardUrl = rtrim(config('app.url'), '/');

        return [
            'code' => $code,
            'dashboardUrl' => $dashboardUrl,
            // The URL must be quoted in-game — Brigadier's unquoted string parsing can't
            // contain ':' or '/', which every URL does.
            'command' => "/dashboard pair \"{$dashboardUrl}\" {$code}",
            'expiresInSeconds' => 600,
        ];
    }

    /**
     * Called by PairingController (public route, hit by the mod's /dashboard pair command) once
     * the admin has run the printed command. Mints our own token for the mod to use on its
     * outbound user-sync webhook, and stores the mod's token for our own outbound REST calls —
     * both directions connected in one round trip, nothing hand-copied between config files.
     */
    public function completePairing(string $code, string $modToken, ?string $serverName, ?int $websocketPort = null): array
    {
        if (! Cache::pull("pairing_code:{$code}")) {
            return ['success' => false, 'message' => 'Invalid or expired pairing code.'];
        }

        $dashboardToken = Str::random(40);

        McConnection::current()->update([
            'api_key' => $modToken,
            'api_key_id' => $this->extractKeyId($modToken),
            'webhook_token' => $dashboardToken,
            'ws_port' => $websocketPort,
            'server_name' => $serverName,
        ]);

        return [
            'success' => true,
            'dashboardToken' => $dashboardToken,
        ];
    }

    /**
     * Best-effort: revokes this connection's own API key on the mod (self-service, since a
     * freshly-paired key is minted with ADMIN role) before clearing the local row, so unpairing
     * here doesn't leave a live, unrevoked credential dangling on the mod side until someone
     * separately remembers to run `/dashboard unpair` in-game too. Still clears local state even
     * if the mod is unreachable — an admin unpairing from here shouldn't get stuck because the
     * game server happens to be offline right now.
     */
    public function unpair(): void
    {
        $connection = McConnection::current();

        if ($connection->api_key_id) {
            try {
                $this->mc->revokeApiKey($connection->api_key_id);
            } catch (\Throwable $e) {
                Log::warning('Could not revoke the mod-side API key during unpair — it may need manual cleanup via /apikey revoke', [
                    'keyId' => $connection->api_key_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $connection->update([
            'api_key' => null,
            'api_key_id' => null,
            'webhook_token' => null,
            'ws_port' => null,
            'server_name' => null,
        ]);
    }

    /**
     * Pulls the public `keyId` out of a `neo_<keyId>_<secret>` token — mirrors the mod's own
     * ApiKeyManager.extractKeyId(), including the fixed-width slice (NOT split on the first
     * underscore: base64url's alphabet includes `_`, so it isn't a reliable separator). Returns
     * null for anything that doesn't match the mod's token shape.
     */
    private function extractKeyId(string $token): ?string
    {
        $prefix = 'neo_';
        $keyIdLength = 12; // (KEY_ID_BYTES=9 * 8 bits) / 6 bits-per-base64url-char

        if (! str_starts_with($token, $prefix)) {
            return null;
        }

        $rest = substr($token, strlen($prefix));

        if (strlen($rest) <= $keyIdLength + 1 || $rest[$keyIdLength] !== '_') {
            return null;
        }

        return substr($rest, 0, $keyIdLength);
    }

    /**
     * Whether a Minecraft account should be admin here — decided by the mod's own
     * LuckPerms-style permission GROUP (config('minecraft.admin_group'), matches
     * PermissionUserLookupResult['group']), not the coarser ADMIN/OPERATOR/MODERATOR/
     * VIEWER dashboard-account role the mod also exposes. Any failure (mod
     * unreachable, player not found) falls back to 'moderator' — this must never
     * silently grant admin on ambiguity.
     */
    public function resolveLocalRole(string $mcUsername): string
    {
        try {
            $result = $this->mc->permissionUserLookup($mcUsername);
        } catch (\Throwable $e) {
            return 'moderator';
        }

        if (! ($result['success'] ?? false)) {
            return 'moderator';
        }

        return ($result['group'] ?? null) === config('minecraft.admin_group') ? 'admin' : 'moderator';
    }

    public function testMcApi(): array
    {
        if (! McConnection::current()->isPaired()) {
            return ['success' => false, 'message' => 'Not paired with a Minecraft server yet.'];
        }

        try {
            $status = $this->mc->status();

            return ['success' => true, 'message' => 'Connected — server reports '.($status['onlineCount'] ?? 0).' player(s) online.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
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

            $role = $this->resolveLocalRole($username);

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
