import { PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { Check } from 'lucide-react';

const STEPS = ['Requirements', 'Environment', 'Database', 'Mod API', 'Finish'];

export default function InstallLayout({
    step,
    title,
    subtitle,
    children,
}: PropsWithChildren<{ step: number; title: string; subtitle?: string }>) {
    const { props } = usePage<PageProps>();

    return (
        <div className="min-h-screen bg-[var(--mc-bg-base)] text-[var(--mc-text-primary)]">
            <div className="mx-auto max-w-2xl px-6 py-10">
                <div className="flex items-center gap-2 mb-8">
                    <img src="/images/logo.png" alt="" className="h-7 w-7 object-contain" />
                    <span className="font-display text-lg font-semibold tracking-tight">
                        ZeroG Network — Setup
                    </span>
                </div>

                {step > 0 && (
                    <div className="flex items-center gap-1.5 mb-8">
                        {STEPS.map((label, i) => {
                            const num = i + 1;
                            const done = num < step;
                            const active = num === step;
                            return (
                                <div key={label} className="flex flex-1 items-center gap-1.5">
                                    <div
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
                                            done
                                                ? 'bg-[var(--mc-moss-500)] text-[#0a1620]'
                                                : active
                                                ? 'bg-[var(--mc-cyan-500)] text-[#0a1620]'
                                                : 'bg-[var(--mc-bg-surface-raised)] text-[var(--mc-text-muted)]'
                                        }`}
                                    >
                                        {done ? <Check size={13} strokeWidth={2.5} /> : num}
                                    </div>
                                    {num < STEPS.length && (
                                        <div className={`h-px flex-1 ${done ? 'bg-[var(--mc-moss-500)]' : 'bg-[var(--mc-border)]'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {props.flash?.success && (
                    <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--mc-moss-400,var(--mc-moss-500))] bg-[var(--mc-moss-50)] px-4 py-3 text-[13px] text-[var(--mc-moss-500)]">
                        {props.flash.success}
                    </div>
                )}
                {props.flash?.error && (
                    <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--mc-ember-400)] bg-[var(--mc-ember-50)] px-4 py-3 text-[13px] text-[var(--mc-ember-500)] whitespace-pre-wrap max-h-64 overflow-auto">
                        {props.flash.error}
                    </div>
                )}

                <div className="dash-card p-6">
                    <h1 className="font-display text-xl font-semibold">{title}</h1>
                    {subtitle && <p className="mt-1 text-[13px] text-[var(--mc-text-secondary)]">{subtitle}</p>}
                    <div className="mt-5">{children}</div>
                </div>
            </div>
        </div>
    );
}
