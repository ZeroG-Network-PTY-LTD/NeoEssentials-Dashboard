<?php

use App\Http\Controllers\Install\InstallController;
use Illuminate\Support\Facades\Route;

// Deliberately outside the 'auth' middleware — there's no user account to
// log in as yet on a fresh deploy. App\Http\Middleware\EnsureInstalled
// forces every other route through here until storage/installed.lock
// exists; access itself is gated by pasting a working mod API key instead
// (see InstallController::apiKeyConnect()).
Route::prefix('install')->name('install.')->group(function () {
    Route::get('/', [InstallController::class, 'index'])->name('index');
    Route::post('/api-key', [InstallController::class, 'apiKeyConnect'])->name('api-key');

    Route::get('/requirements', [InstallController::class, 'requirements'])->name('requirements');

    Route::get('/environment', [InstallController::class, 'environmentShow'])->name('environment');
    Route::post('/environment/test', [InstallController::class, 'environmentTest'])->name('environment.test');
    Route::post('/environment', [InstallController::class, 'environmentSave'])->name('environment.save');

    Route::get('/migrate', [InstallController::class, 'migrateShow'])->name('migrate');
    Route::post('/migrate', [InstallController::class, 'migrateRun'])->name('migrate.run');

    Route::get('/finish', [InstallController::class, 'finishShow'])->name('finish');
    Route::post('/finish', [InstallController::class, 'finishRun'])->name('finish.run');
});
