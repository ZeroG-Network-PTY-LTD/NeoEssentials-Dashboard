<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WarpsController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Warps', [
            'warps' => $this->safe(fn () => $this->mc->warps(), []),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:32'],
            'world' => ['required', 'string'],
            'x' => ['required', 'numeric'],
            'y' => ['required', 'numeric'],
            'z' => ['required', 'numeric'],
            'yaw' => ['nullable', 'numeric'],
            'pitch' => ['nullable', 'numeric'],
        ]);

        $name = $data['name'];
        unset($data['name']);

        return $this->attempt(fn () => $this->mc->createWarp($name, $data), "Warp '{$name}' created.");
    }

    public function destroy(string $name): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->deleteWarp($name), "Warp '{$name}' deleted.");
    }
}