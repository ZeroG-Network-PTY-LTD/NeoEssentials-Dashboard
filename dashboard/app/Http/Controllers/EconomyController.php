<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EconomyController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Economy', [
            'stats' => $this->safe(fn () => $this->mc->economyStats(), [
                'totalWealth' => '0.00',
                'accountCount' => 0,
                'currencySymbol' => '$',
                'startingBalance' => 0,
                'averageBalance' => '0.00',
                'topPlayers' => [],
                'distribution' => [],
            ]),
        ]);
    }

    public function adjust(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'uuid' => ['required', 'string'],
            'action' => ['required', 'in:give,take,set'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        return $this->attempt(
            fn () => $this->mc->economyAdjust($data['uuid'], $data['action'], (float) $data['amount']),
            'Balance updated.',
        );
    }
}
