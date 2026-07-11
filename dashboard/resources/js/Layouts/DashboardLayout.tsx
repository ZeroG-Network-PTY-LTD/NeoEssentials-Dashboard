import { PropsWithChildren } from 'react';
import { Link, usePage } from '@inertiajs/react';
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
} from 'lucide-react';
import { PageProps } from '@/types';

type DashboardPageProps = PageProps<{ apiReachable?: boolean }>;

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { url, props } = usePage<DashboardPageProps>();
  const reachable = props.apiReachable ?? true;
  const isAdmin = props.auth.user.role === 'admin';

  const nav = [
    { label: 'Overview', href: route('dashboard'), icon: LayoutGrid },
    { label: 'Players', href: route('dashboard.players.index'), icon: Users },
    { label: 'Economy', href: route('dashboard.economy.index'), icon: Coins },
    { label: 'Warps', href: route('dashboard.warps.index'), icon: MapPin },
    { label: 'Kits', href: route('dashboard.kits.index'), icon: Package },
    { label: 'Holograms', href: route('dashboard.holograms.index'), icon: Sparkles },
    { label: 'Discord', href: route('dashboard.discord.index'), icon: MessageCircle },
    { label: 'Permissions', href: route('dashboard.permissions.index'), icon: ShieldCheck },
    { label: 'Backups', href: route('dashboard.backups.index'), icon: DatabaseBackup },
    { label: 'Commands', href: route('dashboard.commands.index'), icon: Terminal },
    { label: 'Logs', href: route('dashboard.logs.index'), icon: ScrollText },
    // Mod dashboard account management is admin-only (mirrors the mod's own
    // UserManagementEndpoint) — hide the link entirely for moderators rather
    // than showing a dead end that 403s.
    ...(isAdmin ? [{ label: 'Users', href: route('dashboard.users.index'), icon: UserCog }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
      <aside className="w-56 shrink-0 border-r border-[var(--mc-border)] bg-[var(--mc-bg-surface)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--mc-border)]">
          <div className="font-display text-[15px] font-semibold tracking-tight">
            ZeroG Network
          </div>
          <div className="text-[12px] text-[var(--mc-text-muted)] font-data mt-0.5">
            survival · 1.21.1
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-1">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = url.startsWith(new URL(href, window.location.origin).pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-[13px] transition-colors ${
                  active
                    ? 'bg-[var(--mc-copper-50)] text-[var(--mc-copper-500)]'
                    : 'text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)] hover:text-[var(--mc-text-primary)]'
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-[var(--mc-border)] flex items-center gap-2 text-[12px]">
          <Radio
            size={13}
            className={reachable ? 'text-[var(--mc-moss-500)]' : 'text-[var(--mc-ember-500)]'}
          />
          <span className={reachable ? 'text-[var(--mc-moss-500)]' : 'text-[var(--mc-ember-500)]'}>
            {reachable ? 'API connected' : 'API unreachable'}
          </span>
        </div>
      </aside>

      <main className="flex-1 px-8 py-7 max-w-6xl">{children}</main>
    </div>
  );
}
