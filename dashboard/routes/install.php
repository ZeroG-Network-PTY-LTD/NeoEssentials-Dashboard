<?php

use App\Http\Controllers\Install\InstallController;
use Illuminate\Support\Facades\Route;

// Deliberately outside the 'auth' middleware — there's no user account to
// log in as yet on a fresh deploy. App\Http\Middleware\EnsureInstalled
// forces every other route through here until storage/installed.lock
// exists; access itself is gated by the one-time setup token instead (see
// InstallController::verifyToken()).
Route::prefix('install')->name('install.')->group(function () {
    Route::get('/', [InstallController::class, 'index'])->name('index');
    Route::post('/token', [InstallController::class, 'verifyToken'])->name('token');

    Route::get('/requirements', [InstallController::class, 'requirements'])->name('requirements');

    Route::get('/environment', [InstallController::class, 'environmentShow'])->name('environment');
    Route::post('/environment/test', [InstallController::class, 'environmentTest'])->name('environment.test');
    Route::post('/environment', [InstallController::class, 'environmentSave'])->name('environment.save');

    Route::get('/migrate', [InstallController::class, 'migrateShow'])->name('migrate');
    Route::post('/migrate', [InstallController::class, 'migrateRun'])->name('migrate.run');

    Route::get('/mc-api', [InstallController::class, 'mcApiShow'])->name('mc-api');
    Route::post('/mc-api/test', [InstallController::class, 'mcApiTest'])->name('mc-api.test');
    Route::post('/mc-api', [InstallController::class, 'mcApiSave'])->name('mc-api.save');

    Route::get('/finish', [InstallController::class, 'finishShow'])->name('finish');
    Route::post('/finish', [InstallController::class, 'finishRun'])->name('finish.run');
});
