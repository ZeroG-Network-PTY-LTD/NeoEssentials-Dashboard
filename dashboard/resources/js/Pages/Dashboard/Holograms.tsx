import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { Hologram, HologramStats } from '@/types/minecraft';
import { Sparkles, PlusCircle, Eye, EyeOff, Pencil, Trash2, X } from 'lucide-react';

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
      <PageHeading
        title="Holograms"
        icon={Sparkles}
        subtitle={`${stats.total} total · ${stats.visible} visible · ${stats.animated} animated · ${stats.shopHolograms} shop`}
      />

      <div className="grid grid-cols-[1fr_340px] gap-5">
        <Card title={`${holograms.length} hologram${holograms.length === 1 ? '' : 's'}`} icon={Sparkles}>
          {holograms.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">No holograms yet.</div>
          )}
          {holograms.map((h) => (
            <div
              key={h.id}
              className="flex items-center px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <span className="flex-1 font-medium">{h.id}</span>
              <span className="font-data text-[12px] text-[var(--mc-text-muted)] mr-3">
                {(h.world ?? '').replace('minecraft:', '')} · {Math.round(h.x)}, {Math.round(h.y)}, {Math.round(h.z)}
              </span>
              <Badge variant={h.visible ? 'moss' : 'neutral'} dot={h.visible} className="mr-3">
                {h.visible ? 'visible' : 'hidden'}
              </Badge>
              <button
                onClick={() => toggleVisible(h.id)}
                className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] mr-2 transition-colors hover:bg-[var(--mc-bg-surface)]"
              >
                {h.visible ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}
                Toggle
              </button>
              <button
                onClick={() => startEdit(h)}
                className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] mr-2 transition-colors hover:bg-[var(--mc-bg-surface)]"
              >
                <Pencil size={12} strokeWidth={2} />
                Edit
              </button>
              <button
                onClick={() => destroy(h.id)}
                className="btn-pop flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
              >
                <Trash2 size={12} strokeWidth={2} />
                Delete
              </button>
            </div>
          ))}
        </Card>

        <Card
          title={editingId ? `Edit '${editingId}'` : 'Create hologram'}
          icon={editingId ? Pencil : PlusCircle}
          accent="purple"
          padded
          className="h-fit"
        >
          <form onSubmit={submit} className="flex flex-col gap-3">
            {!editingId && (
              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                ID
                <input
                  value={data.id}
                  onChange={(e) => setData('id', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                {errors.id && <span className="text-[var(--mc-ember-500)]">{errors.id}</span>}
              </label>
            )}

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

            <label className="flex items-center gap-2 text-[12px] text-[var(--mc-text-secondary)]">
              <input
                type="checkbox"
                checked={data.visible}
                onChange={(e) => setData('visible', e.target.checked)}
                className="accent-[var(--mc-cyan-500)]"
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
                    className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                  />
                  {data.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="px-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] text-[12px] transition-colors hover:bg-[var(--mc-bg-surface)]"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
              {errors.lines && <span className="text-[12px] text-[var(--mc-ember-500)]">{errors.lines}</span>}
              <button
                type="button"
                onClick={addLine}
                className="self-start flex items-center gap-1 text-[12px] text-[var(--mc-cyan-500)] transition-colors hover:text-[var(--mc-cyan-400)]"
              >
                <PlusCircle size={12} strokeWidth={2} />
                Add line
              </button>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={processing}
                className="btn-pop flex-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50"
              >
                {editingId ? 'Save' : 'Create'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] transition-colors hover:bg-[var(--mc-bg-surface)]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
