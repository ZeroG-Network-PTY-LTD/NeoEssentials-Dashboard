import { Head, useForm } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';

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
      <h1 className="font-display text-[20px] font-semibold mb-5">Commands</h1>

      <form
        onSubmit={submit}
        className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 mb-5"
      >
        <div className="flex gap-2">
          <span className="font-data text-[13px] text-[var(--mc-text-muted)] py-2">/</span>
          <input
            value={data.command}
            onChange={(e) => setData('command', e.target.value)}
            placeholder="broadcast Hello everyone!"
            className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-3 py-2 text-[var(--mc-text-primary)]"
          />
          <button
            type="submit"
            disabled={processing}
            className="text-[13px] px-4 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium disabled:opacity-50"
          >
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
              className="text-[11px] px-2.5 py-1 rounded-[6px] border border-[var(--mc-border-strong)] font-data hover:bg-[var(--mc-bg-surface-raised)]"
            >
              /{cmd}
            </button>
          ))}
        </div>
      </form>
    </DashboardLayout>
  );
}
