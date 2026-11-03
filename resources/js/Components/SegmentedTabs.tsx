import { LucideIcon } from 'lucide-react';

export interface SegmentedTabOption<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

export default function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  name,
}: {
  tabs: SegmentedTabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex flex-wrap overflow-hidden rounded-[var(--radius)] border border-[var(--mc-border-strong)]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === value;
        return (
          <label
            key={tab.id}
            className={`flex cursor-pointer items-center gap-1.5 border-r border-[var(--mc-border-strong)] px-3 py-1.5 text-[12.5px] font-medium transition-colors last:border-r-0 ${
              active
                ? 'text-[var(--mc-cyan-400)] shadow-[inset_0_0_0_1px_var(--mc-cyan-400)]'
                : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)]'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={active}
              onChange={() => onChange(tab.id)}
              className="sr-only"
            />
            {Icon && <Icon size={13} strokeWidth={2} />}
            {tab.label}
          </label>
        );
      })}
    </div>
  );
}
