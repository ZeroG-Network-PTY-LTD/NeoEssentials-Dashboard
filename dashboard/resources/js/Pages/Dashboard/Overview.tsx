import { Head, Link } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { McPlayer, ServerStatus } from '@/types/minecraft';
import { Users, Gauge, Clock, MemoryStick, LucideIcon } from 'lucide-react';

interface Props {
  status: Partial<ServerStatus>;
  players: McPlayer[];
  apiReachable: boolean;
}

// Alternating cyan/purple per card, matching the sidebar's two-tone accent system —
// four cards read as a set without every icon competing for the same color.
const STAT_ACCENTS = [
  { fg: 'text-[var(--mc-cyan-400)]', bg: 'bg-[var(--mc-cyan-50)]' },
  { fg: 'text-[var(--mc-purple-400)]', bg: 'bg-[var(--mc-purple-50)]' },
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent: number;
}) {
  const { fg, bg } = STAT_ACCENTS[accent % STAT_ACCENTS.length];
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] px-4 py-3.5 flex items-start gap-3">
      <span className={`h-8 w-8 rounded-[8px] shrink-0 flex items-center justify-center ${bg} ${fg}`}>
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] text-[var(--mc-text-secondary)]">{label}</div>
        <div className="font-data text-[22px] mt-0.5 leading-none">{value}</div>
        {sub && <div className="text-[11px] text-[var(--mc-text-muted)] mt-1.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Overview({ status, players, apiReachable }: Props) {
  if (!apiReachable) {
    return (
      <DashboardLayout>
        <Head title="Overview" />
        <div className="rounded-[var(--radius-lg)] border border-[var(--mc-ember-400)] bg-[var(--mc-ember-50)] px-5 py-4">
          <div className="font-display text-[15px] text-[var(--mc-ember-500)]">
            Can't reach the game server
          </div>
          <p className="text-[13px] text-[var(--mc-text-secondary)] mt-1">
            The dashboard couldn't connect to the mod's API. Check that the Minecraft
            server is running and that MC_API_URL / MC_SERVICE_USERNAME /
            MC_SERVICE_PASSWORD in your .env match the mod's config and a valid
            dashboard service account.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const uptime = status.uptimeSeconds
    ? `${Math.floor(status.uptimeSeconds / 86400)}d ${Math.floor((status.uptimeSeconds % 86400) / 3600)}h`
    : '—';

  return (
    <DashboardLayout>
      <Head title="Overview" />

      <h1 className="font-display text-[20px] font-semibold mb-5">Server overview</h1>

      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Players"
          value={`${status.onlineCount ?? 0}/${status.maxPlayers ?? '—'}`}
          icon={Users}
          accent={0}
        />
        <StatCard
          label="TPS"
          value={status.tps?.toFixed(1) ?? '—'}
          sub="ticks per second"
          icon={Gauge}
          accent={1}
        />
        <StatCard label="Uptime" value={uptime} icon={Clock} accent={0} />
        <StatCard
          label="Memory"
          value={`${status.memoryUsedMb ?? 0}/${status.memoryMaxMb ?? 0}`}
          sub="MB used"
          icon={MemoryStick}
          accent={1}
        />
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--mc-border)]">
          <span className="font-display text-[14px] font-semibold">Online now</span>
          <Link
            href={route('dashboard.players.index')}
            className="text-[12px] text-[var(--mc-cyan-500)] hover:underline"
          >
            View all →
          </Link>
        </div>
        <div>
          {players.slice(0, 6).map((p) => (
            <div
              key={p.uuid}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0"
            >
              <img
                src={`https://mc-heads.net/avatar/${p.uuid}/32`}
                alt=""
                className="h-5 w-5 rounded-[4px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)]"
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--mc-moss-500)]"
                aria-hidden="true"
              />
              <span className="text-[13px] flex-1">{p.username}</span>
              <span className="font-data text-[11px] text-[var(--mc-text-muted)]">
                {p.x.toFixed(0)}, {p.y.toFixed(0)}, {p.z.toFixed(0)} · {p.dimension}
              </span>
            </div>
          ))}
          {players.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--mc-text-muted)]">
              Nobody's online right now.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
