<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Discord OAuth2 app for "Login with Discord" — a separate Discord Developer Portal
    // application from any Minecraft-side bot (SDLink/Mc2Discord/DCIntegration). This app
    // performs a normal web OAuth2 login; it never touches Minecraft directly. The linked
    // Minecraft account is resolved afterward via the mod's own /api/discord/link-lookup.
    'discord' => [
        'client_id' => env('DISCORD_CLIENT_ID'),
        'client_secret' => env('DISCORD_CLIENT_SECRET'),
        'redirect' => env('DISCORD_REDIRECT_URI'),
    ],

    // Shared secret for verifying the mod's optional DashboardUserSyncWebhook
    // (X-NeoEssentials-Signature: hex HMAC-SHA256 of the raw request body) —
    // see WebhookController and docs/API.md's dashboard-account-sync section
    // on the mod side. Leave unset to accept unsigned webhook calls (fine for
    // a same-host/trusted-network setup; set it if the mod and dashboard
    // aren't on a network you control end-to-end).
    'mod_sync' => [
        'webhook_secret' => env('MOD_SYNC_WEBHOOK_SECRET'),
    ],

];
