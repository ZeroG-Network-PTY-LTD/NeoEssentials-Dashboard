<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMinecraftApi;
use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HologramsController extends Controller
{
    use InteractsWithMinecraftApi;

    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Holograms', [
            'holograms' => $this->safe(fn () => $this->mc->holograms(), []),
            'stats' => $this->safe(fn () => $this->mc->hologramStats(), [
                'total' => 0, 'visible' => 0, 'animated' => 0, 'shopHolograms' => 0,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request, true);

        return $this->attempt(
            fn () => $this->mc->createHologram($data),
            "Hologram '{$data['id']}' created.",
        );
    }

    /**
     * The mod's PUT /api/holograms/{id} replaces the whole record, so the
     * fields this UI doesn't expose (spin/hover/billboard/per-line frames)
     * are fetched first and merged in, rather than being wiped out by a
     * partial payload from this simplified edit form.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $data = $this->validated($request, false);

        return $this->attempt(function () use ($data, $id) {
            $existing = $this->mc->hologram($id);
            $this->mc->updateHologram($id, array_merge($existing, $data, ['id' => $id]));
        }, "Hologram '{$id}' updated.");
    }

    public function destroy(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->deleteHologram($id), "Hologram '{$id}' deleted.");
    }

    public function spawn(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->spawnHologram($id), "Hologram '{$id}' spawned.");
    }

    public function despawn(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->despawnHologram($id), "Hologram '{$id}' despawned.");
    }

    public function toggleVisibility(string $id): RedirectResponse
    {
        return $this->attempt(fn () => $this->mc->toggleHologramVisibility($id), 'Visibility toggled.');
    }

    /**
     * Only the placement/text fields are editable through this UI — the mod's
     * hologramJson has many more animation knobs (spin/hover/billboard/per-line
     * frames) that round-trip untouched via updateHologram()'s caller merging
     * this validated subset onto the existing record client-side.
     */
    private function validated(Request $request, bool $idRequired): array
    {
        $rules = [
            'world' => ['required', 'string'],
            'x' => ['required', 'numeric'],
            'y' => ['required', 'numeric'],
            'z' => ['required', 'numeric'],
            'visible' => ['required', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*' => ['string'],
        ];

        if ($idRequired) {
            $rules['id'] = ['required', 'string', 'max:64'];
        }

        $data = $request->validate($rules);

        $data['lines'] = array_values(array_map(
            fn (string $text, int $i) => [
                'lineId' => "line-{$i}",
                'text' => $text,
                'animFrameIntervalTicks' => 0,
                'frames' => [],
            ],
            $data['lines'],
            array_keys($data['lines']),
        ));

        return $data;
    }
}