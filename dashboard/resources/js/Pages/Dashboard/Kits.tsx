import { Head } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { Kit, KitStats } from '@/types/minecraft';
import { Package, CheckCircle2, Lock, Timer, Hash, LucideIcon } from 'lucide-react';

interface Props {
  kits: Kit[];
  stats: KitStats;
}

const KIT_STAT_ICONS: [string, LucideIcon][] = [
  ['Total', Package],
  ['Enabled', CheckCircle2],
  ['With permission', Lock],
  ['With cooldown', Timer],
  ['With use limit', Hash],
];

// Same alternating cyan/purple badge treatment as the Overview stat cards.
const STAT_ACCENTS = [
  { fg: 'text-[var(--mc-cyan-400)]', bg: 'bg-[var(--mc-cyan-50)]' },
  { fg: 'text-[var(--mc-purple-400)]', bg: 'bg-[var(--mc-purple-50)]' },
];

export default function Kits({ kits, stats }: Props) {
  const values: Record<string, number> = {
    Total: stats.total,
    Enabled: stats.enabled,
    'With permission': stats.withPermission,
    'With cooldown': stats.withCooldown,
    'With use limit': stats.withUsageLimit,
  };

  return (
    <DashboardLayout>
      <Head title="Kits" />
      <h1 className="font-display text-[20px] font-semibold mb-1">Kits</h1>
      <p className="text-[12px] text-[var(--mc-text-muted)] mb-5">
        Read-only — the mod doesn't expose a dashboard API to create/edit kits yet.
        Configure kits in-game or via <code>kits.json</code>.
      </p>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {KIT_STAT_ICONS.map(([label, Icon], i) => {
          const { fg, bg } = STAT_ACCENTS[i % STAT_ACCENTS.length];
          return (
            <div
              key={label}
              className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-3 flex items-start gap-2.5"
            >
              <span className={`h-7 w-7 rounded-[7px] shrink-0 flex items-center justify-center ${bg} ${fg}`}>
                <Icon size={14} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-[var(--mc-text-muted)] mb-0.5">{label}</div>
                <div className="font-data text-[18px] font-semibold leading-none">{values[label]}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
          {kits.length} kit{kits.length === 1 ? '' : 's'}
        </div>
        {kits.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-[var(--mc-text-muted)]">
            No kits configured yet.
          </div>
        )}
        {kits.map((kit) => (
          <div
            key={kit.name}
            className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px]"
          >
            <span
              className={`w-2 h-2 rounded-full mr-3 ${kit.enabled ? 'bg-[var(--mc-moss-500)]' : 'bg-[var(--mc-text-muted)]'}`}
              title={kit.enabled ? 'Enabled' : 'Disabled'}
            />
            <span className="flex-1">
              <span className="font-medium">{kit.displayName}</span>
              {kit.displayName !== kit.name && (
                <span className="text-[var(--mc-text-muted)] font-data text-[12px] ml-2">{kit.name}</span>
              )}
            </span>
            <span className="text-[12px] text-[var(--mc-text-muted)] mr-3">{kit.itemCount} items</span>
            <span className="text-[12px] text-[var(--mc-text-muted)] mr-3">{kit.cooldownDisplay}</span>
            {kit.permission && (
              <span className="font-data text-[11px] px-2 py-0.5 rounded-full bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]">
                {kit.permission}
              </span>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}