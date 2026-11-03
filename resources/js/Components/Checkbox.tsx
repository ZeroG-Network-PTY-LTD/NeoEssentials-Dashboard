import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] text-[var(--mc-cyan-500)] shadow-sm focus:ring-[var(--mc-cyan-500)] focus:ring-offset-[var(--mc-bg-surface)] ' +
                className
            }
        />
    );
}
