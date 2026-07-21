<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }

    public function isPaired(): bool
    {
        return filled($this->api_key);
    }
}
