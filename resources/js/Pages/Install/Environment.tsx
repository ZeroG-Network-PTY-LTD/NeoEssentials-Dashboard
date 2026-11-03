import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import InstallLayout from '@/Layouts/InstallLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Database, ArrowRight, PlugZap } from 'lucide-react';

export default function Environment({ driver }: { driver: string }) {
    const [dbDriver, setDbDriver] = useState<'sqlite' | 'mysql'>(driver === 'mysql' ? 'mysql' : 'sqlite');
    const [testing, setTesting] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        appUrl: typeof window !== 'undefined' ? window.location.origin : '',
        driver: dbDriver,
        host: '127.0.0.1',
        port: '3306',
        database: '',
        username: '',
        password: '',
    });

    const testConnection = () => {
        setTesting(true);
        router.post(route('install.environment.test'), { ...data, driver: dbDriver }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setTesting(false),
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('install.environment.save'));
    };

    return (
        <InstallLayout step={3} title="Environment" subtitle="App URL and database connection.">
            <Head title="Setup — Environment" />

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="appUrl" value="App URL" />
                    <TextInput
                        id="appUrl"
                        type="url"
                        value={data.appUrl}
                        onChange={(e) => setData('appUrl', e.target.value)}
                        className="mt-1 block w-full font-data"
                    />
                    <InputError message={errors.appUrl} className="mt-2" />
                </div>

                <div>
                    <InputLabel value="Database" />
                    <div className="mt-1.5 flex gap-2">
                        {(['sqlite', 'mysql'] as const).map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => { setDbDriver(d); setData('driver', d); }}
                                className={`flex-1 rounded-[var(--radius)] border px-3 py-2 text-[13px] font-medium capitalize transition-colors ${
                                    dbDriver === d
                                        ? 'border-[var(--mc-cyan-500)] bg-[var(--mc-cyan-50)] text-[var(--mc-cyan-400)]'
                                        : 'border-[var(--mc-border-strong)] text-[var(--mc-text-secondary)] hover:bg-[var(--mc-bg-surface-raised)]'
                                }`}
                            >
                                {d === 'sqlite' ? 'SQLite (zero-config)' : 'MySQL'}
                            </button>
                        ))}
                    </div>
                </div>

                {dbDriver === 'mysql' && (
                    <div className="grid grid-cols-2 gap-3 rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-3.5">
                        <div className="col-span-2 sm:col-span-1">
                            <InputLabel htmlFor="host" value="Host" />
                            <TextInput id="host" value={data.host} onChange={(e) => setData('host', e.target.value)} className="mt-1 block w-full font-data" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <InputLabel htmlFor="port" value="Port" />
                            <TextInput id="port" value={data.port} onChange={(e) => setData('port', e.target.value)} className="mt-1 block w-full font-data" />
                        </div>
                        <div className="col-span-2">
                            <InputLabel htmlFor="database" value="Database name" />
                            <TextInput id="database" value={data.database} onChange={(e) => setData('database', e.target.value)} className="mt-1 block w-full font-data" />
                            <InputError message={errors.database} className="mt-1" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <InputLabel htmlFor="username" value="Username" />
                            <TextInput id="username" value={data.username} onChange={(e) => setData('username', e.target.value)} className="mt-1 block w-full font-data" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <InputLabel htmlFor="password" value="Password" />
                            <TextInput id="password" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} className="mt-1 block w-full font-data" />
                        </div>
                    </div>
                )}

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
                        <Database size={15} />
                        Save & continue
                        <ArrowRight size={15} />
                    </button>
                </div>
            </form>
        </InstallLayout>
    );
}
