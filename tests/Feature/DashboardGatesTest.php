<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardGatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_do_everything(): void
    {
        $admin = User::factory()->admin()->create();

        $this->assertTrue($admin->can('players.kick'));
        $this->assertTrue($admin->can('players.ban'));
        $this->assertTrue($admin->can('players.mute'));
        $this->assertTrue($admin->can('economy.manage'));
        $this->assertTrue($admin->can('console.run'));
        $this->assertTrue($admin->can('mod-users.manage'));
        $this->assertTrue($admin->can('discord.manage'));
        $this->assertTrue($admin->can('permissions.manage'));
        $this->assertTrue($admin->can('backups.manage'));
    }

    public function test_moderator_can_only_mute(): void
    {
        $moderator = User::factory()->create(); // default role is 'moderator'

        $this->assertFalse($moderator->can('players.kick'));
        $this->assertFalse($moderator->can('players.ban'));
        $this->assertTrue($moderator->can('players.mute'));
        $this->assertFalse($moderator->can('economy.manage'));
        $this->assertFalse($moderator->can('console.run'));
        $this->assertFalse($moderator->can('mod-users.manage'));
        $this->assertFalse($moderator->can('discord.manage'));
        $this->assertFalse($moderator->can('permissions.manage'));
        $this->assertFalse($moderator->can('backups.manage'));
    }
}