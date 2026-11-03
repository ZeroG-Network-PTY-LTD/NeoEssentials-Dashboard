<?php

namespace App\Support;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

/**
 * Shared by InstallService (setup wizard) and ConfigService (post-install
 * runtime config edits) — both need to upsert KEY=value pairs into .env.
 */
trait WritesEnvFile
{
    /**
     * Upserts KEY=value pairs into .env, quoting any value containing
     * whitespace. Creates .env from .env.example first if it's somehow
     * still missing (the shipped installer package always includes a
     * working one, but this keeps callers from hard-crashing if someone
     * deleted it by hand).
     */
    public function writeEnv(array $updates): void
    {
        $path = base_path('.env');

        if (! File::exists($path)) {
            $example = base_path('.env.example');
            File::put($path, File::exists($example) ? File::get($example) : '');
        }

        $contents = File::get($path);

        foreach ($updates as $key => $value) {
            $formatted = preg_match('/\s/', (string) $value) ? '"'.addslashes((string) $value).'"' : $value;
            $line = "{$key}={$formatted}";

            if (preg_match("/^{$key}=.*$/m", $contents)) {
                $contents = preg_replace("/^{$key}=.*$/m", $line, $contents);
            } else {
                $contents = rtrim($contents)."\n{$line}\n";
            }
        }

        File::put($path, $contents);

        if (! config('app.key')) {
            Artisan::call('key:generate', ['--force' => true]);
        }

        Artisan::call('config:clear');
    }

    /** Shows only the last 4 characters of a secret, for a "you already have one set" UI. */
    protected function maskSecret(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        return strlen($value) <= 4
            ? str_repeat('•', strlen($value))
            : str_repeat('•', strlen($value) - 4).substr($value, -4);
    }
}
