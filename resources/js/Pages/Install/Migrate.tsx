import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import InstallLayout from '@/Layouts/InstallLayout';
import { Database, ArrowRight } from 'lucide-react';

export default function Migrate() {
    const [running, setRunning] = useState(false);

    const run = () => {
        setRunning(true);
        router.post(route('install.migrate.run'), {}, {
            preserveScroll: true,
            onFinish: () => setRunning(false),
        });
    };

    return (
        <InstallLayout step={3} title="Set up the database" subtitle="Creates every table this dashboard needs.">
            <Head title="Setup — Database" />

            <p className="mb-5 text-[13px] text-[var(--mc-text-secondary)]">
                This runs the app's migrations against the database connection you just configured. Safe to run more than
                once if something fails partway through.
            </p>

            <button
                onClick={run}
                disabled={running}
                className="btn-pop flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2.5 text-sm font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
                <Database size={15} />
                {running ? 'Running migrations…' : 'Run migrations'}
                {!running && <ArrowRight size={15} />}
            </button>
        </InstallLayout>
    );
}
