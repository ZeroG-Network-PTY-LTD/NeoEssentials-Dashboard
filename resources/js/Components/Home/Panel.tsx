import { PropsWithChildren } from 'react';

export default function Panel({
    className = '',
    children,
}: PropsWithChildren<{ className?: string }>) {
    return (
        <div
            className={`flex h-full flex-col rounded-3xl border-2 border-[var(--mc-border)] bg-[var(--mc-bg-surface)] p-6 ${className}`}
        >
            {children}
        </div>
    );
}
