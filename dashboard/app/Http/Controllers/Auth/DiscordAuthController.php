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
 * "Login with Discord" — this app performs the actual OAuth2 exchange (Socialite), then asks
 * the mod's own API whether the resulting Discord ID is linked to a Minecraft account. The mod
 * itself never talks to Discord directly (see NeoEssentials' DiscordAuthProvider) — that
 * separation is why the OAuth2 dance lives here instead of on the mod side.
 */
class DiscordAuthController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function redirect(): RedirectResponse
    {
        $config = $this->safeAuthConfig();

        if (! ($config['enabled'] ?? false)) {
            return redirect()->route('login')->with('error', 'Discord login is not enabled on this server.');
        }

        if (! ($config['linkAdapterAvailable'] ?? false)) {
            return redirect()->route('login')->with('error',
                'Discord login is unavailable right now — no Discord bridge mod is connected on the server.');
        }

        return Socialite::driver('discord')->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $discordUser = Socialite::driver('discord')->user();
        } catch (\Throwable $e) {
            Log::warning('Discord OAuth2 callback failed', ['error' => $e->getMessage()]);
            return redirect()->route('login')->with('error', 'Discord login failed. Please try again.');
        }

        try {
            $link = $this->mc->discordLinkLookup($discordUser->getId());
        } catch (\Throwable $e) {
            Log::warning('Mod API unreachable during Discord link lookup', ['error' => $e->getMessage()]);
            return redirect()->route('login')->with('error',
                'Could not reach the Minecraft server to verify your Discord link. Please try again shortly.');
        }

        if (! ($link['linked'] ?? false)) {
            return redirect()->route('login')->with('error',
                'Your Discord account isn\'t linked to a Minecraft account yet. Link it in-game '.
                'using your server\'s Discord link command, then try again.');
        }

        $mcUuid = $link['minecraftUuid'];
        $mcUsername = $link['minecraftUsername'];

        // Prefer an existing account already linked to this Discord ID. Otherwise, adopt an
        // existing password-registered account for the same Minecraft player (matched by
        // mc_uuid) rather than creating a duplicate — a player who registered manually and
        // later links Discord should end up with one account, not two.
        $user = User::where('discord_id', $discordUser->getId())->first()
            ?? User::where('mc_uuid', $mcUuid)->first();

        if ($user === null) {
            $config = $this->safeAuthConfig();
            if (! ($config['allowAutoRegistration'] ?? true)) {
                return redirect()->route('login')->with('error',
                    'No dashboard account exists for your linked Minecraft account, and '.
                    'auto-registration is disabled. Ask an admin to create one for you.');
            }

            $user = User::create([
                'name' => $mcUsername,
                'email' => $discordUser->getId().'@discord.oauth',
                // Discord-only accounts don't use password login — a random, unusable
                // password still satisfies the column's NOT NULL constraint.
                'password' => Hash::make(Str::random(40)),
            ]);

            if (User::count() === 1) {
                $user->forceFill(['role' => 'admin'])->save();
            }
        }

        $user->forceFill([
            'discord_id' => $discordUser->getId(),
            'mc_uuid' => $mcUuid,
            'mc_username' => $mcUsername,
        ])->save();

        Auth::login($user, remember: true);

        return redirect(route('dashboard', absolute: false));
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
