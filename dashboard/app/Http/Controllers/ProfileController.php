<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Http\Requests\ProfileUpdateRequest;
use App\Services\MinecraftApiService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    /**
     * The username passed to the mod's /api/auth/link-minecraft/* + /discord-status routes —
     * mod_username when this Laravel account has one (a real mod dashboard account), else a
     * synthetic key so the feature still works for accounts that only ever exist on this side.
     * See MinecraftAccountLinkManager's class doc (mod repo) — it's keyed by a plain username
     * string, not a real mod account id, for exactly this reason.
     */
    private function mcLinkOwnerKey(Request $request): string
    {
        return $request->user()->mod_username ?? ('laravel:'.$request->user()->id);
    }

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    /** POST /profile/minecraft-link/start — generates a code for /linkaccount <code> in-game. */
    public function minecraftLinkStart(Request $request): JsonResponse
    {
        return $this->attemptJson(
            fn () => $this->mc->linkMinecraftStart($this->mcLinkOwnerKey($request)),
            'Code generated.',
        );
    }

    /**
     * GET /profile/minecraft-link/status — polled while a code is showing. Persists the result
     * onto this Laravel user's own mc_uuid/mc_username the moment it sees linked:true, since the
     * mod's own completed-link cache is ephemeral (see MinecraftAccountLinkManager) — this app's
     * DB is the durable source of truth for its own accounts.
     */
    public function minecraftLinkStatus(Request $request): JsonResponse
    {
        $status = $this->safe(
            fn () => $this->mc->linkMinecraftStatus($this->mcLinkOwnerKey($request)),
            ['linked' => false],
        );

        if (($status['linked'] ?? false) && ! empty($status['mcUuid'])) {
            $request->user()->forceFill([
                'mc_uuid' => $status['mcUuid'],
                'mc_username' => $status['mcUsername'] ?? null,
            ])->save();
        }

        return response()->json($status);
    }

    /** POST /profile/minecraft-link/unlink — self-service, no code needed. */
    public function minecraftLinkUnlink(Request $request): JsonResponse
    {
        return $this->attemptJson(function () use ($request) {
            $this->mc->unlinkMinecraft($this->mcLinkOwnerKey($request));
            $request->user()->forceFill(['mc_uuid' => null, 'mc_username' => null])->save();
        }, 'Minecraft account unlinked.');
    }

    /** GET /profile/discord-status — read-only, resolved from the linked Minecraft account. */
    public function discordStatus(Request $request): JsonResponse
    {
        return $this->safeJson(
            fn () => $this->mc->accountDiscordStatus($this->mcLinkOwnerKey($request)),
            ['linked' => false],
        );
    }
}
