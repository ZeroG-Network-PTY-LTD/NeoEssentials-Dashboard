<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Authenticate against the mod's own /api/auth/login first — that's the
     * source of truth for dashboard accounts (admin, dashboard-service, any user
     * created via the mod's user-management UI). A successful API check mirrors
     * the credentials into this app's local `users` table (hashed copy, current
     * role) so login keeps working if the mod's API goes offline afterward —
     * live server data just won't populate again until the API is reachable.
     *
     * If the API is reachable AND rejects the credentials for an account this
     * app already knows is mod-linked (has a local mod_username), that
     * rejection is authoritative — no fallback. But the mod's /api/auth/login
     * has no concept of a Discord-OAuth-only account (see DiscordAuthController),
     * which never has a mod_username — for those, a reachable-but-rejecting API
     * response just means "the mod has never heard of this login," not "the
     * password is wrong," so we still fall back to the local copy. The API
     * being fully unreachable always falls back regardless of mod_username.
     *
     * The 'login' field also accepts a Minecraft username for accounts linked via
     * Discord OAuth (see DiscordAuthController), matched against 'name' or
     * 'mc_username', which never touch the mod's own dashboard-account API.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $login = trim($this->string('login')->toString());
        $password = $this->string('password')->toString();
        $remember = $this->boolean('remember');

        $localUser = str_contains($login, '@')
            ? User::whereRaw('LOWER(email) = ?', [Str::lower($login)])->first()
            : User::whereRaw('LOWER(name) = ?', [Str::lower($login)])
                ->orWhereRaw('LOWER(mc_username) = ?', [Str::lower($login)])
                ->orWhereRaw('LOWER(mod_username) = ?', [Str::lower($login)])
                ->first();

        $apiResult = null;
        $apiReachable = true;

        try {
            $apiResult = app(MinecraftApiService::class)->authenticateUser($login, $password);
        } catch (\Throwable $e) {
            $apiReachable = false;
        }

        if ($apiReachable && ($apiResult['success'] ?? false) && isset($apiResult['user'])) {
            $localUser = $this->mirrorModUser($apiResult['user'], $password);
            Auth::login($localUser, $remember);
            RateLimiter::clear($this->throttleKey());

            return;
        }

        if ($apiReachable && ($localUser?->mod_username !== null)) {
            // The mod API is up and explicitly rejected these credentials for
            // an account this app already knows is mod-linked — authoritative,
            // don't fall back to a possibly-stale local copy for that account.
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'login' => trans('auth.failed'),
            ]);
        }

        // Either the API is unreachable, or it rejected the login because no
        // mod-side account exists at all for a candidate this app already has
        // locally (e.g. a Discord-OAuth-only account, which never has a
        // mod_username) — fall back to the locally-cached credential copy.
        if (! $localUser || ! Auth::attempt(
            ['id' => $localUser->id, 'password' => $password],
            $remember,
        )) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'login' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Create or update the local mirror of a mod dashboard account after a
     * successful API login. Stores a local bcrypt copy of the just-verified
     * password (not the mod's own hash, which uses a different scheme) purely so
     * Auth::attempt() can succeed locally later if the API is down.
     */
    private function mirrorModUser(array $modUser, string $password): User
    {
        $role = match ($modUser['role'] ?? 'VIEWER') {
            'ADMIN' => 'admin',
            'MODERATOR' => 'moderator',
            default => 'moderator',
        };

        // Mass assignment ($fillable) deliberately excludes 'mod_username' and 'role' —
        // same reasoning as the class doc comment on User: only ever set directly by
        // trusted server-side code, never from a request payload. updateOrCreate()'s
        // create()/update() calls go through fill(), which would silently drop both, so
        // set them by direct property assignment instead.
        $user = User::where('mod_username', $modUser['username'])->first() ?? new User();
        $user->mod_username = $modUser['username'];
        $user->name = $modUser['username'];
        $user->email = $modUser['email'] ?: $modUser['username'].'@mod.local';
        $user->password = bcrypt($password);
        $user->role = $role;
        $user->save();

        return $user;
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('login')).'|'.$this->ip());
    }
}
