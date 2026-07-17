<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            // Unique because 'name' doubles as the player's Minecraft username
            // throughout this app (see the mod-side sync below, and LoginRequest's
            // login-by-username fallback) — two accounts sharing a name would make
            // that lookup ambiguous.
            'name' => 'required|string|max:255|unique:'.User::class,
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // The very first account on a fresh install becomes admin automatically —
        // otherwise a brand-new self-hoster would have no way to grant themselves
        // kick/ban/economy/console access without dropping into `php artisan
        // tinker` by hand. Every account after that defaults to 'moderator'
        // (see the migration) and must be promoted by an existing admin.
        if (User::count() === 1) {
            $user->forceFill(['role' => 'admin'])->save();
        }

        // Also push a matching identity record onto the mod's own dashboard-
        // account store, via the idempotent api/users/sync (never api/users/create
        // — that errors on an existing username, sync doesn't). Best-effort: if
        // the mod's server is offline, registration on THIS app still succeeds.
        //
        // Deliberately does NOT mirror this app's own admin/moderator role onto the
        // mod side — a self-service public registration form is not a safe place to
        // auto-grant real kick/ban/console access. Only the bootstrap first account
        // (already trusted, since it's whoever stood the server up) gets ADMIN;
        // everyone else gets VIEWER and must be promoted by an existing mod admin.
        //
        // Deliberately does NOT set $user->mod_username here, even on success —
        // sync never gives the mod a usable password (it generates its own random
        // placeholder; see MinecraftApiService::syncModUser()'s doc comment), so
        // this app's own password stays the real login surface for this account.
        // mod_username specifically means "this account's login is delegated to
        // the mod's own /api/auth/login" (see LoginRequest::authenticate()) — that
        // must stay reserved for accounts actually mirrored FROM a real mod
        // login/account, or a self-registered user would get locked out the
        // moment LoginRequest tries the mod first and the placeholder rejects it.
        //
        // Guards against a Laravel registration silently clobbering an unrelated
        // pre-existing mod account that happens to share this username (sync
        // matches by username only, no cross-system unique constraint exists) —
        // skip the push rather than risk downgrading/renaming someone else's
        // real mod-side account.
        try {
            $existingModUsernames = collect($this->mc->modUsers())->pluck('username')->map(fn ($u) => mb_strtolower((string) $u));

            if ($existingModUsernames->contains(mb_strtolower($user->name))) {
                Log::notice('Skipped mod-side sync on registration — username already exists on the mod and may belong to someone else', [
                    'user_id' => $user->id,
                    'name' => $user->name,
                ]);
            } else {
                $this->mc->syncModUser($user->name, $user->email, 'VIEWER');
            }
        } catch (\Throwable $e) {
            Log::warning('Could not sync matching mod dashboard identity on registration', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
