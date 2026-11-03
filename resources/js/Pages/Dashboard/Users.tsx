import { Head, useForm, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { ModUser, ModUserSession, ModUserRole } from '@/types/minecraft';
import { UserCog, UserPlus, KeyRound, Power, Trash2, Radio } from 'lucide-react';

interface Props {
  users: ModUser[];
  sessions: ModUserSession[];
}

const ROLES: ModUserRole[] = ['ADMIN', 'OPERATOR', 'MODERATOR', 'VIEWER'];

const ROLE_BADGE: Record<ModUserRole, 'purple' | 'cyan' | 'moss' | 'neutral'> = {
  ADMIN: 'purple',
  OPERATOR: 'moss',
  MODERATOR: 'cyan',
  VIEWER: 'neutral',
};

export default function Users({ users, sessions }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm({
    username: '',
    password: '',
    email: '',
    role: 'VIEWER' as ModUserRole,
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
      <PageHeading
        title="Mod dashboard accounts"
        icon={UserCog}
        subtitle="Logins for the mod's own embedded dashboard (including the service account this app authenticates as) — separate from your account on this Laravel app."
      />

      <div className="grid grid-cols-[1fr_320px] gap-5 mb-5">
        <Card title={`${users.length} account${users.length === 1 ? '' : 's'}`} icon={UserCog}>
          {users.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
              No accounts found.
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] gap-2 transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <Badge variant={u.enabled ? 'moss' : 'neutral'} dot={u.enabled}>
                {u.enabled ? 'enabled' : 'disabled'}
              </Badge>
              <div className="flex-1 ml-1">
                <div className="font-medium">{u.username}</div>
                <div className="text-[11px] text-[var(--mc-text-muted)]">
                  {typeof u.lastLoginAt === 'number' && u.lastLoginAt > 0
                    ? `Last login ${new Date(u.lastLoginAt).toLocaleString()}`
                    : 'Never logged in'}
                </div>
              </div>
              <Badge variant={ROLE_BADGE[u.role]}>{u.role}</Badge>
              <select
                value={u.role}
                onChange={(e) => setRole(u.id, e.target.value as ModUserRole)}
                className="text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1 transition-colors focus:border-[var(--mc-cyan-400)] outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => resetPassword(u.id, u.username)}
                className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
              >
                <KeyRound size={12} strokeWidth={2} />
                Reset password
              </button>
              <button
                onClick={() => toggleEnabled(u.id, u.enabled)}
                className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
              >
                <Power size={12} strokeWidth={2} />
                {u.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => destroy(u.id, u.username)}
                className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
              >
                <Trash2 size={12} strokeWidth={2} />
                Delete
              </button>
            </div>
          ))}
        </Card>

        <Card title="Create account" icon={UserPlus} accent="purple" padded className="h-fit">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Username
              <input
                value={data.username}
                onChange={(e) => setData('username', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {errors.username && <span className="text-[var(--mc-ember-500)]">{errors.username}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Password
              <input
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {errors.password && <span className="text-[var(--mc-ember-500)]">{errors.password}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Email (optional)
              <input
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Role
              <select
                value={data.role}
                onChange={(e) => setData('role', e.target.value as ModUserRole)}
                className="text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={processing}
              className="btn-pop mt-1 flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
              <UserPlus size={13} strokeWidth={2} />
              Create
            </button>
          </form>
        </Card>
      </div>

      <Card title="Active sessions" icon={Radio} accent="moss">
        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
            No active sessions.
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.sessionId}
            className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
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
              className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
            >
              <Trash2 size={12} strokeWidth={2} />
              Revoke
            </button>
          </div>
        ))}
      </Card>
    </DashboardLayout>
  );
}
