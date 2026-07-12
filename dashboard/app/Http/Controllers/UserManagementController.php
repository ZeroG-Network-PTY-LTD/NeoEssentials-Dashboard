<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
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
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Users', [
            'users' => $this->safe(fn () => $this->mc->modUsers(), []),
            'sessions' => $this->safe(fn () => $this->mc->modUserSessions(), []),
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

        return $this->attempt(
            fn () => $this->mc->createModUser($data['username'], $data['password'], $data['email'] ?? '', $data['role']),
            "Account '{$data['username']}' created.",
        );
    }

    public function setRole(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['role' => ['required', 'in:ADMIN,MODERATOR,VIEWER']]);

        return $this->attempt(fn () => $this->mc->setModUserRole($id, $data['role']), 'Role updated.');
    }

    public function resetPassword(string $id): RedirectResponse
    {
        try {
            $result = $this->mc->setModUserPassword($id);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        $temp = $result['tempPassword'] ?? null;

        return back()->with('success', $temp
            ? "Temporary password: {$temp} (shown once — give it to the account owner now)"
            : 'Password reset.');
    }

    public function enable(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->enableModUser($id), 'Account enabled.');
    }

    public function disable(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->disableModUser($id), 'Account disabled.');
    }

    public function destroy(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->deleteModUser($id), 'Account deleted.');
    }

    public function revokeSession(string $sessionId): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->revokeModUserSession($sessionId), 'Session revoked.');
    }
}