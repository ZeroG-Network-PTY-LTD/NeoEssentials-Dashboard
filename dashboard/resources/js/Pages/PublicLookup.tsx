import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import {
    Search,
    ShieldBan,
    VolumeX,
    LogOut,
    TriangleAlert,
    LayoutDashboard,
    Settings,
    UserCircle,
    Gauge,
    ShieldCheck,
    Shield,
    Coins,
    Backpack,
    StickyNote,
    Flag,
    Send,
    X as XIcon,
    Ban,
    History,
} from 'lucide-react';
import PlayerRender from '@/Components/PlayerRender';
import PlayerManagementPanel from '@/Components/PlayerManagementPanel';
import Card from '@/Components/Dashboard/Card';
import type { IPBanEntry, MuteEntry as IpMuteEntry } from '@/types/minecraft';
import Badge from '@/Components/Dashboard/Badge';
import SegmentedTabs, { SegmentedTabOption } from '@/Components/SegmentedTabs';

interface PunishmentBase {
    id: string;
    reason: string | null;
    active: boolean;
    permanent: boolean;
}

interface BanRecord extends PunishmentBase {
    playerName: string;
    playerId: string;
    bannedBy: string;
    banTime: number;
    expireTime: number;
    unbannedBy: string | null;
    unbannedAt: number;
}

interface MuteRecord extends PunishmentBase {
    target: string;
    mutedBy: string;
    muteTime: number;
    expireTime: number;
    unmutedBy: string | null;
    unmutedAt: number;
}

interface KickRecord {
    id: string;
    playerName: string;
    reason: string | null;
    kickedBy: string;
    kickTime: number;
}

interface WarnRecord {
    id: string;
    targetName: string;
    warnedBy: string;
    reason: string | null;
    timestamp: number;
}

interface LookupResult {
    success: boolean;
    playerName: string;
    playerId: string | null;
    bans: BanRecord[];
    mutes: MuteRecord[];
    kicks: KickRecord[];
    warns: WarnRecord[];
}

type RecentEntry =
    | (BanRecord & { type: 'ban' })
    | (MuteRecord & { type: 'mute' });

interface NameSuggestion {
    username: string;
    uuid: string;
    online: boolean;
}

interface StatusInfo {
    online: boolean;
    lastSeen: string | null;
    playtimeMinutes: number | null;
    firstJoined: string | number | null;
    gamemode: string | null;
}

function formatPlaytime(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatJoined(value: string | number | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function formatGamemode(mode: string | null): string {
    if (!mode) return '—';
    return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
}

type Tab = 'overview' | 'staff' | 'moderation' | 'permissions' | 'economy' | 'inventory' | 'notes' | 'recent' | 'ipbans';

// 'recent' and 'ipbans' are server-wide, not player-specific — always present and never
// require a player to have been searched, unlike every other tab here.
const STAFF_TABS: SegmentedTabOption<Tab>[] = [
    { id: 'overview', label: 'Overview', icon: Gauge },
    { id: 'staff', label: 'Staff tools', icon: ShieldCheck },
    { id: 'moderation', label: 'Moderation', icon: ShieldBan },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'economy', label: 'Economy', icon: Coins },
    { id: 'inventory', label: 'Inventory', icon: Backpack },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'recent', label: 'Recent Activity', icon: History },
    { id: 'ipbans', label: 'IP Bans', icon: Ban },
];

const PUBLIC_TABS: SegmentedTabOption<Tab>[] = [
    { id: 'overview', label: 'Overview', icon: Gauge },
    { id: 'moderation', label: 'Moderation', icon: ShieldBan },
    { id: 'recent', label: 'Recent Activity', icon: History },
    { id: 'ipbans', label: 'IP Bans', icon: Ban },
];

const PLAYER_TABS: readonly Tab[] = ['overview', 'staff', 'moderation', 'permissions', 'economy', 'inventory', 'notes'];

function formatDate(ms: number) {
    return ms ? new Date(ms).toLocaleString() : '—';
}

interface ModRow {
    id: string;
    type: 'Ban' | 'Mute' | 'Kick' | 'Warning';
    reason: string;
    staff: string;
    duration: string;
    date: number;
}

const MOD_TAG_VARIANT: Record<ModRow['type'], 'ember' | 'purple' | 'neutral' | 'cyan'> = {
    Ban: 'ember',
    Mute: 'purple',
    Kick: 'neutral',
    Warning: 'cyan',
};

function buildModerationRows(result: LookupResult): ModRow[] {
    const rows: ModRow[] = [
        ...result.bans.map((b): ModRow => ({
            id: `ban-${b.id}`,
            type: 'Ban',
            reason: b.reason || 'No reason given',
            staff: b.bannedBy,
            duration: !b.active ? 'Lifted' : b.permanent ? 'Permanent' : `Until ${formatDate(b.expireTime)}`,
            date: b.banTime,
        })),
        ...result.mutes.map((m): ModRow => ({
            id: `mute-${m.id}`,
            type: 'Mute',
            reason: m.reason || 'No reason given',
            staff: m.mutedBy,
            duration: !m.active ? 'Lifted' : m.permanent ? 'Permanent' : `Until ${formatDate(m.expireTime)}`,
            date: m.muteTime,
        })),
        ...result.kicks.map((k): ModRow => ({
            id: `kick-${k.id}`,
            type: 'Kick',
            reason: k.reason || 'No reason given',
            staff: k.kickedBy,
            duration: '—',
            date: k.kickTime,
        })),
        ...result.warns.map((w): ModRow => ({
            id: `warn-${w.id}`,
            type: 'Warning',
            reason: w.reason || 'No reason given',
            staff: w.warnedBy,
            duration: '—',
            date: w.timestamp,
        })),
    ];
    return rows.sort((a, b) => b.date - a.date);
}

export default function PublicLookup({
    auth,
    query,
    result,
    status,
    recent,
    ipBans,
    ipMutes,
    canManage,
    canSeeReports,
}: PageProps<{
    query: string | null;
    result: LookupResult | null;
    status: StatusInfo | null;
    recent: RecentEntry[];
    ipBans: IPBanEntry[];
    ipMutes: IpMuteEntry[];
    canManage: boolean;
    canSeeReports: boolean;
}>) {
    const [name, setName] = useState(query ?? '');
    const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const isStaff = canManage && !!auth.user;
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [showReportModal, setShowReportModal] = useState(false);

    useEffect(() => {
        // Only reset to Overview for player-specific tabs — Recent Activity/IP Bans aren't
        // about the searched player at all, so switching players shouldn't kick the visitor
        // out of either if that's what they were looking at.
        setActiveTab((current) => (PLAYER_TABS.includes(current) ? 'overview' : current));
    }, [result?.playerName]);

    const go = (player: string) => {
        setShowSuggestions(false);
        router.get(route('lookup'), player.trim() ? { player: player.trim() } : {}, {
            preserveState: true,
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        go(name);
    };

    useEffect(() => {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            setSuggestions([]);
            return;
        }

        const timeout = setTimeout(() => {
            fetch(route('lookup.suggest', { q: trimmed }))
                .then((res) => res.json())
                .then((data: NameSuggestion[]) => setSuggestions(data))
                .catch(() => setSuggestions([]));
        }, 200);

        return () => clearTimeout(timeout);
    }, [name]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const tabs = isStaff ? STAFF_TABS : PUBLIC_TABS;
    const moderationRows = result ? buildModerationRows(result) : [];

    return (
        <>
            <Head title="Player Lookup" />
            <div className="min-h-screen bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
                <div className="mx-auto max-w-5xl px-6">
                    <header className="flex items-center gap-4 border-b border-[var(--mc-border)] py-4">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/images/logo.png" alt="" className="h-7 w-7 object-contain" />
                            <span className="font-display text-lg font-semibold tracking-tight">
                                ZeroG Network
                            </span>
                        </Link>

                        {auth.user ? (
                            <>
                                <nav className="flex items-center gap-4 text-sm">
                                    <Link
                                        href={route('dashboard')}
                                        className="flex items-center gap-1.5 text-[var(--mc-text-secondary)] transition hover:text-[var(--mc-text-primary)]"
                                    >
                                        <LayoutDashboard size={15} strokeWidth={2} />
                                        Dashboard
                                    </Link>
                                    <span className="flex items-center gap-1.5 font-medium text-[var(--mc-cyan-400)]">
                                        <Search size={15} strokeWidth={2} />
                                        Player Lookup
                                    </span>
                                    <Link
                                        href={route('profile.edit')}
                                        className="flex items-center gap-1.5 text-[var(--mc-text-secondary)] transition hover:text-[var(--mc-text-primary)]"
                                    >
                                        <Settings size={15} strokeWidth={2} />
                                        Settings
                                    </Link>
                                </nav>
                                <Link
                                    href={route('profile.edit')}
                                    className="ml-auto flex items-center gap-2 text-sm text-[var(--mc-text-primary)]"
                                >
                                    <UserCircle size={17} strokeWidth={2} />
                                    {auth.user.name}
                                </Link>
                            </>
                        ) : (
                            <Link
                                href={route('login')}
                                className="ml-auto rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-[var(--mc-text-secondary)] transition hover:text-[var(--mc-text-primary)]"
                            >
                                Staff log in
                            </Link>
                        )}
                    </header>

                    <main className="pb-20">
                        <div className="flex items-baseline justify-between gap-4 pt-8">
                            <div>
                                <h1 className="font-display text-2xl font-semibold">Player Lookup</h1>
                                <p className="mt-1 text-sm italic text-[var(--mc-text-secondary)]">
                                    Search any player to view their record
                                    {isStaff ? ' and manage them with staff tools' : ''}.
                                </p>
                            </div>
                            <Badge variant={isStaff ? 'cyan' : 'neutral'}>
                                {isStaff ? 'Staff view' : 'Public view'}
                            </Badge>
                        </div>

                        <form onSubmit={submit} className="relative z-20 mt-6 flex max-w-md gap-2">
                            <div ref={searchBoxRef} className="relative flex-1">
                                <Search
                                    size={16}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mc-text-muted)]"
                                />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setShowSuggestions(false);
                                    }}
                                    placeholder="Start typing a username…"
                                    autoComplete="off"
                                    className="w-full rounded-[var(--radius)] border border-[var(--mc-border)] bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--mc-text-primary)] placeholder:text-[var(--mc-text-muted)] focus:border-[var(--mc-cyan-500)] focus:outline-none focus:ring-1 focus:ring-[var(--mc-cyan-500)]"
                                />

                                {showSuggestions && name.trim().length >= 2 && (
                                    <div className="animate-dropdown-in absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] shadow-lg">
                                        {suggestions.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-[var(--mc-text-muted)]">
                                                No players found.
                                            </div>
                                        ) : (
                                            suggestions.map((s) => (
                                                <button
                                                    key={s.uuid}
                                                    type="button"
                                                    onClick={() => {
                                                        setName(s.username);
                                                        go(s.username);
                                                    }}
                                                    className="flex w-full items-center gap-3 border-b border-[var(--mc-border)] px-3 py-2 text-left text-sm text-[var(--mc-text-secondary)] transition last:border-b-0 hover:bg-[var(--mc-bg-surface-raised)] hover:text-[var(--mc-text-primary)]"
                                                >
                                                    <img
                                                        src={`https://mc-heads.net/avatar/${s.username}/64`}
                                                        alt=""
                                                        className="h-7 w-7 shrink-0 rounded-[var(--radius-sm)]"
                                                    />
                                                    <span className="flex-1">{s.username}</span>
                                                    <span
                                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                            s.online ? 'bg-[var(--mc-cyan-500)]' : 'bg-[var(--mc-text-muted)]'
                                                        }`}
                                                    />
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="btn-pop rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-5 py-2 text-sm font-semibold text-[#12151a] transition hover:bg-[var(--mc-cyan-400)]"
                            >
                                Search
                            </button>
                        </form>

                        {query && !result && (
                            <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] p-5 text-sm text-[var(--mc-text-secondary)]">
                                Couldn't reach the moderation lookup service. Try again shortly.
                            </div>
                        )}

                        {result && (
                            <div className="mt-8 flex items-center gap-6 border-b border-[var(--mc-border)] pb-6">
                                <PlayerRender uuid={result.playerId} size={120} />
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="font-display text-xl font-semibold">
                                            {result.playerName}
                                        </h2>
                                        <Badge variant={status?.online ? 'moss' : 'neutral'} dot={status?.online}>
                                            {status?.online ? 'online' : 'offline'}
                                        </Badge>
                                    </div>
                                    <div className="mt-1 font-data text-xs text-[var(--mc-text-muted)]">
                                        {result.playerId ?? '—'}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--mc-text-muted)]">
                                        {status?.online ? 'Online now' : status?.lastSeen ? `Last seen ${status.lastSeen}` : 'Offline'}
                                        {' · '}Joined {formatJoined(status?.firstJoined ?? null)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        auth.user
                                            ? setShowReportModal(true)
                                            : router.visit(route('login'))
                                    }
                                    className="btn-pop ml-auto flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--mc-text-secondary)] transition hover:border-[var(--mc-ember-500)] hover:text-[var(--mc-ember-500)]"
                                >
                                    <Flag size={14} strokeWidth={2} />
                                    Report
                                </button>
                            </div>
                        )}

                        <div className="mt-6">
                            <SegmentedTabs name="lookup-tab" tabs={tabs} value={activeTab} onChange={setActiveTab} />
                        </div>

                        {activeTab === 'overview' && (
                            <div className="mt-6">
                                {!result ? (
                                    <p className="text-sm text-[var(--mc-text-muted)]">Search for a player above to see their overview.</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                            {[
                                                ['Status', status?.online ? 'Online' : 'Offline'],
                                                ['Playtime', formatPlaytime(status?.playtimeMinutes ?? null)],
                                                ['Game mode', formatGamemode(status?.gamemode ?? null)],
                                                ['Joined', formatJoined(status?.firstJoined ?? null)],
                                            ].map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    className="rounded-[var(--radius-md)] border border-[var(--mc-border)] p-4"
                                                >
                                                    <div className="text-[11px] uppercase tracking-widest text-[var(--mc-text-muted)]">
                                                        {label}
                                                    </div>
                                                    <div className="mt-1 font-display text-lg font-semibold [font-variant-numeric:tabular-nums]">
                                                        {value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {!isStaff && (
                                            <p className="mt-6 max-w-[60ch] text-sm text-[var(--mc-text-muted)]">
                                                Sign in with a staff account to view balance, permissions,
                                                inventory, and moderation tools for this player.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'moderation' && (
                            <div className="mt-6">
                                {!result ? (
                                    <p className="text-sm text-[var(--mc-text-muted)]">Search for a player above to see their moderation history.</p>
                                ) : (
                                    <Card padded>
                                        {moderationRows.length === 0 ? (
                                            <p className="text-sm text-[var(--mc-text-muted)]">
                                                No moderation history on file.
                                            </p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="border-b border-[var(--mc-border)] text-[11px] uppercase tracking-widest text-[var(--mc-text-muted)]">
                                                            <th className="pb-2 pr-3 font-medium">Type</th>
                                                            <th className="pb-2 pr-3 font-medium">Reason</th>
                                                            <th className="pb-2 pr-3 font-medium">Staff</th>
                                                            <th className="pb-2 pr-3 font-medium">Duration</th>
                                                            <th className="pb-2 font-medium">Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {moderationRows.map((row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="border-b border-[var(--mc-border)] last:border-b-0"
                                                            >
                                                                <td className="py-2.5 pr-3">
                                                                    <Badge variant={MOD_TAG_VARIANT[row.type]}>
                                                                        {row.type}
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-2.5 pr-3 text-[var(--mc-text-secondary)]">
                                                                    {row.reason}
                                                                </td>
                                                                <td className="py-2.5 pr-3 text-[var(--mc-text-muted)]">
                                                                    {row.staff}
                                                                </td>
                                                                <td className="py-2.5 pr-3 text-[var(--mc-text-muted)]">
                                                                    {row.duration}
                                                                </td>
                                                                <td className="py-2.5 text-[var(--mc-text-muted)]">
                                                                    {formatDate(row.date)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>
                        )}

                        {activeTab === 'recent' && (
                            <div className="mt-6">
                                <Card>
                                    <div className="divide-y divide-[var(--mc-border)]">
                                        {recent.length === 0 ? (
                                            <p className="p-4 text-sm text-[var(--mc-text-muted)]">
                                                Nothing recent.
                                            </p>
                                        ) : (
                                            recent.map((entry) => (
                                                <div
                                                    key={`${entry.type}-${entry.id}`}
                                                    className="flex items-center gap-3 p-3 text-sm"
                                                >
                                                    {entry.type === 'ban' ? (
                                                        <ShieldBan size={15} className="text-[var(--mc-ember-500)]" />
                                                    ) : (
                                                        <VolumeX size={15} className="text-[var(--mc-cyan-500)]" />
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            router.get(
                                                                route('lookup'),
                                                                {
                                                                    player:
                                                                        entry.type === 'ban'
                                                                            ? entry.playerName
                                                                            : entry.target,
                                                                },
                                                                { preserveState: true },
                                                            )
                                                        }
                                                        className="font-medium text-[var(--mc-text-primary)] hover:text-[var(--mc-cyan-500)]"
                                                    >
                                                        {entry.type === 'ban' ? entry.playerName : entry.target}
                                                    </button>
                                                    <span className="text-[var(--mc-text-muted)]">
                                                        {entry.reason || 'No reason given'}
                                                    </span>
                                                    <span className="ml-auto shrink-0 text-xs text-[var(--mc-text-muted)]">
                                                        {formatDate(
                                                            entry.type === 'ban' ? entry.banTime : entry.muteTime,
                                                        )}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'ipbans' && (
                            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--mc-text-muted)]">
                                        IP bans
                                    </span>
                                    <Card className="mt-2">
                                        <div className="divide-y divide-[var(--mc-border)]">
                                            {ipBans.length === 0 ? (
                                                <p className="p-4 text-sm text-[var(--mc-text-muted)]">No active IP bans.</p>
                                            ) : (
                                                ipBans.map((b) => (
                                                    <div key={b.id} className="flex items-center gap-3 p-3 text-sm">
                                                        <Ban size={15} className="text-[var(--mc-ember-500)]" />
                                                        <span className="font-data font-medium text-[var(--mc-text-primary)]">{b.ipAddress}</span>
                                                        <span className="text-[var(--mc-text-muted)]">{b.reason || 'No reason given'}</span>
                                                        <span className="ml-auto shrink-0 text-xs text-[var(--mc-text-muted)]">
                                                            {formatDate(b.banTime)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </Card>
                                </div>

                                <div>
                                    <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--mc-text-muted)]">
                                        IP mutes
                                    </span>
                                    <Card className="mt-2">
                                        <div className="divide-y divide-[var(--mc-border)]">
                                            {ipMutes.length === 0 ? (
                                                <p className="p-4 text-sm text-[var(--mc-text-muted)]">No active IP mutes.</p>
                                            ) : (
                                                ipMutes.map((m) => (
                                                    <div key={m.id} className="flex items-center gap-3 p-3 text-sm">
                                                        <VolumeX size={15} className="text-[var(--mc-cyan-500)]" />
                                                        <span className="font-data font-medium text-[var(--mc-text-primary)]">{m.target}</span>
                                                        <span className="text-[var(--mc-text-muted)]">{m.reason || 'No reason given'}</span>
                                                        <span className="ml-auto shrink-0 text-xs text-[var(--mc-text-muted)]">
                                                            {formatDate(m.muteTime)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {isStaff && result && activeTab !== 'overview' && activeTab !== 'moderation' && activeTab !== 'recent' && activeTab !== 'ipbans' && (
                            <div
                                className={`mt-6 rounded-[var(--radius-lg)] p-5 ${
                                    activeTab === 'staff'
                                        ? 'border border-[var(--mc-purple-400)] bg-[var(--mc-bg-surface)]'
                                        : 'border border-[var(--mc-border)] bg-[var(--mc-bg-surface)]'
                                }`}
                            >
                                <PlayerManagementPanel
                                    username={result.playerName}
                                    activeTab={activeTab}
                                    canSeeReports={canSeeReports}
                                />
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {showReportModal && result && (
                <ReportModal playerName={result.playerName} onClose={() => setShowReportModal(false)} />
            )}
        </>
    );
}

/** Quick-report modal launched from the Report button on a looked-up player — files
 *  the same way the dedicated /report page does, just pre-filled with the target and
 *  without leaving the lookup page. Only ever mounted for a logged-in visitor (see the
 *  Report button's onClick above), so no auth gate needed here. */
function ReportModal({ playerName, onClose }: { playerName: string; onClose: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        targetName: playerName,
        reason: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('dashboard.reports.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] p-5 shadow-lg">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Report {playerName}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[var(--mc-text-muted)] transition hover:text-[var(--mc-text-primary)]"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-[12px] text-[var(--mc-text-secondary)]">
                        Reason
                        <textarea
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            rows={4}
                            autoFocus
                            placeholder="What happened?"
                            className="resize-none rounded-[8px] border border-[var(--mc-border-strong)] bg-[var(--mc-bg-surface-raised)] px-2.5 py-1.5 text-[13px] text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
                        />
                        {errors.reason && <span className="text-[var(--mc-ember-500)]">{errors.reason}</span>}
                    </label>

                    <button
                        type="submit"
                        disabled={processing}
                        className="btn-pop mt-1 flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-3 py-2 text-[13px] font-medium text-[#0a1620] transition-colors hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                    >
                        <Send size={13} strokeWidth={2} />
                        File report
                    </button>
                </form>
            </div>
        </div>
    );
}
