<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class BackupsController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Backups', [
            'status' => $this->mc->backupStatus(),
            'snapshots' => $this->mc->backupList(),
            'cloudStatus' => $this->mc->cloudStatus(),
            'cloudConfig' => $this->mc->cloudConfig(),
            'dropboxFiles' => $this->mc->cloudDropboxFiles(),
            'googleFiles' => $this->mc->cloudGoogleFiles(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:64'],
            'targets' => ['required', 'array', 'min:1'],
            'targets.*' => ['string'],
        ]);

        $this->mc->createBackup($data['name'] ?? ('backup-' . now()->timestamp), $data['targets']);

        return back()->with('success', 'Backup created.');
    }

    public function restore(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string']]);
        $this->mc->restoreBackup($data['name']);

        return back()->with('success', "Snapshot '{$data['name']}' restored (a pre-restore backup was made automatically).");
    }

    public function destroy(string $name): RedirectResponse
    {
        $this->mc->deleteBackup($name);

        return back()->with('success', "Snapshot '{$name}' deleted.");
    }

    public function download(string $name): HttpResponse
    {
        $mcResponse = $this->mc->downloadBackup($name);

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

        $this->mc->configureDropbox($data['accessToken'], $data['uploadPath'] ?? '/NeoEssentials-Backups');

        return back()->with('success', 'Dropbox configuration saved.');
    }

    public function configureGoogle(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'refreshToken' => ['nullable', 'string'],
            'clientId' => ['nullable', 'string'],
            'clientSecret' => ['nullable', 'string'],
            'folderId' => ['nullable', 'string'],
        ]);

        $this->mc->configureGoogleDrive(
            $data['refreshToken'] ?? '',
            $data['clientId'] ?? '',
            $data['clientSecret'] ?? '',
            $data['folderId'] ?? '',
        );

        return back()->with('success', 'Google Drive configuration saved.');
    }

    public function testDropbox(): RedirectResponse
    {
        $result = $this->mc->testDropbox();

        return back()->with('success', $result['message'] ?? 'Dropbox connection OK.');
    }

    public function testGoogle(): RedirectResponse
    {
        $result = $this->mc->testGoogleDrive();

        return back()->with('success', $result['message'] ?? 'Google Drive connection OK.');
    }

    public function uploadDropbox(string $backupId): RedirectResponse
    {
        $this->mc->uploadBackupToDropbox($backupId);

        return back()->with('success', "Uploaded '{$backupId}' to Dropbox.");
    }

    public function uploadGoogle(string $backupId): RedirectResponse
    {
        $this->mc->uploadBackupToGoogleDrive($backupId);

        return back()->with('success', "Uploaded '{$backupId}' to Google Drive.");
    }

    public function deleteDropboxFile(Request $request): RedirectResponse
    {
        $data = $request->validate(['path' => ['required', 'string']]);
        $this->mc->deleteDropboxFile($data['path']);

        return back()->with('success', 'Deleted from Dropbox.');
    }

    public function deleteGoogleFile(string $fileId): RedirectResponse
    {
        $this->mc->deleteGoogleDriveFile($fileId);

        return back()->with('success', 'Deleted from Google Drive.');
    }
}