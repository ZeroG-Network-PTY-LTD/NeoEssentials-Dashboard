import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import InstallLayout from '@/Layouts/InstallLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { PlugZap, ArrowRight, SkipForward, KeyRound, Copy, Check } from 'lucide-react';

/**
 * A random 32-byte key, hex-encoded — used as the service account's
 * password. Generated client-side (Web Crypto, not Math.random) since it
 * never needs to leave the browser except into the two systems being
 * paired; the server never sees or stores it before the admin submits it.
 */
function generateKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function McApi() {
    const [testing, setTesting] = useState(false);
    const [copied, setCopied] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        url: 'http://127.0.0.1:8642',
        username: 'dashboard-service',
        password: '',
    });

    const generate = () => {
        setData('password', generateKey());
        setCopied(false);
    };

    const copyKey = async () => {
        if (!data.password) return;
        await navigator.clipboard.writeText(data.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const testConnection = () => {
        setTesting(true);
        router.post(route('install.mc-api.test'), data, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setTesting(false),
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.mc-api.save'));
    };

    const skip = () => router.post(route('install.mc-api.save'), { url: '', username: '', password: '' });

    return (
        <InstallLayout step={4} title="Connect to the Minecraft server" subtitle="The mod's embedded API — you can also configure or change this later in Updates.">
            <Head title="Setup — Mod API" />

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="url" value="Mod API URL" />
                    <TextInput
                        id="url"
                        type="url"
                        value={data.url}
                        onChange={(e) => setData('url', e.target.value)}
                        className="mt-1 block w-full font-data"
                    />
                    <InputError message={errors.url} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="username" value="Service account username" />
                    <TextInput
                        id="username"
                        value={data.username}
                        onChange={(e) => setData('username', e.target.value)}
                        className="mt-1 block w-full font-data"
                    />
                    <p className="mt-1 text-[11.5px] text-[var(--mc-text-muted)]">
                        Create this via the mod's own dashboard (<code className="font-data">POST /api/auth/users</code>) — don't
                        reuse the bootstrap admin account.
                    </p>
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Service account key" />
                    <div className="mt-1 flex gap-1.5">
                        <TextInput
                            id="password"
                            type="text"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="block w-full font-data"
                            placeholder="Generate a key, or paste one you already created"
                        />
                        <button
                            type="button"
                            onClick={generate}
                            title="Generate a random key"
                            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
                        >
                            <KeyRound size={14} />
                            Generate
                        </button>
                        {data.password && (
                            <button
                                type="button"
                                onClick={copyKey}
                                title="Copy to clipboard"
                                className="flex shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-3 transition-colors hover:bg-[var(--mc-bg-surface-raised)]"
                            >
                                {copied ? <Check size={14} className="text-[var(--mc-moss-400)]" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>
                    <InputError message={errors.password} className="mt-1" />
                    <div className="mt-1.5 rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-2.5 text-[11.5px] text-[var(--mc-text-muted)]">
                        <p>
                            This is a one-time shared key, not a real password you need to remember — generate it here, then
                            give it (with the username above) to the mod so the two sides can pair:
                        </p>
                        <pre className="mt-1.5 overflow-x-auto rounded-[6px] bg-[var(--mc-bg-base)] p-2 font-data text-[11px] text-[var(--mc-cyan-400)]">
{`POST /api/auth/users
{ "username": "${data.username || '...'}", "password": "${data.password || '...'}", "role": "ADMIN" }`}
                        </pre>
                        <p className="mt-1.5">on the mod's own dashboard. Neither side trusts the other until both have the matching value.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={testConnection}
                        disabled={testing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50"
                    >
                        <PlugZap size={15} />
                        {testing ? 'Testing…' : 'Test connection'}
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="btn-pop flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2.5 text-sm font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                    >
                        Save & continue
                        <ArrowRight size={15} />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={skip}
                    className="flex items-center justify-center gap-2 text-[12.5px] text-[var(--mc-text-muted)] hover:text-[var(--mc-text-secondary)] transition-colors"
                >
                    <SkipForward size={13} />
                    Skip for now — the server isn't ready yet
                </button>
            </form>
        </InstallLayout>
    );
}
