<?php

namespace App\Http\Controllers;

use App\Services\MinecraftApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HologramsController extends Controller
{
    public function __construct(private MinecraftApiService $mc)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Dashboard/Holograms', [
            'holograms' => $this->mc->holograms(),
            'stats' => $this->mc->hologramStats(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request, true);

        $this->mc->createHologram($data);

        return back()->with('success', "Hologram '{$data['id']}' created.");
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
        $existing = $this->mc->hologram($id);

        $this->mc->updateHologram($id, array_merge($existing, $data, ['id' => $id]));

        return back()->with('success', "Hologram '{$id}' updated.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->mc->deleteHologram($id);

        return back()->with('success', "Hologram '{$id}' deleted.");
    }

    public function spawn(string $id): RedirectResponse
    {
        $this->mc->spawnHologram($id);

        return back();
    }

    public function despawn(string $id): RedirectResponse
    {
        $this->mc->despawnHologram($id);

        return back();
    }

    public function toggleVisibility(string $id): RedirectResponse
    {
        $this->mc->toggleHologramVisibility($id);

        return back();
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