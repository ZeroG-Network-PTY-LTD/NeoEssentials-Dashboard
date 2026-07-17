import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center rounded-[var(--radius)] border border-transparent bg-[var(--mc-cyan-500)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#12151a] transition duration-150 ease-in-out hover:bg-[var(--mc-cyan-400)] focus:bg-[var(--mc-cyan-400)] focus:outline-none focus:ring-2 focus:ring-[var(--mc-cyan-500)] focus:ring-offset-2 focus:ring-offset-[var(--mc-bg-surface)] active:bg-[var(--mc-cyan-600)] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
