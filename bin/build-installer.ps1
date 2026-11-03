<#
.SYNOPSIS
  Builds a *_installer.zip (fresh deploy, for the /install web wizard) or
  *-updater.zip (overlay onto an existing install, for the dashboard's own
  Updates page) — both self-contained packages for shared/cPanel hosting
  with no shell/Composer/Node access: vendor/ and the built frontend are
  baked in, so the target host never needs to run a build step itself.

.PARAMETER Kind
  'installer' (default) — bundles a working .env (fresh per-build APP_KEY)
  and an empty SQLite DB, for a brand-new deployment that has neither yet.
  'updater' — omits both, since App\Services\SelfUpdateService::applyZipUpdate()
  never touches .env/storage/the DB on an existing install anyway; shipping
  them would just be dead weight.

.PARAMETER Version
  Label written into version.json inside the package and shown on the
  dashboard's Updates page after install. Defaults to the current short git
  commit hash.

.PARAMETER OutDir
  Where the finished zip is written. Defaults to dist/ next to this script's
  parent (dashboard/dist/).

.EXAMPLE
  ./bin/build-installer.ps1 -Version 1.4.0
  ./bin/build-installer.ps1 -Kind updater -Version 1.4.1
#>
param(
    [ValidateSet('installer', 'updater')]
    [string]$Kind = 'installer',
    [string]$Version,
    [string]$OutDir
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot   # dashboard/
if (-not $Version) {
    $Version = (git -C $RepoRoot rev-parse --short HEAD 2>$null)
    if (-not $Version) { $Version = 'dev' }
}
if (-not $OutDir) { $OutDir = Join-Path $RepoRoot 'dist' }

$StagingDir = Join-Path ([System.IO.Path]::GetTempPath()) ("neo-installer-" + [System.Guid]::NewGuid().ToString('N'))
$ZipSuffix = if ($Kind -eq 'updater') { "-updater.zip" } else { "_installer.zip" }
$ZipName = "NeoEssentials-Dashboard_v${Version}${ZipSuffix}"
$ZipPath = Join-Path $OutDir $ZipName

Write-Host "==> Building $Kind package v$Version" -ForegroundColor Cyan
Write-Host "    Source:  $RepoRoot"
Write-Host "    Staging: $StagingDir"
Write-Host "    Output:  $ZipPath"

# --- 1. Clean copy of the app, excluding dev-only / generated / secret paths ---
# README.md and INSTALL.md aren't excluded below, so they're carried straight
# into the package root, right next to the wizard the extracted zip lands on.
#
# Plain recursive Copy-Item instead of robocopy: robocopy is a Windows-only
# external binary, and this script runs under `pwsh` (PowerShell Core, cross-
# platform) in CI on both GitHub's windows-latest and a Linux-based Forgejo
# runner, so nothing here can shell out to a Windows-specific tool.
Write-Host "`n==> Copying source (excluding vendor/node_modules/.env/storage logs/tests)..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

# Directories skipped by name, anywhere in the tree (matches robocopy /XD's behavior
# for a bare name, and none of these names recur elsewhere in this repo).
$ExcludeDirNames = @('.git', 'node_modules', 'vendor', 'dist', 'tests')
# Directories skipped by their exact path relative to $RepoRoot — storage/ itself
# (e.g. storage/app) still needs to be copied, only these specific subpaths don't.
$ExcludeRelativeDirs = @(
    (Join-Path 'storage' (Join-Path 'framework' 'cache')),
    (Join-Path 'storage' (Join-Path 'framework' 'sessions')),
    (Join-Path 'storage' (Join-Path 'framework' 'views')),
    (Join-Path 'storage' 'logs')
)
# Files skipped by name (or *.log pattern), anywhere in the tree, matching robocopy /XF.
$ExcludeFileNames = @('.env', '.env.backup', '.env.production', 'database.sqlite', 'installed.lock', 'deployment.json')

function Copy-FilteredTree {
    param([string]$Source, [string]$Destination)
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
        $destPath = Join-Path $Destination $_.Name
        if ($_.PSIsContainer) {
            if ($ExcludeDirNames -contains $_.Name) { return }
            $relFromRoot = $_.FullName.Substring($RepoRoot.Length).TrimStart('\', '/')
            if ($ExcludeRelativeDirs -contains $relFromRoot) { return }
            Copy-FilteredTree -Source $_.FullName -Destination $destPath
        } else {
            if ($ExcludeFileNames -contains $_.Name) { return }
            if ($_.Name -like '*.log') { return }
            Copy-Item -LiteralPath $_.FullName -Destination $destPath -Force
        }
    }
}

Copy-FilteredTree -Source $RepoRoot -Destination $StagingDir

# --- 2. Install production dependencies + build frontend, inside the copy only ---
Push-Location $StagingDir
try {
    Write-Host "`n==> composer install --no-dev..." -ForegroundColor Cyan
    composer install --no-dev --optimize-autoloader --no-interaction
    if ($LASTEXITCODE -ne 0) { throw "composer install failed" }

    Write-Host "`n==> npm install && npm run build..." -ForegroundColor Cyan
    # Not `npm ci` — package.json currently pins @vitejs/plugin-react@^4.2.0
    # (peer-wants vite ^4-7) alongside vite@^8.0.0, a pre-existing mismatch
    # that `ci`'s strict lockfile/peer enforcement rejects outright. The
    # working dev node_modules already tolerates this; --legacy-peer-deps
    # reproduces that same tolerance for a from-scratch install here.
    npm install --no-audit --no-fund --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

    # node_modules was only needed to produce public/build/ above — the
    # installer doesn't ship it (no Node runtime assumed on the target host).
    Remove-Item -Recurse -Force (Join-Path $StagingDir 'node_modules') -ErrorAction SilentlyContinue
}
finally {
    Pop-Location
}

if ($Kind -eq 'installer') {
    # --- 3. Bundle a working .env (unique APP_KEY per build, safe defaults
    #        for a host that may not offer a queue worker / much DB headroom) ---
    Write-Host "`n==> Writing bundled .env..." -ForegroundColor Cyan
    # RandomNumberGenerator.Fill() needs .NET 5+, which `pwsh` (PowerShell Core)
    # always runs on, on both Windows and Linux — this script no longer supports
    # legacy Windows PowerShell 5.1 (.NET Framework), where this API isn't available.
    $appKeyBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($appKeyBytes)
    $appKey = 'base64:' + [Convert]::ToBase64String($appKeyBytes)

    $envExamplePath = Join-Path $StagingDir '.env.example'
    $env = Get-Content $envExamplePath -Raw

    $envOverrides = @{
        'APP_ENV'           = 'production'
        'APP_KEY'           = $appKey
        'APP_DEBUG'         = 'false'
        'DB_CONNECTION'     = 'sqlite'
        'SESSION_DRIVER'    = 'file'
        'CACHE_STORE'       = 'file'
        'QUEUE_CONNECTION'  = 'sync'
    }
    foreach ($key in $envOverrides.Keys) {
        $value = $envOverrides[$key]
        if ($env -match "(?m)^$key=.*$") {
            $env = $env -replace "(?m)^$key=.*$", "$key=$value"
        } else {
            $env = $env.TrimEnd() + "`n$key=$value`n"
        }
    }
    Set-Content -Path (Join-Path $StagingDir '.env') -Value $env -NoNewline

    # --- 4. Empty SQLite DB so the "Database" step's default path just works ---
    New-Item -ItemType File -Path (Join-Path (Join-Path $StagingDir 'database') 'database.sqlite') -Force | Out-Null
} else {
    # Updater packages overlay onto an existing, already-configured install —
    # SelfUpdateService::applyZipUpdate() skips .env/storage/the DB no matter
    # what's in the archive, so there's no reason to ship either here.
    Write-Host "`n==> Skipping .env/SQLite bundling (updater package overlays onto an existing install)" -ForegroundColor Cyan
}

# --- 5. Version marker read by the /install and Updates pages ---
@{ version = $Version; builtAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -Path (Join-Path $StagingDir 'version.json')

# --- 6. Zip it ---
Write-Host "`n==> Zipping..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path (Join-Path $StagingDir '*') -DestinationPath $ZipPath -CompressionLevel Optimal

Remove-Item -Recurse -Force $StagingDir

$sizeMb = [Math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-Host "`n==> Done: $ZipPath ($sizeMb MB)" -ForegroundColor Green
Write-Host "    Upload this to the target host and extract it, then point the domain's document root at its public/ folder."
