import { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ShieldCheck,
    Coins,
    Package,
    Sparkles,
    DatabaseBackup,
    Terminal,
    Search,
} from 'lucide-react';
import { FormEventHandler } from 'react';
import Panel from '@/Components/Home/Panel';
import PageHeader from '@/Components/Home/PageHeader';
import DiscordAuthButton from '@/Components/DiscordAuthButton';
import PlayerRender from '@/Components/PlayerRender';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

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
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false as boolean,
    });

    // Mirrors EnsureAccountLinked/DashboardLayout's own check — a non-admin who
    // isn't fully linked yet gets redirected to Profile the moment they hit
    // /dashboard anyway, so the button here says where they're actually going
    // instead of always claiming "Dashboard".
    const isAdmin = auth.user?.role === 'admin';
    const isLinked = isAdmin || (!!auth.user?.mc_uuid && !!auth.user?.discord_id);
    const homeDestination = isLinked ? route('dashboard') : route('profile.edit');
    const homeLabel = isLinked ? 'Dashboard' : 'Profile';
    const homeCta = isLinked ? 'Open Dashboard' : 'Go to Profile';

    const submitLogin: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="ZeroG Network Dashboard" />
            <div className="min-h-screen bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
                <div className="mx-auto max-w-6xl px-6">
                    <header className="flex items-center justify-between py-8">
                        <div className="flex items-center gap-2">
                            <img src="/images/logo.png" alt="" className="h-7 w-7 object-contain" />
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
                                    href={homeDestination}
                                    className="btn-pop rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2 text-sm font-medium text-[#12151a] transition hover:bg-[var(--mc-cyan-400)]"
                                >
                                    {homeLabel}
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
                                        className="btn-pop rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2 text-sm font-medium text-[#12151a] transition hover:bg-[var(--mc-cyan-400)]"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main>
                        <div className="py-16 text-center sm:py-20">
                            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                                Run your NeoEssentials server
                                <br />
                                <span className="bg-gradient-to-r from-[var(--mc-cyan-400)] to-[var(--mc-purple-400)] bg-clip-text text-transparent">
                                    from one dashboard
                                </span>
                            </h1>
                            <p className="mx-auto mt-5 max-w-xl text-base text-[var(--mc-text-secondary)]">
                                Moderation, economy, kits, holograms, and
                                permissions — everything NeoEssentials tracks
                                in-game, managed remotely with the same data,
                                the same rules, and the same audit trail.
                            </p>
                        </div>

                        {/* Three-panel row, in the spirit of BanManager WebUI's
                            home layout: matched, bordered, rounded-3xl cards
                            with an eyebrow/title header and a CTA pinned to
                            the bottom of each. */}
                        <div className="flex flex-wrap gap-4 pb-4">
                            <div className="w-full lg:w-[calc(33.333%-0.667rem)]">
                                <Panel>
                                    <PageHeader
                                        eyebrow="ZeroG Network"
                                        title="NeoEssentials"
                                    />
                                    <p className="text-center text-sm leading-relaxed text-[var(--mc-text-secondary)]">
                                        A control room for the mod running on
                                        your server — moderation, economy,
                                        and world tools, all backed by the
                                        same data players see in-game.
                                    </p>
                                    <Link
                                        href={
                                            auth.user
                                                ? homeDestination
                                                : route('register')
                                        }
                                        className="btn-pop mt-auto inline-flex w-full items-center justify-center rounded-3xl bg-[var(--mc-cyan-500)] px-6 py-2 text-sm font-semibold text-[#12151a] transition hover:bg-[var(--mc-cyan-400)]"
                                    >
                                        {auth.user ? homeCta : 'Get Started'}
                                    </Link>
                                </Panel>
                            </div>

                            <div className="w-full lg:w-[calc(33.333%-0.667rem)]">
                                <Panel>
                                    <PageHeader
                                        eyebrow="Quick Access"
                                        title="Player Lookup"
                                    />
                                    <p className="text-center text-sm leading-relaxed text-[var(--mc-text-secondary)]">
                                        Check a player's ban, mute, and kick
                                        history without logging in — the same
                                        public lookup staff and players both
                                        use.
                                    </p>
                                    <Link
                                        href={route('lookup')}
                                        className="btn-pop mt-auto inline-flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-[var(--mc-border-strong)] px-6 py-2 text-sm font-semibold text-[var(--mc-text-primary)] transition hover:bg-[var(--mc-bg-surface-raised)]"
                                    >
                                        <Search size={16} strokeWidth={1.75} />
                                        Look up a player
                                    </Link>
                                </Panel>
                            </div>

                            <div className="w-full lg:w-[calc(33.333%-0.667rem)]">
                                <Panel>
                                    <PageHeader
                                        eyebrow={
                                            auth.user
                                                ? 'Welcome back'
                                                : 'Get Started'
                                        }
                                        title={
                                            auth.user
                                                ? auth.user.name
                                                : 'Sign In'
                                        }
                                    />
                                    {auth.user ? (
                                        <>
                                            {auth.user.mc_uuid && (
                                                <div className="mx-auto mb-1">
                                                    <PlayerRender uuid={auth.user.mc_uuid} size={140} />
                                                </div>
                                            )}
                                            <p className="text-center text-sm leading-relaxed text-[var(--mc-text-secondary)]">
                                                You're signed in as{' '}
                                                {auth.user.email}. Jump back
                                                into the dashboard to keep
                                                managing your server.
                                            </p>
                                            <Link
                                                href={homeDestination}
                                                className="btn-pop mt-auto inline-flex w-full items-center justify-center rounded-3xl bg-[var(--mc-cyan-500)] px-6 py-2 text-sm font-semibold text-[#12151a] transition hover:bg-[var(--mc-cyan-400)]"
                                            >
                                                {homeCta}
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <form
                                                onSubmit={submitLogin}
                                                className="flex flex-1 flex-col"
                                            >
                                                <div>
                                                    <InputLabel
                                                        htmlFor="home-login"
                                                        value="Email or Minecraft username"
                                                        className="text-xs"
                                                    />
                                                    <TextInput
                                                        id="home-login"
                                                        type="text"
                                                        name="login"
                                                        value={data.login}
                                                        className="mt-1 block w-full text-sm"
                                                        autoComplete="username"
                                                        onChange={(e) =>
                                                            setData(
                                                                'login',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    <InputError
                                                        message={errors.login}
                                                        className="mt-1"
                                                    />
                                                </div>

                                                <div className="mt-3">
                                                    <InputLabel
                                                        htmlFor="home-password"
                                                        value="Password"
                                                        className="text-xs"
                                                    />
                                                    <TextInput
                                                        id="home-password"
                                                        type="password"
                                                        name="password"
                                                        value={data.password}
                                                        className="mt-1 block w-full text-sm"
                                                        autoComplete="current-password"
                                                        onChange={(e) =>
                                                            setData(
                                                                'password',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.password
                                                        }
                                                        className="mt-1"
                                                    />
                                                </div>

                                                <div className="mt-2 text-right">
                                                    <Link
                                                        href={route(
                                                            'password.request',
                                                        )}
                                                        className="text-xs text-[var(--mc-text-muted)] underline hover:text-[var(--mc-text-secondary)]"
                                                    >
                                                        Forgot your password?
                                                    </Link>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={processing}
                                                    className="btn-pop mt-auto inline-flex w-full items-center justify-center rounded-3xl bg-[var(--mc-cyan-500)] px-6 py-2 text-sm font-semibold text-[#12151a] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-60"
                                                >
                                                    Log in
                                                </button>
                                            </form>
                                            <DiscordAuthButton label="Continue with Discord" />
                                        </>
                                    )}
                                </Panel>
                            </div>
                        </div>

                        {/* Feature strip below the panel row, echoing the
                            BanManager stats strip: a full-width grid of
                            bordered, rounded-3xl icon tiles. */}
                        <div className="grid gap-4 pb-24 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map(({ icon: Icon, title, description }, i) => (
                                <div
                                    key={title}
                                    className="rounded-3xl border-2 border-[var(--mc-border)] bg-[var(--mc-bg-surface)] p-6 transition hover:border-[var(--mc-border-strong)]"
                                >
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius)] ${
                                            i % 2 === 0 ? 'bg-[var(--mc-cyan-50)]' : 'bg-[var(--mc-purple-50)]'
                                        }`}
                                    >
                                        <Icon
                                            size={19}
                                            strokeWidth={1.75}
                                            className={i % 2 === 0 ? 'text-[var(--mc-cyan-400)]' : 'text-[var(--mc-purple-400)]'}
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
