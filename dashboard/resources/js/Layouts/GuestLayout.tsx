import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--mc-bg-base)] px-4 py-10">
            <Link
                href="/"
                className="flex items-center gap-2 text-[var(--mc-text-primary)] transition hover:text-[var(--mc-cyan-500)]"
            >
                <svg
                    className="h-8 w-8 text-[var(--mc-cyan-500)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M3 6.5 12 11l9-4.5M12 11v11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
                <span className="font-display text-lg font-semibold tracking-tight">
                    ZeroG Network
                </span>
            </Link>

            <div className="mt-8 w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--mc-border)] bg-[var(--mc-bg-surface)] px-6 py-8 shadow-2xl shadow-black/40 sm:max-w-md">
                {children}
            </div>

            <p className="mt-6 text-[13px] text-[var(--mc-text-muted)]">
                Powered by NeoEssentials
            </p>
        </div>
    );
}