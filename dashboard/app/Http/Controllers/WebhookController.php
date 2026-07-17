<?php

namespace App\Http\Controllers;

use App\Models\User;
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
 * reconciliation rather than replacing it — the mod only sends this if
 * webDashboard.userSyncWebhookUrl is configured on its side; the pull path
 * still works (and is the only thing that runs) if it isn't.
 */
class WebhookController extends Controller
{
    public function modUserSync(Request $request): JsonResponse
    {
        if (! $this->verifySignature($request)) {
            Log::warning('Rejected mod user-sync webhook — bad or missing signature');

            return response()->json(['error' => 'invalid signature'], 401);
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

        $role = match ($request->input('role', 'VIEWER')) {
            'ADMIN' => 'admin',
            default => 'moderator',
        };
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
     * Recomputes the HMAC-SHA256 hex digest of the raw request body against
     * MOD_SYNC_WEBHOOK_SECRET and compares to X-NeoEssentials-Signature. If no
     * secret is configured, accepts unsigned requests (fine for a same-host/
     * trusted-network setup — see config/services.php's comment).
     */
    private function verifySignature(Request $request): bool
    {
        $secret = config('services.mod_sync.webhook_secret');
        if (! $secret) {
            return true;
        }

        $signature = $request->header('X-NeoEssentials-Signature');
        if (! $signature) {
            return false;
        }

        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $signature);
    }
}
