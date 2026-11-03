import { Head, router, useForm } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { IPBanEntry, MuteEntry } from '@/types/minecraft';
import { Ban, VolumeX, Plus, X } from 'lucide-react';

interface Props {
  bans: IPBanEntry[];
  showingAll: boolean;
  mutes: MuteEntry[];
}

function formatDate(ms: number) {
  return ms ? new Date(ms).toLocaleString() : '—';
}

export default function IpBans({ bans, showingAll, mutes }: Props) {
  const unban = (ip: string) => {
    router.delete(route('dashboard.ip-bans.unban', ip));
  };

  const unmute = (ip: string) => {
    router.delete(route('dashboard.ip-mutes.unmute', ip));
  };

  const banForm = useForm({ ip: '', reason: '', duration: '' });
  const submitBan = (e: React.FormEvent) => {
    e.preventDefault();
    banForm.post(route('dashboard.ip-bans.ban'), { onSuccess: () => banForm.reset() });
  };

  const muteForm = useForm({ ip: '', reason: '', duration: '' });
  const submitMute = (e: React.FormEvent) => {
    e.preventDefault();
    muteForm.post(route('dashboard.ip-mutes.mute'), { onSuccess: () => muteForm.reset() });
  };

  return (
    <DashboardLayout>
      <Head title="IP Bans" />
      <PageHeading
        title="IP Bans"
        icon={Ban}
        subtitle="Bans and mutes applied at the IP-address level, separate from per-player punishments."
        action={
          <div className="flex gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] p-0.5">
            <button
              onClick={() => router.get(route('dashboard.ip-bans.index'), { all: false })}
              className={`text-[12px] px-2.5 py-1 rounded-[6px] transition-colors ${
                !showingAll ? 'bg-[var(--mc-cyan-500)] text-[#0a1620]' : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => router.get(route('dashboard.ip-bans.index'), { all: true })}
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
        <Card title={`${bans.length} IP ban${bans.length === 1 ? '' : 's'}`} icon={Ban}>
          {bans.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
              {showingAll ? 'No IP bans on file.' : 'No active IP bans.'}
            </div>
          )}
          {bans.map((b) => (
            <div
              key={b.id}
              className="flex items-start gap-3 px-4 py-3 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <Badge variant={b.active ? 'ember' : 'neutral'}>{b.active ? 'active' : 'lifted'}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-data font-medium">{b.ipAddress}</div>
                <div className="mt-0.5 text-[12.5px] text-[var(--mc-text-secondary)] break-words">{b.reason}</div>
                <div className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
                  Banned by {b.bannedBy} · {formatDate(b.banTime)}
                  {b.permanent ? ' · Permanent' : ` · Until ${formatDate(b.expireTime)}`}
                  {!b.active && b.unbannedBy && (
                    <>
                      {' '}
                      · Unbanned by {b.unbannedBy} · {formatDate(b.unbannedAt ?? 0)}
                    </>
                  )}
                </div>
              </div>
              {b.active && (
                <button
                  onClick={() => unban(b.ipAddress)}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors shrink-0"
                >
                  <X size={12} strokeWidth={2} />
                  Unban
                </button>
              )}
            </div>
          ))}
        </Card>

        <Card title="Ban an IP" icon={Plus} accent="purple" padded className="h-fit">
          <form onSubmit={submitBan} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              IP address
              <input
                value={banForm.data.ip}
                onChange={(e) => banForm.setData('ip', e.target.value)}
                placeholder="203.0.113.42"
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {banForm.errors.ip && <span className="text-[var(--mc-ember-500)]">{banForm.errors.ip}</span>}
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Reason
              <textarea
                value={banForm.data.reason}
                onChange={(e) => banForm.setData('reason', e.target.value)}
                rows={2}
                placeholder="Why is this IP being banned?"
                className="text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)] resize-none"
              />
              {banForm.errors.reason && <span className="text-[var(--mc-ember-500)]">{banForm.errors.reason}</span>}
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Duration (seconds, blank = permanent)
              <input
                value={banForm.data.duration}
                onChange={(e) => banForm.setData('duration', e.target.value)}
                placeholder="e.g. 86400 for 1 day"
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
            </label>
            <button
              type="submit"
              disabled={banForm.processing}
              className="btn-pop mt-1 flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            >
              <Ban size={13} strokeWidth={2} />
              Ban IP
            </button>
          </form>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <Card title={`${mutes.length} IP mute${mutes.length === 1 ? '' : 's'}`} icon={VolumeX}>
          {mutes.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">No active IP mutes.</div>
          )}
          {mutes.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 px-4 py-3 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <Badge variant={m.active ? 'ember' : 'neutral'}>{m.active ? 'active' : 'lifted'}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-data font-medium">{m.target}</div>
                <div className="mt-0.5 text-[12.5px] text-[var(--mc-text-secondary)] break-words">{m.reason ?? 'No reason given'}</div>
                <div className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
                  Muted by {m.mutedBy} · {formatDate(m.muteTime)}
                  {m.permanent ? ' · Permanent' : ` · Until ${formatDate(m.expireTime)}`}
                </div>
              </div>
              {m.active && (
                <button
                  onClick={() => unmute(m.target)}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors shrink-0"
                >
                  <X size={12} strokeWidth={2} />
                  Unmute
                </button>
              )}
            </div>
          ))}
        </Card>

        <Card title="Mute an IP" icon={Plus} accent="purple" padded className="h-fit">
          <form onSubmit={submitMute} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              IP address
              <input
                value={muteForm.data.ip}
                onChange={(e) => muteForm.setData('ip', e.target.value)}
                placeholder="203.0.113.42"
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {muteForm.errors.ip && <span className="text-[var(--mc-ember-500)]">{muteForm.errors.ip}</span>}
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Reason
              <textarea
                value={muteForm.data.reason}
                onChange={(e) => muteForm.setData('reason', e.target.value)}
                rows={2}
                placeholder="Why is this IP being muted?"
                className="text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)] resize-none"
              />
              {muteForm.errors.reason && <span className="text-[var(--mc-ember-500)]">{muteForm.errors.reason}</span>}
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Duration (seconds, blank = permanent)
              <input
                value={muteForm.data.duration}
                onChange={(e) => muteForm.setData('duration', e.target.value)}
                placeholder="e.g. 3600 for 1 hour"
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
            </label>
            <button
              type="submit"
              disabled={muteForm.processing}
              className="btn-pop mt-1 flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
              <VolumeX size={13} strokeWidth={2} />
              Mute IP
            </button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
