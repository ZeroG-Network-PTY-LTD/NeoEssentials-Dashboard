<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WarpsController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Warps', [
            'warps' => $this->mc->warps(),
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

        $this->mc->createWarp($name, $data);

        return back()->with('success', "Warp '{$name}' created.");
    }

    public function destroy(string $name): RedirectResponse
    {
        $this->mc->deleteWarp($name);

        return back()->with('success', "Warp '{$name}' deleted.");
    }
}