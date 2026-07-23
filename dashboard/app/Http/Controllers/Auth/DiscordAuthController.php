<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

/**
 * "Login with Discord" — this app performs the actual OAuth2 exchange (Socialite) and only ever
 * identifies/creates the dashboard account from it. It no longer decides dashboard access by
 * itself: whether a Discord-identified account can reach the dashboard is EnsureAccountLinked's
 * job (requires mc_uuid too, linked separately via the Profile page's in-game-code flow).
 */
class DiscordAuthController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function redirect(): RedirectResponse
    {
        if ($blocked = $this->blockedRedirect()) {
            return $blocked;
        }

        return Socialite::driver('discord')->redirect();
    }

    /** Same OAuth2 app/redirect_uri as redirect() — only difference is who's allowed to hit it and where callback() sends them back to. */
    public function connect(): RedirectResponse
    {
        if ($blocked = $this->blockedRedirect()) {
            return $blocked;
        }

        return Socialite::driver('discord')->redirect();
    }

    public function disconnect(): RedirectResponse
    {
        Auth::user()->forceFill(['discord_id' => null])->save();

        return redirect()->route('profile.edit')->with('success', 'Discord account disconnected.');
    }

    public function callback(): RedirectResponse
    {
        // Where to send the visitor back to on failure — the profile page for
        // an already-logged-in "connect" attempt, login for a guest "log in
        // with Discord" attempt. Errors from here on branch the same way.
        $errorRoute = Auth::check() ? 'profile.edit' : 'login';

        try {
            $discordUser = Socialite::driver('discord')->user();
        } catch (\Throwable $e) {
            Log::warning('Discord OAuth2 callback failed', ['error' => $e->getMessage()]);
            return redirect()->route($errorRoute)->with('error', 'Discord login failed. Please try again.');
        }

        return Auth::check()
            ? $this->handleConnect($discordUser->getId())
            : $this->handleLogin($discordUser->getId());
    }

    /** Guest flow — log in as (or create) the account this Discord identity resolves to. */
    private function handleLogin(string $discordId): RedirectResponse
    {
        $user = User::where('discord_id', $discordId)->first();

        if ($user === null) {
            $config = $this->safeAuthConfig();
            if (! ($config['allowAutoRegistration'] ?? true)) {
                return redirect()->route('login')->with('error',
                    'No dashboard account is linked to this Discord account, and '.
                    'auto-registration is disabled. Ask an admin to create one for you.');
            }

            // Defaults to 'moderator' (User::booted()) — Discord login never grants
            // admin on its own; that's earned via ConfigService::resolveLocalRole()
            // once this account links a Minecraft account with the right permission
            // node (see EnsureAccountLinked). The only auto-admin path is the account
            // created right after finishing /install (RegisteredUserController::store).
            $user = User::create([
                'name' => $discordId,
                'email' => $discordId.'@discord.oauth',
                // Discord-only accounts don't use password login — a random, unusable
                // password still satisfies the column's NOT NULL constraint.
                'password' => Hash::make(Str::random(40)),
            ]);
        }

        $user->forceFill(['discord_id' => $discordId])->save();

        Auth::login($user, remember: true);

        return redirect(route('dashboard', absolute: false));
    }

    /** Authenticated flow — attach this Discord identity to the CURRENT session's account instead of logging in as whoever else it might already belong to. */
    private function handleConnect(string $discordId): RedirectResponse
    {
        $user = Auth::user();

        $claimedBy = User::where('id', '!=', $user->id)
            ->where('discord_id', $discordId)
            ->first();

        if ($claimedBy) {
            return redirect()->route('profile.edit')->with('error',
                'That Discord account is already linked to a different dashboard account.');
        }

        $user->forceFill(['discord_id' => $discordId])->save();

        return redirect()->route('profile.edit')->with('success', 'Discord account connected.');
    }

    /** Shared "is Discord login enabled at all" gate for both redirect() and connect(). */
    private function blockedRedirect(): ?RedirectResponse
    {
        $config = $this->safeAuthConfig();
        $errorRoute = Auth::check() ? 'profile.edit' : 'login';

        if (! ($config['enabled'] ?? false)) {
            return redirect()->route($errorRoute)->with('error', 'Discord login is not enabled on this server.');
        }

        return null;
    }

    /** discordAuthConfig() requires the mod to be reachable — never let a down mod 500 the login page. */
    private function safeAuthConfig(): array
    {
        try {
            return $this->mc->discordAuthConfig();
        } catch (\Throwable $e) {
            Log::warning('Mod API unreachable while checking Discord auth config', ['error' => $e->getMessage()]);
            return ['enabled' => false, 'linkAdapterAvailable' => false, 'allowAutoRegistration' => false];
        }
    }
}
