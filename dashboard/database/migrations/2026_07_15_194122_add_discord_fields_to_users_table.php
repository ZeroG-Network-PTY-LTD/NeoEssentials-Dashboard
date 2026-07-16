<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Real Discord snowflake ID from this app's own OAuth2 login (Socialite) — not
            // to be confused with the mod's separate Discord bot integration config.
            $table->string('discord_id')->nullable()->unique()->after('role');
            // The Minecraft account this Discord identity resolved to via the mod's
            // /api/discord/link-lookup at the time of login (cached here so we don't need
            // to re-query the mod API on every page load — refreshed on each login).
            $table->uuid('mc_uuid')->nullable()->after('discord_id');
            $table->string('mc_username')->nullable()->after('mc_uuid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['discord_id', 'mc_uuid', 'mc_username']);
        });
    }
};
