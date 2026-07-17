import { Head, useForm, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import InstallLayout from '@/Layouts/InstallLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { PlugZap, ArrowRight, SkipForward, Link2, Copy, Check, RefreshCw } from 'lucide-react';

interface Pairing {
    code: string;
    dashboardUrl: string;
    command: string;
    expiresInSeconds: number;
}

interface Props {
    mcApi: { url: string | null; paired: boolean };
    pairing?: Pairing;
}

export default function McApi({ mcApi, pairing }: Props) {
    const [testing, setTesting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [waitingForPairing, setWaitingForPairing] = useState(!!pairing);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const urlForm = useForm({ url: mcApi.url ?? 'http://127.0.0.1:8642' });

    const saveUrl = (e: React.FormEvent) => {
        e.preventDefault();
        urlForm.post(route('install.mc-api.url'), { preserveScroll: true, preserveState: true });
    };

    const testConnection = () => {
        setTesting(true);
        router.post(route('install.mc-api.test'), {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setTesting(false),
        });
    };

    const generateCode = () => {
        setGenerating(true);
        router.post(route('install.mc-api.pairing.start'), {}, {
            preserveScroll: true,
            onSuccess: () => setWaitingForPairing(true),
            onFinish: () => setGenerating(false),
        });
    };

    const copyCommand = async () => {
        if (!pairing) return;
        await navigator.clipboard.writeText(pairing.command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const continueWizard = () => router.post(route('install.mc-api.continue'));

    // Poll pairing status while a code is showing and we haven't confirmed the mod side yet.
    useEffect(() => {
        if (!waitingForPairing || mcApi.paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(route('install.mc-api.pairing.status'), {
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
        <InstallLayout step={4} title="Connect to the Minecraft server" subtitle="The mod's embedded API — you can also configure or change this later in Configuration.">
            <Head title="Setup — Mod API" />

            <div className="flex flex-col gap-4">
                <form onSubmit={saveUrl} className="flex flex-col gap-1">
                    <InputLabel htmlFor="url" value="Mod API URL" />
                    <div className="flex gap-1.5">
                        <TextInput
                            id="url"
                            type="url"
                            value={urlForm.data.url}
                            onChange={(e) => urlForm.setData('url', e.target.value)}
                            className="block w-full font-data"
                        />
                        <button
                            type="submit"
                            disabled={urlForm.processing}
                            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                    <InputError message={urlForm.errors.url} className="mt-1" />
                </form>

                <div className="rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-3">
                    {mcApi.paired ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-[12.5px] text-[var(--mc-moss-400)] font-medium">✓ Paired with the Minecraft server.</p>
                            <button
                                type="button"
                                onClick={testConnection}
                                disabled={testing}
                                className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-4 py-2 text-[13px] font-medium transition hover:bg-[var(--mc-bg-surface)] disabled:opacity-50"
                            >
                                <PlugZap size={14} />
                                {testing ? 'Testing…' : 'Test connection'}
                            </button>
                        </div>
                    ) : pairing && waitingForPairing ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-[12.5px] text-[var(--mc-text-secondary)]">
                                Run this on the Minecraft server's console (or in-game, if OP) within 10 minutes:
                            </p>
                            <div className="flex gap-1.5">
                                <input
                                    readOnly
                                    value={pairing.command}
                                    className="flex-1 font-data text-[12px] bg-[var(--mc-bg-base)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-cyan-400)]"
                                />
                                <button
                                    type="button"
                                    onClick={copyCommand}
                                    className="flex shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 transition-colors hover:bg-[var(--mc-bg-base)]"
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
                        <div className="flex flex-col gap-2">
                            <p className="text-[12.5px] text-[var(--mc-text-muted)]">
                                Generates a one-time code that pairs this dashboard with the mod in one step — no keys to
                                copy by hand.
                            </p>
                            <button
                                type="button"
                                onClick={generateCode}
                                disabled={generating}
                                className="btn-pop flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2 text-[13px] font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                            >
                                <Link2 size={14} />
                                {generating ? 'Generating…' : 'Generate pairing code'}
                            </button>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={continueWizard}
                    className="btn-pop flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2.5 text-sm font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)]"
                >
                    {mcApi.paired ? (
                        <>Continue <ArrowRight size={15} /></>
                    ) : (
                        <><SkipForward size={15} /> Skip for now — the server isn't ready yet</>
                    )}
                </button>
            </div>
        </InstallLayout>
    );
}
