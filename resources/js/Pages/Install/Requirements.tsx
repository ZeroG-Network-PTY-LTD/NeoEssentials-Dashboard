import { Head, Link } from '@inertiajs/react';
import InstallLayout from '@/Layouts/InstallLayout';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface Check {
    label: string;
    ok: boolean;
    detail: string;
}

export default function Requirements({ checks, allPassed }: { checks: Check[]; allPassed: boolean }) {
    return (
        <InstallLayout step={2} title="Requirements check" subtitle="Confirms this hosting environment can run the dashboard.">
            <Head title="Setup — Requirements" />

            <div className="flex flex-col divide-y divide-[var(--mc-border)] rounded-[var(--radius)] border border-[var(--mc-border)] overflow-hidden mb-5">
                {checks.map((c) => (
                    <div key={c.label} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                        {c.ok ? (
                            <CheckCircle2 size={15} className="shrink-0 text-[var(--mc-moss-400)]" />
                        ) : (
                            <XCircle size={15} className="shrink-0 text-[var(--mc-ember-500)]" />
                        )}
                        <span className="font-medium">{c.label}</span>
                        <span className="ml-auto text-[12px] text-[var(--mc-text-muted)] text-right">{c.detail}</span>
                    </div>
                ))}
            </div>

            {!allPassed && (
                <p className="mb-4 text-[12.5px] text-[var(--mc-ember-500)]">
                    Fix the failing checks above (usually a directory permission — chmod 775 on the flagged folder) and reload this
                    page.
                </p>
            )}

            <Link
                href={route('install.environment')}
                className={`btn-pop flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-semibold transition ${
                    allPassed
                        ? 'bg-[var(--mc-cyan-500)] text-[#0a1620] hover:bg-[var(--mc-cyan-400)]'
                        : 'pointer-events-none bg-[var(--mc-bg-surface-raised)] text-[var(--mc-text-muted)]'
                }`}
            >
                Continue
                <ArrowRight size={15} />
            </Link>
        </InstallLayout>
    );
}
