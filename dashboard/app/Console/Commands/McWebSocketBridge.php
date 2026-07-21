<?php

namespace App\Console\Commands;

use App\Events\McRelayEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Ratchet\Client\Connector;
use Ratchet\Client\WebSocket;
use React\EventLoop\Loop;
use React\EventLoop\LoopInterface;
use React\Socket\Connector as SocketConnector;
use Throwable;

/**
 * Persistent bridge: connects to the mod's own WebSocket server (server-to-server, holds the
 * mod API key — never the browser) and re-broadcasts every message it receives, verbatim, as
 * a McRelayEvent over Laravel's own broadcasting layer (Reverb). Intended to run as a
 * long-lived Supervisor-managed process on VPS/Docker installs alongside `reverb:start` and
 * `queue:work` — see INSTALL.md. Not applicable to shared/cPanel hosting, which can't run
 * persistent background processes at all; those installs simply never run this command, and
 * the dashboard falls back to its pre-existing static (page-load-only) behavior.
 */
class McWebSocketBridge extends Command
{
    protected $signature = 'dashboard:mc-bridge';

    protected $description = "Bridge the mod's WebSocket event stream into Laravel broadcasting for live dashboard updates";

    /** Reconnect backoff schedule, seconds — holds at the last value once exhausted. */
    private const BACKOFF = [1, 2, 5, 10];

    private int $backoffIndex = 0;

    public function handle(): int
    {
        $host = parse_url((string) config('minecraft.api_url'), PHP_URL_HOST) ?: '127.0.0.1';
        $port = config('minecraft.ws_port');
        $apiKey = config('minecraft.service_api_key');

        if (! $port || ! $apiKey) {
            $this->error('Not paired, or no WebSocket port on record — pair the dashboard with the mod first (Configuration → Minecraft Server Connection).');

            return self::FAILURE;
        }

        $url = "ws://{$host}:{$port}";
        $loop = Loop::get();

        $this->connect($url, $apiKey, $loop);

        $loop->run();

        return self::SUCCESS;
    }

    private function connect(string $url, string $apiKey, LoopInterface $loop): void
    {
        $connector = new Connector($loop, new SocketConnector($loop));

        $connector($url)->then(
            function (WebSocket $conn) use ($url, $apiKey, $loop) {
                $this->info("Connected to {$url}");
                $this->backoffIndex = 0;

                $conn->send(json_encode(['type' => 'authenticate', 'apiKey' => $apiKey]));

                $conn->on('message', function ($msg) use ($conn) {
                    $this->handleMessage($conn, (string) $msg);
                });

                $conn->on('close', function ($code = null, $reason = null) use ($url, $apiKey, $loop) {
                    Log::warning("mc-bridge: connection to {$url} closed ({$code} - {$reason}), reconnecting");
                    $this->scheduleReconnect($url, $apiKey, $loop);
                });
            },
            function (Throwable $e) use ($url, $apiKey, $loop) {
                Log::warning("mc-bridge: could not connect to {$url}: {$e->getMessage()}");
                $this->scheduleReconnect($url, $apiKey, $loop);
            }
        );
    }

    private function scheduleReconnect(string $url, string $apiKey, LoopInterface $loop): void
    {
        $delay = self::BACKOFF[min($this->backoffIndex, count(self::BACKOFF) - 1)];
        $this->backoffIndex++;

        $loop->addTimer($delay, function () use ($url, $apiKey, $loop) {
            $this->connect($url, $apiKey, $loop);
        });
    }

    private function handleMessage(WebSocket $conn, string $raw): void
    {
        $payload = json_decode($raw, true);

        if (! is_array($payload) || ! isset($payload['type'])) {
            return;
        }

        match ($payload['type']) {
            'authenticated' => $this->onAuthenticated($conn),
            'auth_error' => Log::error('mc-bridge: authentication rejected: '.($payload['message'] ?? 'unknown')),
            'pong' => null,
            default => McRelayEvent::dispatch($payload),
        };
    }

    private function onAuthenticated(WebSocket $conn): void
    {
        $this->info('Authenticated — subscribing to events/chat/stats.');
        $conn->send(json_encode(['type' => 'subscribe', 'channels' => ['events', 'chat', 'stats']]));
    }
}
