import { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type {
  BackupSnapshot,
  BackupStatus,
  CloudConfig,
  CloudFile,
  CloudStatus,
} from '@/types/minecraft';
import type { PageProps } from '@/types';
import { Database, Plus, Cloud, CloudUpload, Trash2, Download, RotateCcw, HardDrive } from 'lucide-react';

interface Props {
  status: BackupStatus;
  snapshots: BackupSnapshot[];
  cloudStatus: CloudStatus;
  cloudConfig: CloudConfig;
  dropboxFiles: CloudFile[];
  googleFiles: CloudFile[];
}

export default function Backups({ status, snapshots, cloudStatus, cloudConfig, dropboxFiles, googleFiles }: Props) {
  const { props } = usePage<PageProps>();
  const isAdmin = props.auth.user.role === 'admin';
  const [targets, setTargets] = useState<string[]>((status.availableTargets ?? []).map((t) => t.key));

  const createForm = useForm({ name: '' });
  const dropboxForm = useForm({ accessToken: '', uploadPath: '/NeoEssentials-Backups' });
  const googleForm = useForm({ refreshToken: '', clientId: '', clientSecret: '', folderId: '' });

  const toggleTarget = (key: string) => {
    setTargets((t) => (t.includes(key) ? t.filter((k) => k !== key) : [...t, key]));
  };

  const createBackup = (e: React.FormEvent) => {
    e.preventDefault();
    router.post(route('dashboard.backups.store'), { name: createForm.data.name, targets }, {
      onSuccess: () => createForm.reset(),
    });
  };

  const restoreBackup = (name: string) => {
    if (!confirm(`Restore snapshot '${name}'? A pre-restore backup will be made automatically.`)) return;
    router.post(route('dashboard.backups.restore'), { name });
  };

  const deleteBackup = (name: string) => {
    if (!confirm(`Delete snapshot '${name}'?`)) return;
    router.delete(route('dashboard.backups.destroy', name));
  };

  const saveDropbox = (e: React.FormEvent) => {
    e.preventDefault();
    dropboxForm.post(route('dashboard.backups.cloud.dropbox.config'), { onSuccess: () => dropboxForm.reset() });
  };

  const saveGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    googleForm.post(route('dashboard.backups.cloud.google.config'), { onSuccess: () => googleForm.reset() });
  };

  const testDropbox = () => router.post(route('dashboard.backups.cloud.dropbox.test'), {}, { preserveScroll: true });
  const testGoogle = () => router.post(route('dashboard.backups.cloud.google.test'), {}, { preserveScroll: true });

  const uploadDropbox = (name: string) =>
    router.post(route('dashboard.backups.cloud.dropbox.upload', name), {}, { preserveScroll: true });
  const uploadGoogle = (name: string) =>
    router.post(route('dashboard.backups.cloud.google.upload', name), {}, { preserveScroll: true });

  const deleteDropboxFile = (path: string) => {
    if (!confirm(`Delete '${path}' from Dropbox?`)) return;
    router.delete(route('dashboard.backups.cloud.dropbox.file.delete'), { data: { path }, preserveScroll: true });
  };

  const deleteGoogleFile = (id: string) => {
    if (!confirm('Delete this file from Google Drive?')) return;
    router.delete(route('dashboard.backups.cloud.google.file.delete', id), { preserveScroll: true });
  };

  return (
    <DashboardLayout>
      <Head title="Backups" />

      <PageHeading
        title="Backups"
        icon={Database}
        subtitle={`${status.count}/${status.maxSnapshots} snapshots · ${status.totalSizeMb} MB · last backup: ${status.lastBackup ? new Date(status.lastBackup).toLocaleString() : 'never'}`}
      />

      <div className="grid grid-cols-[1fr_320px] gap-5 mb-5">
        <Card title={`${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'}`} icon={HardDrive} accent="cyan">
          {snapshots.length === 0 && (
            <div className="text-center py-8 text-[13px] text-[var(--mc-text-muted)]">No snapshots yet.</div>
          )}
          {snapshots.map((s) => (
            <div key={s.filename} className="px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]">
              <div className="flex items-center gap-3">
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="font-data text-[12px] text-[var(--mc-text-muted)]">
                  {s.sizeMb ?? (s.sizeBytes / 1_048_576).toFixed(2)} MB ·{' '}
                  {s.created === 'unknown' ? 'unknown' : new Date(s.created).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <a
                  href={route('dashboard.backups.download', s.name)}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] transition-colors hover:bg-[var(--mc-bg-surface)]"
                >
                  <Download size={12} strokeWidth={2} />
                  Download
                </a>
                {isAdmin && (
                  <>
                    {cloudStatus.providers.dropbox.configured && (
                      <button
                        onClick={() => uploadDropbox(s.name)}
                        className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] transition-colors hover:bg-[var(--mc-bg-surface)]"
                      >
                        <CloudUpload size={12} strokeWidth={2} />
                        Dropbox
                      </button>
                    )}
                    {cloudStatus.providers.googleDrive.configured && (
                      <button
                        onClick={() => uploadGoogle(s.name)}
                        className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] transition-colors hover:bg-[var(--mc-bg-surface)]"
                      >
                        <CloudUpload size={12} strokeWidth={2} />
                        Drive
                      </button>
                    )}
                    <button
                      onClick={() => restoreBackup(s.name)}
                      className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-moss-500)] text-white transition-colors hover:bg-[var(--mc-moss-600,var(--mc-moss-500))]"
                    >
                      <RotateCcw size={12} strokeWidth={2} />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteBackup(s.name)}
                      className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white transition-colors hover:bg-[var(--mc-ember-600,var(--mc-ember-500))]"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </Card>

        {isAdmin && (
          <Card title="Create backup" icon={Plus} accent="purple" padded className="h-fit">
            <form onSubmit={createBackup} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                Name (optional)
                <input
                  value={createForm.data.name}
                  onChange={(e) => createForm.setData('name', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-[var(--mc-text-secondary)]">Targets</span>
                {(status.availableTargets ?? []).map((t) => (
                  <label key={t.key} className="flex items-center gap-2 text-[12px]">
                    <input type="checkbox" checked={targets.includes(t.key)} onChange={() => toggleTarget(t.key)} className="accent-[var(--mc-cyan-500)]" />
                    {t.key} {!t.exists && <span className="text-[var(--mc-text-muted)]">(missing)</span>}
                  </label>
                ))}
              </div>
              <button
                type="submit"
                disabled={targets.length === 0}
                className="btn-pop text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
              >
                Create
              </button>
            </form>
          </Card>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-5">
          <Card title="Dropbox" icon={Cloud} accent="cyan" padded>
            <div className="flex flex-col gap-3">
              <Badge variant={cloudConfig.dropbox.configured ? 'moss' : 'neutral'} className="w-fit">
                {cloudConfig.dropbox.configured ? `Configured (${cloudConfig.dropbox.tokenMasked})` : 'Not configured'}
              </Badge>
              <form onSubmit={saveDropbox} className="flex flex-col gap-2">
                <input
                  type="password"
                  placeholder="Access token"
                  value={dropboxForm.data.accessToken}
                  onChange={(e) => dropboxForm.setData('accessToken', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <input
                  placeholder="Upload path"
                  value={dropboxForm.data.uploadPath}
                  onChange={(e) => dropboxForm.setData('uploadPath', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-pop text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)]">
                    Save
                  </button>
                  <button type="button" onClick={testDropbox} className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] transition-colors hover:bg-[var(--mc-bg-surface)]">
                    Test
                  </button>
                </div>
              </form>
              {dropboxFiles.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {dropboxFiles.map((f) => (
                    <div key={f.path ?? f.name} className="flex items-center text-[12px] font-data rounded-[6px] px-2 py-1 transition-colors hover:bg-[var(--mc-bg-surface-raised)]">
                      <span className="flex-1 truncate">{f.name}</span>
                      <button onClick={() => deleteDropboxFile(f.path ?? f.name)} className="text-[var(--mc-ember-500)] transition-colors hover:text-[var(--mc-ember-400)]">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="Google Drive" icon={Cloud} accent="purple" padded>
            <div className="flex flex-col gap-3">
              <Badge variant={cloudConfig.googleDrive.configured ? 'moss' : 'neutral'} className="w-fit">
                {cloudConfig.googleDrive.configured ? `Configured (folder ${cloudConfig.googleDrive.folderId})` : 'Not configured'}
              </Badge>
              <form onSubmit={saveGoogle} className="flex flex-col gap-2">
                <input
                  placeholder="Client ID"
                  value={googleForm.data.clientId}
                  onChange={(e) => googleForm.setData('clientId', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <input
                  type="password"
                  placeholder="Client secret"
                  value={googleForm.data.clientSecret}
                  onChange={(e) => googleForm.setData('clientSecret', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <input
                  type="password"
                  placeholder="Refresh token"
                  value={googleForm.data.refreshToken}
                  onChange={(e) => googleForm.setData('refreshToken', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <input
                  placeholder="Folder ID"
                  value={googleForm.data.folderId}
                  onChange={(e) => googleForm.setData('folderId', e.target.value)}
                  className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-pop text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium transition-colors hover:bg-[var(--mc-cyan-400)]">
                    Save
                  </button>
                  <button type="button" onClick={testGoogle} className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] transition-colors hover:bg-[var(--mc-bg-surface)]">
                    Test
                  </button>
                </div>
              </form>
              {googleFiles.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {googleFiles.map((f) => (
                    <div key={f.id ?? f.name} className="flex items-center text-[12px] font-data rounded-[6px] px-2 py-1 transition-colors hover:bg-[var(--mc-bg-surface-raised)]">
                      <span className="flex-1 truncate">{f.name}</span>
                      <button onClick={() => deleteGoogleFile(f.id ?? '')} className="text-[var(--mc-ember-500)] transition-colors hover:text-[var(--mc-ember-400)]">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
