import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import InstallLayout from '@/Layouts/InstallLayout';
import { PartyPopper, ArrowRight } from 'lucide-react';

export default function Finish() {
    const [finishing, setFinishing] = useState(false);

    const finish = () => {
        setFinishing(true);
        router.post(route('install.finish.run'));
    };

    return (
        <InstallLayout step={4} title="Almost done" subtitle="This locks setup — it can't be run again after this.">
            <Head title="Setup — Finish" />

            <div className="mb-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] p-3.5 text-[12.5px] text-[var(--mc-text-secondary)]">
                <PartyPopper size={16} className="shrink-0 mt-0.5 text-[var(--mc-cyan-400)]" />
                <div>
                    Finishing writes <code className="font-data text-[var(--mc-cyan-400)]">storage/installed.lock</code> and
                    removes the setup token — you'll land on the registration page next, and the first account you create
                    becomes admin automatically.
                </div>
            </div>

            <button
                onClick={finish}
                disabled={finishing}
                className="btn-pop flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] px-4 py-2.5 text-sm font-semibold text-[#0a1620] transition hover:bg-[var(--mc-cyan-400)] disabled:opacity-50"
            >
                {finishing ? 'Finishing…' : 'Finish setup'}
                {!finishing && <ArrowRight size={15} />}
            </button>
        </InstallLayout>
    );
}
