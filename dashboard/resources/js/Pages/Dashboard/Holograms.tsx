import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type { Hologram, HologramStats } from '@/types/minecraft';

interface Props {
  holograms: Hologram[];
  stats: HologramStats;
}

const emptyForm = {
  id: '',
  world: 'minecraft:overworld',
  x: '',
  y: '',
  z: '',
  visible: true as boolean,
  lines: ['Line 1'],
};

export default function Holograms({ holograms, stats }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data, setData, post, put, processing, errors, reset } = useForm(emptyForm);

  const startCreate = () => {
    setEditingId(null);
    reset();
  };

  const startEdit = (h: Hologram) => {
    setEditingId(h.id);
    setData({
      id: h.id,
      world: h.world,
      x: String(h.x),
      y: String(h.y),
      z: String(h.z),
      visible: h.visible,
      lines: h.lines && h.lines.length > 0 ? h.lines.map((l) => l.text) : ['Line 1'],
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      put(route('dashboard.holograms.update', editingId), { onSuccess: () => startCreate() });
    } else {
      post(route('dashboard.holograms.store'), { onSuccess: () => startCreate() });
    }
  };

  const destroy = (id: string) => {
    if (!confirm(`Delete hologram '${id}'?`)) return;
    router.delete(route('dashboard.holograms.destroy', id));
    if (editingId === id) startCreate();
  };

  const toggleVisible = (id: string) => {
    router.post(route('dashboard.holograms.visible', id), {}, { preserveScroll: true });
  };

  const setLine = (i: number, text: string) => {
    const lines = [...data.lines];
    lines[i] = text;
    setData('lines', lines);
  };

  const addLine = () => setData('lines', [...data.lines, '']);
  const removeLine = (i: number) => setData('lines', data.lines.filter((_, idx) => idx !== i));

  return (
    <DashboardLayout>
      <Head title="Holograms" />
      <h1 className="font-display text-[20px] font-semibold mb-1">Holograms</h1>
      <p className="text-[13px] text-[var(--mc-text-muted)] mb-5">
        {stats.total} total · {stats.visible} visible · {stats.animated} animated · {stats.shopHolograms} shop
      </p>

      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
            {holograms.length} hologram{holograms.length === 1 ? '' : 's'}
          </div>
          {holograms.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No holograms yet.</div>
          )}
          {holograms.map((h) => (
            <div
              key={h.id}
              className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px]"
            >
              <span className="flex-1 font-medium">{h.id}</span>
              <span className="font-data text-[12px] text-[var(--mc-text-muted)] mr-3">
                {(h.world ?? '').replace('minecraft:', '')} · {Math.round(h.x)}, {Math.round(h.y)}, {Math.round(h.z)}
              </span>
              <span
                className={`text-[12px] mr-3 ${h.visible ? 'text-[var(--mc-moss-500)]' : 'text-[var(--mc-text-muted)]'}`}
              >
                {h.visible ? 'visible' : 'hidden'}
              </span>
              <button
                onClick={() => toggleVisible(h.id)}
                className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] mr-2"
              >
                Toggle
              </button>
              <button
                onClick={() => startEdit(h)}
                className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] mr-2"
              >
                Edit
              </button>
              <button
                onClick={() => destroy(h.id)}
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
          <div className="font-display text-[14px] font-semibold mb-1">
            {editingId ? `Edit '${editingId}'` : 'Create hologram'}
          </div>

          {!editingId && (
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              ID
              <input
                value={data.id}
                onChange={(e) => setData('id', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              {errors.id && <span className="text-[var(--mc-ember-500)]">{errors.id}</span>}
            </label>
          )}

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

          <label className="flex items-center gap-2 text-[12px] text-[var(--mc-text-secondary)]">
            <input
              type="checkbox"
              checked={data.visible}
              onChange={(e) => setData('visible', e.target.checked)}
            />
            Visible
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] text-[var(--mc-text-secondary)]">Lines</span>
            {data.lines.map((line, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={line}
                  onChange={(e) => setLine(i, e.target.value)}
                  className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
                />
                {data.lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="px-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] text-[12px]"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            {errors.lines && <span className="text-[12px] text-[var(--mc-ember-500)]">{errors.lines}</span>}
            <button
              type="button"
              onClick={addLine}
              className="self-start text-[12px] text-[var(--mc-cyan-500)]"
            >
              + Add line
            </button>
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={processing}
              className="flex-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium disabled:opacity-50"
            >
              {editingId ? 'Save' : 'Create'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={startCreate}
                className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}