import { Head, useForm } from '@inertiajs/react';
import InstallLayout from '@/Layouts/InstallLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { FileText, KeyRound, Terminal } from 'lucide-react';

export default function Token() {
    const { data, setData, post, processing, errors } = useForm({ token: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.token'));
    };

    return (
        <InstallLayout step={0} title="Verify setup access" subtitle="Prove you have file access to this hosting account before continuing.">
            <Head title="Setup — Verify access" />

            <div className="mb-3 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-3.5 text-[12.5px] text-[var(--mc-text-secondary)]">
                <Terminal size={16} className="shrink-0 mt-0.5 text-[var(--mc-cyan-400)]" />
                <div>
                    <strong className="text-[var(--mc-text-primary)]">Have SSH access (a VPS or your own server)?</strong>{' '}
                    Run <code className="font-data text-[var(--mc-cyan-400)]">php artisan install:token</code> from the
                    project folder and paste what it prints below — no need to hunt down a file over FTP.
                </div>
            </div>

            <div className="mb-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-3.5 text-[12.5px] text-[var(--mc-text-secondary)]">
                <FileText size={16} className="shrink-0 mt-0.5 text-[var(--mc-cyan-400)]" />
                <div>
                    <strong className="text-[var(--mc-text-primary)]">No shell access (shared/cPanel hosting)?</strong> The
                    same one-time token has also been written to{' '}
                    <code className="font-data text-[var(--mc-cyan-400)]">storage/app/install-token.txt</code>. Open it with
                    your host's file manager (or FTP/SFTP) and paste its contents below.
                </div>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="token" value="Setup token" />
                    <TextInput
                        id="token"
                        type="text"
                        value={data.token}
                        onChange={(e) => setData('token', e.target.value)}
                        className="mt-1 block w-full font-data"
                        autoFocus
                        autoComplete="off"
                    />
                    <InputError message={errors.token} className="mt-2" />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="btn-pop flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2.5 text-sm font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
                >
                    <KeyRound size={15} />
                    Continue
                </button>
            </form>
        </InstallLayout>
    );
}
