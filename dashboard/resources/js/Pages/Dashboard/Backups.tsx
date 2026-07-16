import { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import type {
  BackupSnapshot,
  BackupStatus,
  CloudConfig,
  CloudFile,
  CloudStatus,
} from '@/types/minecraft';
import type { PageProps } from '@/types';

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
      <h1 className="font-display text-[20px] font-semibold mb-1">Backups</h1>
      <p className="text-[13px] text-[var(--mc-text-muted)] mb-5">
        {status.count}/{status.maxSnapshots} snapshots · {status.totalSizeMb} MB · last backup:{' '}
        {status.lastBackup ? new Date(status.lastBackup).toLocaleString() : 'never'}
      </p>

      <div className="grid grid-cols-[1fr_320px] gap-5 mb-5">
        <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--mc-border)] font-display text-[14px] font-semibold">
            {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'}
          </div>
          {snapshots.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-[var(--mc-text-muted)]">No snapshots yet.</div>
          )}
          {snapshots.map((s) => (
            <div key={s.filename} className="px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px]">
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
                  className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]"
                >
                  Download
                </a>
                {isAdmin && (
                  <>
                    {cloudStatus.providers.dropbox.configured && (
                      <button
                        onClick={() => uploadDropbox(s.name)}
                        className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]"
                      >
                        &uarr; Dropbox
                      </button>
                    )}
                    {cloudStatus.providers.googleDrive.configured && (
                      <button
                        onClick={() => uploadGoogle(s.name)}
                        className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]"
                      >
                        &uarr; Drive
                      </button>
                    )}
                    <button
                      onClick={() => restoreBackup(s.name)}
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-moss-500)] text-white"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => deleteBackup(s.name)}
                      className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {isAdmin && (
          <form
            onSubmit={createBackup}
            className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 h-fit flex flex-col gap-3"
          >
            <div className="font-display text-[14px] font-semibold mb-1">Create backup</div>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Name (optional)
              <input
                value={createForm.data.name}
                onChange={(e) => createForm.setData('name', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-[var(--mc-text-secondary)]">Targets</span>
              {(status.availableTargets ?? []).map((t) => (
                <label key={t.key} className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={targets.includes(t.key)} onChange={() => toggleTarget(t.key)} />
                  {t.key} {!t.exists && <span className="text-[var(--mc-text-muted)]">(missing)</span>}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={targets.length === 0}
              className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium disabled:opacity-50"
            >
              Create
            </button>
          </form>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 flex flex-col gap-3">
            <div className="font-display text-[14px] font-semibold">Dropbox</div>
            <p className="text-[12px] text-[var(--mc-text-muted)]">
              {cloudConfig.dropbox.configured ? `Configured (${cloudConfig.dropbox.tokenMasked})` : 'Not configured'}
            </p>
            <form onSubmit={saveDropbox} className="flex flex-col gap-2">
              <input
                type="password"
                placeholder="Access token"
                value={dropboxForm.data.accessToken}
                onChange={(e) => dropboxForm.setData('accessToken', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              <input
                placeholder="Upload path"
                value={dropboxForm.data.uploadPath}
                onChange={(e) => dropboxForm.setData('uploadPath', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              <div className="flex gap-2">
                <button type="submit" className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium">
                  Save
                </button>
                <button type="button" onClick={testDropbox} className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]">
                  Test
                </button>
              </div>
            </form>
            {dropboxFiles.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {dropboxFiles.map((f) => (
                  <div key={f.path ?? f.name} className="flex items-center text-[12px] font-data">
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => deleteDropboxFile(f.path ?? f.name)} className="text-[var(--mc-ember-500)]">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 flex flex-col gap-3">
            <div className="font-display text-[14px] font-semibold">Google Drive</div>
            <p className="text-[12px] text-[var(--mc-text-muted)]">
              {cloudConfig.googleDrive.configured ? `Configured (folder ${cloudConfig.googleDrive.folderId})` : 'Not configured'}
            </p>
            <form onSubmit={saveGoogle} className="flex flex-col gap-2">
              <input
                placeholder="Client ID"
                value={googleForm.data.clientId}
                onChange={(e) => googleForm.setData('clientId', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              <input
                type="password"
                placeholder="Client secret"
                value={googleForm.data.clientSecret}
                onChange={(e) => googleForm.setData('clientSecret', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              <input
                type="password"
                placeholder="Refresh token"
                value={googleForm.data.refreshToken}
                onChange={(e) => googleForm.setData('refreshToken', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              <input
                placeholder="Folder ID"
                value={googleForm.data.folderId}
                onChange={(e) => googleForm.setData('folderId', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)]"
              />
              <div className="flex gap-2">
                <button type="submit" className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium">
                  Save
                </button>
                <button type="button" onClick={testGoogle} className="text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)]">
                  Test
                </button>
              </div>
            </form>
            {googleFiles.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {googleFiles.map((f) => (
                  <div key={f.id ?? f.name} className="flex items-center text-[12px] font-data">
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => deleteGoogleFile(f.id ?? '')} className="text-[var(--mc-ember-500)]">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}