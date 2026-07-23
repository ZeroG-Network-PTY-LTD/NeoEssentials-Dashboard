<?php

namespace App\Services;

use App\Models\User;
use App\Support\WritesEnvFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use PDO;
use PDOException;

/**
 * Backs the web-based /install wizard — the path for someone who uploaded a
 * *_installer.zip to shared hosting (cPanel or similar) with no SSH/shell
 * access. Every step here runs in-process (Artisan::call, PDO, Http) rather
 * than shelling out, unlike SelfUpdateService's git/composer/npm calls,
 * because typical shared hosting disables proc_open/exec entirely.
 */
class InstallService
{
    use WritesEnvFile;

    public function __construct(private SelfUpdateService $selfUpdate)
    {
    }

    public function isInstalled(): bool
    {
        if (File::exists($this->lockPath())) {
            return true;
        }

        // Backward-compat: a deployment that predates this feature (working
        // APP_KEY, migrated DB, at least one user account already created)
        // is obviously already installed — write the lock transparently
        // instead of sending an existing, configured dashboard through the
        // setup wizard the next time someone loads it.
        if ($this->looksAlreadyConfigured()) {
            $this->finish();

            return true;
        }

        return false;
    }

    private function looksAlreadyConfigured(): bool
    {
        if (! config('app.key')) {
            return false;
        }

        try {
            return User::query()->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    // --- Requirements --------------------------------------------------

    public function checkRequirements(): array
    {
        $extensions = ['pdo', 'mbstring', 'openssl', 'curl', 'fileinfo', 'zip', 'ctype', 'json', 'tokenizer'];

        $checks = [
            [
                'label' => 'PHP >= 8.3',
                'ok' => version_compare(PHP_VERSION, '8.3.0', '>='),
                'detail' => 'Running '.PHP_VERSION,
            ],
        ];

        foreach ($extensions as $ext) {
            $checks[] = [
                'label' => "ext-{$ext}",
                'ok' => extension_loaded($ext),
                'detail' => extension_loaded($ext) ? 'loaded' : 'missing',
            ];
        }

        foreach (['storage', 'bootstrap/cache'] as $dir) {
            $path = base_path($dir);
            $checks[] = [
                'label' => "{$dir}/ writable",
                'ok' => is_dir($path) && is_writable($path),
                'detail' => is_dir($path) ? (is_writable($path) ? 'writable' : 'not writable — chmod 775') : 'missing',
            ];
        }

        $checks[] = [
            'label' => '.env writable',
            'ok' => is_writable(base_path('.env')) || (! File::exists(base_path('.env')) && is_writable(base_path())),
            'detail' => File::exists(base_path('.env')) ? 'present and writable' : 'will be created',
        ];

        // A missing APP_KEY doesn't stop this Requirements page from
        // rendering, but it WILL make every other route in the app 500
        // (cookie/session encryption needs it) — surface it here loudly
        // rather than letting the next step fail mysteriously. The shipped
        // installer package always includes a working .env with this set;
        // seeing this fail means .env was replaced/edited by hand.
        $checks[] = [
            'label' => 'APP_KEY set',
            'ok' => (bool) config('app.key'),
            'detail' => config('app.key')
                ? 'set'
                : 'missing — re-extract the installer package, or run `php artisan key:generate` if you have shell access',
        ];

        return [
            'checks' => $checks,
            'allPassed' => collect($checks)->every(fn ($c) => $c['ok']),
        ];
    }

    // --- Database --------------------------------------------------------

    public function testDatabaseConnection(array $config): array
    {
        try {
            if (($config['driver'] ?? 'sqlite') === 'sqlite') {
                $path = database_path('database.sqlite');
                if (! File::exists($path)) {
                    File::ensureDirectoryExists(dirname($path));
                    File::put($path, '');
                }
                new PDO('sqlite:'.$path);

                return ['success' => true, 'message' => 'SQLite file ready.'];
            }

            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $config['host'] ?? '127.0.0.1',
                $config['port'] ?? '3306',
                $config['database'] ?? '',
            );
            new PDO($dsn, $config['username'] ?? '', $config['password'] ?? '', [
                PDO::ATTR_TIMEOUT => 5,
            ]);

            return ['success' => true, 'message' => 'Connected successfully.'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // --- .env writing (see App\Support\WritesEnvFile::writeEnv()) ---------

    // --- Migrations ----------------------------------------------------

    public function runMigrations(): array
    {
        try {
            Artisan::call('migrate', ['--force' => true]);

            return ['success' => true, 'log' => Artisan::output()];
        } catch (\Throwable $e) {
            return ['success' => false, 'log' => $e->getMessage()];
        }
    }

    // --- Finish ------------------------------------------------------------

    public function finish(): void
    {
        File::ensureDirectoryExists(dirname($this->lockPath()));
        File::put($this->lockPath(), json_encode([
            'installedAt' => now()->toIso8601String(),
            'ip' => request()->ip(),
        ], JSON_PRETTY_PRINT));

        // So the Updates page's "current version"/"update available" logic
        // is accurate immediately, instead of showing an update available
        // for the exact build this installer package already is.
        $this->selfUpdate->recordInstallerDeployment();

        Artisan::call('config:clear');
        Artisan::call('cache:clear');
    }

    private function lockPath(): string
    {
        return storage_path('installed.lock');
    }
}
