import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Copy, Unlink } from 'lucide-react';

/**
 * New this pass — no existing equivalent. Lets any dashboard account (however it was created)
 * prove ownership of a Minecraft account via a short in-game code, the reverse direction of
 * DiscordConnectionForm's OAuth-only path (which requires the player to already be linked to
 * Discord in-game first). Same code+poll UX as the internal (mod-bundled) dashboard's own
 * Settings page — see webdashboard-ui/src/pages/Settings.tsx.
 */
export default function MinecraftLinkForm({ className = '' }: { className?: string }) {
    const user = usePage().props.auth.user;
    const [mcUuid, setMcUuid] = useState<string | null>(user.mc_uuid ?? null);
    const [mcUsername, setMcUsername] = useState<string | null>(user.mc_username ?? null);
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [linking, setLinking] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    const startLink = async () => {
        setLinking(true);
        try {
            const res = await fetch(route('profile.minecraft-link.start'), {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message ?? 'Could not start linking.');
                return;
            }
            setLinkCode(data.result.code);

            pollRef.current = setInterval(async () => {
                const statusRes = await fetch(route('profile.minecraft-link.status'), {
                    headers: { Accept: 'application/json' },
                });
                const status = await statusRes.json();
                if (status.linked) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setLinkCode(null);
                    setMcUuid(status.mcUuid ?? null);
                    setMcUsername(status.mcUsername ?? null);
                }
            }, 3000);
        } finally {
            setLinking(false);
        }
    };

    const unlink = async () => {
        if (!confirm('Unlink this Minecraft account from your dashboard account?')) return;
        await fetch(route('profile.minecraft-link.unlink'), {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        setMcUuid(null);
        setMcUsername(null);
    };

    const copyCode = () => {
        if (linkCode) navigator.clipboard.writeText(linkCode).catch(() => {});
    };

    return (
        <section className={className}>
            <header>
                <h2 className="font-display text-[14px] font-semibold text-[var(--mc-text-primary)]">
                    Minecraft account
                </h2>
                <p className="mt-1 text-[13px] text-[var(--mc-text-muted)]">
                    Link your Minecraft account to this dashboard account with an in-game code.
                </p>
            </header>

            <div className="mt-4">
                {mcUuid ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={`https://mc-heads.net/avatar/${mcUuid}/40`}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-[8px] border border-[var(--mc-border-strong)] [image-rendering:pixelated]"
                        />
                        <div className="flex-1 text-[13px] font-medium">{mcUsername}</div>
                        <button
                            type="button"
                            onClick={unlink}
                            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 py-2 text-[13px] font-medium text-[var(--mc-text-secondary)] transition hover:bg-[var(--mc-bg-surface-raised)]"
                        >
                            <Unlink size={14} /> Unlink
                        </button>
                    </div>
                ) : linkCode ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-[13px] text-[var(--mc-text-secondary)]">
                            Run this command in-game to finish linking (expires in 5 minutes):
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-[var(--radius)] border border-[var(--mc-border-strong)] bg-[var(--mc-bg-surface-raised)] px-3 py-2 text-center font-data text-[15px] tracking-wider text-[var(--mc-cyan-400)]">
                                /linkaccount {linkCode}
                            </code>
                            <button
                                type="button"
                                onClick={copyCode}
                                title="Copy code"
                                className="rounded-[var(--radius)] border border-[var(--mc-border-strong)] p-2 transition hover:bg-[var(--mc-bg-surface-raised)]"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                        <p className="text-[12px] text-[var(--mc-text-muted)]">Waiting for you to run the command…</p>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={startLink}
                        disabled={linking}
                        className="rounded-[var(--radius)] bg-[var(--mc-moss-500)] px-4 py-2 text-sm font-medium text-[#0a1620] transition hover:bg-[var(--mc-moss-400)] disabled:opacity-50"
                    >
                        {linking ? 'Starting…' : 'Link Minecraft account'}
                    </button>
                )}
            </div>
        </section>
    );
}
