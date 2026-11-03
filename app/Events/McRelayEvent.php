<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Thin pass-through broadcast of a message received verbatim from the mod's own WebSocket
 * server (see the dashboard:mc-bridge command / McWebSocketBridge). Deliberately NOT modeled
 * as separate typed events per message shape — the mod's docs/API.md is already the single
 * source of truth for these payload shapes (events/chat/stats channels); duplicating that as
 * parallel PHP DTOs here would just be one more place to keep in sync every time the mod's
 * WebSocket protocol changes.
 *
 * ShouldBroadcastNow (not ShouldBroadcast) — this is a live feed, queuing it would defeat the
 * point.
 */
class McRelayEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param  array<string, mixed>  $payload  the decoded JSON message from the mod, as-is
     */
    public function __construct(public readonly array $payload)
    {
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('mc-dashboard')];
    }

    /**
     * The mod's own "type" field (stats/chat/event) becomes the broadcast event name the
     * frontend listens for — matches docs/API.md's WebSocket section 1:1, no translation
     * layer. Echo's client-side `useEcho('mc-dashboard', '.stats', ...)` call is what adds the
     * leading dot (meaning "don't prefix with the App\Events\ namespace"); this returns the
     * bare name.
     */
    public function broadcastAs(): string
    {
        return $this->payload['type'] ?? 'unknown';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
