<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HologramsRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_moderator_can_view_and_manage_holograms(): void
    {
        $moderator = User::factory()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('holograms')->once()->andReturn([]);
            $mock->shouldReceive('hologramStats')->once()->andReturn([
                'total' => 0, 'visible' => 0, 'animated' => 0, 'shopHolograms' => 0,
            ]);
            $mock->shouldReceive('createHologram')->once()->andReturn(['success' => true]);
        });

        $this->actingAs($moderator)
            ->get(route('dashboard.holograms.index'))
            ->assertOk();

        $this->actingAs($moderator)
            ->post(route('dashboard.holograms.store'), [
                'id' => 'sign1',
                'world' => 'minecraft:overworld',
                'x' => 1, 'y' => 2, 'z' => 3,
                'visible' => true,
                'lines' => ['hello'],
            ])
            ->assertRedirect();
    }
}
