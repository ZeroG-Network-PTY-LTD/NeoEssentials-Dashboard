import { Head, useForm } from '@inertiajs/react';
import InstallLayout from '@/Layouts/InstallLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Gamepad2, KeyRound } from 'lucide-react';

export default function ApiKey() {
    const { data, setData, post, processing, errors } = useForm({ apiKey: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.api-key'));
    };

    return (
        <InstallLayout step={1} title="Connect to your Minecraft server" subtitle="Prove you control the server this dashboard will manage before continuing.">
            <Head title="Setup — Connect to your server" />

            <div className="mb-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-3.5 text-[12.5px] text-[var(--mc-text-secondary)]">
                <Gamepad2 size={16} className="shrink-0 mt-0.5 text-[var(--mc-cyan-400)]" />
                <div>
                    <strong className="text-[var(--mc-text-primary)]">On your Minecraft server's console (or in-game, if you're OP), run:</strong>{' '}
                    <code className="font-data text-[var(--mc-cyan-400)]">/apikey create</code>. Paste the key it prints
                    below — this connects the dashboard to your server and doubles as proof you're the one running it.
                </div>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="apiKey" value="API key" />
                    <TextInput
                        id="apiKey"
                        type="text"
                        value={data.apiKey}
                        onChange={(e) => setData('apiKey', e.target.value)}
                        className="mt-1 block w-full font-data"
                        autoFocus
                        autoComplete="off"
                        placeholder="neo_..."
                    />
                    <InputError message={errors.apiKey} className="mt-2" />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="btn-pop flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2.5 text-sm font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                >
                    <KeyRound size={15} />
                    Connect
                </button>
            </form>
        </InstallLayout>
    );
}
