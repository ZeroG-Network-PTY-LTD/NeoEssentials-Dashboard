<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MinecraftApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackupsRouteTest extends TestCase
{
    use RefreshDatabase;

    private function mockIndex($mock): void
    {
        $mock->shouldReceive('backupStatus')->once()->andReturn([
            'count' => 0, 'totalSizeMb' => '0.00', 'totalSizeBytes' => 0,
            'lastBackup' => null, 'maxSnapshots' => 10, 'backupDir' => '/backups',
            'availableTargets' => [],
        ]);
        $mock->shouldReceive('backupList')->once()->andReturn([]);
        $mock->shouldReceive('cloudStatus')->once()->andReturn([
            'providers' => [
                'dropbox' => ['configured' => false],
                'googleDrive' => ['configured' => false],
            ],
        ]);
        $mock->shouldReceive('cloudConfig')->once()->andReturn([
            'dropbox' => ['configured' => false, 'tokenMasked' => '', 'uploadPath' => ''],
            'googleDrive' => ['configured' => false, 'clientId' => '', 'folderId' => '', 'refreshTokenMasked' => ''],
        ]);
        $mock->shouldReceive('cloudDropboxFiles')->once()->andReturn([]);
        $mock->shouldReceive('cloudGoogleFiles')->once()->andReturn([]);
    }

    public function test_moderator_can_view_but_not_manage(): void
    {
        $moderator = User::factory()->create();

        $this->mock(MinecraftApiService::class, fn ($mock) => $this->mockIndex($mock));

        $this->actingAs($moderator)
            ->get(route('dashboard.backups.index'))
            ->assertOk();

        $this->actingAs($moderator)
            ->post(route('dashboard.backups.store'), ['targets' => ['configs']])
            ->assertForbidden();
    }

    public function test_admin_can_manage(): void
    {
        $admin = User::factory()->admin()->create();

        $this->mock(MinecraftApiService::class, function ($mock) {
            $this->mockIndex($mock);
            $mock->shouldReceive('createBackup')->once()->andReturn(['success' => true]);
        });

        $this->actingAs($admin)
            ->get(route('dashboard.backups.index'))
            ->assertOk();

        $this->actingAs($admin)
            ->post(route('dashboard.backups.store'), ['targets' => ['configs']])
            ->assertRedirect();
    }
}