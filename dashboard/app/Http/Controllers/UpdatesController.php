<?php

namespace App\Http\Controllers;

use App\Services\SelfUpdateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UpdatesController extends Controller
{
    public function __construct(private SelfUpdateService $updates)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Updates', [
            'current' => $this->updates->currentVersion(),
            'github' => $this->updates->checkGithub(),
            'repo' => config('selfupdate.repo'),
            'branch' => config('selfupdate.branch'),
            'maxUploadKb' => config('selfupdate.max_upload_kb'),
        ]);
    }

    public function check(): RedirectResponse
    {
        $this->updates->checkGithub(force: true);

        return back();
    }

    public function applyGit(): RedirectResponse
    {
        $result = $this->updates->applyGitUpdate();

        return back()
            ->with($result['success'] ? 'success' : 'error', $this->summarize($result))
            ->with('updateLog', $result['log']);
    }

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'package' => [
                'required',
                'file',
                'max:'.config('selfupdate.max_upload_kb'),
                function (string $_attribute, $file, \Closure $fail) {
                    if (strtolower($file->getClientOriginalExtension()) !== 'zip') {
                        $fail('The package must be a .zip file.');
                    }
                    if ($this->updates->packageKind($file->getClientOriginalName()) === null) {
                        $fail('Filename must end in _installer.zip or -updater.zip.');
                    }
                },
            ],
        ]);

        try {
            $result = $this->updates->applyZipUpdate($request->file('package'));
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()
            ->with($result['success'] ? 'success' : 'error', $this->summarize($result))
            ->with('updateLog', $result['log']);
    }

    private function summarize(array $result): string
    {
        // The full log is genuinely long (composer/npm output) — flash a
        // short verdict, and let the page re-fetch currentVersion()/log tail
        // rather than stuffing kilobytes into the session flash.
        return $result['success']
            ? 'Update applied successfully.'
            : 'Update failed — see storage/logs/laravel.log for the full command output.';
    }
}
