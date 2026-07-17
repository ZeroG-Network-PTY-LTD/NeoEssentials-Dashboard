import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center rounded-md border border-[var(--mc-border-strong)] bg-[var(--mc-bg-surface-raised)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--mc-text-secondary)] shadow-sm transition duration-150 ease-in-out hover:bg-[var(--mc-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--mc-cyan-500)] focus:ring-offset-2 focus:ring-offset-[var(--mc-bg-surface)] disabled:opacity-25 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
