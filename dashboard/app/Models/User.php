<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * 'role' is deliberately NOT in the #[Fillable] list above — it must only ever
     * be set via direct assignment (e.g. RegisteredUserController, or manually by
     * an existing admin), never through a mass-assigned request payload.
     * Same reasoning for 'discord_id'/'mc_uuid'/'mc_username' — only DiscordAuthController
     * sets these, from Socialite's verified response and the mod's own link-lookup, never
     * from a request payload a visitor controls directly.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * The users table's `role` column has a DB-level default of 'moderator', but
     * on this Laravel version Eloquent inserts an explicit empty string for any
     * unset attribute instead of omitting the column — which silently defeats
     * that DB default for every User::create() call site (registration, seeders,
     * factories, etc.), leaving new users with role === '' rather than
     * 'moderator'. Enforced here instead, in one place, rather than trusting
     * every call site to remember to pass 'role' explicitly.
     */
    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (empty($user->role)) {
                $user->role = 'moderator';
            }
        });
    }
}
