<?php

use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// Server-to-server only (the mod's DashboardUserSyncWebhook) — no browser
// session, so deliberately outside 'auth'/'verified' and CSRF-exempted (see
// bootstrap/app.php). Authenticity is verified via HMAC signature instead,
// see WebhookController::verifySignature().
Route::prefix('webhooks')->name('webhooks.')->group(function () {
    Route::post('/mod/user-sync', [WebhookController::class, 'modUserSync'])->name('mod.user-sync');
});
