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
            // Lightweight built-in role system — this app doesn't assume Spatie
            // Laravel Permission (or any other package) is installed. Just two
            // roles for now: 'admin' can do everything the ported dashboard
            // routes gate (kick/ban/mute/economy.manage/console.run); 'moderator'
            // gets mute but not the more destructive/impactful actions. See
            // AppServiceProvider::boot() for the actual Gate definitions.
            $table->string('role')->default('moderator')->after('password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
