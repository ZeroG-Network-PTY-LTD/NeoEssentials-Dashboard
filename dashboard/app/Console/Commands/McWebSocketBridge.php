<?php

namespace App\Console\Commands;

use App\Events\McRelayEvent;
use App\Models\McConnection;
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
        $connection = McConnection::current();
        $port = $connection->ws_port;
        $apiKey = $connection->api_key;

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

                $conn->on('message', function ($msg) use ($conn, $loop) {
                    $this->handleMessage($conn, (string) $msg, $loop);
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

    /**
     * Only these three ever carry the mod's own channel data (see docs/API.md's WebSocket
     * section) — everything else is connection/protocol lifecycle chatter (welcome on open,
     * subscribed/unsubscribed acks, pong, generic error) that must never be relayed as a
     * dashboard broadcast.
     */
    private const DATA_TYPES = ['event', 'chat', 'stats'];

    private function handleMessage(WebSocket $conn, string $raw, LoopInterface $loop): void
    {
        $payload = json_decode($raw, true);

        if (! is_array($payload) || ! isset($payload['type'])) {
            return;
        }

        if (in_array($payload['type'], self::DATA_TYPES, true)) {
            // A broadcast failure (Reverb briefly down, etc.) must not take out the WS
            // connection to the mod itself — that would drop and reconnect the whole session
            // over what's often a transient, unrelated problem on the Laravel side.
            try {
                McRelayEvent::dispatch($payload);
            } catch (Throwable $e) {
                Log::warning("mc-bridge: failed to broadcast a relayed {$payload['type']} message: {$e->getMessage()}");
            }

            return;
        }

        match ($payload['type']) {
            'authenticated' => $this->onAuthenticated($conn, $loop),
            'auth_error' => Log::error('mc-bridge: authentication rejected: '.($payload['message'] ?? 'unknown')),
            'error' => Log::warning('mc-bridge: protocol error from mod: '.($payload['message'] ?? 'unknown')),
            default => null, // welcome, subscribed, unsubscribed, pong — nothing to do
        };
    }

    private function onAuthenticated(WebSocket $conn, LoopInterface $loop): void
    {
        $this->info('Authenticated — subscribing to events/chat/stats.');

        // The mod enforces a 100ms-minimum gap between messages per connection; sending
        // subscribe in the very same tick we received "authenticated" can land inside that
        // window on localhost's near-zero round-trip and get bounced as a rate-limit error.
        $loop->addTimer(0.15, function () use ($conn) {
            $conn->send(json_encode(['type' => 'subscribe', 'channels' => ['events', 'chat', 'stats']]));
        });
    }
}
