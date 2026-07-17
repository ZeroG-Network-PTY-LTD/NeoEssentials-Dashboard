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
            // throughout this app (see createModUser() below, and LoginRequest's
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

        // Also create a matching account on the mod's own built-in dashboard, so a
        // visitor who registers here (the public app) ends up with working
        // credentials on the mod's dashboard too — no separate in-game
        // /dashboardregister step needed. Best-effort: if the mod's server is
        // offline or the service account can't reach it, registration on THIS app
        // still succeeds — the mod-side account can be created later by an admin,
        // or the player can fall back to /dashboardregister in-game.
        //
        // Deliberately does NOT mirror this app's own admin/moderator role onto the
        // mod side — a self-service public registration form is not a safe place to
        // auto-grant real kick/ban/console access. Only the bootstrap first account
        // (already trusted, since it's whoever stood the server up) gets ADMIN;
        // everyone else gets VIEWER and must be promoted by an existing mod admin.
        try {
            $this->mc->createModUser(
                $user->name,
                $request->password,
                $user->email,
                $user->role === 'admin' ? 'ADMIN' : 'VIEWER',
            );
        } catch (\Throwable $e) {
            Log::warning('Could not create matching mod dashboard account on registration', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
