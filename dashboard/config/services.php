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

    // Bearer token the dashboard minted for the mod during pairing (see PairingController) —
    // the mod presents this as `Authorization: Bearer <token>` on its outbound user-sync
    // webhook (WebhookController). Populated automatically by pairing, never hand-typed.
    // Until a pairing has completed, this is empty and the webhook route rejects everything.
    'mod_sync' => [
        'webhook_token' => env('MOD_WEBHOOK_TOKEN'),
    ],

];
