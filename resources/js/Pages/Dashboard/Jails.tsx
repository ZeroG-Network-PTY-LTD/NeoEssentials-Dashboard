import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { JailLocation, JailShape, ServerWorld } from '@/types/minecraft';
import { Lock, Plus, X } from 'lucide-react';

interface Props {
  jails: JailLocation[];
  worlds: ServerWorld[];
}

function formatDate(ms: number) {
  return ms ? new Date(ms).toLocaleString() : '—';
}

export default function Jails({ jails, worlds }: Props) {
  const [shape, setShape] = useState<JailShape>('SPHERE');

  const remove = (name: string) => {
    router.delete(route('dashboard.jails.destroy', name));
  };

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    dimension: 'minecraft:overworld',
    shape: 'SPHERE' as JailShape,
    x: '',
    y: '',
    z: '',
    radius: '',
    x2: '',
    y2: '',
    z2: '',
  });

  const changeShape = (s: JailShape) => {
    setShape(s);
    setData('shape', s);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('dashboard.jails.store'), { onSuccess: () => reset() });
  };

  const inputClass =
    'font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]';

  return (
    <DashboardLayout>
      <Head title="Jails" />
      <PageHeading
        title="Jails"
        icon={Lock}
        subtitle="Jail cells, defined by coordinates. Create one here, or in-game with /setjail and the jail wand — both write to the same store."
      />

      <div className="grid grid-cols-[1fr_360px] gap-5">
        <Card title={`${jails.length} jail${jails.length === 1 ? '' : 's'}`} icon={Lock}>
          {jails.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">No jails set up yet.</div>
          )}
          {jails.map((j) => (
            <div
              key={j.name}
              className="flex items-start gap-3 px-4 py-3 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
            >
              <Badge variant={j.shape === 'CUBOID' ? 'purple' : 'cyan'}>{j.shape.toLowerCase()}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{j.name}</div>
                <div className="mt-0.5 text-[12.5px] text-[var(--mc-text-secondary)] font-data">
                  {j.dimension} · {j.position.x}, {j.position.y}, {j.position.z}
                  {j.shape === 'SPHERE' && j.radius !== undefined && ` (r=${j.radius})`}
                  {j.shape === 'CUBOID' && j.corner1 && j.corner2 && ` to ${j.corner2.x}, ${j.corner2.y}, ${j.corner2.z}`}
                </div>
                <div className="mt-1 text-[11px] text-[var(--mc-text-muted)]">
                  Created by {j.createdBy} · {formatDate(j.createdTime)}
                </div>
              </div>
              <button
                onClick={() => remove(j.name)}
                className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors shrink-0"
              >
                <X size={12} strokeWidth={2} />
                Remove
              </button>
            </div>
          ))}
        </Card>

        <Card title="Create a jail" icon={Plus} accent="purple" padded className="h-fit">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Name
              <input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="mainjail" className={inputClass} />
              {errors.name && <span className="text-[var(--mc-ember-500)]">{errors.name}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Dimension
              {worlds.length > 0 ? (
                <select value={data.dimension} onChange={(e) => setData('dimension', e.target.value)} className={inputClass}>
                  {worlds.map((w) => (
                    <option key={w.dimension} value={w.dimension}>
                      {w.name} ({w.dimension})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={data.dimension}
                  onChange={(e) => setData('dimension', e.target.value)}
                  placeholder="minecraft:overworld"
                  className={inputClass}
                />
              )}
            </label>

            <div className="flex gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] p-0.5 w-fit">
              {(['SPHERE', 'CUBOID'] as JailShape[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeShape(s)}
                  className={`text-[12px] px-2.5 py-1 rounded-[6px] transition-colors ${
                    shape === s
                      ? 'bg-[var(--mc-cyan-500)] text-[#0a1620]'
                      : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)]'
                  }`}
                >
                  {s === 'SPHERE' ? 'Sphere' : 'Cuboid'}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              {shape === 'SPHERE' ? 'Center (X, Y, Z)' : 'Corner 1 (X, Y, Z)'}
              <div className="flex gap-1.5">
                <input value={data.x} onChange={(e) => setData('x', e.target.value)} placeholder="X" className={inputClass + ' w-full'} />
                <input value={data.y} onChange={(e) => setData('y', e.target.value)} placeholder="Y" className={inputClass + ' w-full'} />
                <input value={data.z} onChange={(e) => setData('z', e.target.value)} placeholder="Z" className={inputClass + ' w-full'} />
              </div>
              {(errors.x || errors.y || errors.z) && <span className="text-[var(--mc-ember-500)]">{errors.x || errors.y || errors.z}</span>}
            </label>

            {shape === 'SPHERE' ? (
              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Radius (blank = server default)
                <input value={data.radius} onChange={(e) => setData('radius', e.target.value)} placeholder="10" className={inputClass} />
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Corner 2 (X, Y, Z)
                <div className="flex gap-1.5">
                  <input value={data.x2} onChange={(e) => setData('x2', e.target.value)} placeholder="X" className={inputClass + ' w-full'} />
                  <input value={data.y2} onChange={(e) => setData('y2', e.target.value)} placeholder="Y" className={inputClass + ' w-full'} />
                  <input value={data.z2} onChange={(e) => setData('z2', e.target.value)} placeholder="Z" className={inputClass + ' w-full'} />
                </div>
                {(errors.x2 || errors.y2 || errors.z2) && (
                  <span className="text-[var(--mc-ember-500)]">{errors.x2 || errors.y2 || errors.z2}</span>
                )}
              </label>
            )}

            <button
              type="submit"
              disabled={processing}
              className="btn-pop mt-1 flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
              <Lock size={13} strokeWidth={2} />
              Create jail
            </button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
