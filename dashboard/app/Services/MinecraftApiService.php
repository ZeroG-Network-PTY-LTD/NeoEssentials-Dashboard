<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Single point of contact between the dashboard and the mod's embedded
 * HTTP API. Every controller talks to the mod through this class — nothing
 * else in the app should call Http::/... directly against MC_API_URL.
 *
 * Also acts as an anti-corruption layer: the mod's JSON field names/shapes
 * (username-keyed player actions, `world` instead of `dimension`, millisecond
 * timestamps, etc.) are mapped here into the exact shapes the Inertia pages
 * and resources/js/types/minecraft.ts expect, so nothing above this class
 * needs to know about the mod's actual REST contract.
 */
class MinecraftApiService
{
    private string $baseUrl;
    private string $serviceUsername;
    private string $servicePassword;
    private int $timeout;
    private int $cacheTtl;
    private int $sessionCacheTtl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('minecraft.api_url'), '/');
        $this->serviceUsername = (string) config('minecraft.service_username');
        $this->servicePassword = (string) config('minecraft.service_password');
        $this->timeout = (int) config('minecraft.timeout');
        $this->cacheTtl = (int) config('minecraft.cache_ttl');
        $this->sessionCacheTtl = (int) config('minecraft.session_cache_ttl');
    }

    // --- Status / players -----------------------------------------------

    /** Server status: TPS, uptime, online count, memory. Cached briefly. */
    public function status(): array
    {
        return Cache::remember('mc_api:status', $this->cacheTtl, function () {
            $status = $this->get('api/server/status');
            $performance = $this->get('api/stats/performance');

            return [
                'online' => (bool) ($status['online'] ?? false),
                'tps' => (float) ($status['tps'] ?? 0),
                'uptimeSeconds' => (int) round(($status['uptimeMillis'] ?? 0) / 1000),
                'onlineCount' => (int) ($status['playersOnline'] ?? 0),
                'maxPlayers' => (int) ($status['playersMax'] ?? 0),
                'memoryUsedMb' => (int) ($performance['memUsedMb'] ?? 0),
                'memoryMaxMb' => (int) ($performance['memMaxMb'] ?? 0),
            ];
        });
    }

    /** Online players, shaped to match the McPlayer type. Cached briefly. */
    public function players(): array
    {
        $data = Cache::remember('mc_api:players', $this->cacheTtl, fn () => $this->get('api/player/online'));
        $online = $data['online'] ?? [];

        return array_map(fn (array $p) => [
            'uuid' => $p['uuid'],
            'username' => $p['username'],
            // The mod doesn't have a "rank" concept exposed cheaply for a bulk
            // player list (that would mean one /api/permissions lookup per
            // player) — approximate it from operator status instead.
            'rank' => ($p['operator'] ?? false) ? 'op' : 'player',
            'online' => true,
            'health' => (float) ($p['health'] ?? 20),
            'maxHealth' => (float) ($p['maxHealth'] ?? 20),
            'hunger' => (float) ($p['foodLevel'] ?? 20),
            'dimension' => $p['dimension'] ?? 'minecraft:overworld',
            'x' => (float) ($p['x'] ?? 0),
            'y' => (float) ($p['y'] ?? 0),
            'z' => (float) ($p['z'] ?? 0),
            'playtimeMinutes' => 0, // not exposed by the mod's online-player list
            'balance' => 0,          // fetch via economyLeaderboard() if needed
        ], $online);
    }

    // --- Player actions (identifier is a username, per the mod's contract) --

    public function teleportPlayer(string $username, array $payload): array
    {
        return $this->post("api/player/teleport/{$username}", $payload);
    }

    public function healPlayer(string $username): array
    {
        return $this->post("api/player/heal/{$username}", []);
    }

    public function kickPlayer(string $username, string $reason): array
    {
        return $this->post("api/player/kick/{$username}", ['reason' => $reason]);
    }

    public function banPlayer(string $username, string $reason, ?string $duration = null): array
    {
        return $this->post('api/moderation/ban', [
            'target' => $username,
            'playerName' => $username,
            'reason' => $reason,
            'type' => 'NAME',
            'duration' => $duration ? (int) $duration : -1, // seconds; -1 = permanent
        ]);
    }

    public function mutePlayer(string $username, ?string $duration = null): array
    {
        return $this->post('api/moderation/mute', [
            'targetName' => $username,
            'duration' => $duration ? (int) $duration : null, // seconds; omit = indefinite
        ]);
    }

    // --- Public moderation lookup (no dashboard login required on either side —
    // the mod's /api/public/moderation/* routes are registered without the
    // Bearer-token check, so these deliberately skip the service-account session
    // machinery entirely rather than calling request()/get()) -------------------

    /** Bans/mutes/kicks/warns for one player, by name. Never includes IP bans/mutes. */
    public function publicLookup(string $username): array
    {
        return $this->publicGet("api/public/moderation/lookup/{$username}");
    }

    /** Recent active bans + mutes across all players, newest first. */
    public function publicRecent(): array
    {
        $data = $this->publicGet('api/public/moderation/recent');

        return $data['recent'] ?? [];
    }

    private function publicGet(string $path): array
    {
        try {
            $response = Http::timeout($this->timeout)->get("{$this->baseUrl}/{$path}");
        } catch (\Throwable $e) {
            Log::warning('Minecraft public API unreachable', ['path' => $path, 'error' => $e->getMessage()]);
            throw new RuntimeException('Could not reach the Minecraft server API. Is the server online?');
        }

        if ($response->failed()) {
            Log::warning('Minecraft public API error', ['path' => $path, 'status' => $response->status()]);
            throw new RuntimeException("Minecraft API returned an error ({$response->status()}).");
        }

        return $response->json() ?? [];
    }

    // --- Economy -----------------------------------------------------------

    /** Balance leaderboard, shaped to match LeaderboardEntry[]. Cached briefly. */
    public function economyLeaderboard(): array
    {
        $data = Cache::remember('mc_api:economy_leaderboard', $this->cacheTtl,
            fn () => $this->get('api/stats/economy'));
        $top = $data['topPlayers'] ?? [];

        return array_map(fn (array $e) => [
            'uuid' => $e['uuid'],
            'username' => $e['name'],
            'balance' => (float) $e['balance'],
        ], $top);
    }

    /** $identifier may be a username or a raw UUID — the mod accepts either. */
    public function economyAdjust(string $identifier, string $action, float $amount): array
    {
        return $this->post("api/economy/{$identifier}", [
            'action' => $action, // give | take | set
            'amount' => $amount,
        ]);
    }

    // --- Warps ---------------------------------------------------------------

    /** Public warps, shaped to match the Warp type. Cached briefly. */
    public function warps(): array
    {
        $data = Cache::remember('mc_api:warps', $this->cacheTtl, fn () => $this->get('api/warps'));
        $warps = $data['warps'] ?? [];

        return array_map(fn (array $w) => [
            'name' => $w['name'],
            'x' => (float) $w['x'],
            'y' => (float) $w['y'],
            'z' => (float) $w['z'],
            'dimension' => $w['world'] ?? 'minecraft:overworld',
            'createdBy' => $w['createdBy'] ?? 'Unknown',
        ], $warps);
    }

    public function createWarp(string $name, array $location): array
    {
        return $this->post('api/warps', array_merge(['name' => $name], $location));
    }

    public function deleteWarp(string $name): array
    {
        return $this->delete("api/warps/{$name}");
    }

    // --- Kits (read-only — the mod's KitsEndpoint has no create/update/delete/
    // give routes, only list/stats/single-view) --------------------------------

    /** All configured kits, shaped to match KitsEndpoint's kitJson. Cached briefly. */
    public function kits(): array
    {
        $data = Cache::remember('mc_api:kits', $this->cacheTtl, fn () => $this->get('api/kits/list'));

        return $data['kits'] ?? [];
    }

    public function kitStats(): array
    {
        return Cache::remember('mc_api:kit_stats', $this->cacheTtl, fn () => $this->get('api/kits/stats'));
    }

    // --- Holograms (full CRUD, no admin gate on the mod side — same rule as
    // Warps: any logged-in dashboard account can manage them) ------------------

    public function holograms(): array
    {
        $data = Cache::remember('mc_api:holograms', $this->cacheTtl, fn () => $this->get('api/holograms/list'));

        return $data['holograms'] ?? [];
    }

    public function hologramStats(): array
    {
        return Cache::remember('mc_api:hologram_stats', $this->cacheTtl, fn () => $this->get('api/holograms/stats'));
    }

    public function hologram(string $id): array
    {
        return $this->get("api/holograms/{$id}")['hologram'] ?? [];
    }

    public function createHologram(array $hologram): array
    {
        return $this->post('api/holograms/create', $hologram);
    }

    public function updateHologram(string $id, array $hologram): array
    {
        return $this->put("api/holograms/{$id}", $hologram);
    }

    public function deleteHologram(string $id): array
    {
        return $this->delete("api/holograms/{$id}");
    }

    public function spawnHologram(string $id): array
    {
        return $this->post("api/holograms/{$id}/spawn", []);
    }

    public function despawnHologram(string $id): array
    {
        return $this->post("api/holograms/{$id}/despawn", []);
    }

    public function toggleHologramVisibility(string $id): array
    {
        return $this->post("api/holograms/{$id}/visible", []);
    }

    // --- Discord integration (status/events readable by any logged-in account;
    // clearing events, sending a test message, and auth-config are admin-only,
    // mirroring the mod's own DiscordEndpoint restrictions) ---------------------

    public function discordStatus(): array
    {
        return Cache::remember('mc_api:discord_status', $this->cacheTtl, fn () => $this->get('api/discord/status'));
    }

    public function discordEvents(int $limit = 50): array
    {
        $data = $this->get('api/discord/events', ['limit' => $limit]);

        return $data['events'] ?? [];
    }

    public function clearDiscordEvents(): array
    {
        return $this->delete('api/discord/events');
    }

    public function sendDiscordTestMessage(?string $channel, ?string $message): array
    {
        return $this->post('api/discord/test', array_filter([
            'channel' => $channel,
            'message' => $message,
        ], fn ($v) => $v !== null && $v !== ''));
    }

    public function discordAuthConfig(): array
    {
        return $this->get('api/discord/auth-config');
    }

    public function updateDiscordAuthConfig(array $config): array
    {
        return $this->post('api/discord/auth-config', $config);
    }

    // --- Permissions (PermissionEndpoint — GET is open to any logged-in
    // account, every write requires the mod's own admin session, so all
    // mutation methods here are only ever called from gated controller
    // actions) ------------------------------------------------------------

    public function permissionOverview(): array
    {
        return $this->get('api/permissions/overview');
    }

    public function permissionGroups(): array
    {
        return $this->get('api/permissions/groups')['groups'] ?? [];
    }

    public function permissionUsers(): array
    {
        return $this->get('api/permissions/users')['users'] ?? [];
    }

    public function permissionAliases(): array
    {
        $data = $this->get('api/permissions/aliases');

        return $data['aliases'] ?? [];
    }

    public function reloadPermissions(): array
    {
        return $this->post('api/permissions/reload', []);
    }

    public function createPermissionGroup(string $name, string $prefix = '', string $suffix = '', bool $isDefault = false): array
    {
        return $this->post('api/permissions/group/create', [
            'name' => $name,
            'prefix' => $prefix,
            'suffix' => $suffix,
            'isDefault' => $isDefault,
        ]);
    }

    public function updatePermissionGroup(string $name, array $data): array
    {
        return $this->put("api/permissions/group/{$name}/update", $data);
    }

    public function deletePermissionGroup(string $name): array
    {
        return $this->delete("api/permissions/group/{$name}");
    }

    public function addGroupPermission(string $group, string $permission): array
    {
        return $this->post("api/permissions/group/{$group}/permission/add", ['permission' => $permission]);
    }

    public function removeGroupPermission(string $group, string $permission): array
    {
        return $this->delete("api/permissions/group/{$group}/permission/remove/{$permission}");
    }

    public function setUserGroup(string $username, string $group): array
    {
        return $this->post("api/permissions/user/{$username}/group/set", ['group' => $group]);
    }

    public function addUserPermission(string $username, string $permission): array
    {
        return $this->post("api/permissions/user/{$username}/permission/add", ['permission' => $permission]);
    }

    public function removeUserPermission(string $username, string $permission): array
    {
        return $this->delete("api/permissions/user/{$username}/permission/remove/{$permission}");
    }

    public function addPermissionAlias(string $alias, string $canonical): array
    {
        return $this->post('api/permissions/aliases', ['alias' => $alias, 'canonical' => $canonical]);
    }

    public function removePermissionAlias(string $alias): array
    {
        return $this->delete("api/permissions/aliases/{$alias}");
    }

    // --- Backups (BackupEndpoint — status/list are readable by any logged-in
    // account, create/restore/delete require the mod's own admin session) -----

    public function backupStatus(): array
    {
        return $this->get('api/backup/status');
    }

    public function backupList(): array
    {
        $result = $this->get('api/backup/list');

        // The mod returns a bare JSON array for this endpoint, not an object —
        // Http::json() decodes that as a numerically-indexed array already.
        return array_is_list($result) ? $result : ($result['snapshots'] ?? []);
    }

    public function createBackup(string $name, array $targets): array
    {
        return $this->post('api/backup/create', ['name' => $name, 'targets' => $targets]);
    }

    public function restoreBackup(string $name): array
    {
        return $this->post('api/backup/restore', ['name' => $name]);
    }

    public function deleteBackup(string $name): array
    {
        return $this->delete('api/backup/delete?name=' . urlencode($name));
    }

    /** Streams the raw ZIP response back — callers pipe this straight to the browser. */
    public function downloadBackup(string $name): \Illuminate\Http\Client\Response
    {
        return $this->rawGet('api/backup/download?name=' . urlencode($name));
    }

    // --- Cloud storage (CloudStorageEndpoint — status/config/file-listing are
    // readable by any logged-in account, everything else is admin-only) -------

    public function cloudStatus(): array
    {
        return $this->get('api/cloud/status');
    }

    public function cloudConfig(): array
    {
        return $this->get('api/cloud/config');
    }

    public function configureDropbox(string $accessToken, string $uploadPath): array
    {
        return $this->post('api/cloud/config/dropbox', ['accessToken' => $accessToken, 'uploadPath' => $uploadPath]);
    }

    public function configureGoogleDrive(string $refreshToken, string $clientId, string $clientSecret, string $folderId): array
    {
        return $this->post('api/cloud/config/google', [
            'refreshToken' => $refreshToken,
            'clientId' => $clientId,
            'clientSecret' => $clientSecret,
            'folderId' => $folderId,
        ]);
    }

    public function testDropbox(): array
    {
        return $this->post('api/cloud/test/dropbox', []);
    }

    public function testGoogleDrive(): array
    {
        return $this->post('api/cloud/test/google', []);
    }

    public function cloudDropboxFiles(): array
    {
        return $this->get('api/cloud/files/dropbox')['files'] ?? [];
    }

    public function cloudGoogleFiles(): array
    {
        return $this->get('api/cloud/files/google')['files'] ?? [];
    }

    public function uploadBackupToDropbox(string $backupId): array
    {
        return $this->post("api/cloud/upload/dropbox/{$backupId}", []);
    }

    public function uploadBackupToGoogleDrive(string $backupId): array
    {
        return $this->post("api/cloud/upload/google/{$backupId}", []);
    }

    public function deleteDropboxFile(string $filePath): array
    {
        return $this->delete('api/cloud/files/dropbox/' . rawurlencode($filePath));
    }

    public function deleteGoogleDriveFile(string $fileId): array
    {
        return $this->delete("api/cloud/files/google/{$fileId}");
    }

    // --- Mod dashboard accounts (UserManagementEndpoint — entirely admin-only
    // on the mod side; distinct from THIS app's own users table/roles) ---------

    /** Accounts that can log into the mod's OWN dashboard (not this app's). */
    public function modUsers(): array
    {
        $data = $this->get('api/users/list');

        return $data['users'] ?? [];
    }

    public function modUserSessions(): array
    {
        $data = $this->get('api/users/sessions');

        return $data['sessions'] ?? [];
    }

    public function createModUser(string $username, string $password, string $email, string $role): array
    {
        return $this->post('api/users/create', [
            'username' => $username,
            'password' => $password,
            'email' => $email,
            'role' => $role, // ADMIN | MODERATOR | VIEWER
        ]);
    }

    public function setModUserRole(string $id, string $role): array
    {
        return $this->post("api/users/{$id}/role", ['role' => $role]);
    }

    /** Omit/blank $password to have the mod generate and return a temp one. */
    public function setModUserPassword(string $id, ?string $password = null): array
    {
        return $this->post("api/users/{$id}/password", ['password' => $password ?? '']);
    }

    public function enableModUser(string $id): array
    {
        return $this->post("api/users/{$id}/enable", []);
    }

    public function disableModUser(string $id): array
    {
        return $this->post("api/users/{$id}/disable", []);
    }

    public function deleteModUser(string $id): array
    {
        return $this->delete("api/users/{$id}");
    }

    public function revokeModUserSession(string $sessionId): array
    {
        return $this->delete("api/users/sessions/{$sessionId}");
    }

    // --- Homes / console -----------------------------------------------------

    public function homes(string $username): array
    {
        return $this->get("api/player/homes/{$username}")['homes'] ?? [];
    }

    public function runCommand(string $command): array
    {
        return $this->post('api/commands/execute', ['command' => $command]);
    }

    /** Recent join/leave/chat/command activity, shaped to match LogEntry[]. */
    public function logs(?int $since = null): array
    {
        $data = $this->get('api/game/events');
        $events = $data['events'] ?? [];

        // Types with a LogEntry equivalent — anything else (e.g. block.break, which
        // the mod also queues for the activity-summary/top-blocks endpoints) has no
        // matching LogEntryType and is dropped here rather than mismapped.
        $typeMap = [
            'player.join' => 'join',
            'player.leave' => 'leave',
            'player.chat' => 'chat',
            'player.command' => 'command',
        ];

        $entries = [];
        foreach ($events as $e) {
            $type = $typeMap[$e['type'] ?? ''] ?? null;
            if ($type === null) {
                continue;
            }

            $message = $e['message'] ?? '';
            // Every message the mod generates for these types starts with the
            // player's name (e.g. "Steve joined the game", "Steve: hi", "Steve ran:
            // /tp"). Extracting it from there — rather than looking the uuid up in
            // the online-players list — works for `leave` and any historical event
            // whose player has since disconnected, not just currently-online ones.
            $username = str_contains($message, ' ') ? strstr($message, ' ', true) : $message;

            $entries[] = [
                'timestamp' => (int) round(($e['timestamp'] ?? 0) / 1000), // ms -> seconds
                'type' => $type,
                'username' => $username ?: '',
                'message' => $message,
            ];
        }

        if ($since !== null) {
            $entries = array_values(array_filter($entries, fn (array $e) => $e['timestamp'] >= $since));
        }

        return $entries;
    }

    // --- internals ---------------------------------------------------

    private function cachedGet(string $cacheKey, string $path): array
    {
        return Cache::remember("mc_api:{$cacheKey}", $this->cacheTtl, fn () => $this->get($path));
    }

    private function get(string $path, array $query = []): array
    {
        return $this->request('get', $path, $query);
    }

    private function post(string $path, array $payload): array
    {
        $result = $this->request('post', $path, $payload);
        $this->bustCaches();
        return $result;
    }

    private function put(string $path, array $payload): array
    {
        $result = $this->request('put', $path, $payload);
        $this->bustCaches();
        return $result;
    }

    private function delete(string $path): array
    {
        $result = $this->request('delete', $path);
        $this->bustCaches();
        return $result;
    }

    /**
     * @param bool $isRetry internal — set on the single allowed retry after a 401,
     *                       to avoid an infinite loop if the service account itself is broken.
     */
    private function request(string $method, string $path, array $data = [], bool $isRetry = false): array
    {
        $sessionId = $this->sessionId();

        try {
            $response = Http::withToken($sessionId)
                ->timeout($this->timeout)
                ->{$method}("{$this->baseUrl}/{$path}", $data);
        } catch (\Throwable $e) {
            Log::warning('Minecraft API unreachable', ['path' => $path, 'error' => $e->getMessage()]);
            $this->markReachable(false);
            throw new RuntimeException('Could not reach the Minecraft server API. Is the server online?');
        }

        if ($response->status() === 401) {
            if ($isRetry) {
                throw new RuntimeException('Minecraft API rejected the dashboard service account — check MC_SERVICE_USERNAME/MC_SERVICE_PASSWORD.');
            }
            // Session expired or was invalidated server-side — log in again and retry once.
            Cache::forget('mc_api:session_id');
            return $this->request($method, $path, $data, true);
        }

        if ($response->failed()) {
            Log::warning('Minecraft API error', ['path' => $path, 'status' => $response->status(), 'body' => $response->body()]);
            throw new RuntimeException("Minecraft API returned an error ({$response->status()}).");
        }

        $this->markReachable(true);

        return $response->json() ?? [];
    }

    /** Like request(), but returns the raw response for binary payloads (backup ZIP downloads). */
    private function rawGet(string $path, bool $isRetry = false): \Illuminate\Http\Client\Response
    {
        $sessionId = $this->sessionId();

        try {
            $response = Http::withToken($sessionId)->timeout($this->timeout)->get("{$this->baseUrl}/{$path}");
        } catch (\Throwable $e) {
            Log::warning('Minecraft API unreachable', ['path' => $path, 'error' => $e->getMessage()]);
            $this->markReachable(false);
            throw new RuntimeException('Could not reach the Minecraft server API. Is the server online?');
        }

        if ($response->status() === 401 && !$isRetry) {
            Cache::forget('mc_api:session_id');
            return $this->rawGet($path, true);
        }

        if ($response->failed()) {
            Log::warning('Minecraft API error', ['path' => $path, 'status' => $response->status()]);
            throw new RuntimeException("Minecraft API returned an error ({$response->status()}).");
        }

        $this->markReachable(true);

        return $response;
    }

    /** Returns a cached session id, logging in fresh if none is cached or valid. */
    private function sessionId(): string
    {
        return Cache::remember('mc_api:session_id', $this->sessionCacheTtl, function () {
            if (empty($this->serviceUsername) || empty($this->servicePassword)) {
                throw new RuntimeException('MC_SERVICE_USERNAME / MC_SERVICE_PASSWORD are not configured.');
            }

            try {
                $response = Http::timeout($this->timeout)
                    ->post("{$this->baseUrl}/api/auth/login", [
                        'username' => $this->serviceUsername,
                        'password' => $this->servicePassword,
                    ]);
            } catch (\Throwable $e) {
                Log::warning('Minecraft API login unreachable', ['error' => $e->getMessage()]);
                $this->markReachable(false);
                throw new RuntimeException('Could not reach the Minecraft server API to log in. Is the server online?');
            }

            if ($response->failed() || !($response->json('success'))) {
                Log::warning('Minecraft API login failed', ['status' => $response->status(), 'body' => $response->body()]);
                $this->markReachable(false);
                throw new RuntimeException('Minecraft API login failed — check MC_SERVICE_USERNAME/MC_SERVICE_PASSWORD.');
            }

            $this->markReachable(true);

            return $response->json('sessionId');
        });
    }

    private function bustCaches(): void
    {
        foreach (['status', 'players', 'economy_leaderboard', 'warps', 'holograms', 'hologram_stats', 'discord_status'] as $key) {
            Cache::forget("mc_api:{$key}");
        }
    }

    /**
     * Tracks the outcome of the most recent real request/login attempt made
     * during this process, so the sidebar's "API connected/unreachable"
     * indicator (a shared Inertia prop, see HandleInertiaRequests) can read a
     * cheap cached flag instead of making its own extra network call on every
     * page load — it just reflects whatever the current page's own
     * controller calls already found out.
     */
    private function markReachable(bool $reachable): void
    {
        Cache::put('mc_api:reachable', $reachable, now()->addSeconds(30));
    }

    /** Optimistic (true) until the first real attempt reports otherwise. */
    public function isReachable(): bool
    {
        return Cache::get('mc_api:reachable', true);
    }
}
