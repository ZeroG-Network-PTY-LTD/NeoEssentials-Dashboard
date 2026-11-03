<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Replaces the old .env-file-writing pairing storage (MC_SERVICE_API_KEY, MOD_WEBHOOK_TOKEN,
 * MC_WS_PORT) — that approach needed filesystem write access to .env, which some shared hosts
 * don't grant, and wasn't concurrency-safe. Singleton row (see McConnection::current()); this
 * app only ever pairs with one Minecraft server at a time.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mc_connection', function (Blueprint $table) {
            $table->id();
            $table->text('api_key')->nullable(); // encrypted at rest — see McConnection's casts
            $table->string('api_key_id')->nullable(); // public half of "neo_<id>_<secret>" — lets unpair() self-revoke via DELETE /api/apikeys/{id}
            $table->text('webhook_token')->nullable(); // encrypted at rest
            $table->unsignedInteger('ws_port')->nullable();
            $table->string('server_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mc_connection');
    }
};
