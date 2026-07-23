<?php

namespace App\Http\Controllers;

use App\Models\McConnection;
use App\Models\User;
use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Receives the mod's optional DashboardUserSyncWebhook — fired whenever a
 * mod-side dashboard_user is created/updated/deleted through ANY path
 * (in-game /dashboardregister, api/users/create, api/users/sync, role/enable
 * changes, deletion), so this app doesn't have to poll api/users/list to
 * notice a change. Complements ConfigService::syncFromMod()'s pull-based
 * reconciliation rather than replacing it — the mod only sends this once
 * paired (see PairingController); the pull path still works (and is the
 * only thing that runs) if it isn't.
 */
class WebhookController extends Controller
{
    public function __construct(private ConfigService $config)
    {
    }

    public function modUserSync(Request $request): JsonResponse
    {
        if (! $this->verifyToken($request)) {
            Log::warning('Rejected mod user-sync webhook — bad or missing token');

            return response()->json(['error' => 'invalid token'], 401);
        }

        $event = $request->input('event');
        $username = $request->input('username');

        if (! $username) {
            return response()->json(['error' => 'missing username'], 400);
        }

        if ($event === 'user_deleted') {
            // Deliberately not destructive — a mod-side account being deleted
            // doesn't necessarily mean this app's account (which may have its
            // own independent password/Discord link) should vanish too. Just
            // drop the mod_username linkage so this app stops treating the
            // mod as authoritative for that account's login.
            User::where('mod_username', $username)->update(['mod_username' => null]);
            Log::info('Mod dashboard account deleted — unlinked local mirror', ['username' => $username]);

            return response()->json(['success' => true]);
        }

        // Deliberately re-resolves via the mod's own permission node rather than trusting
        // the role this push payload carries — see ConfigService::resolveLocalRole().
        $role = $this->config->resolveLocalRole($username);
        $email = $request->input('email');

        $user = User::where('mod_username', $username)->first() ?? new User();
        $user->mod_username = $username;
        if (! $user->exists) {
            $user->name = $username;
            $user->email = $email ?: "{$username}@mod.local";
            $user->password = bcrypt(Str::random(40));
        } elseif ($email) {
            $user->email = $email;
        }
        $user->role = $role;
        $user->save();

        return response()->json(['success' => true]);
    }

    /**
     * Compares the request's Bearer token against the token this dashboard minted for the mod
     * during pairing (mc_connection.webhook_token — see McConnection). Unlike the old HMAC
     * scheme, an unconfigured token always rejects — there's nothing to compare against until a
     * pairing has actually completed, and accepting unsigned calls by default was the wrong
     * posture.
     */
    private function verifyToken(Request $request): bool
    {
        $expected = McConnection::current()->webhook_token;
        if (! $expected) {
            return false;
        }

        $token = $request->bearerToken();
        if (! $token) {
            return false;
        }

        return hash_equals($expected, $token);
    }
}
