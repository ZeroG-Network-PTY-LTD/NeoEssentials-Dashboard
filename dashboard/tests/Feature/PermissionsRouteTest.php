<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionsRouteTest extends TestCase
{
    use RefreshDatabase;

    private function mockReadOnly(): void
    {
        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('permissionOverview')->once()->andReturn([
                'success' => true, 'totalGroups' => 1, 'totalUsers' => 0,
                'usingExternal' => false, 'systemType' => 'Internal',
            ]);
            $mock->shouldReceive('permissionGroups')->once()->andReturn([]);
            $mock->shouldReceive('permissionUsers')->once()->andReturn([]);
            $mock->shouldReceive('permissionAliases')->once()->andReturn([]);
        });
    }

    public function test_moderator_can_view_but_not_manage(): void
    {
        $moderator = User::factory()->linked()->create();
        $this->mockReadOnly();

        $this->actingAs($moderator)
            ->get(route('dashboard.permissions.index'))
            ->assertOk();

        $this->actingAs($moderator)
            ->post(route('dashboard.permissions.groups.store'), ['name' => 'vip'])
            ->assertForbidden();
    }

    public function test_admin_can_manage(): void
    {
        $admin = User::factory()->admin()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            $mock->shouldReceive('permissionOverview')->once()->andReturn([
                'success' => true, 'totalGroups' => 1, 'totalUsers' => 0,
                'usingExternal' => false, 'systemType' => 'Internal',
            ]);
            $mock->shouldReceive('permissionGroups')->once()->andReturn([]);
            $mock->shouldReceive('permissionUsers')->once()->andReturn([]);
            $mock->shouldReceive('permissionAliases')->once()->andReturn([]);
            $mock->shouldReceive('createPermissionGroup')->once()->andReturn(['success' => true]);
        });

        $this->actingAs($admin)
            ->get(route('dashboard.permissions.index'))
            ->assertOk();

        $this->actingAs($admin)
            ->post(route('dashboard.permissions.groups.store'), ['name' => 'vip'])
            ->assertRedirect();
    }
}