<?php

use App\Http\Controllers\BackupsController;
use App\Http\Controllers\ConfigurationController;
use App\Http\Controllers\ConsoleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiscordController;
use App\Http\Controllers\EconomyController;
use App\Http\Controllers\HologramsController;
use App\Http\Controllers\KitsController;
use App\Http\Controllers\PermissionsController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\PlayerProfileController;
use App\Http\Controllers\PublicLookupController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UpdatesController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WarpsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

require __DIR__.'/install.php';
require __DIR__.'/webhooks.php';

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Public player moderation lookup — no login required, reachable whether or not
// a dashboard account is signed in (also linked from the staff sidebar nav).
Route::get('/lookup', [PublicLookupController::class, 'index'])->name('lookup');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/minecraft-link/start', [ProfileController::class, 'minecraftLinkStart'])->name('profile.minecraft-link.start');
    Route::get('/profile/minecraft-link/status', [ProfileController::class, 'minecraftLinkStatus'])->name('profile.minecraft-link.status');
    Route::post('/profile/minecraft-link/unlink', [ProfileController::class, 'minecraftLinkUnlink'])->name('profile.minecraft-link.unlink');
    Route::get('/profile/discord-status', [ProfileController::class, 'discordStatus'])->name('profile.discord-status');
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
        // Read-only — no gate, mirrors the mod's own homes lookup imposing no
        // admin requirement beyond being logged in.
        Route::get('/players/{uuid}/homes', [PlayerController::class, 'homes'])->name('players.homes');
        Route::get('/players/{uuid}/permission-group', [PlayerController::class, 'permissionGroup'])->name('players.permission-group');
        Route::post('/players/{uuid}/kick', [PlayerController::class, 'kick'])
            ->middleware('can:players.kick')->name('players.kick');
        Route::post('/players/{uuid}/ban', [PlayerController::class, 'ban'])
            ->middleware('can:players.ban')->name('players.ban');
        Route::post('/players/{uuid}/mute', [PlayerController::class, 'mute'])
            ->middleware('can:players.mute')->name('players.mute');
        Route::post('/players/{uuid}/gamemode', [PlayerController::class, 'gamemode'])
            ->middleware('can:players.gamemode')->name('players.gamemode');

        // Full per-player control page — keyed by username directly (not uuid), works for
        // offline players wherever the mod's own endpoint supports it. See
        // PlayerProfileController's class docblock for why this is a separate controller
        // from PlayerController above (JSON everywhere, not Inertia redirects).
        Route::get('/players/player/{username}', [PlayerProfileController::class, 'show'])->name('players.profile');
        Route::prefix('players/player/{username}')->name('players.profile.')->group(function () {
            Route::get('/lookup', [PlayerProfileController::class, 'lookup'])->name('lookup');
            Route::get('/balance', [PlayerProfileController::class, 'balance'])->name('balance');
            Route::get('/permission-info', [PlayerProfileController::class, 'permissionInfo'])->name('permission-info');
            Route::get('/inventory', [PlayerProfileController::class, 'inventory'])->name('inventory');
            Route::get('/freeze', [PlayerProfileController::class, 'freezeStatus'])->name('freeze.status');
            Route::get('/vanish', [PlayerProfileController::class, 'vanishStatus'])->name('vanish.status');
            Route::get('/jail', [PlayerProfileController::class, 'jailStatus'])->name('jail.status');
            Route::get('/ptime', [PlayerProfileController::class, 'ptime'])->name('ptime.get');
            Route::get('/pweather', [PlayerProfileController::class, 'pweather'])->name('pweather.get');
            Route::get('/bans', [PlayerProfileController::class, 'banHistory'])->name('bans');
            Route::get('/mutes', [PlayerProfileController::class, 'muteHistory'])->name('mutes');
            Route::get('/kicks', [PlayerProfileController::class, 'kickHistory'])->name('kicks');
            Route::get('/warns', [PlayerProfileController::class, 'warns'])->name('warns');
            Route::get('/notes', [PlayerProfileController::class, 'notes'])->name('notes');

            Route::middleware('can:players.profile.manage')->group(function () {
                Route::post('/heal', [PlayerProfileController::class, 'heal'])->name('heal');
                Route::post('/kick', [PlayerProfileController::class, 'kick'])->name('kick');
                Route::post('/ban', [PlayerProfileController::class, 'ban'])->name('ban');
                Route::post('/mute', [PlayerProfileController::class, 'mute'])->name('mute');
                Route::delete('/mute', [PlayerProfileController::class, 'unmute'])->name('unmute');
                Route::post('/gamemode', [PlayerProfileController::class, 'gamemode'])->name('gamemode');
                Route::post('/group', [PlayerProfileController::class, 'group'])->name('group');
                Route::post('/permissions', [PlayerProfileController::class, 'addPermission'])->name('permissions.add');
                Route::delete('/permissions/{permission}', [PlayerProfileController::class, 'removePermission'])->name('permissions.remove');
                Route::post('/economy', [PlayerProfileController::class, 'economyAdjust'])->name('economy');
                Route::post('/teleport', [PlayerProfileController::class, 'teleport'])->name('teleport');

                Route::post('/fly', [PlayerProfileController::class, 'fly'])->name('fly');
                Route::post('/god', [PlayerProfileController::class, 'god'])->name('god');
                Route::post('/feed', [PlayerProfileController::class, 'feed'])->name('feed');
                Route::post('/extinguish', [PlayerProfileController::class, 'extinguish'])->name('extinguish');
                Route::post('/speed', [PlayerProfileController::class, 'speed'])->name('speed');
                Route::post('/nickname', [PlayerProfileController::class, 'nickname'])->name('nickname');

                Route::post('/freeze', [PlayerProfileController::class, 'freeze'])->name('freeze');
                Route::delete('/freeze', [PlayerProfileController::class, 'unfreeze'])->name('unfreeze');
                Route::post('/vanish', [PlayerProfileController::class, 'vanish'])->name('vanish');
                Route::delete('/vanish', [PlayerProfileController::class, 'unvanish'])->name('unvanish');
                Route::post('/jail', [PlayerProfileController::class, 'jail'])->name('jail');
                Route::delete('/jail', [PlayerProfileController::class, 'unjail'])->name('unjail');

                Route::delete('/ban', [PlayerProfileController::class, 'unban'])->name('unban');
                Route::delete('/warns/{warnId}', [PlayerProfileController::class, 'removeWarn'])->name('warns.remove');
                Route::post('/notes', [PlayerProfileController::class, 'createNote'])->name('notes.add');
                Route::delete('/notes/{noteId}', [PlayerProfileController::class, 'removeNote'])->name('notes.remove');

                Route::post('/give', [PlayerProfileController::class, 'give'])->name('give');
                Route::post('/burn', [PlayerProfileController::class, 'burn'])->name('burn');
                Route::post('/kill', [PlayerProfileController::class, 'kill'])->name('kill');
                Route::post('/effect', [PlayerProfileController::class, 'applyEffect'])->name('effect');
                Route::delete('/effect', [PlayerProfileController::class, 'clearEffects'])->name('effect.clear');
                Route::post('/lightning', [PlayerProfileController::class, 'lightning'])->name('lightning');
                Route::post('/spawnmob', [PlayerProfileController::class, 'spawnMob'])->name('spawnmob');

                Route::post('/sudo', [PlayerProfileController::class, 'sudo'])->name('sudo');
                Route::post('/clear-inventory', [PlayerProfileController::class, 'clearInventory'])->name('clear-inventory');
                Route::post('/ptime', [PlayerProfileController::class, 'setPtime'])->name('ptime.set');
                Route::post('/pweather', [PlayerProfileController::class, 'setPweather'])->name('pweather.set');
            });
        });
        // Shared group list for the profile page's dropdown (same source /permissions uses).
        Route::get('/players/player-groups', [PlayerProfileController::class, 'groups'])->name('players.profile.groups');
        Route::get('/players/jails', [PlayerProfileController::class, 'jails'])->name('players.profile.jails');

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

        // GET routes are open to any logged-in account (mirrors PermissionEndpoint's
        // own GET-is-open rule); every write requires can:permissions.manage since a
        // self-escalation risk exists otherwise (a moderator granting themselves an
        // admin-equivalent node).
        Route::get('/permissions', [PermissionsController::class, 'index'])->name('permissions.index');
        Route::middleware('can:permissions.manage')->group(function () {
            Route::post('/permissions/reload', [PermissionsController::class, 'reload'])->name('permissions.reload');
            Route::post('/permissions/groups', [PermissionsController::class, 'storeGroup'])->name('permissions.groups.store');
            Route::put('/permissions/groups/{name}', [PermissionsController::class, 'updateGroup'])->name('permissions.groups.update');
            Route::post('/permissions/groups/{name}/rename', [PermissionsController::class, 'renameGroup'])->name('permissions.groups.rename');
            Route::delete('/permissions/groups/{name}', [PermissionsController::class, 'destroyGroup'])->name('permissions.groups.destroy');
            Route::post('/permissions/groups/{name}/permissions', [PermissionsController::class, 'addGroupPermission'])->name('permissions.groups.permissions.add');
            Route::delete('/permissions/groups/{name}/permissions/{permission}', [PermissionsController::class, 'removeGroupPermission'])->name('permissions.groups.permissions.remove');
            Route::post('/permissions/users/{username}/group', [PermissionsController::class, 'setUserGroup'])->name('permissions.users.group');
            Route::post('/permissions/users/{username}/permissions', [PermissionsController::class, 'addUserPermission'])->name('permissions.users.permissions.add');
            Route::delete('/permissions/users/{username}/permissions/{permission}', [PermissionsController::class, 'removeUserPermission'])->name('permissions.users.permissions.remove');
            Route::post('/permissions/aliases', [PermissionsController::class, 'storeAlias'])->name('permissions.aliases.store');
            Route::delete('/permissions/aliases/{alias}', [PermissionsController::class, 'destroyAlias'])->name('permissions.aliases.destroy');
        });

        // Status/list/file-browsing readable by any logged-in account; every write
        // (create/restore/delete/cloud config/upload) requires can:backups.manage,
        // mirroring BackupEndpoint/CloudStorageEndpoint's own admin-only mutations.
        Route::get('/backups', [BackupsController::class, 'index'])->name('backups.index');
        Route::get('/backups/{name}/download', [BackupsController::class, 'download'])->name('backups.download');
        Route::middleware('can:backups.manage')->group(function () {
            Route::post('/backups', [BackupsController::class, 'store'])->name('backups.store');
            Route::post('/backups/restore', [BackupsController::class, 'restore'])->name('backups.restore');
            Route::post('/backups/cloud/dropbox/config', [BackupsController::class, 'configureDropbox'])->name('backups.cloud.dropbox.config');
            Route::post('/backups/cloud/google/config', [BackupsController::class, 'configureGoogle'])->name('backups.cloud.google.config');
            Route::post('/backups/cloud/dropbox/test', [BackupsController::class, 'testDropbox'])->name('backups.cloud.dropbox.test');
            Route::post('/backups/cloud/google/test', [BackupsController::class, 'testGoogle'])->name('backups.cloud.google.test');
            Route::post('/backups/cloud/dropbox/upload/{backupId}', [BackupsController::class, 'uploadDropbox'])->name('backups.cloud.dropbox.upload');
            Route::post('/backups/cloud/google/upload/{backupId}', [BackupsController::class, 'uploadGoogle'])->name('backups.cloud.google.upload');
            Route::delete('/backups/cloud/dropbox/file', [BackupsController::class, 'deleteDropboxFile'])->name('backups.cloud.dropbox.file.delete');
            Route::delete('/backups/cloud/google/file/{fileId}', [BackupsController::class, 'deleteGoogleFile'])->name('backups.cloud.google.file.delete');
            // Grouped after the cloud DELETE routes for readability — {name} only
            // matches a single path segment by default, so it can't actually shadow
            // the multi-segment cloud/* routes above, but keeping specific-before-
            // generic here avoids having to re-verify that fact later.
            Route::delete('/backups/{name}', [BackupsController::class, 'destroy'])->name('backups.destroy');
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

        // Self-update — checking GitHub for a newer commit is admin-only (it's
        // only interesting to whoever can act on it); applying an update (git
        // or uploaded zip) is always admin-only since it overwrites this app's
        // own code.
        Route::middleware('can:updates.manage')->group(function () {
            Route::get('/updates', [UpdatesController::class, 'index'])->name('updates.index');
            Route::post('/updates/check', [UpdatesController::class, 'check'])->name('updates.check');
            Route::post('/updates/apply', [UpdatesController::class, 'applyGit'])->name('updates.apply');
            Route::post('/updates/apply-release', [UpdatesController::class, 'applyRelease'])->name('updates.apply-release');
            Route::post('/updates/apply-release-version', [UpdatesController::class, 'applyReleaseVersion'])->name('updates.apply-release-version');
            Route::post('/updates/upload', [UpdatesController::class, 'upload'])->name('updates.upload');
        });

        // Discord OAuth app credentials, MC API connection, and the mod-account
        // sync trigger — admin-only, this app's own runtime config.
        Route::middleware('can:configuration.manage')->prefix('configuration')->name('configuration.')->group(function () {
            Route::get('/', [ConfigurationController::class, 'index'])->name('index');
            Route::post('/discord', [ConfigurationController::class, 'updateDiscord'])->name('discord.update');
            Route::post('/mc-api/url', [ConfigurationController::class, 'updateMcApiUrl'])->name('mc-api.url');
            Route::post('/mc-api/test', [ConfigurationController::class, 'testMcApi'])->name('mc-api.test');
            Route::post('/mc-api/pairing/start', [ConfigurationController::class, 'startPairing'])->name('mc-api.pairing.start');
            Route::get('/mc-api/pairing/status', [ConfigurationController::class, 'pairingStatus'])->name('mc-api.pairing.status');
            Route::post('/mc-api/unpair', [ConfigurationController::class, 'unpair'])->name('mc-api.unpair');
            Route::post('/sync-users', [ConfigurationController::class, 'syncUsers'])->name('sync-users');
        });
    });
});

require __DIR__.'/auth.php';
