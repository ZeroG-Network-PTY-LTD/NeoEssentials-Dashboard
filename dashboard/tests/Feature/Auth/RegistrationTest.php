<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_first_user_becomes_admin_only_right_after_install_wizard(): void
    {
        $this->withSession(['install_bootstrap_admin' => true])->post('/register', [
            'name' => 'First User',
            'email' => 'first@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertSame('admin', User::where('email', 'first@example.com')->firstOrFail()->role);
    }

    public function test_first_user_stays_moderator_without_the_install_wizard_flag(): void
    {
        // Registering directly (e.g. Option B's manual bootstrap skipping /install
        // entirely) no longer grants admin just for being first — see
        // InstallController::finishRun()'s one-time 'install_bootstrap_admin' flag.
        $this->post('/register', [
            'name' => 'First User',
            'email' => 'first@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertSame('moderator', User::where('email', 'first@example.com')->firstOrFail()->role);
    }

    public function test_second_registered_user_stays_moderator_even_with_the_install_flag(): void
    {
        User::factory()->create(); // occupies the "first user" slot

        $this->withSession(['install_bootstrap_admin' => true])->post('/register', [
            'name' => 'Second User',
            'email' => 'second@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertSame('moderator', User::where('email', 'second@example.com')->firstOrFail()->role);
    }
}
