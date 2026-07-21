<?php

return [

    // Base URL of the mod's embedded HTTP API, e.g. http://127.0.0.1:8642
    // If the game server isn't publicly reachable, point this at a tunnel/VPN address instead.
    // Still admin-entered manually — it's just an address, not a secret, and the mod has no way
    // to tell the dashboard where it lives on its own.
    'api_url' => env('MC_API_URL', 'http://127.0.0.1:8642'),

    // API key minted by the mod during the pairing handshake (Configuration → "Minecraft Server
    // Connection" → Generate Pairing Code, then run the printed `/dashboard pair` command on the
    // server console) — never hand-typed. See PairingController.
    'service_api_key' => env('MC_SERVICE_API_KEY'),

    // Port of the mod's WebSocket server, sent automatically alongside modToken during
    // pairing (see PairingController) — used by the `dashboard:mc-bridge` command to open a
    // live connection for real-time updates. Null on cPanel installs that never ran
    // `php artisan reverb:install`; the bridge command simply isn't run there.
    'ws_port' => env('MC_WS_PORT') !== null && env('MC_WS_PORT') !== '' ? (int) env('MC_WS_PORT') : null,

    // Request timeout in seconds. The mod should respond from an in-memory
    // cache, so this can stay short — a slow response usually means the
    // server is lagging or the mod's cache thread has stalled.
    'timeout' => (int) env('MC_API_TIMEOUT', 4),

    // How long to cache read-only responses (players, status, economy) in
    // Laravel's cache layer, in seconds. Keeps the dashboard snappy on
    // multi-tab / multi-admin use without hammering the mod's API.
    'cache_ttl' => (int) env('MC_API_CACHE_TTL', 3),

];
