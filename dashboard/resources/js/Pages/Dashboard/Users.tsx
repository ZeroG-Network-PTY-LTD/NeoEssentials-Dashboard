import { Head, useForm, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { ModUser, ModUserSession, ModUserRole } from '@/types/minecraft';

interface Props {
  users: ModUser[];
  sessions: ModUserSession[];
}

const ROLES: ModUserRole[] = ['ADMIN', 'MODERATOR', 'VIEWER'];

export default function Users({ users, sessions }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm({
    username: '',
    password: '',
    email: '',
    role: 'MODERATOR' as ModUserRole,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('dashboard.users.store'), { onSuccess: () => reset() });
  };

  const setRole = (id: string, role: ModUserRole) => {
    router.post(route('dashboard.users.role', id), { role });
  };

  const resetPassword = (id: string, username: string) => {
    if (!confirm(`Generate a new temporary password for '${username}'?`)) return;
    router.post(route('dashboard.users.password', id));
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    router.post(route(enabled ? 'dashboard.users.disable' : 'dashboard.users.enable', id));
  };

  const destroy = (id: string, username: string) => {
    if (!confirm(`Delete mod dashboard account '${username}'? This cannot be undone.`)) return;
    router.delete(route('dashboard.users.destroy', id));
  };

  const revokeSession = (sessionId: string) => {
    router.delete(route('dashboard.users.sessions.revoke', sessionId));
  };

  return (
    <DashboardLayout>
      <Head title="Users" />
      <h1 className="font-display text-[20px] font-semibold mb-1">Mod dashboard accounts</h1>
      <p className="text-[12px] text-[var(--mc-text-muted)] mb-5">
        These are logins for the <em>mod's own</em> embedded dashboard (including the
        service account this app authenticates as) — separate from your account on
        this Laravel app.
      </p>

      <div className="grid grid-cols-[1fr_320px] gap-5 mb-5">
        <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
            {users.length} account{users.length === 1 ? '' : 's'}
          </div>
          {users.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--mc-text-muted)]">
              No accounts found.
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] gap-2"
            >
              <span
                className={`w-2 h-2 rounded-full ${u.enabled ? 'bg-[var(--mc-moss-500)]' : 'bg-[var(--mc-text-muted)]'}`}
                title={u.enabled ? 'Enabled' : 'Disabled'}
              />
              <div className="flex-1">
                <div className="font-medium">{u.username}</div>
                <div className="text-[11px] text-[var(--mc-text-muted)]">
                  {typeof u.lastLoginAt === 'number' && u.lastLoginAt > 0
                    ? `Last login ${new Date(u.lastLoginAt).toLocaleString()}`
                    : 'Never logged in'}
                </div>
              </div>
              <select
                value={u.role}
                onChange={(e) => setRole(u.id, e.target.value as ModUserRole)}
                className="text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => resetPassword(u.id, u.username)}
                className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)]"
              >
                Reset password
              </button>
              <button
                onClick={() => toggleEnabled(u.id, u.enabled)}
                className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)]"
              >
                {u.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => destroy(u.id, u.username)}
                className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={submit}
          className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 h-fit flex flex-col gap-3"
        >
          <div className="font-display text-[14px] font-semibold mb-1">Create account</div>

          <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
            Username
            <input
              value={data.username}
              onChange={(e) => setData('username', e.target.value)}
              className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
            />
            {errors.username && <span className="text-[var(--mc-ember-500)]">{errors.username}</span>}
          </label>

          <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
            Password
            <input
              type="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
            />
            {errors.password && <span className="text-[var(--mc-ember-500)]">{errors.password}</span>}
          </label>

          <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
            Email (optional)
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
            Role
            <select
              value={data.role}
              onChange={(e) => setData('role', e.target.value as ModUserRole)}
              className="text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={processing}
            className="mt-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
          Active sessions
        </div>
        {sessions.length === 0 && (
          <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No active sessions.</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.sessionId}
            className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px]"
          >
            <div className="flex-1">
              <div>{s.username} <span className="text-[var(--mc-text-muted)]">({s.role})</span></div>
              <div className="text-[11px] text-[var(--mc-text-muted)]">
                last active {new Date(s.lastAccessAt).toLocaleString()}
              </div>
            </div>
            <span className="font-data text-[12px] text-[var(--mc-text-muted)] mr-3">{s.ipAddress}</span>
            <button
              onClick={() => revokeSession(s.sessionId)}
              className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white"
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
