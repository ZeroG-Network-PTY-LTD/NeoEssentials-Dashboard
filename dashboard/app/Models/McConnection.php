<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Singleton row holding the mod-pairing state — see the mc_connection migration for why this
 * replaced writing MC_SERVICE_API_KEY/MOD_WEBHOOK_TOKEN/MC_WS_PORT into .env. api_key and
 * webhook_token are encrypted at rest (Laravel's `encrypted` cast, keyed off APP_KEY); nothing
 * else in this app should query this table directly — go through ConfigService.
 */
class McConnection extends Model
{
    protected $table = 'mc_connection';

    protected $fillable = ['api_key', 'api_key_id', 'webhook_token', 'ws_port', 'server_name'];

    protected $casts = [
        'api_key' => 'encrypted',
        'webhook_token' => 'encrypted',
    ];

    private const ENCRYPTED_ATTRIBUTES = ['api_key', 'webhook_token'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }

    public function isPaired(): bool
    {
        return filled($this->api_key);
    }

    /**
     * The encrypted cast throws DecryptException if the stored ciphertext can't be decrypted
     * under the CURRENT APP_KEY — which happens whenever the key changes after pairing (key
     * rotation, or a fresh key baked into a redeployed container image while this table's
     * volume persists across the rebuild). Every consumer of this model (isPaired(),
     * MinecraftApiService's constructor, etc.) would otherwise crash with an uncaught 500 the
     * moment the key and the stored ciphertext stop matching — treat it the same as "this
     * credential was never set" instead, since from the app's perspective that's functionally
     * true: it can no longer use whatever was stored there.
     */
    public function getAttribute($key)
    {
        try {
            return parent::getAttribute($key);
        } catch (DecryptException $e) {
            if (in_array($key, self::ENCRYPTED_ATTRIBUTES, true)) {
                Log::warning("McConnection.{$key} could not be decrypted (APP_KEY changed since pairing?) — treating as unset.", [
                    'error' => $e->getMessage(),
                ]);
                return null;
            }
            throw $e;
        }
    }
}
