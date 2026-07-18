<?php

use App\Http\Controllers\PairingController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// Server-to-server only (the mod's DashboardUserSyncWebhook) — no browser
// session, so deliberately outside 'auth'/'verified' and CSRF-exempted (see
// bootstrap/app.php). Authenticity is verified via a Bearer token the
// dashboard minted for the mod during pairing, see WebhookController.
Route::prefix('webhooks')->name('webhooks.')->group(function () {
    Route::post('/mod/user-sync', [WebhookController::class, 'modUserSync'])->name('mod.user-sync');
});

// Hit by the mod's /dashboard pair command to complete the pairing handshake — same
// no-session/CSRF-exempt posture as above. Authenticity comes from the one-time code an
// already-logged-in admin generated via ConfigurationController::startPairing().
// Named webhooks.* (despite the /api/pair/complete URI) so EnsureInstalled's route-name
// exemption check actually matches it — this route must work even before the install
// wizard has finished, since it's part of that same wizard's own pairing step.
Route::post('/api/pair/complete', [PairingController::class, 'complete'])->name('webhooks.pair.complete');
