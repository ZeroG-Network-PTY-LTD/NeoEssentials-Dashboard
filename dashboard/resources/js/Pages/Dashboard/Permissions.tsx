import { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { PermissionGroup, PermissionOverview, PermissionUser } from '@/types/minecraft';
import type { PageProps } from '@/types';

interface Props {
  overview: PermissionOverview;
  groups: PermissionGroup[];
  users: PermissionUser[];
  aliases: Record<string, string>;
}

export default function Permissions({ overview, groups, users, aliases }: Props) {
  const { props } = usePage<PageProps>();
  const isAdmin = props.auth.user.role === 'admin';
  const [newPerm, setNewPerm] = useState<Record<string, string>>({});

  const groupForm = useForm({ name: '', prefix: '', suffix: '', isDefault: false as boolean });
  const aliasForm = useForm({ alias: '', canonical: '' });

  const createGroup = (e: React.FormEvent) => {
    e.preventDefault();
    groupForm.post(route('dashboard.permissions.groups.store'), { onSuccess: () => groupForm.reset() });
  };

  const deleteGroup = (name: string) => {
    if (!confirm(`Delete group '${name}'?`)) return;
    router.delete(route('dashboard.permissions.groups.destroy', name));
  };

  const addGroupPermission = (group: string) => {
    const permission = newPerm[`group:${group}`];
    if (!permission) return;
    router.post(route('dashboard.permissions.groups.permissions.add', group), { permission }, {
      preserveScroll: true,
      onSuccess: () => setNewPerm((s) => ({ ...s, [`group:${group}`]: '' })),
    });
  };

  const removeGroupPermission = (group: string, permission: string) => {
    router.delete(route('dashboard.permissions.groups.permissions.remove', [group, permission]), { preserveScroll: true });
  };

  const addUserPermission = (username: string) => {
    const permission = newPerm[`user:${username}`];
    if (!permission) return;
    router.post(route('dashboard.permissions.users.permissions.add', username), { permission }, {
      preserveScroll: true,
      onSuccess: () => setNewPerm((s) => ({ ...s, [`user:${username}`]: '' })),
    });
  };

  const removeUserPermission = (username: string, permission: string) => {
    router.delete(route('dashboard.permissions.users.permissions.remove', [username, permission]), { preserveScroll: true });
  };

  const setUserGroup = (username: string, group: string) => {
    router.post(route('dashboard.permissions.users.group', username), { group }, { preserveScroll: true });
  };

  const createAlias = (e: React.FormEvent) => {
    e.preventDefault();
    aliasForm.post(route('dashboard.permissions.aliases.store'), { onSuccess: () => aliasForm.reset() });
  };

  const deleteAlias = (alias: string) => {
    router.delete(route('dashboard.permissions.aliases.destroy', alias), { preserveScroll: true });
  };

  const reload = () => router.post(route('dashboard.permissions.reload'), {}, { preserveScroll: true });

  return (
    <DashboardLayout>
      <Head title="Permissions" />
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-[20px] font-semibold">Permissions</h1>
        {isAdmin && (
          <button
            onClick={reload}
            className="text-[12px] px-2.5 py-1.5 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]"
          >
            Reload
          </button>
        )}
      </div>
      <p className="text-[13px] text-[var(--mc-text-muted)] mb-5">
        {overview.systemType} · {overview.totalGroups} groups · {overview.totalUsers} online users
        {overview.usingExternal && ' · management disabled while an external permission plugin is active'}
      </p>

      {!overview.usingExternal && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-[1fr_320px] gap-5">
            <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
                Groups
              </div>
              {groups.map((g) => (
                <div key={g.name} className="px-4 py-3 border-b border-[var(--mc-border)] last:border-0 text-[13px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-medium">{g.name}</span>
                    {g.isDefault && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--mc-copper-50)] text-[var(--mc-copper-500)]">
                        default
                      </span>
                    )}
                    {(g.prefix || g.suffix) && (
                      <span className="text-[12px] text-[var(--mc-text-muted)]">
                        {g.prefix}{g.suffix}
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteGroup(g.name)}
                        className="ml-auto text-[12px] px-2 py-0.5 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {(g.permissions ?? []).map((p) => (
                      <span
                        key={p}
                        className="font-data text-[11px] px-1.5 py-0.5 rounded bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border)] flex items-center gap-1"
                      >
                        {p}
                        {isAdmin && (
                          <button onClick={() => removeGroupPermission(g.name, p)} className="text-[var(--mc-ember-500)]">
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <input
                        value={newPerm[`group:${g.name}`] ?? ''}
                        onChange={(e) => setNewPerm((s) => ({ ...s, [`group:${g.name}`]: e.target.value }))}
                        placeholder="neoessentials.node"
                        className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2 py-1 text-[var(--mc-text-primary)]"
                      />
                      <button
                        onClick={() => addGroupPermission(g.name)}
                        className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <form
                onSubmit={createGroup}
                className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 h-fit flex flex-col gap-3"
              >
                <div className="font-display text-[14px] font-semibold mb-1">Create group</div>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Name
                  <input
                    value={groupForm.data.name}
                    onChange={(e) => groupForm.setData('name', e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Prefix
                  <input
                    value={groupForm.data.prefix}
                    onChange={(e) => groupForm.setData('prefix', e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Suffix
                  <input
                    value={groupForm.data.suffix}
                    onChange={(e) => groupForm.setData('suffix', e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                  />
                </label>
                <label className="flex items-center gap-2 text-[12px] text-[var(--mc-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={groupForm.data.isDefault}
                    onChange={(e) => groupForm.setData('isDefault', e.target.checked)}
                  />
                  Make default group
                </label>
                <button
                  type="submit"
                  disabled={groupForm.processing}
                  className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium disabled:opacity-50"
                >
                  Create
                </button>
              </form>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
              Online users
            </div>
            {users.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No players online.</div>
            )}
            {users.map((u) => (
              <div key={u.username} className="px-4 py-3 border-b border-[var(--mc-border)] last:border-0 text-[13px]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium">{u.username}</span>
                  {isAdmin ? (
                    <select
                      value={u.group}
                      onChange={(e) => setUserGroup(u.username, e.target.value)}
                      className="font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-1.5 py-0.5"
                    >
                      {groups.map((g) => (
                        <option key={g.name} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[12px] text-[var(--mc-text-muted)]">{u.group}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(u.permissions ?? []).map((p) => (
                    <span
                      key={p}
                      className="font-data text-[11px] px-1.5 py-0.5 rounded bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border)] flex items-center gap-1"
                    >
                      {p}
                      {isAdmin && (
                        <button onClick={() => removeUserPermission(u.username, p)} className="text-[var(--mc-ember-500)]">
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    <input
                      value={newPerm[`user:${u.username}`] ?? ''}
                      onChange={(e) => setNewPerm((s) => ({ ...s, [`user:${u.username}`]: e.target.value }))}
                      placeholder="neoessentials.node"
                      className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2 py-1 text-[var(--mc-text-primary)]"
                    />
                    <button
                      onClick={() => addUserPermission(u.username)}
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-5">
            <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
                Permission aliases
              </div>
              {Object.entries(aliases).length === 0 && (
                <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No aliases configured.</div>
              )}
              {Object.entries(aliases).map(([alias, canonical]) => (
                <div key={alias} className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] font-data">
                  <span className="flex-1">{alias} &rarr; {canonical}</span>
                  {isAdmin && (
                    <button
                      onClick={() => deleteAlias(alias)}
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <form
                onSubmit={createAlias}
                className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 h-fit flex flex-col gap-3"
              >
                <div className="font-display text-[14px] font-semibold mb-1">Add alias</div>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Alias
                  <input
                    value={aliasForm.data.alias}
                    onChange={(e) => aliasForm.setData('alias', e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Canonical node
                  <input
                    value={aliasForm.data.canonical}
                    onChange={(e) => aliasForm.setData('canonical', e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={aliasForm.processing}
                  className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-copper-500)] text-[#1a1410] font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}