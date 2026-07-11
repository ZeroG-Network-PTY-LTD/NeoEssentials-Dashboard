<?php

use App\Http\Controllers\ConsoleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EconomyController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\ProfileController;
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
// below (players.kick, players.ban, players.mute, economy.manage, console.run)
// aren't defined yet — Phase 2 adds a lightweight role system to back them.
// Until then these specific actions will 403 with an "ability not defined" error;
// everything else (viewing players/economy/logs, teleport, heal) works as-is.
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
    });
});

require __DIR__.'/auth.php';
