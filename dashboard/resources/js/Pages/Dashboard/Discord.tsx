import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { DiscordAuthConfig, DiscordEvent, DiscordStatus } from '@/types/minecraft';
import type { PageProps } from '@/types';

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
    oauth2: {
      clientId: authConfig?.oauth2?.clientId ?? '',
      clientSecret: '',
      redirectUri: authConfig?.oauth2?.redirectUri ?? '',
    },
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
      <h1 className="font-display text-[20px] font-semibold mb-5">Discord</h1>

      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="flex flex-col gap-5">
          <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4">
            <div className="font-display text-[14px] font-semibold mb-2">Status</div>
            <div className="flex items-center gap-4 text-[13px]">
              <span className={status.anyActive ? 'text-[var(--mc-moss-500)]' : 'text-[var(--mc-ember-500)]'}>
                {status.anyActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-[var(--mc-text-muted)]">{status.adapterCount} adapter(s)</span>
              <span className="text-[var(--mc-text-muted)]">{status.eventCount} events logged</span>
            </div>
            <div className="flex flex-col gap-1 mt-3">
              {(status.adapters ?? []).map((a) => (
                <div key={a.name} className="flex items-center gap-2 text-[12px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${a.enabled ? 'bg-[var(--mc-moss-500)]' : 'bg-[var(--mc-text-muted)]'}`}
                  />
                  {a.name}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--mc-border)] flex items-center justify-between">
              <span className="font-display text-[14px] font-semibold">Recent events</span>
              {isAdmin && (
                <button
                  onClick={clearEvents}
                  className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white"
                >
                  Clear
                </button>
              )}
            </div>
            {events.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No events yet.</div>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className="px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] flex items-center gap-3"
              >
                <span className="font-data text-[12px] text-[var(--mc-text-muted)] w-32 shrink-0">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
                <span className="font-medium">{e.type}</span>
                {e.actor && <span className="text-[var(--mc-text-muted)]">by {e.actor}</span>}
                {e.message && <span className="text-[var(--mc-text-muted)] truncate">{e.message}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {isAdmin && (
            <form
              onSubmit={sendTest}
              className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 flex flex-col gap-3"
            >
              <div className="font-display text-[14px] font-semibold mb-1">Send test message</div>
              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Channel (optional)
                <input
                  value={testForm.data.channel}
                  onChange={(e) => testForm.setData('channel', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Message
                <input
                  value={testForm.data.message}
                  onChange={(e) => testForm.setData('message', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
              </label>
              <button
                type="submit"
                disabled={testForm.processing}
                className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}

          {isAdmin && authConfig && (
            <form
              onSubmit={saveConfig}
              className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 flex flex-col gap-3"
            >
              <div className="font-display text-[14px] font-semibold mb-1">Account-linking config</div>

              {(['enabled', 'requireLinkedAccount', 'allowAutoRegistration'] as const).map((field) => (
                <label key={field} className="flex items-center gap-2 text-[12px] text-[var(--mc-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={configForm.data[field]}
                    onChange={(e) => configForm.setData(field, e.target.checked)}
                  />
                  {field}
                </label>
              ))}

              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Default role
                <select
                  value={configForm.data.defaultRole}
                  onChange={(e) => configForm.setData('defaultRole', e.target.value as never)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                OAuth2 client ID
                <input
                  value={configForm.data.oauth2.clientId ?? ''}
                  onChange={(e) => configForm.setData('oauth2', { ...configForm.data.oauth2, clientId: e.target.value })}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
              </label>

              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                OAuth2 client secret
                <input
                  type="password"
                  placeholder={authConfig.oauth2?.clientSecretSet ? '(unchanged)' : ''}
                  value={configForm.data.oauth2.clientSecret}
                  onChange={(e) => configForm.setData('oauth2', { ...configForm.data.oauth2, clientSecret: e.target.value })}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
              </label>

              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Redirect URI
                <input
                  value={configForm.data.oauth2.redirectUri ?? ''}
                  onChange={(e) => configForm.setData('oauth2', { ...configForm.data.oauth2, redirectUri: e.target.value })}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
              </label>

              <button
                type="submit"
                disabled={configForm.processing}
                className="mt-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium disabled:opacity-50"
              >
                Save
              </button>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}