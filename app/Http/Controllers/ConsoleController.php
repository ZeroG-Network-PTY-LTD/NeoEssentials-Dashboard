<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConsoleController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function commands(): Response
    {
        return Inertia::render('Dashboard/Commands');
    }

    public function runCommand(Request $request): RedirectResponse
    {
        $data = $request->validate(['command' => ['required', 'string', 'max:500']]);

        // Belt-and-braces: block anything trying to chain commands or read
        // files via console injection. The mod's API should also validate
        // this server-side — never trust a single layer.
        if (str_contains($data['command'], "\n") || str_contains($data['command'], ';')) {
            return back()->withErrors(['command' => 'Only a single command is allowed.']);
        }

        try {
            $result = $this->mc->runCommand(ltrim($data['command'], '/'));
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        // The mod's `output` field is an array of captured console output lines —
        // often empty (e.g. for commands like /say that produce no feedback line).
        // A bare `?? 'Command sent.'` only guards against a missing key, not an
        // empty array, so an empty-but-present `output` was flashing `[]` as the
        // literal success message instead of falling back.
        $output = $result['output'] ?? [];
        $message = !empty($output) ? implode("\n", $output) : 'Command sent.';

        return back()->with('success', $message);
    }

    public function logs(Request $request): Response
    {
        $since = $request->integer('since') ?: null;

        return Inertia::render('Dashboard/Logs', [
            'entries' => $this->safe(fn () => $this->mc->logs($since), []),
        ]);
    }
}
