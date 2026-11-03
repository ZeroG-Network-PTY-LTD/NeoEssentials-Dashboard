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
            // Per-tab dashboard permissions resolved from the mod's
            // webDashboard.groupPermissions[] config for this user's in-game primary
            // group — an array of {tab, canRead, canWrite} entries, kept in sync by
            // ConfigService::syncFromMod(). Null/empty means no custom per-group
            // mapping applies (role-based admin/moderator gating is unaffected).
            $table->json('permissions')->nullable()->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
