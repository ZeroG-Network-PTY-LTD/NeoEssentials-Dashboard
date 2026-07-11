<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class BackupsController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        $fallbackStatus = [
            'count' => 0, 'totalSizeMb' => '0.00', 'totalSizeBytes' => 0, 'lastBackup' => null,
            'maxSnapshots' => 0, 'backupDir' => '', 'availableTargets' => [],
        ];
        $fallbackCloudStatus = ['providers' => ['dropbox' => ['configured' => false], 'googleDrive' => ['configured' => false]]];
        $fallbackCloudConfig = [
            'dropbox' => ['configured' => false, 'tokenMasked' => '', 'uploadPath' => ''],
            'googleDrive' => ['configured' => false, 'clientId' => '', 'folderId' => '', 'refreshTokenMasked' => ''],
        ];

        return Inertia::render('Dashboard/Backups', [
            'status' => $this->safe(fn () => $this->mc->backupStatus(), $fallbackStatus),
            'snapshots' => $this->safe(fn () => $this->mc->backupList(), []),
            'cloudStatus' => $this->safe(fn () => $this->mc->cloudStatus(), $fallbackCloudStatus),
            'cloudConfig' => $this->safe(fn () => $this->mc->cloudConfig(), $fallbackCloudConfig),
            'dropboxFiles' => $this->safe(fn () => $this->mc->cloudDropboxFiles(), []),
            'googleFiles' => $this->safe(fn () => $this->mc->cloudGoogleFiles(), []),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:64'],
            'targets' => ['required', 'array', 'min:1'],
            'targets.*' => ['string'],
        ]);

        return $this->attempt(
            fn () => $this->mc->createBackup($data['name'] ?? ('backup-' . now()->timestamp), $data['targets']),
            'Backup created.',
        );
    }

    public function restore(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string']]);

        return $this->attempt(
            fn () => $this->mc->restoreBackup($data['name']),
            "Snapshot '{$data['name']}' restored (a pre-restore backup was made automatically).",
        );
    }

    public function destroy(string $name): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->deleteBackup($name), "Snapshot '{$name}' deleted.");
    }

    public function download(string $name): HttpResponse
    {
        try {
            $mcResponse = $this->mc->downloadBackup($name);
        } catch (\Throwable $e) {
            return response($e->getMessage(), 502);
        }

        return response($mcResponse->body(), 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => "attachment; filename=\"{$name}.zip\"",
        ]);
    }

    public function configureDropbox(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'accessToken' => ['required', 'string'],
            'uploadPath' => ['nullable', 'string'],
        ]);

        return $this->attempt(
            fn () => $this->mc->configureDropbox($data['accessToken'], $data['uploadPath'] ?? '/NeoEssentials-Backups'),
            'Dropbox configuration saved.',
        );
    }

    public function configureGoogle(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'refreshToken' => ['nullable', 'string'],
            'clientId' => ['nullable', 'string'],
            'clientSecret' => ['nullable', 'string'],
            'folderId' => ['nullable', 'string'],
        ]);

        return $this->attempt(fn () => $this->mc->configureGoogleDrive(
            $data['refreshToken'] ?? '',
            $data['clientId'] ?? '',
            $data['clientSecret'] ?? '',
            $data['folderId'] ?? '',
        ), 'Google Drive configuration saved.');
    }

    public function testDropbox(): RedirectResponse
    {
        try {
            $result = $this->mc->testDropbox();
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', $result['message'] ?? 'Dropbox connection OK.');
    }

    public function testGoogle(): RedirectResponse
    {
        try {
            $result = $this->mc->testGoogleDrive();
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', $result['message'] ?? 'Google Drive connection OK.');
    }

    public function uploadDropbox(string $backupId): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->uploadBackupToDropbox($backupId), "Uploaded '{$backupId}' to Dropbox.");
    }

    public function uploadGoogle(string $backupId): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->uploadBackupToGoogleDrive($backupId), "Uploaded '{$backupId}' to Google Drive.");
    }

    public function deleteDropboxFile(Request $request): RedirectResponse
    {
        $data = $request->validate(['path' => ['required', 'string']]);

        return $this->attempt(fn () => $this->mc->deleteDropboxFile($data['path']), 'Deleted from Dropbox.');
    }

    public function deleteGoogleFile(string $fileId): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->deleteGoogleDriveFile($fileId), 'Deleted from Google Drive.');
    }
}