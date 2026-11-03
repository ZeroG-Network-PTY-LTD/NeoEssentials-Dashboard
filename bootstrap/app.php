<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Request as SymfonyRequest;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // This container sits behind a reverse proxy in every real deployment (Cloudflare
        // Tunnel locally, nginx/Apache/ALB elsewhere) that terminates TLS and forwards plain
        // HTTP internally. Without this, Laravel's own scheme/host/IP detection sees the proxy
        // hop, not the real visitor — every generated asset/script URL (Vite, asset(), url())
        // comes back http:// on an https:// page (browsers hard-block that as mixed content —
        // this is what broke the login/register buttons' JS), isSecure() is false (so the
        // session cookie's auto "secure" flag never engages), and rate limiting/logs see the
        // proxy's IP instead of the client's. Trusting '*' is safe here because this app is
        // never meant to be reached except through that one trusted proxy hop (nothing else
        // should be pointed at this container's port in a real deployment) — it is NOT safe if
        // you expose this port directly to untrusted clients, since they could then spoof these
        // headers themselves.
        $middleware->trustProxies(
            at: '*',
            headers: SymfonyRequest::HEADER_X_FORWARDED_FOR
                | SymfonyRequest::HEADER_X_FORWARDED_HOST
                | SymfonyRequest::HEADER_X_FORWARDED_PORT
                | SymfonyRequest::HEADER_X_FORWARDED_PROTO,
        );

        $middleware->web(prepend: [
            \App\Http\Middleware\EnsureInstalled::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'account.linked' => \App\Http\Middleware\EnsureAccountLinked::class,
        ]);

        // The mod's own DashboardUserSyncWebhook and /dashboard pair command are
        // server-to-server POSTs with no browser session/CSRF token to send —
        // authenticated instead via a Bearer token (WebhookController) or a
        // one-time pairing code (PairingController).
        $middleware->validateCsrfTokens(except: [
            'webhooks/*',
            'api/pair/complete',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
