<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Player-filed reports (in-game /report command) — surfaced here so an admin doesn't have to
 * dig through the mod's own console/log to see what's been reported. Reviewing a report
 * (marking it reviewed or dismissed) requires the mod's admin session (ModerationEndpoint),
 * mirrored by the reports.manage gate on every route below.
 */
class ReportsController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(Request $request): Response
    {
        $all = $request->boolean('all');

        return Inertia::render('Dashboard/Reports', [
            'reports' => $this->safe(fn () => $all ? $this->mc->allReports() : $this->mc->pendingReports(), []),
            'showingAll' => $all,
        ]);
    }

    public function review(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:REVIEWED,DISMISSED'],
        ]);

        return $this->attempt(
            fn () => $this->mc->reviewReport($id, $data['status']),
            $data['status'] === 'DISMISSED' ? 'Report dismissed.' : 'Report marked reviewed.',
        );
    }
}
