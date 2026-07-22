<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Full single-player control page — /dashboard/players/player/{username}. Unlike
 * PlayerController's action routes (keyed by uuid, resolved via the online-players list,
 * online-only), everything here is keyed directly by username and works for offline
 * players wherever the mod's own endpoint supports it (freeze, notes, warns, economy,
 * permission group/overrides, ban history) — only routes that need a live ServerPlayer
 * (fly/god/feed/state toggles, items/fun, sudo, ptime/pweather, clear inventory) are
 * online-only, same restriction the mod itself enforces.
 *
 * Deliberately all JSON, not Inertia redirects: this page fires many small independent
 * actions and shows a toast per response, mirroring the internal bundled dashboard's
 * PlayerProfile page rather than reloading the whole Inertia page after every click.
 */
class PlayerProfileController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    /** Renders the page shell — the page itself fetches everything else client-side. */
    public function show(string $username): Response
    {
        return Inertia::render('Dashboard/PlayerProfile', [
            'username' => $username,
        ]);
    }

    // --- Read-only status --------------------------------------------------

    public function lookup(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->lookupPlayer($username), ['success' => false, 'message' => 'Could not reach the Minecraft server API.']);
    }

    public function balance(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->getBalance($username), ['success' => false]);
    }

    public function permissionInfo(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->permissionUserLookup($username), ['success' => false]);
    }

    public function groups(): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->permissionGroups(), []);
    }

    public function inventory(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->getInventory($username), ['error' => 'Could not reach the Minecraft server API.']);
    }

    public function freezeStatus(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->freezeStatus($username), ['frozen' => false]);
    }

    public function vanishStatus(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->vanishStatus($username), ['vanished' => false]);
    }

    public function jailStatus(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->jailStatus($username), ['jailed' => false]);
    }

    public function jails(): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->jailLocations(), []);
    }

    public function ptime(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->getPtime($username), ['ticks' => null]);
    }

    public function pweather(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->getPweather($username), ['type' => null]);
    }

    public function banHistory(string $username): JsonResponse
    {
        return $this->safeJson(function () use ($username) {
            $lookup = $this->mc->lookupPlayer($username);
            $uuid = $lookup['uuid'] ?? null;
            return $uuid ? $this->mc->banHistory($uuid) : [];
        }, []);
    }

    public function muteHistory(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->muteHistory($username), []);
    }

    public function kickHistory(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->kickHistory($username), []);
    }

    public function warns(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->warnsForPlayer($username), []);
    }

    public function notes(string $username): JsonResponse
    {
        return $this->safeJson(fn () => $this->mc->notesForPlayer($username), []);
    }

    // --- Quick actions -------------------------------------------------------

    public function heal(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->healPlayer($username), 'Healed and fed.');
    }

    public function kick(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        return $this->attemptJson(fn () => $this->mc->kickPlayer($username, $data['reason'] ?? 'Kicked from dashboard'), 'Kicked.');
    }

    public function ban(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255'], 'duration' => ['nullable', 'string']]);
        return $this->attemptJson(fn () => $this->mc->banPlayer($username, $data['reason'] ?? 'Banned from dashboard', $data['duration'] ?? null), 'Banned.');
    }

    public function mute(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['duration' => ['nullable', 'string']]);
        return $this->attemptJson(fn () => $this->mc->mutePlayer($username, $data['duration'] ?? null), 'Muted.');
    }

    public function unmute(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->unmute($username), 'Unmuted.');
    }

    public function gamemode(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['gamemode' => ['required', 'string', 'in:survival,creative,adventure,spectator']]);
        return $this->attemptJson(fn () => $this->mc->setGamemode($username, $data['gamemode']), "Game mode set to {$data['gamemode']}.");
    }

    public function group(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['group' => ['required', 'string']]);
        return $this->attemptJson(fn () => $this->mc->setUserGroup($username, $data['group']), "Group set to '{$data['group']}'.");
    }

    public function addPermission(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['permission' => ['required', 'string']]);
        return $this->attemptJson(fn () => $this->mc->addUserPermission($username, $data['permission']), 'Permission added.');
    }

    public function removePermission(string $username, string $permission): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->removeUserPermission($username, $permission), 'Permission removed.');
    }

    public function economyAdjust(Request $request, string $username): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:give,take,set'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);
        return $this->attemptJson(fn () => $this->mc->economyAdjust($username, $data['action'], (float) $data['amount']), 'Balance updated.');
    }

    public function teleport(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['targetUsername' => ['required', 'string']]);
        return $this->attemptJson(fn () => $this->mc->teleportPlayer($username, ['targetUsername' => $data['targetUsername']]), "Teleported to {$data['targetUsername']}.");
    }

    // --- Player state toggles ------------------------------------------------

    public function fly(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['enable' => ['nullable', 'boolean']]);
        return $this->attemptJson(fn () => $this->mc->setFly($username, $data['enable'] ?? null), 'Flight updated.');
    }

    public function god(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['enable' => ['nullable', 'boolean']]);
        return $this->attemptJson(fn () => $this->mc->setGod($username, $data['enable'] ?? null), 'God mode updated.');
    }

    public function feed(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->feedPlayer($username), 'Fed.');
    }

    public function extinguish(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->extinguishPlayer($username), 'Extinguished.');
    }

    public function speed(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['type' => ['required', 'in:walk,fly'], 'speed' => ['required', 'numeric', 'min:0', 'max:10']]);
        return $this->attemptJson(fn () => $this->mc->setSpeed($username, $data['type'], (float) $data['speed']), 'Speed updated.');
    }

    public function nickname(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['nickname' => ['nullable', 'string']]);
        return $this->attemptJson(fn () => $this->mc->setNickname($username, $data['nickname'] ?? null), 'Nickname updated.');
    }

    // --- Freeze / vanish / jail -----------------------------------------------

    public function freeze(Request $request, string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->freezePlayer($username, $request->input('reason')), 'Frozen.');
    }

    public function unfreeze(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->unfreezePlayer($username), 'Unfrozen.');
    }

    public function vanish(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->vanishPlayer($username), 'Vanished.');
    }

    public function unvanish(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->unvanishPlayer($username), 'Unvanished.');
    }

    public function jail(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['jailName' => ['required', 'string']]);
        return $this->attemptJson(fn () => $this->mc->jailPlayer($username, $data['jailName']), "Jailed in '{$data['jailName']}'.");
    }

    public function unjail(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->unjailPlayer($username), 'Unjailed.');
    }

    // --- Moderation history mutations -----------------------------------------

    public function unban(string $username): JsonResponse
    {
        return $this->attemptJson(function () use ($username) {
            $lookup = $this->mc->lookupPlayer($username);
            $uuid = $lookup['uuid'] ?? throw new \RuntimeException("Player {$username} not found.");
            return $this->mc->unban($uuid);
        }, 'Ban lifted.');
    }

    public function removeWarn(string $username, string $warnId): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->removeWarn($warnId, $username), 'Warning removed.');
    }

    public function createNote(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['text' => ['required', 'string']]);
        return $this->attemptJson(fn () => $this->mc->createNote($username, $data['text']), 'Note added.');
    }

    public function removeNote(string $username, string $noteId): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->removeNote($noteId, $username), 'Note removed.');
    }

    // --- Items / fun -----------------------------------------------------------

    public function give(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['item' => ['required', 'string'], 'amount' => ['nullable', 'integer', 'min:1', 'max:3456']]);
        return $this->attemptJson(fn () => $this->mc->giveItem($username, $data['item'], (int) ($data['amount'] ?? 1)), 'Item given.');
    }

    public function burn(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['seconds' => ['nullable', 'integer', 'min:1', 'max:600']]);
        return $this->attemptJson(fn () => $this->mc->burnPlayer($username, (int) ($data['seconds'] ?? 10)), 'Set on fire.');
    }

    public function kill(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->killPlayer($username), 'Killed.');
    }

    public function applyEffect(Request $request, string $username): JsonResponse
    {
        $data = $request->validate([
            'effect' => ['required', 'string'],
            'duration' => ['nullable', 'integer', 'min:1'],
            'amplifier' => ['nullable', 'integer', 'min:0', 'max:255'],
        ]);
        return $this->attemptJson(
            fn () => $this->mc->applyEffect($username, $data['effect'], (int) ($data['duration'] ?? 30), (int) ($data['amplifier'] ?? 0)),
            'Effect applied.',
        );
    }

    public function clearEffects(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->clearEffects($username), 'Effects cleared.');
    }

    public function lightning(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->strikeLightning($username), 'Lightning struck.');
    }

    public function spawnMob(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['mob' => ['required', 'string'], 'amount' => ['nullable', 'integer', 'min:1', 'max:100']]);
        return $this->attemptJson(fn () => $this->mc->spawnMob($username, $data['mob'], (int) ($data['amount'] ?? 1)), 'Mob spawned.');
    }

    // --- Admin tools -----------------------------------------------------------

    public function sudo(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['command' => ['required', 'string'], 'isChat' => ['nullable', 'boolean']]);
        return $this->attemptJson(fn () => $this->mc->runSudo($username, $data['command'], (bool) ($data['isChat'] ?? false)), 'Ran on player.');
    }

    public function clearInventory(string $username): JsonResponse
    {
        return $this->attemptJson(fn () => $this->mc->clearInventory($username), 'Inventory cleared.');
    }

    public function setPtime(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['ticks' => ['nullable', 'integer', 'min:0']]);
        return $this->attemptJson(fn () => $this->mc->setPtime($username, isset($data['ticks']) ? (int) $data['ticks'] : null), 'Ptime updated.');
    }

    public function setPweather(Request $request, string $username): JsonResponse
    {
        $data = $request->validate(['type' => ['nullable', 'string', 'in:sun,storm']]);
        return $this->attemptJson(fn () => $this->mc->setPweather($username, $data['type'] ?? null), 'Pweather updated.');
    }
}
