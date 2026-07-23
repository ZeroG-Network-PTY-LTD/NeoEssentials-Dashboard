import { useEcho, echoIsConfigured, useConnectionStatus } from '@laravel/echo-react';

/**
 * Shapes mirror docs/API.md's WebSocket section exactly (the mod's own contract, relayed
 * verbatim by the dashboard:mc-bridge command / McRelayEvent — see that PHP class for why
 * there's no separate DTO layer). `channel` and `timestamp` are added by the mod's own
 * WebSocket server to every message.
 */
export interface McStatsPayload {
  type: 'stats';
  channel: string;
  timestamp: number;
  tps: number;
  memUsedMb: number;
  memMaxMb: number;
  memPercent: number;
  players: number;
  playersMax: number;
  uptimeMs: number;
}

export interface McEventPayload {
  type: 'event';
  channel: string;
  timestamp: number;
  event: 'player_join' | 'player_leave' | 'chat' | 'death';
  player: string;
  message?: string;
}

/** Whether live updates are even possible on this deployment (Reverb configured — see app.tsx). */
export function isMcLiveAvailable(): boolean {
  return echoIsConfigured();
}

// @laravel/echo-react's useEcho (as of 2.4.0) throws synchronously from within its own
// subscribe effect the moment it mounts if configureEcho() was never called — it does NOT
// silently no-op on an unconfigured Echo despite what its docs imply. Every call site below
// must gate on isMcLiveAvailable() itself rather than relying on useEcho to skip cleanly.
// Safe to call conditionally (breaking rules-of-hooks) only because isMcLiveAvailable() reads a
// build-time env var baked into the bundle — it can't change across a mounted instance's
// lifetime, so the hook call is never conditional across re-renders of the same component.

/**
 * Subscribes to the mod's relayed stats pulse (~every 60s) on the shared `mc-dashboard`
 * private channel. No-ops cleanly when Reverb isn't configured (shared/cPanel installs).
 */
export function useMcStats(onStats: (payload: McStatsPayload) => void) {
  if (!isMcLiveAvailable()) return;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEcho<McStatsPayload>('mc-dashboard', 'stats', onStats, [onStats]);
}

/** Subscribes to player join/leave/chat/death events on the same live feed. */
export function useMcEvents(onEvent: (payload: McEventPayload) => void) {
  if (!isMcLiveAvailable()) return;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEcho<McEventPayload>('mc-dashboard', 'event', onEvent, [onEvent]);
}

/**
 * Whether the live feed is actually connected right now, for a small live/static indicator.
 * `useConnectionStatus()` throws if `configureEcho()` was never called, so this only invokes
 * it when Reverb is configured — safe because `isMcLiveAvailable()` reads a build-time env var
 * that can't change during a mounted component's lifetime, so the hook call is never
 * conditional across re-renders of the same instance.
 */
export function useMcLiveStatus(): boolean {
  const available = isMcLiveAvailable();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const status = available ? useConnectionStatus() : null;

  return available && status === 'connected';
}
