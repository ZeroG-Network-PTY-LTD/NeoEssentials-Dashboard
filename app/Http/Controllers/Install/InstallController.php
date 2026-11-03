<?php

namespace App\Http\Controllers\Install;

use App\Http\Controllers\Controller;
use App\Services\ConfigService;
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
    public function __construct(private InstallService $install, private ConfigService $config)
    {
    }

    public function index(Request $request): Response|RedirectResponse
    {
        if ($this->install->isInstalled()) {
            return redirect('/');
        }

        if ($request->session()->get('install_api_connected')) {
            return redirect()->route('install.requirements');
        }

        return Inertia::render('Install/ApiKey', [
            'apiUrl' => config('minecraft.api_url'),
        ]);
    }

    /**
     * Step 1 — proves whoever is running the wizard actually controls the Minecraft
     * server, by pasting a key straight from its own `/apikey create` command,
     * instead of the old "you can read a file on this host" local-token check.
     * Connecting here also leaves the dashboard fully wired up to the mod (no
     * separate pairing step needed later) — see ConfigService::connectWithApiKey().
     * Takes the API URL on this same step (rather than defaulting to
     * config('minecraft.api_url')'s 127.0.0.1 placeholder) since the dashboard and
     * Minecraft server are very often two different machines entirely.
     */
    public function apiKeyConnect(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'url' => 'required|url',
            'apiKey' => 'required|string',
        ]);

        $this->config->updateMcApiUrl($data['url']);

        $result = $this->config->connectWithApiKey($data['apiKey']);

        if (! $result['success']) {
            return back()->withErrors(['apiKey' => $result['message']]);
        }

        $request->session()->put('install_api_connected', true);

        return redirect()->route('install.requirements');
    }

    private function guard(Request $request): ?RedirectResponse
    {
        if ($this->install->isInstalled()) {
            return redirect('/');
        }
        if (! $request->session()->get('install_api_connected')) {
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
        } else {
            // Must overwrite DB_DATABASE here too, not just DB_CONNECTION — a
            // previous run through this step (or a re-installed host) may
            // have left a MySQL database name sitting in .env, which the
            // sqlite driver would otherwise try to open literally as a
            // relative file path and fail with "Database file ... does not
            // exist". testDatabaseConnection() already creates the file at
            // this exact path, so this just points DB_DATABASE at it.
            $env['DB_DATABASE'] = database_path('database.sqlite');
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

        return redirect()->route('install.finish')->with('success', 'Database migrated.');
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
        $request->session()->forget('install_api_connected');
        // Consumed once by RegisteredUserController::store() — the only remaining
        // "first account is admin" shortcut, scoped to the registration that
        // immediately follows finishing this wizard.
        $request->session()->put('install_bootstrap_admin', true);

        return redirect()->route('register')
            ->with('success', 'Setup complete — create your account below. Since this is a fresh install, the first account becomes admin automatically.');
    }
}
