<?php

namespace App\Services;

use App\Models\McConnection;
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
    private string $serviceApiKey;
    private int $timeout;
    private int $cacheTtl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('minecraft.api_url'), '/');
        // Pairing credentials live in the mc_connection table, not .env/config — see the
        // mc_connection migration for why (filesystem-write requirements, concurrency safety).
        $this->serviceApiKey = (string) (McConnection::current()->api_key ?? '');
        $this->timeout = (int) config('minecraft.timeout');
        $this->cacheTtl = (int) config('minecraft.cache_ttl');
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

    /** Raw /api/player/online payload — {players: [...online], offlinePlayers: [...]}. Cached briefly. */
    private function rawPlayerData(): array
    {
        return Cache::remember('mc_api:players', $this->cacheTtl, fn () => $this->get('api/player/online'));
    }

    /**
     * Online players, shaped to match the McPlayer type. Cached briefly.
     *
     * The mod's response key here is 'players', not 'online' — a stale read of a key that
     * never existed used to silently return an empty list unconditionally, meaning every
     * player-targeting action on the dashboard (kick/ban/mute/teleport/heal, all of which
     * resolve a UUID back to a username via this same list) failed with "player not online"
     * regardless of who was actually connected.
     */
    public function players(): array
    {
        $online = $this->rawPlayerData()['players'] ?? [];

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

    /**
     * Recently-active offline players (up to the mod's own cap, currently 50 — anyone beyond
     * that needs the explicit lookup instead). Lets the Players page show a real roster by
     * default without requiring a search, while `lookupPlayer()` covers anyone not in this list.
     */
    public function offlinePlayers(): array
    {
        $offline = $this->rawPlayerData()['offlinePlayers'] ?? [];

        return array_map(fn (array $p) => [
            'uuid' => $p['uuid'],
            'username' => $p['username'],
            'lastSeen' => $p['lastSeen'] ?? 'Unknown',
        ], $offline);
    }

    // --- API keys (ApiKeyEndpoint — used here for self-revoke on unpair, see
    // ConfigService::unpair()) -------------------------------------------------

    public function revokeApiKey(string $keyId): array
    {
        return $this->delete("api/apikeys/{$keyId}");
    }

    /**
     * Look up a single player by name whether or not they're online or in the recent-offline
     * roster above — resolves via the mod's profile cache / Mojang API fallback, for servers
     * with more players than the roster's cap.
     */
    public function lookupPlayer(string $username): array
    {
        return $this->get("api/player/lookup/{$username}");
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

    public function setGamemode(string $username, string $gamemode): array
    {
        return $this->post("api/player/gamemode/{$username}", ['gamemode' => $gamemode]);
    }

    public function getBalance(string $username): array
    {
        return $this->get("api/economy/{$username}");
    }

    public function getInventory(string $username): array
    {
        return $this->get("api/player/inventory/{$username}");
    }

    // --- Player state toggles (online players only) ------------------------

    public function setFly(string $username, ?bool $enable = null): array
    {
        return $this->post("api/player/fly/{$username}", $enable === null ? [] : ['enable' => $enable]);
    }

    public function setGod(string $username, ?bool $enable = null): array
    {
        return $this->post("api/player/god/{$username}", $enable === null ? [] : ['enable' => $enable]);
    }

    public function feedPlayer(string $username): array
    {
        return $this->post("api/player/feed/{$username}", []);
    }

    public function extinguishPlayer(string $username): array
    {
        return $this->post("api/player/extinguish/{$username}", []);
    }

    public function setSpeed(string $username, string $type, float $speed): array
    {
        return $this->post("api/player/speed/{$username}", ['type' => $type, 'speed' => $speed]);
    }

    public function setNickname(string $username, ?string $nickname): array
    {
        return $this->post("api/player/nickname/{$username}", ['nickname' => $nickname]);
    }

    // --- Freeze / vanish / jail ---------------------------------------------

    public function freezeStatus(string $username): array
    {
        return $this->get("api/moderation/freeze/{$username}");
    }

    public function freezePlayer(string $targetName, ?string $reason = null): array
    {
        return $this->post('api/moderation/freeze', ['targetName' => $targetName, 'reason' => $reason]);
    }

    public function unfreezePlayer(string $username): array
    {
        return $this->delete("api/moderation/freeze/{$username}");
    }

    public function vanishStatus(string $username): array
    {
        return $this->get("api/moderation/vanish/{$username}");
    }

    public function vanishPlayer(string $targetName): array
    {
        return $this->post('api/moderation/vanish', ['targetName' => $targetName]);
    }

    public function unvanishPlayer(string $username): array
    {
        return $this->delete("api/moderation/vanish/{$username}");
    }

    public function jailLocations(): array
    {
        return $this->get('api/moderation/jails')['jails'] ?? [];
    }

    public function jailStatus(string $username): array
    {
        return $this->get("api/moderation/jail/{$username}");
    }

    public function jailPlayer(string $targetName, string $jailName, ?string $reason = null, ?int $durationSeconds = null): array
    {
        return $this->post('api/moderation/jail', [
            'targetName' => $targetName,
            'jailName' => $jailName,
            'reason' => $reason,
            'duration' => $durationSeconds,
        ]);
    }

    public function unjailPlayer(string $username): array
    {
        return $this->delete("api/moderation/jail/{$username}");
    }

    // --- Items / fun commands (online players only) -------------------------

    public function giveItem(string $username, string $item, int $amount = 1): array
    {
        return $this->post("api/player/give/{$username}", ['item' => $item, 'amount' => $amount]);
    }

    public function burnPlayer(string $username, int $seconds = 10): array
    {
        return $this->post("api/player/burn/{$username}", ['seconds' => $seconds]);
    }

    public function killPlayer(string $username): array
    {
        return $this->post("api/player/kill/{$username}", []);
    }

    public function applyEffect(string $username, string $effect, int $duration = 30, int $amplifier = 0): array
    {
        return $this->post("api/player/effect/{$username}", ['effect' => $effect, 'duration' => $duration, 'amplifier' => $amplifier]);
    }

    public function clearEffects(string $username): array
    {
        return $this->post("api/player/effect/{$username}", ['clear' => true]);
    }

    public function strikeLightning(string $username): array
    {
        return $this->post("api/player/lightning/{$username}", []);
    }

    public function spawnMob(string $username, string $mob, int $amount = 1): array
    {
        return $this->post("api/player/spawnmob/{$username}", ['mob' => $mob, 'amount' => $amount]);
    }

    // --- Admin tools ---------------------------------------------------------

    public function runSudo(string $username, string $command, bool $isChat = false): array
    {
        return $this->post("api/player/sudo/{$username}", ['command' => $command, 'isChat' => $isChat]);
    }

    public function clearInventory(string $username): array
    {
        return $this->post("api/player/clearinventory/{$username}", []);
    }

    public function getPtime(string $username): array
    {
        return $this->get("api/player/ptime/{$username}");
    }

    public function setPtime(string $username, ?int $ticks): array
    {
        return $this->post("api/player/ptime/{$username}", ['ticks' => $ticks]);
    }

    public function getPweather(string $username): array
    {
        return $this->get("api/player/pweather/{$username}");
    }

    public function setPweather(string $username, ?string $type): array
    {
        return $this->post("api/player/pweather/{$username}", ['type' => $type]);
    }

    // --- Moderation history (per-player) ------------------------------------
    // Bans are keyed by UUID on the mod side; mutes/kicks/warns/notes by username.

    public function banHistory(string $uuid): array
    {
        return $this->get("api/moderation/bans/{$uuid}")['bans'] ?? [];
    }

    public function unban(string $uuid): array
    {
        return $this->delete("api/moderation/ban/{$uuid}");
    }

    public function muteHistory(string $username): array
    {
        return $this->get("api/moderation/mutes/{$username}")['mutes'] ?? [];
    }

    public function unmute(string $username): array
    {
        return $this->delete("api/moderation/mute/{$username}");
    }

    public function kickHistory(string $username): array
    {
        return $this->get("api/moderation/kicks/{$username}")['kicks'] ?? [];
    }

    public function warnsForPlayer(string $username): array
    {
        return $this->get("api/moderation/warns/{$username}")['warns'] ?? [];
    }

    public function removeWarn(string $warnId, string $targetName): array
    {
        return $this->deleteWithBody("api/moderation/warn/{$warnId}", ['targetName' => $targetName]);
    }

    public function notesForPlayer(string $username): array
    {
        return $this->get("api/moderation/notes/{$username}")['notes'] ?? [];
    }

    public function createNote(string $targetName, string $text): array
    {
        return $this->post('api/moderation/note', ['targetName' => $targetName, 'text' => $text]);
    }

    public function removeNote(string $noteId, string $targetName): array
    {
        return $this->deleteWithBody("api/moderation/note/{$noteId}", ['targetName' => $targetName]);
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
            $response = Http::timeout($this->timeout)->retry(2, 150)->get("{$this->baseUrl}/{$path}");
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

    /**
     * Full /api/stats/economy payload (total wealth, account count, average balance,
     * distribution histogram) — economyLeaderboard() above only extracts topPlayers, this
     * exposes everything else the Economy page's overview cards/distribution chart need.
     */
    public function economyStats(): array
    {
        $data = Cache::remember('mc_api:economy_stats', $this->cacheTtl,
            fn () => $this->get('api/stats/economy'));

        return [
            'totalWealth' => $data['totalWealth'] ?? '0.00',
            'accountCount' => (int) ($data['accountCount'] ?? 0),
            'currencySymbol' => $data['currencySymbol'] ?? '$',
            'startingBalance' => (float) ($data['startingBalance'] ?? 0),
            'averageBalance' => $data['averageBalance'] ?? '0.00',
            'topPlayers' => array_map(fn (array $e) => [
                'uuid' => $e['uuid'],
                'username' => $e['name'],
                'balance' => (float) $e['balance'],
            ], $data['topPlayers'] ?? []),
            'distribution' => $data['distribution'] ?? [],
        ];
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

    /**
     * Every player's `/pwarp` warps. Unlike public warps, the mod's endpoint requires ADMIN for
     * this even on GET — player warps are personal, not public. Cached briefly.
     */
    public function playerWarps(): array
    {
        $data = Cache::remember('mc_api:player_warps', $this->cacheTtl, fn () => $this->get('api/warps/players'));

        return $data['players'] ?? [];
    }

    public function deletePlayerWarp(string $uuid, string $name): array
    {
        return $this->delete("api/warps/players/{$uuid}/{$name}");
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
        return Cache::remember('mc_api:permission_overview', $this->cacheTtl, fn () => $this->get('api/permissions/overview'));
    }

    public function permissionGroups(): array
    {
        return $this->get('api/permissions/groups')['groups'] ?? [];
    }

    public function permissionUsers(): array
    {
        return $this->get('api/permissions/users')['users'] ?? [];
    }

    /**
     * Look up a single player by username whether or not they're currently online — the mod's
     * PermissionEndpoint resolves offline players via its profile cache / Mojang API fallback.
     * Returns ['success' => false, 'message' => ...] if the name can't be resolved at all.
     */
    public function permissionUserLookup(string $username): array
    {
        return $this->get("api/permissions/user/{$username}");
    }

    public function permissionAliases(): array
    {
        $data = $this->get('api/permissions/aliases');

        return $data['aliases'] ?? [];
    }

    /**
     * Real permission-node catalog (node/description/defaultValue, grouped by category),
     * sourced from the mod's own PermissionRegistry — powers the node search/picker when
     * adding a permission to a group or user instead of requiring the raw string from memory.
     * Cached longer than the live-data endpoints since this basically never changes at runtime.
     */
    public function permissionNodeCatalog(): array
    {
        return Cache::remember('mc_api:permission_catalog', 300, fn () => $this->get('api/permissions/permissions/all')['categories'] ?? []);
    }

    public function reloadPermissions(): array
    {
        return $this->post('api/permissions/reload', []);
    }

    public function createPermissionGroup(
        string $name,
        string $prefix = '',
        string $suffix = '',
        bool $isDefault = false,
        ?int $priority = null,
        array $inherits = [],
    ): array {
        return $this->post('api/permissions/group/create', array_filter([
            'name' => $name,
            'prefix' => $prefix,
            'suffix' => $suffix,
            'isDefault' => $isDefault,
            'priority' => $priority,
            'inherits' => $inherits,
        ], fn ($v) => $v !== null && $v !== []));
    }

    /** $data may include prefix/suffix/priority/inherits (full replace)/isDefault. */
    public function updatePermissionGroup(string $name, array $data): array
    {
        return $this->put("api/permissions/group/{$name}/update", $data);
    }

    public function renamePermissionGroup(string $name, string $newName): array
    {
        return $this->post("api/permissions/group/{$name}/rename", ['newName' => $newName]);
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
            'role' => $role, // ADMIN | OPERATOR | MODERATOR | VIEWER
        ]);
    }

    /**
     * Idempotent create-or-update, purpose-built for mirroring THIS app's own
     * accounts onto the mod's dashboard-account store — unlike createModUser(),
     * safe to call on every registration/role-change without an "already
     * exists" error on repeat calls. Matches purely by username (the mod has
     * no external-ID field), never touches password (the mod generates its
     * own unusable placeholder for new accounts — this app's own login is the
     * real auth surface for anyone created this way), and only mutates role +
     * email on an existing match. Does not touch enabled/disabled state.
     */
    public function syncModUser(string $username, string $email, string $role): array
    {
        return $this->post('api/users/sync', [
            'username' => $username,
            'email' => $email,
            'role' => $role, // ADMIN | OPERATOR | MODERATOR | VIEWER
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

    // --- Account linking (POST/GET /api/auth/link-minecraft/*, /api/auth/discord-status —
    // this app has no mod-side dashboard session of its own, so every call here passes the
    // Laravel user's own $modUsername explicitly; the mod resolves the target account by
    // username instead of a session cookie, same API-key auth as everything else in this
    // service. See docs/API.md's "AUTH*" note on these four routes.) -----------------------

    public function linkMinecraftStart(string $modUsername): array
    {
        return $this->post('api/auth/link-minecraft/start', ['username' => $modUsername]);
    }

    public function linkMinecraftStatus(string $modUsername): array
    {
        return $this->get('api/auth/link-minecraft/status', ['username' => $modUsername]);
    }

    public function unlinkMinecraft(string $modUsername): array
    {
        return $this->post('api/auth/unlink-minecraft', ['username' => $modUsername]);
    }

    public function accountDiscordStatus(string $modUsername): array
    {
        return $this->get('api/auth/discord-status', ['username' => $modUsername]);
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

    /**
     * Authenticate a real dashboard visitor directly against the mod's own
     * /api/auth/login — NOT the paired API key used by serviceToken() above.
     * Returns the mod's raw response (success/user/sessionId) for both accepted and
     * rejected credentials; only throws when the mod's API couldn't be reached at
     * all, which LoginRequest uses to decide whether to fall back to this user's
     * locally-cached credential copy instead of hard-failing the login.
     */
    public function authenticateUser(string $username, string $password): array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/auth/login", [
                    'username' => $username,
                    'password' => $password,
                ]);
        } catch (\Throwable $e) {
            Log::warning('Minecraft API unreachable during user login', ['username' => $username, 'error' => $e->getMessage()]);
            $this->markReachable(false);
            throw new RuntimeException('Could not reach the Minecraft server API to log in.');
        }

        $this->markReachable(true);

        return $response->json() ?? ['success' => false];
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

    /** Like delete(), but with a JSON body — the mod's warn/note removal routes need one. */
    private function deleteWithBody(string $path, array $data): array
    {
        $result = $this->request('delete', $path, $data);
        $this->bustCaches();
        return $result;
    }

    private function request(string $method, string $path, array $data = []): array
    {
        $token = $this->serviceToken();

        try {
            $request = Http::withToken($token)->timeout($this->timeout);

            // Only GETs are safe to retry blind — a read timeout on a POST/PUT/DELETE can mean
            // the mod already applied the change (economy grant, ban, etc.) and only the
            // response got lost, so retrying it here could double it up. GETs have no such risk.
            if ($method === 'get') {
                $request = $request->retry(2, 150);
            }

            $response = $request->{$method}("{$this->baseUrl}/{$path}", $data);
        } catch (\Throwable $e) {
            Log::warning('Minecraft API unreachable', ['path' => $path, 'error' => $e->getMessage()]);
            $this->markReachable(false);
            throw new RuntimeException('Could not reach the Minecraft server API. Is the server online?');
        }

        if ($response->status() === 401) {
            throw new RuntimeException('Minecraft API rejected our paired API key — it may have been revoked on the server. Re-pair from Configuration → Minecraft Server Connection.');
        }

        if ($response->failed()) {
            Log::warning('Minecraft API error', ['path' => $path, 'status' => $response->status(), 'body' => $response->body()]);
            throw new RuntimeException("Minecraft API returned an error ({$response->status()}).");
        }

        $this->markReachable(true);

        return $response->json() ?? [];
    }

    /** Like request(), but returns the raw response for binary payloads (backup ZIP downloads). */
    private function rawGet(string $path): \Illuminate\Http\Client\Response
    {
        $token = $this->serviceToken();

        try {
            $response = Http::withToken($token)->timeout($this->timeout)->retry(2, 150)->get("{$this->baseUrl}/{$path}");
        } catch (\Throwable $e) {
            Log::warning('Minecraft API unreachable', ['path' => $path, 'error' => $e->getMessage()]);
            $this->markReachable(false);
            throw new RuntimeException('Could not reach the Minecraft server API. Is the server online?');
        }

        if ($response->status() === 401) {
            throw new RuntimeException('Minecraft API rejected our paired API key — it may have been revoked on the server. Re-pair from Configuration → Minecraft Server Connection.');
        }

        if ($response->failed()) {
            Log::warning('Minecraft API error', ['path' => $path, 'status' => $response->status()]);
            throw new RuntimeException("Minecraft API returned an error ({$response->status()}).");
        }

        $this->markReachable(true);

        return $response;
    }

    /**
     * Returns the API key minted for us during pairing — no login round-trip, no session
     * cache, since API keys don't idle-expire the way the mod's human-login sessions do.
     */
    private function serviceToken(): string
    {
        if (empty($this->serviceApiKey)) {
            throw new RuntimeException('Not paired with a Minecraft server yet — visit Configuration → Minecraft Server Connection to pair.');
        }

        return $this->serviceApiKey;
    }

    private function bustCaches(): void
    {
        foreach (['status', 'players', 'economy_leaderboard', 'warps', 'holograms', 'hologram_stats', 'discord_status', 'permission_overview'] as $key) {
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
     *
     * TTL is longer than a single request/response cycle needs, on purpose: it has to outlive
     * the gap between two runs of the independent health-check schedule (see checkHealth() /
     * CheckMcHealth) so the flag doesn't quietly revert to the optimistic default in between.
     */
    private function markReachable(bool $reachable): void
    {
        Cache::put('mc_api:reachable', $reachable, now()->addSeconds(90));
    }

    /** Optimistic (true) until the first real attempt reports otherwise. */
    public function isReachable(): bool
    {
        return Cache::get('mc_api:reachable', true);
    }

    /**
     * Independent liveness probe, meant to run on a schedule (see CheckMcHealth /
     * routes/console.php) rather than piggyback on whatever a page's own controller happens to
     * call. Without this, isReachable() only ever reflects the last real request some admin's
     * page load triggered — if nobody's browsing the dashboard when the mod goes down, the flag
     * just stays stuck on whatever it last was (or the optimistic default if nothing's called
     * the API yet at all in this cache's lifetime).
     */
    public function checkHealth(): bool
    {
        if (empty($this->serviceApiKey)) {
            return false; // not paired — nothing to check yet
        }

        try {
            $response = Http::withToken($this->serviceApiKey)
                ->timeout($this->timeout)
                ->retry(2, 150)
                ->get("{$this->baseUrl}/api/server/status");
        } catch (\Throwable $e) {
            $this->markReachable(false);

            return false;
        }

        $reachable = $response->successful();
        $this->markReachable($reachable);

        return $reachable;
    }
}
