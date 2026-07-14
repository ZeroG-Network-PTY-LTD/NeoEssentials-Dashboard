import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ShieldCheck,
    Coins,
    Package,
    Sparkles,
    DatabaseBackup,
    Terminal,
} from 'lucide-react';

const features = [
    {
        icon: ShieldCheck,
        title: 'Moderation',
        description:
            'Bans, mutes, kicks, warnings, staff notes, and player reports — all with full history and audit trails, enforced the same whether issued in-game or from the dashboard.',
    },
    {
        icon: Coins,
        title: 'Economy',
        description:
            'Balances, transaction history, and item worth, with a live leaderboard and admin tools to adjust accounts without touching the console.',
    },
    {
        icon: Package,
        title: 'Kits & Warps',
        description:
            'Manage kit definitions, cooldowns, and player warps from one place, in sync with what players see in-game.',
    },
    {
        icon: Sparkles,
        title: 'Holograms',
        description:
            'Create and edit animated holographic displays, including shop click-to-trade holograms, without leaving the browser.',
    },
    {
        icon: DatabaseBackup,
        title: 'Pluggable Storage',
        description:
            'JSON, YAML, SQLite, or MySQL — pick your backend. MySQL enables real-time shared data across an entire server network.',
    },
    {
        icon: Terminal,
        title: 'Live Console & Logs',
        description:
            'Run commands and monitor server logs remotely, with permission groups controlling exactly who can do what.',
    },
];

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="ZeroG Network Dashboard" />
            <div className="min-h-screen bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
                <div className="mx-auto max-w-6xl px-6">
                    <header className="flex items-center justify-between py-8">
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-7 w-7 text-[var(--mc-copper-500)]"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M3 6.5 12 11l9-4.5M12 11v11"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span className="font-display text-lg font-semibold tracking-tight">
                                ZeroG Network
                            </span>
                        </div>

                        <nav className="flex items-center gap-2">
                            <Link
                                href={route('lookup')}
                                className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-[var(--mc-text-secondary)] transition hover:text-[var(--mc-text-primary)]"
                            >
                                Player Lookup
                            </Link>
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-[var(--radius)] bg-[var(--mc-copper-500)] px-4 py-2 text-sm font-medium text-[#12151a] transition hover:bg-[var(--mc-copper-400)]"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-[var(--mc-text-secondary)] transition hover:text-[var(--mc-text-primary)]"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-[var(--radius)] bg-[var(--mc-copper-500)] px-4 py-2 text-sm font-medium text-[#12151a] transition hover:bg-[var(--mc-copper-400)]"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main>
                        <div className="py-20 text-center sm:py-28">
                            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                                Run your NeoEssentials server
                                <br />
                                <span className="text-[var(--mc-copper-500)]">
                                    from one dashboard
                                </span>
                            </h1>
                            <p className="mx-auto mt-5 max-w-xl text-base text-[var(--mc-text-secondary)]">
                                Moderation, economy, kits, holograms, and
                                permissions — everything NeoEssentials tracks
                                in-game, managed remotely with the same data,
                                the same rules, and the same audit trail.
                            </p>
                            <div className="mt-8 flex items-center justify-center gap-3">
                                {auth.user ? (
                                    <Link
                                        href={route('dashboard')}
                                        className="rounded-[var(--radius)] bg-[var(--mc-copper-500)] px-6 py-3 text-sm font-semibold text-[#12151a] transition hover:bg-[var(--mc-copper-400)]"
                                    >
                                        Open Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="rounded-[var(--radius)] bg-[var(--mc-copper-500)] px-6 py-3 text-sm font-semibold text-[#12151a] transition hover:bg-[var(--mc-copper-400)]"
                                        >
                                            Get Started
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--mc-text-primary)] transition hover:bg-[var(--mc-bg-surface-raised)]"
                                        >
                                            Log in
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map(({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="rounded-[var(--radius-lg)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] p-6 transition hover:border-[var(--mc-border-strong)]"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-[var(--mc-copper-50)]">
                                        <Icon
                                            size={19}
                                            strokeWidth={1.75}
                                            className="text-[var(--mc-copper-500)]"
                                        />
                                    </div>
                                    <h2 className="font-display mt-4 text-base font-semibold">
                                        {title}
                                    </h2>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--mc-text-secondary)]">
                                        {description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </main>

                    <footer className="border-t border-[var(--mc-border)] py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
                        ZeroG Network · Powered by NeoEssentials
                    </footer>
                </div>
            </div>
        </>
    );
}