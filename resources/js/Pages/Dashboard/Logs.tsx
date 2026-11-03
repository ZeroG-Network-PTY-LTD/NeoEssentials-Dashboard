import { Head } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { LogEntry, LogEntryType } from '@/types/minecraft';
import { ScrollText } from 'lucide-react';

interface Props {
  entries: LogEntry[];
}

const TYPE_BADGE: Record<LogEntryType, 'moss' | 'ember' | 'cyan' | 'neutral'> = {
  join: 'moss',
  leave: 'ember',
  command: 'cyan',
  chat: 'neutral',
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Logs({ entries }: Props) {
  return (
    <DashboardLayout>
      <Head title="Logs" />
      <PageHeading title="Activity log" icon={ScrollText} count={entries.length} subtitle="Recent joins, leaves, commands, and chat." />

      <Card title="Recent activity" icon={ScrollText} accent="purple">
        <div className="px-4 py-1">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-1.5 border-b border-[var(--mc-border)] last:border-0 font-data text-[12px]"
            >
              <span className="text-[var(--mc-text-muted)] w-12 shrink-0">{formatTime(entry.timestamp)}</span>
              <Badge variant={TYPE_BADGE[entry.type]} className="w-16 shrink-0 justify-center uppercase">
                {entry.type}
              </Badge>
              <span className="text-[var(--mc-text-secondary)]">
                {entry.username}: {entry.message}
              </span>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="px-1 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
              No activity yet.
            </div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
