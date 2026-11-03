import { Head, useForm } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import { Terminal, Play, Zap } from 'lucide-react';

const QUICK_COMMANDS = [
  'time set day',
  'time set night',
  'weather clear',
  'weather rain',
];

export default function Commands() {
  const { data, setData, post, processing, recentlySuccessful } = useForm({ command: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('dashboard.commands.run'), { preserveScroll: true });
  };

  return (
    <DashboardLayout>
      <Head title="Commands" />
      <PageHeading title="Commands" icon={Terminal} subtitle="Run a command directly on the server console." />

      <Card title="Console" icon={Terminal} padded>
        <form onSubmit={submit}>
          <div className="flex gap-2">
            <span className="font-data text-[13px] text-[var(--mc-text-muted)] py-2">/</span>
            <input
              value={data.command}
              onChange={(e) => setData('command', e.target.value)}
              placeholder="broadcast Hello everyone!"
              className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-3 py-2 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
            />
            <button
              type="submit"
              disabled={processing}
              className="btn-pop flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
              <Play size={13} strokeWidth={2} />
              Run
            </button>
          </div>
          {recentlySuccessful && (
            <div className="mt-2 text-[12px] text-[var(--mc-moss-500)]">Command sent.</div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => setData('command', cmd)}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-[6px] border border-[var(--mc-border-strong)] font-data transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
              >
                <Zap size={11} strokeWidth={2} className="text-[var(--mc-purple-400)]" />
                /{cmd}
              </button>
            ))}
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
