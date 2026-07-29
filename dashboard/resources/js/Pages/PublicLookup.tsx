import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { Search, ShieldBan, VolumeX, LogOut, TriangleAlert } from 'lucide-react';
import PlayerRender from '@/Components/PlayerRender';
import PlayerManagementPanel from '@/Components/PlayerManagementPanel';
import Card from '@/Components/Dashboard/Card';
import Badge from '@/Components/Dashboard/Badge';
import PageHeading from '@/Components/Dashboard/PageHeading';

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
}

function formatDate(ms: number) {
    return ms ? new Date(ms).toLocaleString() : '—';
}

function StatusPill({ active, permanent }: { active: boolean; permanent: boolean }) {
    if (!active) {
        return <Badge variant="moss">lifted</Badge>;
    }
    return (
        <Badge variant="ember" dot>
            {permanent ? 'active · permanent' : 'active'}
        </Badge>
    );
}

function SectionCard({
    icon: Icon,
    title,
    count,
    children,
    last = false,
}: {
    icon: typeof ShieldBan;
    title: string;
    count: number;
    children: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div className={last ? 'py-5' : 'border-b border-[var(--mc-border)] py-5'}>
            <div className="flex items-center gap-2">
                <Icon size={15} strokeWidth={1.75} className="text-[var(--mc-cyan-500)]" />
                <h2 className="font-display text-base font-semibold">{title}</h2>
                <span className="text-xs text-[var(--mc-text-muted)]">{count}</span>
            </div>
            <div className="mt-3 space-y-0">
                {count === 0 ? (
                    <p className="text-sm text-[var(--mc-text-muted)]">No records.</p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

export default function PublicLookup({
    auth,
    query,
    result,
    recent,
    canManage,
}: PageProps<{
    query: string | null;
    result: LookupResult | null;
    recent: RecentEntry[];
    canManage: boolean;
}>) {
    const [name, setName] = useState(query ?? '');
    const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchBoxRef = useRef<HTMLDivElement>(null);

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

    return (
        <>
            <Head title="Player Lookup" />
            <div className="min-h-screen bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
                <div className="mx-auto max-w-5xl px-6">
                    <header className="flex items-center justify-between border-b border-[var(--mc-border)] py-6">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/images/logo.png" alt="" className="h-7 w-7 object-contain" />
                            <span className="font-display text-lg font-semibold tracking-tight">
                                ZeroG Network
                            </span>
                        </Link>

                        <Link
                            href={auth.user ? route('dashboard') : route('login')}
                            className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-[var(--mc-text-secondary)] transition hover:text-[var(--mc-text-primary)]"
                        >
                            {auth.user ? 'Dashboard' : 'Staff log in'}
                        </Link>
                    </header>

                    <main className="pb-20">
                        <PageHeading
                            title="Player Lookup"
                            subtitle="Search any player to see their public moderation record — bans, mutes, kicks, and warnings, with full history."
                        />

                        <form onSubmit={submit} className="flex gap-2">
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
                                    placeholder="Player name"
                                    autoComplete="off"
                                    className="w-full rounded-[var(--radius)] border border-[var(--mc-border)] bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--mc-text-primary)] placeholder:text-[var(--mc-text-muted)] focus:border-[var(--mc-cyan-500)] focus:outline-none focus:ring-1 focus:ring-[var(--mc-cyan-500)]"
                                />

                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] shadow-lg">
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.uuid}
                                                type="button"
                                                onClick={() => {
                                                    setName(s.username);
                                                    go(s.username);
                                                }}
                                                className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--mc-text-secondary)] transition hover:bg-[var(--mc-bg-surface-raised)] hover:text-[var(--mc-text-primary)]"
                                            >
                                                {s.username}
                                            </button>
                                        ))}
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

                        {query && (
                            <div className="mt-8">
                                {!result ? (
                                    <div className="rounded-[var(--radius-lg)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] p-5 text-sm text-[var(--mc-text-secondary)]">
                                        Couldn't reach the moderation lookup service. Try again
                                        shortly.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <Card>
                                            <div className="flex items-center gap-4 p-4">
                                                <PlayerRender uuid={result.playerId} size={120} />
                                                <div>
                                                    <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--mc-text-muted)]">
                                                        Player
                                                    </span>
                                                    <h2 className="font-display text-lg font-semibold">
                                                        {result.playerName}
                                                    </h2>
                                                </div>
                                            </div>
                                        </Card>

                                        {canManage && auth.user && (
                                            <div className="rounded-[var(--radius-lg)] border border-[var(--mc-purple-400)] bg-[var(--mc-bg-surface)] p-5">
                                                <PlayerManagementPanel username={result.playerName} />
                                            </div>
                                        )}

                                        <Card padded>
                                        <SectionCard icon={ShieldBan} title="Bans" count={result.bans.length}>
                                            {result.bans.map((b) => (
                                                <div
                                                    key={b.id}
                                                    className="border-b border-[var(--mc-border)] py-2.5 text-sm last:border-b-0"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[var(--mc-text-secondary)]">
                                                            {b.reason || 'No reason given'}
                                                        </span>
                                                        <StatusPill active={b.active} permanent={b.permanent} />
                                                    </div>
                                                    <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                                        Banned by {b.bannedBy} · {formatDate(b.banTime)}
                                                        {b.active && !b.permanent && (
                                                            <> · Expires {formatDate(b.expireTime)}</>
                                                        )}
                                                        {!b.active && b.unbannedBy && (
                                                            <> · Unbanned by {b.unbannedBy}</>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </SectionCard>

                                        <SectionCard icon={VolumeX} title="Mutes" count={result.mutes.length}>
                                            {result.mutes.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="border-b border-[var(--mc-border)] py-2.5 text-sm last:border-b-0"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[var(--mc-text-secondary)]">
                                                            {m.reason || 'No reason given'}
                                                        </span>
                                                        <StatusPill active={m.active} permanent={m.permanent} />
                                                    </div>
                                                    <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                                        Muted by {m.mutedBy} · {formatDate(m.muteTime)}
                                                        {m.active && !m.permanent && (
                                                            <> · Expires {formatDate(m.expireTime)}</>
                                                        )}
                                                        {!m.active && m.unmutedBy && (
                                                            <> · Unmuted by {m.unmutedBy}</>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </SectionCard>

                                        <SectionCard icon={LogOut} title="Kicks" count={result.kicks.length}>
                                            {result.kicks.map((k) => (
                                                <div
                                                    key={k.id}
                                                    className="border-b border-[var(--mc-border)] py-2.5 text-sm last:border-b-0"
                                                >
                                                    <span className="text-[var(--mc-text-secondary)]">
                                                        {k.reason || 'No reason given'}
                                                    </span>
                                                    <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                                        Kicked by {k.kickedBy} · {formatDate(k.kickTime)}
                                                    </div>
                                                </div>
                                            ))}
                                        </SectionCard>

                                        <SectionCard icon={TriangleAlert} title="Warnings" count={result.warns.length} last>
                                            {result.warns.map((w) => (
                                                <div
                                                    key={w.id}
                                                    className="border-b border-[var(--mc-border)] py-2.5 text-sm last:border-b-0"
                                                >
                                                    <span className="text-[var(--mc-text-secondary)]">
                                                        {w.reason || 'No reason given'}
                                                    </span>
                                                    <div className="mt-1 text-xs text-[var(--mc-text-muted)]">
                                                        Warned by {w.warnedBy} · {formatDate(w.timestamp)}
                                                    </div>
                                                </div>
                                            ))}
                                        </SectionCard>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-10">
                            <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--mc-text-muted)]">
                                Recent activity
                            </span>
                            <Card className="mt-2">
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
                    </main>
                </div>
            </div>
        </>
    );
}