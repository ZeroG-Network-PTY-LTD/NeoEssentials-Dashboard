import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import { Settings, MessageCircle, PlugZap, Webhook, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  discord: { clientId: string | null; clientSecretSet: boolean; clientSecretMasked: string | null; redirect: string | null };
  mcApi: { url: string | null; username: string | null; passwordSet: boolean; passwordMasked: string | null };
  webhook: { url: string; secretSet: boolean; secretMasked: string | null };
}

export default function Configuration({ discord, mcApi, webhook }: Props) {
  const [testingMc, setTestingMc] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const discordForm = useForm({
    clientId: discord.clientId ?? '',
    clientSecret: '',
    redirect: discord.redirect ?? '',
  });

  const mcForm = useForm({
    url: mcApi.url ?? '',
    username: mcApi.username ?? '',
    password: '',
  });

  const saveDiscord = (e: React.FormEvent) => {
    e.preventDefault();
    discordForm.post(route('dashboard.configuration.discord.update'), {
      preserveScroll: true,
      onSuccess: () => discordForm.setData('clientSecret', ''),
    });
  };

  const testMcApi = () => {
    setTestingMc(true);
    router.post(route('dashboard.configuration.mc-api.test'), mcForm.data, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => setTestingMc(false),
    });
  };

  const saveMcApi = (e: React.FormEvent) => {
    e.preventDefault();
    mcForm.post(route('dashboard.configuration.mc-api.update'), {
      preserveScroll: true,
      onSuccess: () => mcForm.setData('password', ''),
    });
  };

  const regenerateWebhookSecret = () => {
    if (webhook.secretSet && !confirm('Regenerate the webhook secret? Update it in the mod\'s config.json too, or the mod\'s sync calls will start failing signature verification.')) return;
    router.post(route('dashboard.configuration.webhook.regenerate'), {}, { preserveScroll: true });
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhook.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syncNow = () => {
    setSyncing(true);
    router.post(route('dashboard.configuration.sync-users'), {}, {
      preserveScroll: true,
      onFinish: () => setSyncing(false),
    });
  };

  return (
    <DashboardLayout>
      <Head title="Configuration" />
      <PageHeading
        title="Configuration"
        icon={Settings}
        subtitle="Discord OAuth app, the mod API connection, and keeping accounts in sync between the two."
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

        <Card title="Minecraft API connection" icon={PlugZap} accent="cyan" padded>
          <p className="text-[12px] text-[var(--mc-text-muted)] mb-3">
            The service account this app uses to authenticate against the mod's own dashboard API.
          </p>
          <form onSubmit={saveMcApi} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Mod API URL
              <input
                value={mcForm.data.url}
                onChange={(e) => mcForm.setData('url', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
              {mcForm.errors.url && <span className="text-[var(--mc-ember-500)]">{mcForm.errors.url}</span>}
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Service account username
              <input
                value={mcForm.data.username}
                onChange={(e) => mcForm.setData('username', e.target.value)}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
            </label>

            <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
              Service account password {mcApi.passwordSet && <span className="text-[var(--mc-text-muted)]">(set — {mcApi.passwordMasked})</span>}
              <input
                type="password"
                value={mcForm.data.password}
                onChange={(e) => mcForm.setData('password', e.target.value)}
                placeholder={mcApi.passwordSet ? 'Leave blank to keep current password' : ''}
                className="font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={testMcApi}
                disabled={testingMc}
                className="flex flex-1 items-center justify-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors disabled:opacity-50"
              >
                <PlugZap size={14} />
                {testingMc ? 'Testing…' : 'Test'}
              </button>
              <button
                type="submit"
                disabled={mcForm.processing}
                className="btn-pop flex-1 text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Account sync" icon={Webhook} accent="moss" padded>
        <p className="text-[12px] text-[var(--mc-text-muted)] mb-3">
          This app and the mod each keep their own list of accounts — this reconciles them so "the mod has an account
          this dashboard doesn't know about yet" self-heals without needing that person to log in first.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
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
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[12px] font-medium">Push from the mod (optional, instant)</span>
              <Badge variant={webhook.secretSet ? 'moss' : 'neutral'}>{webhook.secretSet ? 'signed' : 'unsigned'}</Badge>
            </div>
            <p className="text-[11.5px] text-[var(--mc-text-muted)] mb-2">
              Set this URL as <code className="font-data">webDashboard.userSyncWebhookUrl</code> in the mod's
              config.json to get changes here immediately instead of waiting for the hourly pull.
            </p>
            <div className="flex gap-1.5 mb-2">
              <input
                readOnly
                value={webhook.url}
                className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-secondary)]"
              />
              <button
                onClick={copyWebhookUrl}
                className="flex shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
              >
                {copied ? <Check size={14} className="text-[var(--mc-moss-400)]" /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={regenerateWebhookSecret}
              className="text-[12px] text-[var(--mc-text-muted)] hover:text-[var(--mc-text-secondary)] transition-colors underline"
            >
              {webhook.secretSet ? `Regenerate secret (currently ${webhook.secretMasked})` : 'Generate a signing secret'}
            </button>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
