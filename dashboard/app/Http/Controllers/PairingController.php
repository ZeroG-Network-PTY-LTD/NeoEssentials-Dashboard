<?php

namespace App\Http\Controllers;

use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Server-to-server only (the mod's /dashboard pair command) — no browser session, so
 * deliberately outside 'auth'/'verified' and CSRF-exempted (see bootstrap/app.php), same
 * posture as routes/webhooks.php. Authenticity comes from the one-time pairing code an
 * already-logged-in admin generated via ConfigurationController::startPairing(), not a
 * session or signature.
 */
class PairingController extends Controller
{
    public function __construct(private ConfigService $config)
    {
    }

    public function complete(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'modToken' => ['required', 'string'],
            'serverName' => ['nullable', 'string'],
        ]);

        $result = $this->config->completePairing($data['code'], $data['modToken'], $data['serverName'] ?? null);

        return response()->json($result, $result['success'] ? 200 : 422);
    }
}
