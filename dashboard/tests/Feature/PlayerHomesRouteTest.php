<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerHomesRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_homes_for_an_online_player(): void
    {
        $user = User::factory()->linked()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('players')->once()->andReturn([
                ['uuid' => 'abc-123', 'username' => 'Steve'],
            ]);
            $mock->shouldReceive('homes')->once()->with('Steve')->andReturn([
                ['name' => 'home', 'x' => 1, 'y' => 2, 'z' => 3, 'yaw' => 0, 'pitch' => 0,
                    'dimension' => 'minecraft:overworld', 'createdBy' => 'Steve', 'timestamp' => 0],
            ]);
        });

        $this->actingAs($user)
            ->getJson(route('dashboard.players.homes', 'abc-123'))
            ->assertOk()
            ->assertJsonPath('homes.0.name', 'home');
    }
}
