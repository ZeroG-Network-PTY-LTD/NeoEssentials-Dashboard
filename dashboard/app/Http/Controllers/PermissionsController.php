<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PermissionsController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Permissions', [
            'overview' => $this->safe(fn () => $this->mc->permissionOverview(), [
                'success' => false, 'totalGroups' => 0, 'totalUsers' => 0,
                'usingExternal' => true, 'systemType' => 'Unavailable — could not reach the Minecraft server API',
            ]),
            'groups' => $this->safe(fn () => $this->mc->permissionGroups(), []),
            'users' => $this->safe(fn () => $this->mc->permissionUsers(), []),
            'aliases' => $this->safe(fn () => $this->mc->permissionAliases(), []),
        ]);
    }

    public function reload(): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->reloadPermissions(), 'Permissions reloaded.');
    }

    public function storeGroup(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:32'],
            'prefix' => ['nullable', 'string'],
            'suffix' => ['nullable', 'string'],
            'isDefault' => ['nullable', 'boolean'],
        ]);

        return $this->attempt(fn () => $this->mc->createPermissionGroup(
            $data['name'],
            $data['prefix'] ?? '',
            $data['suffix'] ?? '',
            $data['isDefault'] ?? false,
        ), "Group '{$data['name']}' created.");
    }

    public function updateGroup(Request $request, string $name): RedirectResponse
    {
        $data = $request->validate([
            'prefix' => ['nullable', 'string'],
            'suffix' => ['nullable', 'string'],
            'isDefault' => ['nullable', 'boolean'],
        ]);

        return $this->attempt(fn () => $this->mc->updatePermissionGroup($name, $data), "Group '{$name}' updated.");
    }

    public function destroyGroup(string $name): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->deletePermissionGroup($name), "Group '{$name}' deleted.");
    }

    public function addGroupPermission(Request $request, string $name): RedirectResponse
    {
        $data = $request->validate(['permission' => ['required', 'string']]);

        return $this->attempt(fn () => $this->mc->addGroupPermission($name, $data['permission']), 'Permission added.');
    }

    public function removeGroupPermission(string $name, string $permission): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->removeGroupPermission($name, $permission), 'Permission removed.');
    }

    public function setUserGroup(Request $request, string $username): RedirectResponse
    {
        $data = $request->validate(['group' => ['required', 'string']]);

        return $this->attempt(
            fn () => $this->mc->setUserGroup($username, $data['group']),
            "{$username} moved to group '{$data['group']}'.",
        );
    }

    public function addUserPermission(Request $request, string $username): RedirectResponse
    {
        $data = $request->validate(['permission' => ['required', 'string']]);

        return $this->attempt(fn () => $this->mc->addUserPermission($username, $data['permission']), 'Permission added.');
    }

    public function removeUserPermission(string $username, string $permission): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->removeUserPermission($username, $permission), 'Permission removed.');
    }

    public function storeAlias(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'alias' => ['required', 'string'],
            'canonical' => ['required', 'string'],
        ]);

        return $this->attempt(
            fn () => $this->mc->addPermissionAlias($data['alias'], $data['canonical']),
            "Alias '{$data['alias']}' added.",
        );
    }

    public function destroyAlias(string $alias): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->removePermissionAlias($alias), "Alias '{$alias}' removed.");
    }
}