<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use ZipArchive;

/**
 * Lets an admin update this dashboard from the Updates page instead of
 * SSHing in — either by fast-forwarding from the tracked GitHub branch, or
 * by uploading a *_installer.zip / *-updater.zip package. Deliberately
 * conservative: git updates never force-push/reset (fail loudly on
 * divergence rather than discarding history), and zip overlays refuse to
 * touch anything in config('selfupdate.protected_paths') no matter what the
 * archive contains.
 */
class SelfUpdateService
{
    private string $repoRoot;

    private string $appRoot;

    public function __construct()
    {
        $this->repoRoot = rtrim((string) config('selfupdate.repo_root'), '/\\');
        $this->appRoot = rtrim(base_path(), '/\\');
    }

    /**
     * What's actually running right now — the deployment record (written by
     * a previous applyGitUpdate()/applyZipUpdate() call) if one exists,
     * falling back to the live git commit for a checkout that predates this
     * feature or was updated by hand.
     */
    public function currentVersion(): array
    {
        $record = $this->readDeploymentRecord();
        $gitHead = $this->gitHead();

        return [
            'commit' => $record['commit'] ?? $gitHead['sha'] ?? null,
            'shortCommit' => ($record['commit'] ?? null) ? substr($record['commit'], 0, 7) : ($gitHead['shortSha'] ?? null),
            'label' => $record['label'] ?? null,
            'source' => $record['source'] ?? ($gitHead['sha'] ? 'git' : 'unknown'),
            'appliedAt' => $record['appliedAt'] ?? null,
            'branch' => $gitHead['branch'] ?? config('selfupdate.branch'),
        ];
    }

    /**
     * Compares local HEAD against the tracked branch's tip on GitHub.
     * Cached — this is called on every Updates page load, not just when the
     * admin clicks "Check now".
     */
    public function checkGithub(bool $force = false): array
    {
        $cacheKey = 'selfupdate:github-check';

        if ($force) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, (int) config('selfupdate.check_cache_ttl'), function () {
            $repo = config('selfupdate.repo');
            $branch = config('selfupdate.branch');

            try {
                $request = Http::timeout(8)->acceptJson();
                if ($token = config('selfupdate.github_token')) {
                    $request = $request->withToken($token);
                }

                $response = $request->get("https://api.github.com/repos/{$repo}/commits/{$branch}");

                if (! $response->successful()) {
                    return ['reachable' => false, 'error' => "GitHub API returned {$response->status()}."];
                }

                $data = $response->json();
                $latestSha = $data['sha'] ?? null;
                $current = $this->currentVersion();

                return [
                    'reachable' => true,
                    'latestSha' => $latestSha,
                    'latestShortSha' => $latestSha ? substr($latestSha, 0, 7) : null,
                    'latestMessage' => $data['commit']['message'] ?? null,
                    'latestDate' => $data['commit']['committer']['date'] ?? null,
                    'compareUrl' => $current['commit'] && $latestSha
                        ? "https://github.com/{$repo}/compare/{$current['commit']}...{$latestSha}"
                        : "https://github.com/{$repo}/commits/{$branch}",
                    'updateAvailable' => $latestSha !== null && $latestSha !== $current['commit'],
                ];
            } catch (\Throwable $e) {
                return ['reachable' => false, 'error' => $e->getMessage()];
            }
        });
    }

    /**
     * Fast-forward-only fetch + merge from the tracked branch, then rebuild.
     * Refuses to run against a dirty working tree or a diverged branch
     * rather than force-resetting — either of those needs a human, not a
     * button.
     */
    public function applyGitUpdate(): array
    {
        return $this->withLock(function () {
            $branch = config('selfupdate.branch');
            $log = '';

            // --untracked-files=no — stray untracked files (a personal notes
            // file, a scratch clone sitting in the repo, ...) don't block a
            // `git merge --ff-only` and shouldn't block this either; only
            // actual modifications to tracked files should.
            $status = $this->run(['git', 'status', '--porcelain', '--untracked-files=no'], $this->repoRoot);
            $log .= $status['log'];
            if (trim($status['output']) !== '') {
                return ['success' => false, 'log' => $log."\nAborted: the repo checkout has uncommitted changes — resolve those manually before updating."];
            }

            $fetch = $this->run(['git', 'fetch', 'origin', $branch], $this->repoRoot);
            $log .= $fetch['log'];
            if (! $fetch['success']) {
                return ['success' => false, 'log' => $log];
            }

            $merge = $this->run(['git', 'merge', '--ff-only', "origin/{$branch}"], $this->repoRoot);
            $log .= $merge['log'];
            if (! $merge['success']) {
                return ['success' => false, 'log' => $log."\nFast-forward failed — local history has diverged from origin/{$branch}. Resolve manually (this app never force-resets)."];
            }

            $rebuild = $this->runRebuildSteps();
            $log .= $rebuild['log'];
            if (! $rebuild['success']) {
                return ['success' => false, 'log' => $log];
            }

            $head = $this->gitHead();
            $this->recordDeployment([
                'commit' => $head['sha'],
                'label' => $head['shortSha'],
                'source' => 'git',
                'appliedAt' => now()->toIso8601String(),
            ]);

            return ['success' => true, 'log' => $log];
        });
    }

    /**
     * Accepts a *_installer.zip or *-updater.zip, extracts it to a staging
     * directory (never straight onto the live app — a corrupt/partial
     * archive should fail before touching anything real), overlays it onto
     * base_path() skipping every protected path, then rebuilds.
     */
    public function applyZipUpdate(UploadedFile $file): array
    {
        $kind = $this->packageKind($file->getClientOriginalName());
        if ($kind === null) {
            throw new RuntimeException('Filename must end in _installer.zip or -updater.zip.');
        }

        $stagingRoot = config('selfupdate.staging_dir');
        File::ensureDirectoryExists($stagingRoot);
        $zipPath = $stagingRoot.DIRECTORY_SEPARATOR.'incoming-'.now()->timestamp.'.zip';
        $file->move(dirname($zipPath), basename($zipPath));

        return $this->applyZipFromPath($zipPath, $kind);
    }

    /**
     * Checks the repo's latest GitHub Release for a *-updater.zip asset —
     * preferred over applyGitUpdate() when one exists, since it needs
     * neither git nor composer/npm reachable from this process (the asset
     * already has vendor/ and the built frontend baked in by
     * bin/build-installer.ps1), only an HTTPS download and PHP's own
     * ZipArchive/Artisan::call. Cached like checkGithub().
     */
    public function checkGithubRelease(bool $force = false): array
    {
        $cacheKey = 'selfupdate:github-release-check';

        if ($force) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, (int) config('selfupdate.check_cache_ttl'), function () {
            $repo = config('selfupdate.repo');

            try {
                $request = Http::timeout(8)->acceptJson();
                if ($token = config('selfupdate.github_token')) {
                    $request = $request->withToken($token);
                }

                $response = $request->get("https://api.github.com/repos/{$repo}/releases/latest");

                if (! $response->successful()) {
                    return ['available' => false, 'reachable' => false, 'error' => "GitHub API returned {$response->status()}."];
                }

                $data = $response->json();
                // Each build gets its own uniquely-tagged release (see the
                // build-packages workflow), so /releases/latest only ever has
                // one *-updater.zip asset — sortByDesc here is just a cheap
                // safety net in case that ever isn't true.
                $asset = collect($data['assets'] ?? [])
                    ->filter(fn (array $a) => $this->packageKind($a['name'] ?? '') === 'updater')
                    ->sortByDesc(fn (array $a) => $a['updated_at'] ?? '')
                    ->first();

                if (! $asset) {
                    return ['available' => false, 'reachable' => true];
                }

                $current = $this->currentVersion();
                $assetUpdatedAt = $asset['updated_at'] ?? null;

                return [
                    'available' => true,
                    'reachable' => true,
                    'assetName' => $asset['name'],
                    'downloadUrl' => $asset['browser_download_url'],
                    'tagName' => $data['tag_name'] ?? null,
                    'publishedAt' => $assetUpdatedAt,
                    'releaseUrl' => $data['html_url'] ?? null,
                    // If this app has never recorded a deployment, or the
                    // asset was uploaded after the last one was applied,
                    // there's a newer package available.
                    'updateAvailable' => ! $current['appliedAt']
                        || ($assetUpdatedAt && $assetUpdatedAt > $current['appliedAt']),
                ];
            } catch (\Throwable $e) {
                return ['available' => false, 'reachable' => false, 'error' => $e->getMessage()];
            }
        });
    }

    /** Downloads the *-updater.zip asset found by checkGithubRelease() and applies it the same way an uploaded zip would be. */
    public function applyReleaseUpdate(): array
    {
        $release = $this->checkGithubRelease();
        if (! ($release['available'] ?? false)) {
            return ['success' => false, 'log' => 'No updater package found on the latest GitHub release.'];
        }

        return $this->downloadAndApplyAsset($release['downloadUrl'], $release['assetName'], $release['tagName']);
    }

    /**
     * Every past build, each its own permanently-kept GitHub Release
     * (dashboard-<sha>, see the build-packages workflow) — this is what
     * powers the "choose a version" downgrade picker on the Updates page.
     * Only releases that actually have a *-updater.zip asset are returned
     * (defensive — every build ships one, but an interrupted/manual release
     * shouldn't show up as a choice with nothing to apply).
     */
    public function listGithubReleases(int $limit = 20): array
    {
        $repo = config('selfupdate.repo');

        try {
            $request = Http::timeout(8)->acceptJson();
            if ($token = config('selfupdate.github_token')) {
                $request = $request->withToken($token);
            }

            $response = $request->get("https://api.github.com/repos/{$repo}/releases", ['per_page' => $limit]);

            if (! $response->successful()) {
                return [];
            }

            $current = $this->currentVersion();

            return collect($response->json() ?? [])
                ->map(function (array $release) use ($current) {
                    $asset = collect($release['assets'] ?? [])
                        ->first(fn (array $a) => $this->packageKind($a['name'] ?? '') === 'updater');

                    if (! $asset) {
                        return null;
                    }

                    return [
                        'tagName' => $release['tag_name'],
                        'name' => $release['name'] ?: $release['tag_name'],
                        'publishedAt' => $release['published_at'] ?? null,
                        'assetName' => $asset['name'],
                        'downloadUrl' => $asset['browser_download_url'],
                        'isCurrent' => $current['label'] !== null && str_contains($release['tag_name'], (string) $current['label']),
                    ];
                })
                ->filter()
                ->values()
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Downloads and applies a specific past release by tag — the "downgrade to an older version" action. */
    public function applyReleaseByTag(string $tag): array
    {
        $repo = config('selfupdate.repo');

        try {
            $request = Http::timeout(8)->acceptJson();
            if ($token = config('selfupdate.github_token')) {
                $request = $request->withToken($token);
            }

            $response = $request->get("https://api.github.com/repos/{$repo}/releases/tags/{$tag}");

            if (! $response->successful()) {
                return ['success' => false, 'log' => "Could not find release '{$tag}' (HTTP {$response->status()})."];
            }

            $data = $response->json();
            $asset = collect($data['assets'] ?? [])
                ->first(fn (array $a) => $this->packageKind($a['name'] ?? '') === 'updater');

            if (! $asset) {
                return ['success' => false, 'log' => "Release '{$tag}' has no updater package attached."];
            }
        } catch (\Throwable $e) {
            return ['success' => false, 'log' => "Could not reach GitHub: {$e->getMessage()}"];
        }

        return $this->downloadAndApplyAsset($asset['browser_download_url'], $asset['name'], $tag);
    }

    private function downloadAndApplyAsset(string $downloadUrl, string $assetName, string $tagName): array
    {
        $stagingRoot = config('selfupdate.staging_dir');
        File::ensureDirectoryExists($stagingRoot);
        $zipPath = $stagingRoot.DIRECTORY_SEPARATOR.'release-'.now()->timestamp.'.zip';

        try {
            $request = Http::timeout(120)->sink($zipPath);
            if ($token = config('selfupdate.github_token')) {
                $request = $request->withToken($token);
            }
            $response = $request->get($downloadUrl);

            if (! $response->successful()) {
                return ['success' => false, 'log' => "Download failed: HTTP {$response->status()}."];
            }
        } catch (\Throwable $e) {
            return ['success' => false, 'log' => "Could not download the release asset: {$e->getMessage()}"];
        }

        return $this->applyZipFromPath($zipPath, 'updater', "Downloaded {$assetName} from {$tagName}\n");
    }

    private function applyZipFromPath(string $zipPath, string $kind, string $log = ''): array
    {
        return $this->withLock(function () use ($zipPath, $kind, $log) {
            $log .= "Package type: {$kind}\n";

            $stagingRoot = config('selfupdate.staging_dir');
            $extractPath = $stagingRoot.DIRECTORY_SEPARATOR.'extract-'.now()->timestamp;

            try {
                $log .= $this->safeExtractZip($zipPath, $extractPath);

                $versionLabel = $this->readPackageVersion($extractPath);
                $log .= "Package version: ".($versionLabel ?? 'unknown')."\n";

                $log .= $this->overlayOntoApp($extractPath);

                // No composer/npm run here, unlike applyGitUpdate() — the zip
                // just overlaid already has vendor/ and public/build baked in
                // by bin/build-installer.ps1, matching this exact release.
                // Rebuilding them again would require composer/npm on the
                // target host, which is exactly what shipping a pre-built
                // package is meant to avoid (see checkGithubRelease()'s
                // docblock above).
                $rebuild = $this->runPostApplySteps();
                $log .= $rebuild['log'];
                if (! $rebuild['success']) {
                    return ['success' => false, 'log' => $log];
                }

                $this->recordDeployment([
                    'commit' => null,
                    'label' => $versionLabel ?? ($kind === 'installer' ? 'installed from package' : 'updated from package'),
                    'source' => $kind,
                    'appliedAt' => now()->toIso8601String(),
                ]);

                return ['success' => true, 'log' => $log];
            } finally {
                File::delete($zipPath);
                if (File::isDirectory($extractPath)) {
                    File::deleteDirectory($extractPath);
                }
            }
        });
    }

    /**
     * 'installer' for *_installer.zip, 'updater' for *-updater.zip, null for
     * anything else — the two supported upload shapes described on the
     * Updates page. Deliberately strict: this determines what code we're
     * about to let overwrite the running app.
     */
    public function packageKind(string $filename): ?string
    {
        if (preg_match('/_installer\.zip$/i', $filename)) {
            return 'installer';
        }
        if (preg_match('/-updater\.zip$/i', $filename)) {
            return 'updater';
        }

        return null;
    }

    /** Post-apply steps for a zip-based (installer/updater) update — no composer/npm, see applyZipFromPath(). */
    private function runPostApplySteps(): array
    {
        $log = '';

        $step = $this->run(['php', 'artisan', 'migrate', '--force'], $this->appRoot);
        $log .= $step['log'];
        if (! $step['success']) {
            return ['success' => false, 'log' => $log];
        }

        foreach (['config:clear', 'route:clear', 'view:clear'] as $artisanCmd) {
            $step = $this->run(['php', 'artisan', $artisanCmd], $this->appRoot);
            $log .= $step['log'];
        }

        if (function_exists('opcache_reset')) {
            opcache_reset();
            $log .= "opcache reset\n";
        }

        return ['success' => true, 'log' => $log];
    }

    private function runRebuildSteps(): array
    {
        $log = '';

        $composerArgs = ['composer', 'install', '--no-interaction', '--prefer-dist', '--optimize-autoloader'];
        if (config('selfupdate.composer_no_dev')) {
            $composerArgs[] = '--no-dev';
        }
        $step = $this->run($composerArgs, $this->appRoot);
        $log .= $step['log'];
        if (! $step['success']) {
            return ['success' => false, 'log' => $log];
        }

        $npmCi = File::exists($this->appRoot.'/package-lock.json')
            ? ['npm', 'ci']
            : ['npm', 'install'];
        $step = $this->run($npmCi, $this->appRoot);
        $log .= $step['log'];
        if (! $step['success']) {
            return ['success' => false, 'log' => $log];
        }

        $step = $this->run(['npm', 'run', 'build'], $this->appRoot);
        $log .= $step['log'];
        if (! $step['success']) {
            return ['success' => false, 'log' => $log];
        }

        $step = $this->run(['php', 'artisan', 'migrate', '--force'], $this->appRoot);
        $log .= $step['log'];
        if (! $step['success']) {
            return ['success' => false, 'log' => $log];
        }

        foreach (['config:clear', 'route:clear', 'view:clear'] as $artisanCmd) {
            $step = $this->run(['php', 'artisan', $artisanCmd], $this->appRoot);
            $log .= $step['log'];
        }

        if (function_exists('opcache_reset')) {
            opcache_reset();
            $log .= "opcache reset\n";
        }

        return ['success' => true, 'log' => $log];
    }

    private function run(array $command, string $cwd): array
    {
        $label = implode(' ', $command);
        $result = Process::path($cwd)
            ->timeout((int) config('selfupdate.process_timeout'))
            ->run($command);

        $log = "\$ {$label}\n".$result->output().$result->errorOutput()."\n";

        if (! $result->successful()) {
            Log::warning('Self-update step failed', ['command' => $label, 'exitCode' => $result->exitCode()]);
        }

        return [
            'success' => $result->successful(),
            'output' => $result->output(),
            'log' => $log,
        ];
    }

    /**
     * Guards against zip-slip: refuses to extract any entry whose name
     * escapes the target directory via `..` or an absolute path, before
     * handing off to ZipArchive::extractTo(). A malicious/corrupt archive
     * throws rather than silently writing outside $target.
     */
    private function safeExtractZip(string $zipPath, string $target): string
    {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException('Could not open the uploaded file as a zip archive.');
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name === false) {
                continue;
            }
            if (str_contains($name, '..') || str_starts_with($name, '/') || preg_match('#^[A-Za-z]:#', $name)) {
                $zip->close();
                throw new RuntimeException("Refusing to extract unsafe archive entry: {$name}");
            }
        }

        File::ensureDirectoryExists($target);
        $zip->extractTo($target);
        $count = $zip->numFiles;
        $zip->close();

        return "Extracted {$count} entries.\n";
    }

    /**
     * Copies everything from the extracted staging directory onto the app
     * root, skipping any path under config('selfupdate.protected_paths').
     * If the package's contents are nested one level deep (e.g. a GitHub
     * "download zip" wrapping everything in a single top-level folder),
     * that wrapper is detected and stripped first.
     */
    private function overlayOntoApp(string $extractPath): string
    {
        $source = $this->resolvePackageRoot($extractPath);
        $protected = array_map(
            fn (string $p) => $this->appRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $p),
            config('selfupdate.protected_paths'),
        );

        $copied = 0;
        $skipped = 0;
        $this->copyTree($source, $this->appRoot, $protected, $copied, $skipped);

        return "Applied {$copied} file(s) onto the app; skipped {$skipped} protected path(s).\n";
    }

    private function copyTree(string $from, string $to, array $protected, int &$copied, int &$skipped): void
    {
        foreach (File::allFiles($from) as $file) {
            $relative = ltrim(str_replace($from, '', $file->getPathname()), DIRECTORY_SEPARATOR);
            $destination = $to.DIRECTORY_SEPARATOR.$relative;

            foreach ($protected as $protectedPath) {
                if ($destination === $protectedPath || str_starts_with($destination.DIRECTORY_SEPARATOR, $protectedPath.DIRECTORY_SEPARATOR)) {
                    $skipped++;
                    continue 2;
                }
            }

            File::ensureDirectoryExists(dirname($destination));
            File::copy($file->getPathname(), $destination);
            $copied++;
        }
    }

    /**
     * If the zip's only top-level entry is a single directory (common for
     * GitHub-generated archives), treat that directory as the real root
     * instead of copying the wrapper folder itself onto the app.
     */
    private function resolvePackageRoot(string $extractPath): string
    {
        $entries = array_values(array_diff(scandir($extractPath) ?: [], ['.', '..']));

        if (count($entries) === 1 && File::isDirectory($extractPath.DIRECTORY_SEPARATOR.$entries[0])) {
            return $extractPath.DIRECTORY_SEPARATOR.$entries[0];
        }

        return $extractPath;
    }

    /**
     * Called by InstallService::finish() once the /install wizard completes —
     * without this, a install-wizard deployment never writes deployment.json
     * at all, so currentVersion() reports source 'unknown' with no
     * appliedAt, and checkGithubRelease() reads that as "never deployed
     * anything, so yes there's an update" even on the exact same build the
     * installer package itself shipped. Reads the version.json every
     * installer/updater package bundles at its own root (see
     * bin/build-installer.ps1) rather than needing a fresh network call.
     */
    public function recordInstallerDeployment(): void
    {
        $versionPath = base_path('version.json');
        $version = null;

        if (File::exists($versionPath)) {
            $data = json_decode(File::get($versionPath), true);
            $version = is_array($data) ? ($data['version'] ?? null) : null;
        }

        $this->recordDeployment([
            'commit' => null,
            'label' => $version ?? 'installed from package',
            'source' => 'installer',
            'appliedAt' => now()->toIso8601String(),
        ]);
    }

    private function readPackageVersion(string $root): ?string
    {
        $candidateRoot = $this->resolvePackageRoot($root);

        $jsonPath = $candidateRoot.DIRECTORY_SEPARATOR.'version.json';
        if (File::exists($jsonPath)) {
            $data = json_decode(File::get($jsonPath), true);
            if (is_array($data) && isset($data['version'])) {
                return (string) $data['version'];
            }
        }

        $versionPath = $candidateRoot.DIRECTORY_SEPARATOR.'VERSION';
        if (File::exists($versionPath)) {
            return trim(File::get($versionPath));
        }

        return null;
    }

    private function gitHead(): array
    {
        $result = Process::path($this->repoRoot)->run(['git', 'rev-parse', 'HEAD']);
        $sha = $result->successful() ? trim($result->output()) : null;

        $branchResult = Process::path($this->repoRoot)->run(['git', 'rev-parse', '--abbrev-ref', 'HEAD']);
        $branch = $branchResult->successful() ? trim($branchResult->output()) : null;

        return [
            'sha' => $sha,
            'shortSha' => $sha ? substr($sha, 0, 7) : null,
            'branch' => $branch,
        ];
    }

    private function deploymentRecordPath(): string
    {
        return storage_path('app/deployment.json');
    }

    private function readDeploymentRecord(): array
    {
        $path = $this->deploymentRecordPath();
        if (! File::exists($path)) {
            return [];
        }

        $data = json_decode(File::get($path), true);

        return is_array($data) ? $data : [];
    }

    private function recordDeployment(array $meta): void
    {
        File::ensureDirectoryExists(dirname($this->deploymentRecordPath()));
        File::put($this->deploymentRecordPath(), json_encode($meta, JSON_PRETTY_PRINT));
    }

    /**
     * Refuses to run a second update concurrently with the first — an
     * overlapping composer/npm run against the same vendor/node_modules
     * tree is how you end up with a half-built app.
     */
    private function withLock(callable $fn): array
    {
        $lockPath = config('selfupdate.staging_dir').DIRECTORY_SEPARATOR.'update.lock';
        File::ensureDirectoryExists(dirname($lockPath));

        if (File::exists($lockPath) && File::lastModified($lockPath) > now()->subMinutes(20)->timestamp) {
            return ['success' => false, 'log' => 'Another update looks like it\'s already in progress (lock younger than 20 minutes). If that\'s wrong, delete storage/app/updates/update.lock and try again.'];
        }

        File::put($lockPath, (string) now()->timestamp);

        try {
            return $fn();
        } finally {
            File::delete($lockPath);
        }
    }
}
