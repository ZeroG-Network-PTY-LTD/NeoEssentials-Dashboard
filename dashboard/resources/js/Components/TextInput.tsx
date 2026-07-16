import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-[var(--radius)] border-[var(--mc-border)] bg-[var(--mc-bg-surface-raised)] text-[var(--mc-text-primary)] shadow-sm placeholder:text-[var(--mc-text-muted)] focus:border-[var(--mc-cyan-500)] focus:ring-[var(--mc-cyan-500)] ' +
                className
            }
            ref={localRef}
        />
    );
});
