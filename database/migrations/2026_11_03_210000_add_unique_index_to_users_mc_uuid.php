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
        // discord_id and mod_username are both unique (see
        // add_discord_fields_to_users_table / add_mod_username_to_users_table) but mc_uuid
        // was left without one, so nothing stopped the same Minecraft account from ending up
        // linked to two or more separate Laravel accounts (e.g. a second self-registered
        // account completing /linkaccount <code> for a uuid another account already holds).
        Schema::table('users', function (Blueprint $table) {
            $table->unique('mc_uuid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['mc_uuid']);
        });
    }
};
