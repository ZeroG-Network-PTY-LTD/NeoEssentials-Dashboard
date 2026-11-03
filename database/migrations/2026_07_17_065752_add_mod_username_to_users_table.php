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
            // The username this account authenticates with against the mod's own
            // /api/auth/login (its dashboard_users collection — admin/dashboard-service/
            // etc). Distinct from mc_username, which is a Minecraft player name resolved
            // via Discord OAuth2 link-lookup, not a dashboard login credential.
            $table->string('mod_username')->nullable()->unique()->after('mc_username');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('mod_username');
        });
    }
};
