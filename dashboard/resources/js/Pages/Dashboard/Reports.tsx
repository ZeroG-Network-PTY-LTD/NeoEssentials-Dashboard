import { Head, router, useForm } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { ReportEntry, ReportStatus } from '@/types/minecraft';
import { Flag, Send, Check, X } from 'lucide-react';

interface Props {
  reports: ReportEntry[];
  showingAll: boolean;
}

const STATUS_BADGE: Record<ReportStatus, 'ember' | 'moss' | 'neutral'> = {
  PENDING: 'ember',
  REVIEWED: 'moss',
  DISMISSED: 'neutral',
};

export default function Reports({ reports, showingAll }: Props) {
  const review = (id: string, status: ReportStatus) => {
    router.post(route('dashboard.reports.review', id), { status });
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    targetName: '',
    reason: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('dashboard.reports.store'), { onSuccess: () => reset() });
  };

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <DashboardLayout>
      <Head title="Reports" />
      <PageHeading
        title="Reports"
        icon={Flag}
        count={reports.length}
        subtitle="Player-filed reports from the in-game /report command."
        action={
          <div className="flex gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] p-0.5">
            <button
              onClick={() => router.get(route('dashboard.reports.index'), { all: false })}
              className={`text-[12px] px-2.5 py-1 rounded-[6px] transition-colors ${
                !showingAll ? 'bg-[var(--mc-cyan-500)] text-[#0a1620]' : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)]'
              }`}
            >
              Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
            <button
              onClick={() => router.get(route('dashboard.reports.index'), { all: true })}
              className={`text-[12px] px-2.5 py-1 rounded-[6px] transition-colors ${
                showingAll ? 'bg-[var(--mc-cyan-500)] text-[#0a1620]' : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)]'
              }`}
            >
              All
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-[1fr_320px] gap-5 mb-5">
        <Card title={`${reports.length} report${reports.length === 1 ? '' : 's'}`} icon={Flag}>
          {reports.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
              {showingAll ? 'No reports on file.' : 'No pending reports.'}
            </div>
          )}
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 px-4 py-3 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <Badge variant={STATUS_BADGE[r.status]}>{r.status.toLowerCase()}</Badge>
              <div className="flex-1 min-w-0">
                <div>
                  <span className="font-medium">{r.reporterName}</span>
                  <span className="text-[var(--mc-text-muted)]"> reported </span>
                  <span className="font-medium">{r.targetName}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--mc-text-secondary)] break-words">{r.reason}</div>
                <div className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
                  {new Date(r.timestamp).toLocaleString()}
                  {r.status !== 'PENDING' && r.reviewedBy && (
                    <>
                      {' '}
                      · {r.status === 'DISMISSED' ? 'Dismissed' : 'Reviewed'} by {r.reviewedBy} · {new Date(r.reviewedAt).toLocaleString()}
                    </>
                  )}
                </div>
              </div>
              {r.status === 'PENDING' && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => review(r.id, 'REVIEWED')}
                    className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-moss-500)] text-white transition-colors hover:bg-[var(--mc-moss-600,var(--mc-moss-500))]"
                  >
                    <Check size={12} strokeWidth={2} />
                    Reviewed
                  </button>
                  <button
                    onClick={() => review(r.id, 'DISMISSED')}
                    className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
                  >
                    <X size={12} strokeWidth={2} />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </Card>

        <Card title="File a report" icon={Send} accent="purple" padded className="h-fit">
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
                rows={3}
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
