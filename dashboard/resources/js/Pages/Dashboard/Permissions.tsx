import { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type {
  PermissionGroup,
  PermissionOverview,
  PermissionUser,
  PermissionUserLookupResult,
  PermissionNodeCategory,
} from '@/types/minecraft';
import type { PageProps } from '@/types';

interface Props {
  overview: PermissionOverview;
  groups: PermissionGroup[];
  users: PermissionUser[];
  aliases: Record<string, string>;
  nodeCatalog: PermissionNodeCategory[];
  lookupQuery: string | null;
  lookupResult: PermissionUserLookupResult | null;
}

/** Datalist-backed free-text input — lets you type any node, but suggests known ones as you type. */
function NodeInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <>
      <input
        list="permission-node-catalog"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2 py-1 text-[var(--mc-text-primary)]"
      />
    </>
  );
}

export default function Permissions({ overview, groups, users, aliases, nodeCatalog, lookupQuery, lookupResult }: Props) {
  const { props } = usePage<PageProps>();
  const isAdmin = props.auth.user.role === 'admin';
  const [newPerm, setNewPerm] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [editingInherits, setEditingInherits] = useState<Record<string, boolean>>({});
  const [lookupInput, setLookupInput] = useState(lookupQuery ?? '');

  const groupForm = useForm({ name: '', prefix: '', suffix: '', isDefault: false as boolean, priority: 0, inherits: [] as string[] });
  const aliasForm = useForm({ alias: '', canonical: '' });

  const createGroup = (e: React.FormEvent) => {
    e.preventDefault();
    groupForm.post(route('dashboard.permissions.groups.store'), { onSuccess: () => groupForm.reset() });
  };

  const deleteGroup = (name: string) => {
    if (!confirm(`Delete group '${name}'?`)) return;
    router.delete(route('dashboard.permissions.groups.destroy', name));
  };

  const startRename = (name: string) => setRenaming((s) => ({ ...s, [name]: name }));
  const cancelRename = (name: string) => setRenaming((s) => { const next = { ...s }; delete next[name]; return next; });
  const submitRename = (name: string) => {
    const newName = (renaming[name] ?? '').trim();
    if (!newName || newName === name) { cancelRename(name); return; }
    router.post(route('dashboard.permissions.groups.rename', name), { newName }, {
      preserveScroll: true,
      onSuccess: () => cancelRename(name),
    });
  };

  const setGroupField = (name: string, field: 'prefix' | 'suffix' | 'priority' | 'isDefault', value: string | number | boolean) => {
    router.put(route('dashboard.permissions.groups.update', name), { [field]: value }, { preserveScroll: true });
  };

  const toggleInherit = (group: PermissionGroup, parent: string) => {
    const current = new Set(group.inherits);
    if (current.has(parent)) current.delete(parent); else current.add(parent);
    router.put(route('dashboard.permissions.groups.update', group.name), { inherits: Array.from(current) }, { preserveScroll: true });
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

  const runLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupInput.trim();
    if (!q) return;
    router.get(route('dashboard.permissions.index'), { lookup: q }, {
      preserveState: true,
      preserveScroll: true,
      only: ['lookupQuery', 'lookupResult'],
    });
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

      <datalist id="permission-node-catalog">
        {nodeCatalog.flatMap((cat) =>
          cat.permissions.map((p) => (
            <option key={p.node} value={p.node}>
              {p.description}
            </option>
          )),
        )}
      </datalist>

      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-[20px] font-semibold">Permissions</h1>
        {isAdmin && !overview.usingExternal && (
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
                    {renaming[g.name] !== undefined ? (
                      <>
                        <input
                          value={renaming[g.name]}
                          onChange={(e) => setRenaming((s) => ({ ...s, [g.name]: e.target.value }))}
                          className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-1.5 py-0.5"
                          autoFocus
                        />
                        <button onClick={() => submitRename(g.name)} className="text-[11px] px-2 py-0.5 rounded bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium">
                          Save
                        </button>
                        <button onClick={() => cancelRename(g.name)} className="text-[11px] px-2 py-0.5 rounded bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{g.name}</span>
                        {isAdmin && (
                          <button onClick={() => startRename(g.name)} className="text-[11px] text-[var(--mc-text-muted)] underline">
                            rename
                          </button>
                        )}
                      </>
                    )}
                    {g.isDefault && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--mc-cyan-50)] text-[var(--mc-cyan-500)]">
                        default
                      </span>
                    )}
                    {!isAdmin && (g.prefix || g.suffix) && (
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

                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-3 mb-1.5 text-[12px] text-[var(--mc-text-secondary)]">
                      <label className="flex items-center gap-1.5">
                        Prefix
                        <input
                          defaultValue={g.prefix}
                          onBlur={(e) => {
                            if (e.target.value !== g.prefix) setGroupField(g.name, 'prefix', e.target.value);
                          }}
                          className="w-20 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-1.5 py-0.5"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        Suffix
                        <input
                          defaultValue={g.suffix}
                          onBlur={(e) => {
                            if (e.target.value !== g.suffix) setGroupField(g.name, 'suffix', e.target.value);
                          }}
                          className="w-20 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-1.5 py-0.5"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        Priority
                        <input
                          type="number"
                          defaultValue={g.priority}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isNaN(v) && v !== g.priority) setGroupField(g.name, 'priority', v);
                          }}
                          className="w-16 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-1.5 py-0.5"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          defaultChecked={g.isDefault}
                          onChange={(e) => {
                            if (e.target.checked) setGroupField(g.name, 'isDefault', true);
                            else e.target.checked = true; // "default" can only move to another group, not be unset directly
                          }}
                        />
                        Default group
                      </label>
                      <button
                        onClick={() => setEditingInherits((s) => ({ ...s, [g.name]: !s[g.name] }))}
                        className="underline"
                      >
                        inherits ({g.inherits.length})
                      </button>
                    </div>
                  )}

                  {editingInherits[g.name] && (
                    <div className="flex flex-wrap gap-2 mb-1.5 p-2 rounded bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border)]">
                      {groups.filter((other) => other.name !== g.name).map((other) => (
                        <label key={other.name} className="flex items-center gap-1 text-[12px]">
                          <input
                            type="checkbox"
                            checked={g.inherits.includes(other.name)}
                            onChange={() => toggleInherit(g, other.name)}
                          />
                          {other.name}
                        </label>
                      ))}
                      {groups.length <= 1 && <span className="text-[12px] text-[var(--mc-text-muted)]">No other groups to inherit from.</span>}
                    </div>
                  )}

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
                      <NodeInput
                        value={newPerm[`group:${g.name}`] ?? ''}
                        onChange={(v) => setNewPerm((s) => ({ ...s, [`group:${g.name}`]: v }))}
                        placeholder="neoessentials.node"
                      />
                      <button
                        onClick={() => addGroupPermission(g.name)}
                        className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium"
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
                <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  Priority
                  <input
                    type="number"
                    value={groupForm.data.priority}
                    onChange={(e) => groupForm.setData('priority', parseInt(e.target.value, 10) || 0)}
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
                  className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium disabled:opacity-50"
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
                  <img
                    src={`https://mc-heads.net/avatar/${u.uuid}/32`}
                    alt=""
                    className="h-5 w-5 rounded-[4px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)]"
                  />
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
                    <NodeInput
                      value={newPerm[`user:${u.username}`] ?? ''}
                      onChange={(v) => setNewPerm((s) => ({ ...s, [`user:${u.username}`]: v }))}
                      placeholder="neoessentials.node"
                    />
                    <button
                      onClick={() => addUserPermission(u.username)}
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
                Manage another player
              </div>
              <div className="px-4 py-3 border-b border-[var(--mc-border)]">
                <form onSubmit={runLookup} className="flex gap-1.5">
                  <input
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    placeholder="Username (online or offline)"
                    className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                  />
                  <button
                    type="submit"
                    className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium"
                  >
                    Look up
                  </button>
                </form>
              </div>

              {lookupQuery && (
                <div className="px-4 py-3 text-[13px]">
                  {!lookupResult?.success ? (
                    <div className="text-[var(--mc-ember-500)]">
                      {lookupResult?.message ?? `Could not find a player named '${lookupQuery}'.`}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1.5">
                        {lookupResult.uuid && (
                          <img
                            src={`https://mc-heads.net/avatar/${lookupResult.uuid}/32`}
                            alt=""
                            className="h-5 w-5 rounded-[4px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)]"
                          />
                        )}
                        <span className="font-medium">{lookupResult.username}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${lookupResult.online ? 'bg-[var(--mc-moss-50)] text-[var(--mc-moss-500)]' : 'bg-[var(--mc-bg-surface-raised)] text-[var(--mc-text-muted)]'}`}>
                          {lookupResult.online ? 'online' : 'offline'}
                        </span>
                        <select
                          value={lookupResult.group}
                          onChange={(e) => setUserGroup(lookupResult.username!, e.target.value)}
                          className="font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-1.5 py-0.5"
                        >
                          {groups.map((g) => (
                            <option key={g.name} value={g.name}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {(lookupResult.permissions ?? []).map((p) => (
                          <span
                            key={p}
                            className="font-data text-[11px] px-1.5 py-0.5 rounded bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border)] flex items-center gap-1"
                          >
                            {p}
                            <button onClick={() => removeUserPermission(lookupResult.username!, p)} className="text-[var(--mc-ember-500)]">
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <NodeInput
                          value={newPerm[`user:${lookupResult.username}`] ?? ''}
                          onChange={(v) => setNewPerm((s) => ({ ...s, [`user:${lookupResult.username}`]: v }))}
                          placeholder="neoessentials.node"
                        />
                        <button
                          onClick={() => addUserPermission(lookupResult.username!)}
                          className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium"
                        >
                          Add
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

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
                  <NodeInput
                    value={aliasForm.data.canonical}
                    onChange={(v) => aliasForm.setData('canonical', v)}
                    placeholder=""
                  />
                </label>
                <button
                  type="submit"
                  disabled={aliasForm.processing}
                  className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium disabled:opacity-50"
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
