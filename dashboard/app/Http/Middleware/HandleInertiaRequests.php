<?php

namespace App\Http\Middleware;

use App\Services\MinecraftApiService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            // Reflects the outcome of whatever mod-API call this same request's
            // controller already made — see MinecraftApiService::isReachable().
            // Wrapped defensively: this must never be the thing that breaks a
            // page render (e.g. test suites that mock MinecraftApiService
            // without stubbing this one extra method shouldn't have to).
            'apiReachable' => function () use ($request) {
                if (!$request->user()) {
                    return true;
                }

                try {
                    return app(MinecraftApiService::class)->isReachable();
                } catch (\Throwable $e) {
                    return true;
                }
            },
        ];
    }
}
