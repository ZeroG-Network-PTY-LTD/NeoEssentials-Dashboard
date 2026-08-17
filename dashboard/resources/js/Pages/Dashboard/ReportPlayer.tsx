import { Head, useForm } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import { Send } from 'lucide-react';

export default function ReportPlayer() {
  const { data, setData, post, processing, errors, reset } = useForm({
    targetName: '',
    reason: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('dashboard.reports.store'), { onSuccess: () => reset() });
  };

  return (
    <DashboardLayout>
      <Head title="Report a player" />
      <PageHeading
        title="Report a player"
        icon={Send}
        subtitle="Let staff know about rule-breaking or bad behavior. Same as using /report in-game."
      />

      <div className="max-w-[420px]">
        <Card title="File a report" icon={Send} accent="purple" padded>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Player
              <input
                value={data.targetName}
                onChange={(e) => setData('targetName', e.target.value)}
                placeholder="Username"
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {errors.targetName && <span className="text-[var(--mc-ember-500)]">{errors.targetName}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Reason
              <textarea
                value={data.reason}
                onChange={(e) => setData('reason', e.target.value)}
                rows={4}
                placeholder="What happened?"
                className="text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)] resize-none"
              />
              {errors.reason && <span className="text-[var(--mc-ember-500)]">{errors.reason}</span>}
            </label>

            <button
              type="submit"
              disabled={processing}
              className="btn-pop mt-1 flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
              <Send size={13} strokeWidth={2} />
              File report
            </button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
