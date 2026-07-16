import { Head, useForm, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { Warp } from '@/types/minecraft';

interface Props {
  warps: Warp[];
}

export default function Warps({ warps }: Props) {
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

  return (
    <DashboardLayout>
      <Head title="Warps" />
      <h1 className="font-display text-[20px] font-semibold mb-5">Warps</h1>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
            {warps.length} warp{warps.length === 1 ? '' : 's'}
          </div>
          {warps.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No warps yet.</div>
          )}
          {warps.map((warp) => (
            <div
              key={warp.name}
              className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px]"
            >
              <span className="flex-1 font-medium">{warp.name}</span>
              <span className="font-data text-[12px] text-[var(--mc-text-muted)] mr-3">
                {warp.dimension.replace('minecraft:', '')} · {Math.round(warp.x)}, {Math.round(warp.y)}, {Math.round(warp.z)}
              </span>
              <span className="text-[12px] text-[var(--mc-text-muted)] mr-3">by {warp.createdBy}</span>
              <button
                onClick={() => destroy(warp.name)}
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
          <div className="font-display text-[14px] font-semibold mb-1">Create warp</div>

          <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
            Name
            <input
              value={data.name}
              onChange={(e) => setData('name', e.target.value)}
              className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
            />
            {errors.name && <span className="text-[var(--mc-ember-500)]">{errors.name}</span>}
          </label>

          <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
            World
            <input
              value={data.world}
              onChange={(e) => setData('world', e.target.value)}
              className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
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
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
                {errors[axis] && <span className="text-[var(--mc-ember-500)]">{errors[axis]}</span>}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={processing}
            className="mt-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}