import { PropsWithChildren, useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
  LayoutGrid,
  Users,
  Coins,
  Terminal,
  ScrollText,
  Radio,
  MapPin,
  Package,
  UserCog,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  DatabaseBackup,
  CheckCircle2,
  XCircle,
  Search,
  Settings,
  LogOut,
  UserRound,
  Menu,
  X,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { PageProps } from '@/types';
import { isMcLiveAvailable, useMcLiveStatus } from '@/lib/useMcLive';

type DashboardPageProps = PageProps<{ apiReachable?: boolean; permissionsUsingExternal?: boolean }>;

function FlashToast() {
  const { props } = usePage<DashboardPageProps>();
  const [dismissed, setDismissed] = useState(false);
  const message = props.flash?.success ?? props.flash?.error ?? null;
  const isError = !props.flash?.success && !!props.flash?.error;

  // Re-arm whenever a new flash message arrives (Inertia keeps re-sending the
  // same prop reference across unrelated navigations otherwise wouldn't matter,
  // but a fresh redirect always produces a new string here).
  useEffect(() => setDismissed(false), [message]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setDismissed(true), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || dismissed) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-[var(--radius-lg)] border text-[13px] shadow-lg ${
        isError
          ? 'bg-[var(--mc-ember-50)] border-[var(--mc-ember-400)] text-[var(--mc-ember-500)]'
          : 'bg-[var(--mc-moss-50)] border-[var(--mc-moss-400,var(--mc-moss-500))] text-[var(--mc-moss-500)]'
      }`}
    >
      {isError ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
      {message}
      <button onClick={() => setDismissed(true)} className="ml-2 opacity-60 hover:opacity-100">
        &times;
      </button>
    </div>
  );
}

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { url, props } = usePage<DashboardPageProps>();
  const reachable = props.apiReachable ?? true;
  const permissionsUsingExternal = props.permissionsUsingExternal ?? false;
  // Reverb isn't configured at all on shared/cPanel installs (see resources/js/app.tsx) — in
  // that case there's nothing to show a connection status for, so the badge only renders once
  // it's actually possible to be live.
  const liveAvailable = isMcLiveAvailable();
  const isLive = useMcLiveStatus();
  const user = props.auth.user;
  const isAdmin = user.role === 'admin';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer on every navigation so it doesn't stay open
  // after tapping a nav link.
  useEffect(() => setMobileNavOpen(false), [url]);

  const nav = [
    { label: 'Overview', href: route('dashboard'), icon: LayoutGrid },
    { label: 'Players', href: route('dashboard.players.index'), icon: Users },
    { label: 'Economy', href: route('dashboard.economy.index'), icon: Coins },
    { label: 'Warps', href: route('dashboard.warps.index'), icon: MapPin },
    { label: 'Kits', href: route('dashboard.kits.index'), icon: Package },
    { label: 'Holograms', href: route('dashboard.holograms.index'), icon: Sparkles },
    { label: 'Discord', href: route('dashboard.discord.index'), icon: MessageCircle },
    // Hidden when the mod is deferring to an external permission plugin (LuckPerms, FTB
    // Ranks, ...) — this dashboard's internal group/user editor would have nothing to manage
    // and would just clash with whatever the external plugin is actually doing.
    ...(permissionsUsingExternal ? [] : [{ label: 'Permissions', href: route('dashboard.permissions.index'), icon: ShieldCheck }]),
    { label: 'Backups', href: route('dashboard.backups.index'), icon: DatabaseBackup },
    { label: 'Commands', href: route('dashboard.commands.index'), icon: Terminal },
    { label: 'Logs', href: route('dashboard.logs.index'), icon: ScrollText },
    // Mod dashboard account management is admin-only (mirrors the mod's own
    // UserManagementEndpoint) — hide the link entirely for moderators rather
    // than showing a dead end that 403s.
    ...(isAdmin ? [{ label: 'Users', href: route('dashboard.users.index'), icon: UserCog }] : []),
    // Self-update is entirely admin-gated server-side (can:updates.manage) —
    // hide the link for moderators too rather than showing a dead end.
    ...(isAdmin ? [{ label: 'Updates', href: route('dashboard.updates.index'), icon: RefreshCw }] : []),
    // Discord OAuth app / MC API / account sync — same admin-only gate
    // (can:configuration.manage) as Users and Updates above.
    ...(isAdmin ? [{ label: 'Configuration', href: route('dashboard.configuration.index'), icon: Settings }] : []),
  ];

  const avatarUrl = user.mc_uuid ? `https://mc-heads.net/avatar/${user.mc_uuid}/64` : null;

  return (
    <div className="min-h-screen flex bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-[var(--mc-border)] bg-[var(--mc-bg-surface)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-[var(--mc-border)] flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 flex-1 group" title="Back to site">
            <span className="h-8 w-8 rounded-[9px] shrink-0 bg-gradient-to-br from-[var(--mc-cyan-500)] to-[var(--mc-purple-500)] shadow-[0_0_16px_-2px_rgba(56,198,224,0.45)] flex items-center justify-center transition-transform group-hover:scale-105">
              <svg className="h-4.5 w-4.5 text-[#0a0d16]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                <path d="M3 6.5 12 11l9-4.5M12 11v11" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] font-semibold tracking-tight group-hover:text-[var(--mc-cyan-400)] transition-colors">
                ZeroG Network
              </div>
              <div className="text-[11px] text-[var(--mc-text-muted)] font-data mt-0.5">
                survival · 1.21.1
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="p-1 rounded-[var(--radius)] text-[var(--mc-text-muted)] hover:text-[var(--mc-text-primary)] hover:bg-[var(--mc-bg-surface-raised)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = url.startsWith(new URL(href, window.location.origin).pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`group flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-[8px] text-[13px] transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[var(--mc-cyan-50)] to-transparent text-[var(--mc-cyan-400)] shadow-[inset_2px_0_0_0_var(--mc-cyan-500)]'
                    : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)] hover:text-[var(--mc-text-primary)]'
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={1.75}
                  className={active ? '' : 'transition-transform group-hover:scale-110'}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2.5 py-2 border-t border-[var(--mc-border)] flex flex-col gap-0.5">
          <Link
            href={route('lookup')}
            className="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-[8px] text-[13px] text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)] hover:text-[var(--mc-text-primary)] transition-colors"
          >
            <Search size={16} strokeWidth={1.75} />
            Player Lookup
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-[8px] text-[13px] text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)] hover:text-[var(--mc-text-primary)] transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            Back to site
          </Link>
        </div>

        <div className="px-4 py-3 border-t border-[var(--mc-border)]">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ${
              reachable
                ? 'bg-[var(--mc-moss-50)] text-[var(--mc-moss-500)]'
                : 'bg-[var(--mc-ember-50)] text-[var(--mc-ember-500)]'
            }`}
          >
            <Radio size={13} className="shrink-0" />
            {reachable ? 'API connected' : 'API unreachable'}
            <span className="pulse-dot relative ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          </span>
          {/* Only shown on installs that ran `php artisan reverb:install` (VPS/Docker) — on
              shared/cPanel hosting liveAvailable is false and this renders nothing, matching
              the dashboard's pre-Phase-1 behavior exactly. */}
          {liveAvailable && (
            <span
              className={`mt-1.5 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ${
                isLive
                  ? 'bg-[var(--mc-cyan-50)] text-[var(--mc-cyan-400)]'
                  : 'bg-[var(--mc-bg-surface-raised)] text-[var(--mc-text-muted)]'
              }`}
            >
              <Radio size={13} className="shrink-0" />
              {isLive ? 'Live updates' : 'Connecting…'}
            </span>
          )}
        </div>

        <div className="border-t border-[var(--mc-border)] p-3 flex items-center gap-3">
          <Link href={route('profile.edit')} className="group flex items-center gap-2.5 min-w-0 flex-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-8 w-8 rounded-[8px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)] transition-shadow group-hover:shadow-[0_0_0_2px_var(--mc-cyan-500)]"
              />
            ) : (
              <span className="h-8 w-8 rounded-[8px] shrink-0 bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] flex items-center justify-center transition-shadow group-hover:shadow-[0_0_0_2px_var(--mc-cyan-500)]">
                <UserRound size={16} className="text-[var(--mc-text-muted)]" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[13px] font-medium truncate">{user.name}</span>
              <span className="block text-[11px] text-[var(--mc-text-muted)] capitalize">{user.role}</span>
            </span>
          </Link>
          <Link
            href={route('profile.edit')}
            title="Account settings"
            className="p-1.5 rounded-[var(--radius)] text-[var(--mc-text-muted)] hover:text-[var(--mc-purple-400)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
          >
            <Settings size={16} strokeWidth={1.75} />
          </Link>
          <button
            type="button"
            title="Log out"
            onClick={() => router.post(route('logout'))}
            className="p-1.5 rounded-[var(--radius)] text-[var(--mc-text-muted)] hover:text-[var(--mc-ember-500)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-[var(--mc-border)] bg-[var(--mc-bg-surface)]">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="p-1.5 rounded-[var(--radius)] text-[var(--mc-text-secondary)] hover:text-[var(--mc-text-primary)] hover:bg-[var(--mc-bg-surface-raised)]"
          >
            <Menu size={20} />
          </button>
          <span className="h-6 w-6 rounded-[7px] bg-gradient-to-br from-[var(--mc-cyan-500)] to-[var(--mc-purple-500)] shrink-0 flex items-center justify-center">
            <svg className="h-3.5 w-3.5 text-[#0a0d16]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M3 6.5 12 11l9-4.5M12 11v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-[14px] font-semibold tracking-tight">ZeroG Network</span>
        </div>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 max-w-6xl w-full">{children}</main>
      </div>
      <FlashToast />
    </div>
  );
}
