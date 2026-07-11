export type PlayerRank = 'owner' | 'op' | 'mod' | 'vip' | 'player';

export interface McPlayer {
  uuid: string;
  username: string;
  rank: PlayerRank;
  online: boolean;
  health: number;
  maxHealth: number;
  hunger: number;
  dimension: string;
  x: number;
  y: number;
  z: number;
  playtimeMinutes: number;
  balance: number;
}

export interface ServerStatus {
  online: boolean;
  tps: number;
  uptimeSeconds: number;
  onlineCount: number;
  maxPlayers: number;
  memoryUsedMb: number;
  memoryMaxMb: number;
}

export interface Warp {
  name: string;
  x: number;
  y: number;
  z: number;
  dimension: string;
  createdBy: string;
}

export interface LeaderboardEntry {
  uuid: string;
  username: string;
  balance: number;
}

export type LogEntryType = 'join' | 'leave' | 'command' | 'chat';

export interface LogEntry {
  timestamp: number;
  type: LogEntryType;
  username: string;
  message: string;
}

/**
 * Matches KitsEndpoint's kitJson exactly — the mod's kit dashboard API is
 * read-only (list/stats/single-view only), no item contents/cost are
 * exposed, and there's no create/update/delete/give route.
 */
export interface Kit {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  permission: string | null;
  cooldownMs: number;
  cooldownDisplay: string;
  maxUses: number;
  itemCount: number;
}

export interface KitStats {
  total: number;
  enabled: number;
  withPermission: number;
  withCooldown: number;
  withUsageLimit: number;
}

/** Mod dashboard account role — distinct from this app's own admin/moderator. */
export type ModUserRole = 'ADMIN' | 'MODERATOR' | 'VIEWER';

export interface ModUser {
  id: string;
  username: string;
  email?: string;
  role: ModUserRole;
  enabled: boolean;
  [key: string]: unknown;
}

export interface ModUserSession {
  sessionId: string;
  username: string;
  role: ModUserRole;
  ipAddress: string;
  createdAt: number;
  lastAccessAt: number;
}
