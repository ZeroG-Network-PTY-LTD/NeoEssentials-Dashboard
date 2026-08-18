<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Jail cells — defining the cell itself (name, dimension, shape, coordinates), as opposed
 * to jailing/unjailing a specific player into an already-defined one (PlayerProfileController).
 * Every route here is admin-only (jails.manage). Lets an admin create a jail cell by
 * typed-in coordinates without needing to physically stand there in-game first — the
 * in-game /setjail command and jail wand still work exactly as before, writing to the
 * same store.
 */
class JailsController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Jails', [
            'jails' => $this->safe(fn () => $this->mc->jailLocationsDetailed(), []),
            'worlds' => $this->safe(fn () => $this->mc->serverWorlds(), []),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'dimension' => ['required', 'string', 'max:128'],
            'shape' => ['required', 'in:SPHERE,CUBOID'],
            'x' => ['required', 'integer'],
            'y' => ['required', 'integer'],
            'z' => ['required', 'integer'],
            'radius' => ['nullable', 'numeric', 'min:1'],
            'x2' => ['required_if:shape,CUBOID', 'nullable', 'integer'],
            'y2' => ['required_if:shape,CUBOID', 'nullable', 'integer'],
            'z2' => ['required_if:shape,CUBOID', 'nullable', 'integer'],
        ]);

        $position = ['x' => $data['x'], 'y' => $data['y'], 'z' => $data['z']];

        if ($data['shape'] === 'CUBOID') {
            $corner2 = ['x' => $data['x2'], 'y' => $data['y2'], 'z' => $data['z2']];

            return $this->attempt(
                fn () => $this->mc->createJailLocationCuboid($data['name'], $data['dimension'], $position, $corner2),
                "Jail '{$data['name']}' created.",
            );
        }

        return $this->attempt(
            fn () => $this->mc->createJailLocationSphere($data['name'], $data['dimension'], $position, $data['radius'] ?? null),
            "Jail '{$data['name']}' created.",
        );
    }

    public function destroy(string $name): RedirectResponse
    {
        return $this->attempt(
            fn () => $this->mc->removeJailLocation($name),
            "Jail '{$name}' removed.",
        );
    }
}
