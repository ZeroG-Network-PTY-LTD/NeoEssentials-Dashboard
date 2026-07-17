import { HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            className={'text-sm text-[var(--mc-ember-500)] ' + className}
        >
            {message}
        </p>
    ) : null;
}
