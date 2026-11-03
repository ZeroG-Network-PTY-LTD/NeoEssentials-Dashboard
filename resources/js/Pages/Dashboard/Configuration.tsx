import { Head, useForm, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import { copyToClipboard } from '@/lib/clipboard';
import { Settings, MessageCircle, PlugZap, RefreshCw, Copy, Check, Link2, Unlink } from 'lucide-react';

interface Pairing {
  code: string;
  dashboardUrl: string;
  command: string;
  expiresInSeconds: number;
}

interface Props {
  discord: { clientId: string | null; clientSecretSet: boolean; clientSecretMasked: string | null; redirect: string | null };
  mcApi: { url: string | null; paired: boolean };
  pairing?: Pairing;
}

export default function Configuration({ discord, mcApi, pairing }: Props) {
  const [testingMc, setTestingMc] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingForPairing, setWaitingForPairing] = useState(!!pairing);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const discordForm = useForm({
    clientId: discord.clientId ?? '',
    clientSecret: '',
    redirect: discord.redirect ?? '',
  });

  const urlForm = useForm({ url: mcApi.url ?? '' });

  const saveDiscord = (e: React.FormEvent) => {
    e.preventDefault();
    discordForm.post(route('dashboard.configuration.discord.update'), {
      preserveScroll: true,
      onSuccess: () => discordForm.setData('clientSecret', ''),
    });
  };

  const saveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    urlForm.post(route('dashboard.configuration.mc-api.url'), { preserveScroll: true });
  };

  const testMcApi = () => {
    setTestingMc(true);
    router.post(route('dashboard.configuration.mc-api.test'), {}, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => setTestingMc(false),
    });
  };

  const generateCode = () => {
    setGenerating(true);
    router.post(route('dashboard.configuration.mc-api.pairing.start'), {}, {
      preserveScroll: true,
      onSuccess: () => setWaitingForPairing(true),
      onFinish: () => setGenerating(false),
    });
  };

  const unpair = () => {
    if (!confirm('Unpair from this Minecraft server? Also run /dashboard unpair on its console to revoke its API key.')) return;
    router.post(route('dashboard.configuration.mc-api.unpair'), {}, { preserveScroll: true });
  };

  const copyCommand = async () => {
    if (!pairing) return;
    if (await copyToClipboard(pairing.command)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const syncNow = () => {
    setSyncing(true);
    router.post(route('dashboard.configuration.sync-users'), {}, {
      preserveScroll: true,
      onFinish: () => setSyncing(false),
    });
  };

  // Poll pairing status while a code is showing and we haven't confirmed the mod side yet —
  // stops itself once mcApi.paired flips true (a fresh Inertia visit brings that prop in).
  useEffect(() => {
    if (!waitingForPairing || mcApi.paired) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(route('dashboard.configuration.mc-api.pairing.status'), {
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (data.paired) {
          setWaitingForPairing(false);
          router.reload({ only: ['mcApi'] });
        }
      } catch {
        // transient — just try again on the next tick
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [waitingForPairing, mcApi.paired]);

  return (
    <DashboardLayout>
      <Head title="Configuration" />
      <PageHeading
        title="Configuration"
        icon={Settings}
        subtitle="Discord OAuth app, the paired Minecraft server connection, and keeping accounts in sync between the two."
      />

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card title="Discord OAuth app" icon={MessageCircle} accent="purple" padded>
          <p className="text-[12px] text-[var(--mc-text-muted)] mb-3">
            This app's own Discord Developer Portal application, used for "Log in with Discord." Separate from the
            account-linking behavior (enabled / auto-registration / default role) configured on the{' '}
            <a href={route('dashboard.discord.index')} className="text-[var(--mc-cyan-400)] hover:underline">
              Discord page
            </a>
            .
          </p>
          <form onSubmit={saveDiscord} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Client ID
              <input
                value={discordForm.data.clientId}
                onChange={(e) => discordForm.setData('clientId', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {discordForm.errors.clientId && <span className="text-[var(--mc-ember-500)]">{discordForm.errors.clientId}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Client secret {discord.clientSecretSet && <span className="text-[var(--mc-text-muted)]">(set — {discord.clientSecretMasked})</span>}
              <input
                type="password"
                value={discordForm.data.clientSecret}
                onChange={(e) => discordForm.setData('clientSecret', e.target.value)}
                placeholder={discord.clientSecretSet ? 'Leave blank to keep current secret' : ''}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Redirect URI
              <input
                value={discordForm.data.redirect}
                onChange={(e) => discordForm.setData('redirect', e.target.value)}
                placeholder="https://your-domain.com/auth/discord/callback"
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {discordForm.errors.redirect && <span className="text-[var(--mc-ember-500)]">{discordForm.errors.redirect}</span>}
            </label>

            <button
              type="submit"
              disabled={discordForm.processing}
              className="btn-pop mt-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </form>
        </Card>

        <Card
          title="Minecraft server connection"
          icon={PlugZap}
          accent="cyan"
          padded
          action={<Badge variant={mcApi.paired ? 'moss' : 'neutral'} dot>{mcApi.paired ? 'Paired' : 'Not paired'}</Badge>}
        >
          <form onSubmit={saveUrl} className="flex flex-col gap-3 mb-4">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Mod API URL
              <div className="flex gap-1.5">
                <input
                  value={urlForm.data.url}
                  onChange={(e) => urlForm.setData('url', e.target.value)}
                  className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                />
                <button
                  type="submit"
                  disabled={urlForm.processing}
                  className="btn-pop shrink-0 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              {urlForm.errors.url && <span className="text-[var(--mc-ember-500)]">{urlForm.errors.url}</span>}
            </label>
          </form>

          {mcApi.paired ? (
            <div className="flex gap-2">
              <button
                onClick={testMcApi}
                disabled={testingMc}
                className="flex flex-1 items-center justify-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors disabled:opacity-50"
              >
                <PlugZap size={14} />
                {testingMc ? 'Testing…' : 'Test connection'}
              </button>
              <button
                onClick={unpair}
                className="flex items-center justify-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white font-medium hover:bg-[var(--mc-ember-600,var(--mc-ember-500))] transition-colors"
              >
                <Unlink size={14} />
                Unpair
              </button>
            </div>
          ) : pairing && waitingForPairing ? (
            <div className="rounded-[8px] border border-[var(--mc-border-strong)] bg-[var(--mc-bg-surface-raised)] p-3">
              <p className="text-[12px] text-[var(--mc-text-secondary)] mb-2">
                Run this on the Minecraft server's console (or in-game, if OP) within 10 minutes:
              </p>
              <div className="flex gap-1.5 mb-2">
                <input
                  readOnly
                  value={pairing.command}
                  className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-secondary)]"
                />
                <button
                  onClick={copyCommand}
                  className="flex shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 transition-colors hover:bg-[var(--mc-bg-surface)]"
                >
                  {copied ? <Check size={14} className="text-[var(--mc-moss-400)]" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--mc-text-muted)]">
                <RefreshCw size={12} className="animate-spin" />
                Waiting for the server…
              </div>
            </div>
          ) : (
            <button
              onClick={generateCode}
              disabled={generating}
              className="btn-pop flex items-center justify-center gap-2 w-full text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50"
            >
              <Link2 size={14} />
              {generating ? 'Generating…' : 'Generate pairing code'}
            </button>
          )}
        </Card>
      </div>

      <Card title="Account sync" icon={RefreshCw} accent="moss" padded>
        <p className="text-[12px] text-[var(--mc-text-muted)] mb-3">
          This app and the mod each keep their own list of accounts — this reconciles them so "the mod has an account
          this dashboard doesn't know about yet" self-heals without needing that person to log in first. Once paired,
          the mod also pushes changes here immediately instead of waiting for the hourly pull.
        </p>

        <div className="text-[12px] font-medium mb-1.5">Pull from the mod (guaranteed to work)</div>
        <p className="text-[11.5px] text-[var(--mc-text-muted)] mb-2">
          Fetches every mod account and creates/updates a matching local shadow row. Runs automatically every hour
          if your server's cron calls <code className="font-data">php artisan schedule:run</code>, or trigger it
          now:
        </p>
        <button
          onClick={syncNow}
          disabled={syncing}
          className="btn-pop flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-moss-500)] text-[#0a1620] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </Card>
    </DashboardLayout>
  );
}
