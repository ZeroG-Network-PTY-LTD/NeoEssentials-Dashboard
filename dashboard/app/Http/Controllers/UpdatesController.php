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
            // Checked separately from the commit-comparison above — a
            // *-updater.zip release asset is preferred when available (no
            // git/composer/npm required on this server), the commit-based
            // git-update path is the fallback.
            'release' => $this->updates->checkGithubRelease(),
            'repo' => config('selfupdate.repo'),
            'branch' => config('selfupdate.branch'),
            'maxUploadKb' => config('selfupdate.max_upload_kb'),
        ]);
    }

    public function check(): RedirectResponse
    {
        $this->updates->checkGithub(force: true);
        $this->updates->checkGithubRelease(force: true);

        return back();
    }

    public function applyGit(): RedirectResponse
    {
        $result = $this->updates->applyGitUpdate();

        return back()
            ->with($result['success'] ? 'success' : 'error', $this->summarize($result))
            ->with('updateLog', $result['log']);
    }

    public function applyRelease(): RedirectResponse
    {
        $result = $this->updates->applyReleaseUpdate();

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
        // The full command output is flashed separately as 'updateLog' (see
        // applyGit()/upload() above) and rendered in the "Last run output"
        // card on the Updates page itself — this is just the short verdict
        // for the toast.
        return $result['success']
            ? 'Update applied successfully.'
            : 'Update failed — see the log below for details.';
    }
}
