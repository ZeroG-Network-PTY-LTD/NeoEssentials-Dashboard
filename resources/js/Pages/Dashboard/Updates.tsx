import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type { PageProps } from '@/types';
import {
  RefreshCw,
  GitBranch,
  GitMerge,
  UploadCloud,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  ChevronDown,
  History,
} from 'lucide-react';

interface CurrentVersion {
  commit: string | null;
  shortCommit: string | null;
  label: string | null;
  source: string;
  appliedAt: string | null;
  branch: string | null;
}

interface GithubCheck {
  reachable: boolean;
  checkedAt?: string;
  error?: string;
  latestSha?: string;
  latestShortSha?: string;
  latestMessage?: string;
  latestDate?: string;
  compareUrl?: string;
  updateAvailable?: boolean;
}

interface ReleaseCheck {
  available: boolean;
  reachable: boolean;
  checkedAt?: string;
  error?: string;
  assetName?: string;
  downloadUrl?: string;
  tagName?: string;
  publishedAt?: string;
  releaseUrl?: string;
  updateAvailable?: boolean;
}

interface ReleaseVersion {
  tagName: string;
  name: string;
  publishedAt: string | null;
  assetName: string;
  downloadUrl: string;
  isCurrent: boolean;
}

interface Props {
  current: CurrentVersion;
  github: GithubCheck;
  release: ReleaseCheck;
  releases: ReleaseVersion[];
  repo: string;
  branch: string;
  maxUploadKb: number;
}

export default function Updates({ current, github, release, releases, repo, branch, maxUploadKb }: Props) {
  const { props } = usePage<PageProps>();
  const [applying, setApplying] = useState(false);
  const [applyingRelease, setApplyingRelease] = useState(false);
  const [showGitFallback, setShowGitFallback] = useState(!release.available);
  const [selectedTag, setSelectedTag] = useState(releases[0]?.tagName ?? '');
  const [applyingVersion, setApplyingVersion] = useState(false);
  const uploadForm = useForm<{ package: File | null }>({ package: null });

  const checkNow = () => router.post(route('dashboard.updates.check'), {}, { preserveScroll: true });

  const applyReleaseUpdate = () => {
    if (!confirm(`This will download ${release.assetName} from ${release.tagName} and apply it over the running app. Continue?`)) return;
    setApplyingRelease(true);
    router.post(route('dashboard.updates.apply-release'), {}, {
      preserveScroll: true,
      onFinish: () => setApplyingRelease(false),
    });
  };

  const applyGitUpdate = () => {
    if (!confirm(`This will fetch and fast-forward-merge origin/${branch}, then run composer install, npm run build, and migrate. Continue?`)) return;
    setApplying(true);
    router.post(route('dashboard.updates.apply'), {}, {
      preserveScroll: true,
      onFinish: () => setApplying(false),
    });
  };

  const applyVersion = () => {
    const target = releases.find((r) => r.tagName === selectedTag);
    if (!target) return;
    const downgrading = releases[0]?.tagName !== selectedTag;
    if (!confirm(
      `This will download ${target.assetName} (${target.name}) and apply it over the running app${downgrading ? ' — this is OLDER than what\'s currently installed, i.e. a downgrade' : ''}. Continue?`,
    )) return;
    setApplyingVersion(true);
    router.post(route('dashboard.updates.apply-release-version'), { tag: selectedTag }, {
      preserveScroll: true,
      onFinish: () => setApplyingVersion(false),
    });
  };

  const submitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.data.package) return;
    const kind = /_installer\.zip$/i.test(uploadForm.data.package.name) ? 'install' : 'update';
    if (!confirm(`This will extract the uploaded package and overlay it onto the running app (${kind}), then rebuild. Continue?`)) return;
    uploadForm.post(route('dashboard.updates.upload'), {
      preserveScroll: true,
      forceFormData: true,
    });
  };

  const maxUploadMb = Math.round(maxUploadKb / 1024);
  const updateAvailable = release.available ? release.updateAvailable : github.updateAvailable;
  // Whichever check actually drove the badge above — release.checkedAt when the
  // release path is what's being trusted, github.checkedAt otherwise. Cached for up
  // to config('selfupdate.check_cache_ttl') (5 min by default), so this can lag a
  // freshly-published release for a few minutes until "Check now" or the cache
  // naturally expires — surfacing it here is what makes that lag legible instead of
  // looking like a wrong/contradictory badge.
  const checkedAt = release.available ? release.checkedAt : (github.checkedAt ?? release.checkedAt);

  return (
    <DashboardLayout>
      <Head title="Updates" />
      <PageHeading
        title="Updates"
        icon={RefreshCw}
        subtitle={`Tracking ${repo} @ ${branch}`}
        action={
          (release.reachable || github.reachable) && (
            <div className="flex flex-col items-end gap-1">
              <Badge variant={updateAvailable ? 'cyan' : 'moss'} dot={updateAvailable}>
                {updateAvailable ? 'Update available' : 'Up to date'}
              </Badge>
              {checkedAt && (
                <span className="text-[11px] text-[var(--mc-text-muted)]">
                  Checked {new Date(checkedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )
        }
      />

      {props.flash?.updateLog && (
        <div className="mb-5">
          <Card
            title="Last run output"
            icon={props.flash?.error ? AlertTriangle : CheckCircle2}
            accent={props.flash?.error ? 'ember' : 'moss'}
            padded
          >
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-data text-[11.5px] leading-relaxed text-[var(--mc-text-secondary)]">
              {props.flash.updateLog}
            </pre>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card title="Current version" icon={GitBranch} accent="cyan" padded>
          <dl className="flex flex-col gap-2 text-[13px]">
            {current.source === 'git' ? (
              <div className="flex justify-between">
                <dt className="text-[var(--mc-text-secondary)]">Commit</dt>
                <dd className="font-data">{current.shortCommit ?? '—'}</dd>
              </div>
            ) : (
              // Installer/updater packages have no git commit to show — the Label row
              // below (the build's short SHA baked into version.json) is the
              // equivalent identifier for a zip-based install.
              <div className="flex justify-between">
                <dt className="text-[var(--mc-text-secondary)]">Installed from</dt>
                <dd>package (no git checkout)</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--mc-text-secondary)]">Branch</dt>
              <dd className="font-data">{current.branch ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--mc-text-secondary)]">Source</dt>
              <dd>
                <Badge variant={current.source === 'git' ? 'cyan' : current.source === 'installer' || current.source === 'updater' ? 'purple' : 'neutral'}>
                  {current.source}
                </Badge>
              </dd>
            </div>
            {current.label && (
              <div className="flex justify-between">
                <dt className="text-[var(--mc-text-secondary)]">Label</dt>
                <dd className="font-data text-right">{current.label}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--mc-text-secondary)]">Last applied</dt>
              <dd className="text-right">{current.appliedAt ? new Date(current.appliedAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Update package (recommended)"
          icon={PackageCheck}
          accent="moss"
          padded
          action={
            <button
              onClick={checkNow}
              className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
            >
              <RefreshCw size={12} strokeWidth={2} />
              Check now
            </button>
          }
        >
          {!release.reachable ? (
            <div className="text-[13px] text-[var(--mc-ember-500)] flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{release.error ?? "Couldn't reach the GitHub API."}</span>
            </div>
          ) : !release.available ? (
            <p className="text-[13px] text-[var(--mc-text-muted)]">
              No <code className="font-data">*-updater.zip</code> found on the latest GitHub release yet — use the
              git-based update below instead, or wait for one to be published.
            </p>
          ) : (
            <dl className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--mc-text-secondary)]">Release</dt>
                <dd className="font-data">{release.tagName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--mc-text-secondary)] shrink-0">Asset</dt>
                <dd className="text-right truncate font-data text-[12px]" title={release.assetName}>
                  {release.assetName}
                </dd>
              </div>
              {release.publishedAt && (
                <div className="flex justify-between">
                  <dt className="text-[var(--mc-text-secondary)]">Published</dt>
                  <dd>{new Date(release.publishedAt).toLocaleString()}</dd>
                </div>
              )}
              {release.releaseUrl && (
                <a
                  href={release.releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-[var(--mc-moss-400)] hover:underline mt-1"
                >
                  <ExternalLink size={12} />
                  View release on GitHub
                </a>
              )}

              <p className="text-[11.5px] text-[var(--mc-text-muted)] mt-1">
                No git, Composer, or npm needed on this server — the package already has everything built in.
              </p>

              <button
                onClick={applyReleaseUpdate}
                disabled={applyingRelease}
                className="btn-pop mt-1 flex items-center justify-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-moss-500)] text-[#0a1620] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PackageCheck size={14} strokeWidth={2} />
                {applyingRelease ? 'Downloading & applying…' : 'Update now'}
              </button>
            </dl>
          )}
        </Card>
      </div>

      {releases.length > 0 && (
        <Card title="Choose a version" icon={History} accent="cyan" padded className="mb-5">
          <p className="text-[12.5px] text-[var(--mc-text-secondary)] mb-3">
            Every build is kept — pick an older one to roll back to if the latest update caused a problem.
          </p>
          <div className="flex gap-2">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
            >
              {releases.map((r, i) => (
                <option key={r.tagName} value={r.tagName}>
                  {r.name} {i === 0 ? '(latest)' : ''} {r.isCurrent ? '— currently installed' : ''}
                  {r.publishedAt ? ` — ${new Date(r.publishedAt).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={applyVersion}
              disabled={applyingVersion || !selectedTag}
              className="btn-pop shrink-0 flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors disabled:opacity-50"
            >
              <History size={14} />
              {applyingVersion ? 'Applying…' : 'Apply this version'}
            </button>
          </div>
        </Card>
      )}

      <button
        onClick={() => setShowGitFallback((v) => !v)}
        className="mb-2 flex items-center gap-1.5 text-[12.5px] text-[var(--mc-text-muted)] hover:text-[var(--mc-text-secondary)] transition-colors"
      >
        <ChevronDown size={14} className={`transition-transform ${showGitFallback ? 'rotate-180' : ''}`} />
        {showGitFallback ? 'Hide' : 'Show'} git-based update (requires git/Composer/npm on this server)
      </button>

      {showGitFallback && (
        <Card title="Update via git" icon={GitMerge} accent="purple" padded className="mb-5">
          {!github.reachable ? (
            <div className="text-[13px] text-[var(--mc-ember-500)] flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{github.error ?? "Couldn't reach the GitHub API."}</span>
            </div>
          ) : (
            <dl className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--mc-text-secondary)]">Latest commit</dt>
                <dd className="font-data">{github.latestShortSha ?? '—'}</dd>
              </div>
              {github.latestMessage && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--mc-text-secondary)] shrink-0">Message</dt>
                  <dd className="text-right truncate" title={github.latestMessage}>
                    {github.latestMessage.split('\n')[0]}
                  </dd>
                </div>
              )}
              {github.latestDate && (
                <div className="flex justify-between">
                  <dt className="text-[var(--mc-text-secondary)]">Date</dt>
                  <dd>{new Date(github.latestDate).toLocaleString()}</dd>
                </div>
              )}
              {github.compareUrl && (
                <a
                  href={github.compareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-[var(--mc-purple-400)] hover:underline mt-1"
                >
                  <ExternalLink size={12} />
                  View on GitHub
                </a>
              )}

              <button
                onClick={applyGitUpdate}
                disabled={applying || !github.updateAvailable}
                className="btn-pop mt-2 flex items-center justify-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitMerge size={14} strokeWidth={2} />
                {applying ? 'Updating…' : github.updateAvailable ? 'Update now' : 'Already up to date'}
              </button>
            </dl>
          )}
        </Card>
      )}

      <Card title="Upload installer / updater package" icon={UploadCloud} accent="cyan" padded>
        <p className="text-[12.5px] text-[var(--mc-text-secondary)] mb-3">
          For servers that can't reach GitHub directly, or a manual deploy: upload a{' '}
          <code className="font-data text-[var(--mc-cyan-400)]">*_installer.zip</code> (fresh install) or{' '}
          <code className="font-data text-[var(--mc-purple-400)]">*-updater.zip</code> (incremental update). The
          package is extracted and overlaid onto the app — <code className="font-data">.env</code>,{' '}
          <code className="font-data">storage/</code>, <code className="font-data">vendor/</code>, and{' '}
          <code className="font-data">node_modules/</code> are never touched — then dependencies are reinstalled
          and rebuilt automatically. Max {maxUploadMb}MB.
        </p>

        <form onSubmit={submitUpload} className="flex items-center gap-3">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => uploadForm.setData('package', e.target.files?.[0] ?? null)}
            className="flex-1 text-[12.5px] file:mr-3 file:rounded-[8px] file:border-0 file:bg-[var(--mc-bg-surface-raised)] file:px-3 file:py-1.5 file:text-[12px] file:text-[var(--mc-text-primary)] text-[var(--mc-text-secondary)]"
          />
          <button
            type="submit"
            disabled={uploadForm.processing || !uploadForm.data.package}
            className="btn-pop flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <UploadCloud size={14} strokeWidth={2} />
            {uploadForm.processing ? 'Uploading…' : 'Upload & apply'}
          </button>
        </form>
        {uploadForm.errors.package && (
          <div className="mt-2 text-[12px] text-[var(--mc-ember-500)]">{uploadForm.errors.package}</div>
        )}
      </Card>
    </DashboardLayout>
  );
}
