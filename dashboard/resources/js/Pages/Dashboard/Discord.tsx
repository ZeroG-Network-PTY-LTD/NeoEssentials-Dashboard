import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { DiscordAuthConfig, DiscordEvent, DiscordStatus } from '@/types/minecraft';
import type { PageProps } from '@/types';
import { MessageCircle, Radio, ScrollText, Send, Settings2, Trash2, PlugZap } from 'lucide-react';

interface Props {
  status: DiscordStatus;
  events: DiscordEvent[];
  authConfig: DiscordAuthConfig | null;
}

export default function Discord({ status, events, authConfig }: Props) {
  const { props } = usePage<PageProps>();
  const isAdmin = props.auth.user.role === 'admin';

  const testForm = useForm({ channel: '', message: '' });
  const configForm = useForm({
    enabled: authConfig?.enabled ?? false,
    requireLinkedAccount: authConfig?.requireLinkedAccount ?? false,
    allowAutoRegistration: authConfig?.allowAutoRegistration ?? false,
    defaultRole: authConfig?.defaultRole ?? 'VIEWER',
  });

  const sendTest = (e: React.FormEvent) => {
    e.preventDefault();
    testForm.post(route('dashboard.discord.test'), { preserveScroll: true });
  };

  const saveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    configForm.post(route('dashboard.discord.auth-config.update'), { preserveScroll: true });
  };

  const clearEvents = () => {
    if (!confirm('Clear the Discord event log?')) return;
    router.delete(route('dashboard.discord.events.clear'));
  };

  return (
    <DashboardLayout>
      <Head title="Discord" />

      <PageHeading
        title="Discord"
        icon={MessageCircle}
        subtitle="Bridge status, account-linking config, and recent bridge activity."
        action={
          <Badge variant={status.anyActive ? 'moss' : 'ember'} dot>
            {status.anyActive ? 'Active' : 'Inactive'}
          </Badge>
        }
      />

      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="flex flex-col gap-5">
          <Card title="Bridge status" icon={PlugZap} accent="cyan" padded>
            <div className="flex items-center gap-4 text-[13px] mb-3">
              <span className="text-[var(--mc-text-muted)]">
                <span className="font-data text-[var(--mc-text-primary)]">{status.adapterCount}</span> adapter(s)
              </span>
              <span className="text-[var(--mc-text-muted)]">
                <span className="font-data text-[var(--mc-text-primary)]">{status.eventCount}</span> events logged
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {(status.adapters ?? []).map((a) => (
                <div
                  key={a.name}
                  className="flex items-center gap-2.5 text-[12.5px] rounded-[8px] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] px-3 py-2"
                >
                  <span className="relative h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: a.ready ? 'var(--mc-moss-500)' : a.enabled ? 'var(--mc-cyan-500)' : 'var(--mc-text-muted)' }}
                  >
                    {a.ready && (
                      <span className="pulse-dot absolute inset-0 rounded-full text-[var(--mc-moss-500)]" />
                    )}
                  </span>
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-auto text-[var(--mc-text-muted)]">
                    {a.ready ? 'connected' : a.enabled ? 'installed, not connected' : 'not installed'}
                  </span>
                </div>
              ))}
              {(status.adapters ?? []).length === 0 && (
                <div className="text-[12.5px] text-[var(--mc-text-muted)] px-1 py-2">
                  No Discord companion mod adapters detected.
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Recent events"
            icon={ScrollText}
            accent="purple"
            action={
              isAdmin && (
                <button
                  onClick={clearEvents}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
                >
                  <Trash2 size={12} strokeWidth={2} />
                  Clear
                </button>
              )
            }
          >
            {events.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
                No events yet.
              </div>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className="px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] flex items-center gap-3 transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
              >
                <span className="font-data text-[11.5px] text-[var(--mc-text-muted)] w-32 shrink-0">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
                <Badge variant="purple">{e.type}</Badge>
                {e.actor && <span className="text-[var(--mc-text-muted)]">by {e.actor}</span>}
                {e.message && <span className="text-[var(--mc-text-muted)] truncate">{e.message}</span>}
              </div>
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {isAdmin && (
            <Card title="Send test message" icon={Send} accent="cyan" padded>
              <form onSubmit={sendTest} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Channel ID
                  <input
                    value={testForm.data.channel}
                    onChange={(e) => testForm.setData('channel', e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    pattern="\d{15,25}"
                    title="The channel's numeric Discord ID, not its name"
                    required
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                  />
                  {testForm.errors.channel && (
                    <span className="text-[var(--mc-ember-500)]">{testForm.errors.channel}</span>
                  )}
                  <span className="text-[var(--mc-text-muted)]">
                    Right-click the channel in Discord (Developer Mode on) → Copy Channel ID.
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Message
                  <input
                    value={testForm.data.message}
                    onChange={(e) => testForm.setData('message', e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={testForm.processing}
                  className="btn-pop flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                >
                  <Send size={13} strokeWidth={2} />
                  Send
                </button>
              </form>
            </Card>
          )}

          {isAdmin && authConfig && (
            <Card title="Account-linking config" icon={Settings2} accent="purple" padded>
              <form onSubmit={saveConfig} className="flex flex-col gap-3">
                <p className="text-[12px] text-[var(--mc-text-muted)] -mt-1 mb-1">
                  Players link their Discord account in-game via Simple Discord Link, Mc2Discord, or
                  DCIntegration's own commands. NeoEssentials never contacts Discord directly — it only
                  reads the link once one of those mods reports it.
                  {!authConfig?.linkAdapterAvailable && (
                    <span className="mt-2 flex items-center gap-1.5 text-[var(--mc-ember-500)]">
                      <Radio size={12} strokeWidth={2} className="shrink-0" />
                      No Discord companion mod is currently installed/connected.
                    </span>
                  )}
                </p>

                <div className="flex flex-col gap-1.5 rounded-[8px] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-2.5">
                  {(['enabled', 'requireLinkedAccount', 'allowAutoRegistration'] as const).map((field) => (
                    <label key={field} className="flex items-center gap-2 text-[12px] text-[var(--mc-text-secondary)] py-0.5">
                      <input
                        type="checkbox"
                        checked={configForm.data[field]}
                        onChange={(e) => configForm.setData(field, e.target.checked)}
                        className="accent-[var(--mc-cyan-500)]"
                      />
                      {field}
                    </label>
                  ))}
                </div>

                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Default role
                  <select
                    value={configForm.data.defaultRole}
                    onChange={(e) => configForm.setData('defaultRole', e.target.value as never)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={configForm.processing}
                  className="btn-pop mt-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                >
                  Save
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
