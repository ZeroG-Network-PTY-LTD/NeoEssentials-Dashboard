<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PermissionsController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Permissions', [
            'overview' => $this->mc->permissionOverview(),
            'groups' => $this->mc->permissionGroups(),
            'users' => $this->mc->permissionUsers(),
            'aliases' => $this->mc->permissionAliases(),
        ]);
    }

    public function reload(): RedirectResponse
    {
        $this->mc->reloadPermissions();

        return back()->with('success', 'Permissions reloaded.');
    }

    public function storeGroup(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:32'],
            'prefix' => ['nullable', 'string'],
            'suffix' => ['nullable', 'string'],
            'isDefault' => ['nullable', 'boolean'],
        ]);

        $this->mc->createPermissionGroup(
            $data['name'],
            $data['prefix'] ?? '',
            $data['suffix'] ?? '',
            $data['isDefault'] ?? false,
        );

        return back()->with('success', "Group '{$data['name']}' created.");
    }

    public function updateGroup(Request $request, string $name): RedirectResponse
    {
        $data = $request->validate([
            'prefix' => ['nullable', 'string'],
            'suffix' => ['nullable', 'string'],
            'isDefault' => ['nullable', 'boolean'],
        ]);

        $this->mc->updatePermissionGroup($name, $data);

        return back()->with('success', "Group '{$name}' updated.");
    }

    public function destroyGroup(string $name): RedirectResponse
    {
        $this->mc->deletePermissionGroup($name);

        return back()->with('success', "Group '{$name}' deleted.");
    }

    public function addGroupPermission(Request $request, string $name): RedirectResponse
    {
        $data = $request->validate(['permission' => ['required', 'string']]);
        $this->mc->addGroupPermission($name, $data['permission']);

        return back()->with('success', 'Permission added.');
    }

    public function removeGroupPermission(string $name, string $permission): RedirectResponse
    {
        $this->mc->removeGroupPermission($name, $permission);

        return back()->with('success', 'Permission removed.');
    }

    public function setUserGroup(Request $request, string $username): RedirectResponse
    {
        $data = $request->validate(['group' => ['required', 'string']]);
        $this->mc->setUserGroup($username, $data['group']);

        return back()->with('success', "{$username} moved to group '{$data['group']}'.");
    }

    public function addUserPermission(Request $request, string $username): RedirectResponse
    {
        $data = $request->validate(['permission' => ['required', 'string']]);
        $this->mc->addUserPermission($username, $data['permission']);

        return back()->with('success', 'Permission added.');
    }

    public function removeUserPermission(string $username, string $permission): RedirectResponse
    {
        $this->mc->removeUserPermission($username, $permission);

        return back()->with('success', 'Permission removed.');
    }

    public function storeAlias(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'alias' => ['required', 'string'],
            'canonical' => ['required', 'string'],
        ]);

        $this->mc->addPermissionAlias($data['alias'], $data['canonical']);

        return back()->with('success', "Alias '{$data['alias']}' added.");
    }

    public function destroyAlias(string $alias): RedirectResponse
    {
        $this->mc->removePermissionAlias($alias);

        return back()->with('success', "Alias '{$alias}' removed.");
    }
}