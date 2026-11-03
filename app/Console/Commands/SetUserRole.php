<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('dashboard:set-role {email} {role : admin or moderator}')]
#[Description('Promote or demote a dashboard user by email — the only way to grant admin beyond the automatic first-account promotion.')]
class SetUserRole extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $role = $this->argument('role');
        if (! in_array($role, ['admin', 'moderator'], true)) {
            $this->error("Role must be 'admin' or 'moderator', got '{$role}'.");

            return self::FAILURE;
        }

        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error("No user found with email '{$this->argument('email')}'.");

            return self::FAILURE;
        }

        $user->forceFill(['role' => $role])->save();
        $this->info("{$user->email} is now '{$role}'.");

        return self::SUCCESS;
    }
}
