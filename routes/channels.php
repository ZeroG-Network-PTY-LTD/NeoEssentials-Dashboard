<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Live relay of the mod's own WebSocket events (server stats, chat, player join/leave/death —
// see McRelayEvent / the dashboard:mc-bridge command). Any authenticated dashboard user
// (admin or moderator) sees the same feed — it mirrors server-wide state, not anything
// per-user, so there's nothing to further scope by role here.
Broadcast::channel('mc-dashboard', function ($user) {
    return $user !== null;
});
