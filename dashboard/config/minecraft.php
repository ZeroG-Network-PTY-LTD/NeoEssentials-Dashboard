<?php

return [

    // Base URL of the mod's embedded HTTP API, e.g. http://127.0.0.1:8642
    // If the game server isn't publicly reachable, point this at a tunnel/VPN address instead.
    // Still admin-entered manually — it's just an address, not a secret, and the mod has no way
    // to tell the dashboard where it lives on its own.
    'api_url' => env('MC_API_URL', 'http://127.0.0.1:8642'),

    // The pairing-minted API key, webhook token, and WebSocket port used to live here as
    // env('MC_SERVICE_API_KEY')/env('MC_WS_PORT') — moved to the mc_connection table (see
    // App\Models\McConnection) since config files get frozen by `config:cache` before any
    // request has a chance to update them, and writing to .env needed filesystem access some
    // shared hosts don't grant. Read McConnection::current() directly wherever these are needed
    // (MinecraftApiService, WebhookController, McWebSocketBridge) instead of adding them back
    // here.

    // Request timeout in seconds. The mod should respond from an in-memory
    // cache, so this can stay short — a slow response usually means the
    // server is lagging or the mod's cache thread has stalled.
    'timeout' => (int) env('MC_API_TIMEOUT', 4),

    // How long to cache read-only responses (players, status, economy) in
    // Laravel's cache layer, in seconds. Keeps the dashboard snappy on
    // multi-tab / multi-admin use without hammering the mod's API.
    'cache_ttl' => (int) env('MC_API_CACHE_TTL', 3),

    // How often `dashboard:sync-mod-users` runs (routes/console.php), in minutes.
    // Also the interval an admin would otherwise have to wait out before the "Sync
    // now" button on the Configuration page becomes worth clicking again.
    'sync_interval_minutes' => (int) env('MC_SYNC_INTERVAL_MINUTES', 60),

    // The in-game permission node (LuckPerms-style, via the mod's PermissionEndpoint)
    // that grants a linked account admin rights on this dashboard — see
    // ConfigService::resolveLocalRole(). Change this if your mod's node naming
    // convention differs; no code change needed.
    'admin_permission_node' => env('MC_ADMIN_PERMISSION_NODE', 'neoessentials.dashboard.admin'),

];
