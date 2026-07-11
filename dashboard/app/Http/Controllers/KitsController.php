<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Inertia\Inertia;
use Inertia\Response;

class KitsController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    /**
     * Read-only — the mod's KitsEndpoint has no create/update/delete/give
     * routes, only list/stats/single-view. Kit configuration still happens
     * in-game or by editing the mod's kits.json directly.
     */
    public function index(): Response
    {
        return Inertia::render('Dashboard/Kits', [
            'kits' => $this->mc->kits(),
            'stats' => $this->mc->kitStats(),
        ]);
    }
}