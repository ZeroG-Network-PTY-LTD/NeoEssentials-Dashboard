import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import type { Warp, PlayerWarpGroup } from '@/types/minecraft';
import { MapPin, PlusCircle, Trash2, ChevronDown, ChevronRight, Users } from 'lucide-react';

interface Props {
  warps: Warp[];
  playerWarps: PlayerWarpGroup[];
}

export default function Warps({ warps, playerWarps }: Props) {
  const [tab, setTab] = useState<'server' | 'player'>('server');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    world: 'minecraft:overworld',
    x: '',
    y: '',
    z: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('dashboard.warps.store'), { onSuccess: () => reset() });
  };

  const destroy = (name: string) => {
    if (!confirm(`Delete warp '${name}'?`)) return;
    router.delete(route('dashboard.warps.destroy', name));
  };

  const destroyPlayerWarp = (uuid: string, name: string, ownerName: string) => {
    if (!confirm(`Delete ${ownerName}'s warp '${name}'?`)) return;
    router.delete(route('dashboard.warps.players.destroy', [uuid, name]));
  };

  const toggleExpanded = (uuid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const tabButtonClass = (active: boolean) =>
    `btn-pop flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[var(--radius)] border transition-colors ${
      active
        ? 'bg-[var(--mc-cyan-500)] text-[#0a1620] border-[var(--mc-cyan-500)] font-medium'
        : 'bg-transparent text-[var(--mc-text-secondary)] border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)]'
    }`;

  return (
    <DashboardLayout>
      <Head title="Warps" />
      <PageHeading
        title="Warps"
        icon={MapPin}
        count={tab === 'server' ? warps.length : playerWarps.length}
        subtitle="Named teleport points on the server."
      />

      <div className="flex gap-2 mb-4">
        <button className={tabButtonClass(tab === 'server')} onClick={() => setTab('server')}>
          <MapPin size={12} strokeWidth={2} />
          Server Warps
        </button>
        <button className={tabButtonClass(tab === 'player')} onClick={() => setTab('player')}>
          <Users size={12} strokeWidth={2} />
          Player Warps
        </button>
      </div>

      {tab === 'player' && (
        <Card title={`${playerWarps.length} player${playerWarps.length === 1 ? '' : 's'} with warps`} icon={Users}>
          {playerWarps.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">No players have created warps yet.</div>
          )}
          {playerWarps.map((group) => {
            const isOpen = expanded.has(group.uuid);
            return (
              <div key={group.uuid} className="border-b border-[var(--mc-border)] last:border-0">
                <button
                  onClick={() => toggleExpanded(group.uuid)}
                  className="w-full flex items-center px-4 py-2.5 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
                >
                  {isOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                  <span className="flex-1 text-left font-medium ml-2">{group.name}</span>
                  <span className="text-[12px] text-[var(--mc-text-muted)]">
                    {group.warpCount} warp{group.warpCount === 1 ? '' : 's'}
                  </span>
                </button>

                {isOpen && (
                  <div className="pb-1">
                    {group.warps.map((warp) => (
                      <div
                        key={warp.name}
                        className="flex items-center pl-10 pr-4 py-2 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
                      >
                        <span className="flex-1 font-medium">{warp.name}</span>
                        <span className="font-data text-[12px] text-[var(--mc-text-muted)] mr-3">
                          {warp.world.replace('minecraft:', '')} · {Math.round(warp.x)}, {Math.round(warp.y)}, {Math.round(warp.z)}
                        </span>
                        <span className="text-[12px] text-[var(--mc-text-muted)] mr-3">
                          {new Date(warp.timestamp).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => destroyPlayerWarp(group.uuid, warp.name, group.name)}
                          className="btn-pop flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {tab === 'server' && (
      <div className="grid grid-cols-[1fr_320px] gap-5">
        <Card title={`${warps.length} warp${warps.length === 1 ? '' : 's'}`} icon={MapPin}>
          {warps.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">No warps yet.</div>
          )}
          {warps.map((warp) => (
            <div
              key={warp.name}
              className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <span className="flex-1 font-medium">{warp.name}</span>
              <span className="font-data text-[12px] text-[var(--mc-text-muted)] mr-3">
                {warp.dimension.replace('minecraft:', '')} · {Math.round(warp.x)}, {Math.round(warp.y)}, {Math.round(warp.z)}
              </span>
              <span className="text-[12px] text-[var(--mc-text-muted)] mr-3">by {warp.createdBy}</span>
              <button
                onClick={() => destroy(warp.name)}
                className="btn-pop flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
              >
                <Trash2 size={12} strokeWidth={2} />
                Delete
              </button>
            </div>
          ))}
        </Card>

        <Card title="Create warp" icon={PlusCircle} accent="purple" padded className="h-fit">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Name
              <input
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {errors.name && <span className="text-[var(--mc-ember-500)]">{errors.name}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              World
              <input
                value={data.world}
                onChange={(e) => setData('world', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {errors.world && <span className="text-[var(--mc-ember-500)]">{errors.world}</span>}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <label key={axis} className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                  {axis.toUpperCase()}
                  <input
                    type="number"
                    value={data[axis]}
                    onChange={(e) => setData(axis, e.target.value)}
                    className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                  />
                  {errors[axis] && <span className="text-[var(--mc-ember-500)]">{errors[axis]}</span>}
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={processing}
              className="btn-pop mt-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </Card>
      </div>
      )}
    </DashboardLayout>
  );
}
