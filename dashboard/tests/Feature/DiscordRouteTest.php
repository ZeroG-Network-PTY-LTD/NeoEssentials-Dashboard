<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscordRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_moderator_can_view_status_but_not_manage(): void
    {
        $moderator = User::factory()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('discordStatus')->once()->andReturn([
                'anyActive' => false, 'adapterCount' => 0, 'eventCount' => 0, 'adapters' => [],
            ]);
            $mock->shouldReceive('discordEvents')->once()->andReturn([]);
            $mock->shouldNotReceive('discordAuthConfig');
        });

        $this->actingAs($moderator)
            ->get(route('dashboard.discord.index'))
            ->assertOk();

        $this->actingAs($moderator)
            ->delete(route('dashboard.discord.events.clear'))
            ->assertForbidden();

        $this->actingAs($moderator)
            ->post(route('dashboard.discord.test'), ['message' => 'hi'])
            ->assertForbidden();
    }

    public function test_admin_sees_auth_config_and_can_manage(): void
    {
        $admin = User::factory()->admin()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('discordStatus')->once()->andReturn([
                'anyActive' => true, 'adapterCount' => 1, 'eventCount' => 5, 'adapters' => [],
            ]);
            $mock->shouldReceive('discordEvents')->once()->andReturn([]);
            $mock->shouldReceive('discordAuthConfig')->once()->andReturn([
                'enabled' => true,
                'requireLinkedAccount' => false,
                'allowAutoRegistration' => false,
                'defaultRole' => 'VIEWER',
                'sdlinkAvailable' => false,
                'oauth2' => [
                    'configured' => false,
                    'clientId' => null,
                    'clientSecretSet' => false,
                    'redirectUri' => null,
                    'scopes' => [],
                ],
            ]);
            $mock->shouldReceive('clearDiscordEvents')->once()->andReturn(['success' => true]);
        });

        $this->actingAs($admin)
            ->get(route('dashboard.discord.index'))
            ->assertOk();

        $this->actingAs($admin)
            ->delete(route('dashboard.discord.events.clear'))
            ->assertRedirect();
    }
}
