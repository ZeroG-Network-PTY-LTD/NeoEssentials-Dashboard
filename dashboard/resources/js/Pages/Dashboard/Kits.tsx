import { Head } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { Kit, KitStats } from '@/types/minecraft';

interface Props {
  kits: Kit[];
  stats: KitStats;
}

export default function Kits({ kits, stats }: Props) {
  return (
    <DashboardLayout>
      <Head title="Kits" />
      <h1 className="font-display text-[20px] font-semibold mb-1">Kits</h1>
      <p className="text-[12px] text-[var(--mc-text-muted)] mb-5">
        Read-only — the mod doesn't expose a dashboard API to create/edit kits yet.
        Configure kits in-game or via <code>kits.json</code>.
      </p>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          ['Total', stats.total],
          ['Enabled', stats.enabled],
          ['With permission', stats.withPermission],
          ['With cooldown', stats.withCooldown],
          ['With use limit', stats.withUsageLimit],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-3"
          >
            <div className="text-[11px] text-[var(--mc-text-muted)] mb-1">{label}</div>
            <div className="font-data text-[18px] font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
          {kits.length} kit{kits.length === 1 ? '' : 's'}
        </div>
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
              <span className="text-[var(--mc-text-muted)] font-data text-[12px] ml-2">{kit.name}</span>
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