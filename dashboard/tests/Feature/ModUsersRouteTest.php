<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModUsersRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_moderator_cannot_view_mod_user_management(): void
    {
        $moderator = User::factory()->create();

        $this->actingAs($moderator)
            ->get(route('dashboard.users.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_mod_user_management(): void
    {
        $admin = User::factory()->admin()->create();

        // Don't hit the real mod API in a unit/feature test — swap in a fake
        // that returns canned data, matching how MinecraftApiService's public
        // methods are actually called by UserManagementController.
        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('modUsers')->once()->andReturn([]);
            $mock->shouldReceive('modUserSessions')->once()->andReturn([]);
        });

        $this->actingAs($admin)
            ->get(route('dashboard.users.index'))
            ->assertOk();
    }
}