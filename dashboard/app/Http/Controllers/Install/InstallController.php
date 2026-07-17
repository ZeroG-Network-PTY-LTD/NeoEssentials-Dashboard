<?php

namespace App\Http\Controllers\Install;

use App\Http\Controllers\Controller;
use App\Services\InstallService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The /install wizard — see App\Services\InstallService for why every step
 * here avoids shelling out (typical shared/cPanel hosting has no
 * proc_open/exec). App\Http\Middleware\EnsureInstalled routes every other
 * request here until storage/installed.lock exists.
 */
class InstallController extends Controller
{
    public function __construct(private InstallService $install)
    {
    }

    public function index(Request $request): Response|RedirectResponse
    {
        if ($this->install->isInstalled()) {
            return redirect('/');
        }

        if ($request->session()->get('install_token_verified')) {
            return redirect()->route('install.requirements');
        }

        // Generates the token file on first visit — instructions on the page
        // tell the admin exactly where to find it via their host's file
        // manager (there's no shell access to assume here).
        $this->install->ensureToken();

        return Inertia::render('Install/Token');
    }

    public function verifyToken(Request $request): RedirectResponse
    {
        $data = $request->validate(['token' => 'required|string']);

        if (! $this->install->verifyToken($data['token'])) {
            return back()->withErrors(['token' => 'That token doesn\'t match. Check storage/app/install-token.txt.']);
        }

        $request->session()->put('install_token_verified', true);

        return redirect()->route('install.requirements');
    }

    private function guard(Request $request): ?RedirectResponse
    {
        if ($this->install->isInstalled()) {
            return redirect('/');
        }
        if (! $request->session()->get('install_token_verified')) {
            return redirect()->route('install.index');
        }

        return null;
    }

    public function requirements(Request $request): Response|RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        return Inertia::render('Install/Requirements', $this->install->checkRequirements());
    }

    public function environmentShow(Request $request): Response|RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        return Inertia::render('Install/Environment', [
            'driver' => config('database.default'),
        ]);
    }

    public function environmentTest(Request $request): RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        $data = $request->validate([
            'driver' => 'required|in:sqlite,mysql',
            'host' => 'nullable|string',
            'port' => 'nullable|string',
            'database' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $result = $this->install->testDatabaseConnection($data);

        return back()->with($result['success'] ? 'success' : 'error', $result['message']);
    }

    public function environmentSave(Request $request): RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        $data = $request->validate([
            'appUrl' => 'required|url',
            'driver' => 'required|in:sqlite,mysql',
            'host' => 'nullable|string',
            'port' => 'nullable|string',
            'database' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $env = [
            'APP_URL' => $data['appUrl'],
            'DB_CONNECTION' => $data['driver'],
        ];

        if ($data['driver'] === 'mysql') {
            $env += [
                'DB_HOST' => $data['host'] ?? '127.0.0.1',
                'DB_PORT' => $data['port'] ?? '3306',
                'DB_DATABASE' => $data['database'] ?? '',
                'DB_USERNAME' => $data['username'] ?? '',
                'DB_PASSWORD' => $data['password'] ?? '',
            ];
        }

        $this->install->writeEnv($env);

        return redirect()->route('install.migrate');
    }

    public function migrateShow(Request $request): Response|RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        return Inertia::render('Install/Migrate');
    }

    public function migrateRun(Request $request): RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        $result = $this->install->runMigrations();

        if (! $result['success']) {
            return back()->with('error', $result['log']);
        }

        return redirect()->route('install.mc-api')->with('success', 'Database migrated.');
    }

    public function mcApiShow(Request $request): Response|RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        return Inertia::render('Install/McApi');
    }

    public function mcApiTest(Request $request): RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        $data = $request->validate([
            'url' => 'required|url',
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $result = $this->install->testMcApi($data['url'], $data['username'], $data['password']);

        return back()->with($result['success'] ? 'success' : 'error', $result['message']);
    }

    public function mcApiSave(Request $request): RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        $data = $request->validate([
            'url' => 'nullable|url',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        if (! empty($data['url'])) {
            $this->install->writeEnv([
                'MC_API_URL' => $data['url'],
                'MC_SERVICE_USERNAME' => $data['username'] ?? '',
                'MC_SERVICE_PASSWORD' => $data['password'] ?? '',
            ]);
        }

        return redirect()->route('install.finish');
    }

    public function finishShow(Request $request): Response|RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        return Inertia::render('Install/Finish');
    }

    public function finishRun(Request $request): RedirectResponse
    {
        if ($redirect = $this->guard($request)) {
            return $redirect;
        }

        $this->install->finish();
        $request->session()->forget('install_token_verified');

        return redirect()->route('register')
            ->with('success', 'Setup complete — create your account below. Since this is a fresh install, the first account becomes admin automatically.');
    }
}
