<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manages the MOD's own dashboard accounts (UserManagementEndpoint) — e.g. the
 * dashboard-service account this app itself authenticates as, or other admin/
 * moderator logins for the mod's built-in dashboard. Entirely distinct from
 * this Laravel app's own `users` table/roles (see App\Models\User).
 */
class UserManagementController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Users', [
            'users' => $this->mc->modUsers(),
            'sessions' => $this->mc->modUserSessions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:32'],
            'password' => ['required', 'string', 'min:8'],
            'email' => ['nullable', 'email'],
            'role' => ['required', 'in:ADMIN,MODERATOR,VIEWER'],
        ]);

        $this->mc->createModUser($data['username'], $data['password'], $data['email'] ?? '', $data['role']);

        return back()->with('success', "Account '{$data['username']}' created.");
    }

    public function setRole(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['role' => ['required', 'in:ADMIN,MODERATOR,VIEWER']]);

        $this->mc->setModUserRole($id, $data['role']);

        return back()->with('success', 'Role updated.');
    }

    public function resetPassword(string $id): RedirectResponse
    {
        $result = $this->mc->setModUserPassword($id);
        $temp = $result['tempPassword'] ?? null;

        return back()->with('success', $temp
            ? "Temporary password: {$temp} (shown once — give it to the account owner now)"
            : 'Password reset.');
    }

    public function enable(string $id): RedirectResponse
    {
        $this->mc->enableModUser($id);

        return back()->with('success', 'Account enabled.');
    }

    public function disable(string $id): RedirectResponse
    {
        $this->mc->disableModUser($id);

        return back()->with('success', 'Account disabled.');
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->mc->deleteModUser($id);

        return back()->with('success', 'Account deleted.');
    }

    public function revokeSession(string $sessionId): RedirectResponse
    {
        $this->mc->revokeModUserSession($sessionId);

        return back()->with('success', 'Session revoked.');
    }
}