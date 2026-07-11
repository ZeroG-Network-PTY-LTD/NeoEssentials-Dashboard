<?php

use App\Http\Controllers\ConsoleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiscordController;
use App\Http\Controllers\EconomyController;
use App\Http\Controllers\HologramsController;
use App\Http\Controllers\KitsController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WarpsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// All dashboard routes require an authenticated, verified user. The `can:` gates
// below are defined in AppServiceProvider::registerDashboardGates() against this
// app's own admin/moderator role (see App\Models\User) — not the mod's own
// dashboard account roles, which are a separate thing managed under /users.
Route::middleware(['auth', 'verified'])->prefix('dashboard')->group(function () {

    // Named 'dashboard' (not 'dashboard.index') because AuthenticatedSessionController
    // redirects here via route('dashboard') after login — keep this name if you
    // restructure these routes later.
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::name('dashboard.')->group(function () {
        Route::get('/players', [PlayerController::class, 'index'])->name('players.index');
        Route::post('/players/{uuid}/teleport', [PlayerController::class, 'teleport'])->name('players.teleport');
        Route::post('/players/{uuid}/heal', [PlayerController::class, 'heal'])->name('players.heal');
        Route::post('/players/{uuid}/kick', [PlayerController::class, 'kick'])
            ->middleware('can:players.kick')->name('players.kick');
        Route::post('/players/{uuid}/ban', [PlayerController::class, 'ban'])
            ->middleware('can:players.ban')->name('players.ban');
        Route::post('/players/{uuid}/mute', [PlayerController::class, 'mute'])
            ->middleware('can:players.mute')->name('players.mute');

        Route::get('/economy', [EconomyController::class, 'index'])->name('economy.index');
        Route::post('/economy/adjust', [EconomyController::class, 'adjust'])
            ->middleware('can:economy.manage')->name('economy.adjust');

        Route::get('/commands', [ConsoleController::class, 'commands'])->name('commands.index');
        // 20 commands/minute per authenticated user — generous enough for normal admin
        // use, tight enough to stop a compromised/careless session from hammering the
        // mod's console with runCommand() calls. Named limiter (not the request-path
        // default) so it's keyed per-user rather than per-IP.
        Route::post('/commands/run', [ConsoleController::class, 'runCommand'])
            ->middleware(['can:console.run', 'throttle:commands-run'])->name('commands.run');

        Route::get('/logs', [ConsoleController::class, 'logs'])->name('logs.index');

        // No gate here — the mod's own /api/warps endpoint imposes no admin
        // requirement beyond being logged in at all, so this app doesn't add one
        // either (any authenticated moderator/admin can manage warps).
        Route::get('/warps', [WarpsController::class, 'index'])->name('warps.index');
        Route::post('/warps', [WarpsController::class, 'store'])->name('warps.store');
        Route::delete('/warps/{name}', [WarpsController::class, 'destroy'])->name('warps.destroy');

        // Read-only — the mod has no create/update/delete/give routes for kits.
        Route::get('/kits', [KitsController::class, 'index'])->name('kits.index');

        // No gate — same rule as Warps: the mod's HologramEndpoint imposes no
        // admin requirement beyond being logged in.
        Route::get('/holograms', [HologramsController::class, 'index'])->name('holograms.index');
        Route::post('/holograms', [HologramsController::class, 'store'])->name('holograms.store');
        Route::put('/holograms/{id}', [HologramsController::class, 'update'])->name('holograms.update');
        Route::delete('/holograms/{id}', [HologramsController::class, 'destroy'])->name('holograms.destroy');
        Route::post('/holograms/{id}/spawn', [HologramsController::class, 'spawn'])->name('holograms.spawn');
        Route::post('/holograms/{id}/despawn', [HologramsController::class, 'despawn'])->name('holograms.despawn');
        Route::post('/holograms/{id}/visible', [HologramsController::class, 'toggleVisibility'])->name('holograms.visible');

        // Status/events are readable by any logged-in account; clearing the
        // event log, sending a test message, and the auth-config form are
        // gated behind can:discord.manage (admin-only), mirroring the mod's
        // own DiscordEndpoint restrictions.
        Route::get('/discord', [DiscordController::class, 'index'])->name('discord.index');
        Route::middleware('can:discord.manage')->group(function () {
            Route::delete('/discord/events', [DiscordController::class, 'clearEvents'])->name('discord.events.clear');
            Route::post('/discord/test', [DiscordController::class, 'test'])->name('discord.test');
            Route::post('/discord/auth-config', [DiscordController::class, 'updateAuthConfig'])->name('discord.auth-config.update');
        });

        // Mod dashboard accounts — admin-only in this app, mirroring the mod's
        // own UserManagementEndpoint being entirely admin-only.
        Route::middleware('can:mod-users.manage')->group(function () {
            Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
            Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
            // Must be registered before the generic /users/{id} DELETE route below —
            // otherwise DELETE /users/sessions/{sessionId} matches /users/{id} first
            // (treating "sessions" as the {id} value) and never reaches this handler.
            Route::delete('/users/sessions/{sessionId}', [UserManagementController::class, 'revokeSession'])->name('users.sessions.revoke');
            Route::post('/users/{id}/role', [UserManagementController::class, 'setRole'])->name('users.role');
            Route::post('/users/{id}/password', [UserManagementController::class, 'resetPassword'])->name('users.password');
            Route::post('/users/{id}/enable', [UserManagementController::class, 'enable'])->name('users.enable');
            Route::post('/users/{id}/disable', [UserManagementController::class, 'disable'])->name('users.disable');
            Route::delete('/users/{id}', [UserManagementController::class, 'destroy'])->name('users.destroy');
        });
    });
});

require __DIR__.'/auth.php';
