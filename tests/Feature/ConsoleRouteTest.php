<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsoleRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_run_a_command(): void
    {
        $admin = User::factory()->admin()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            // Matches the mod's real shape: `output` is often an empty array
            // (e.g. for commands like /say that produce no console feedback line),
            // not absent — a bare `?? 'fallback'` doesn't catch that case.
            $mock->shouldReceive('runCommand')->once()->andReturn(['success' => true, 'output' => []]);
        });

        $this->actingAs($admin)
            ->post(route('dashboard.commands.run'), ['command' => 'say hi'])
            ->assertRedirect()
            ->assertSessionHas('success', 'Command sent.');
    }

    public function test_moderator_cannot_run_commands(): void
    {
        $moderator = User::factory()->linked()->create();

        $this->actingAs($moderator)
            ->post(route('dashboard.commands.run'), ['command' => 'say hi'])
            ->assertForbidden();
    }

    public function test_chained_commands_are_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('dashboard.commands.run'), ['command' => 'say hi; stop'])
            ->assertSessionHasErrors('command');
    }
}