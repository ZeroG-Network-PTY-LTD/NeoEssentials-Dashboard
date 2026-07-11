<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        $status = $this->safe(fn () => $this->mc->status(), []);
        $players = $this->safe(fn () => $this->mc->players(), []);

        return Inertia::render('Dashboard/Overview', [
            'status' => $status,
            'players' => $players,
            'apiReachable' => $status !== [],
        ]);
    }
}
