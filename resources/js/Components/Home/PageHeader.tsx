export default function PageHeader({
    eyebrow,
    title,
}: {
    eyebrow: string;
    title: string;
}) {
    return (
        <div>
            <h2 className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-[var(--mc-text-muted)]">
                {eyebrow}
            </h2>
            <div className="mb-4 flex flex-col items-center border-b border-[var(--mc-cyan-500)]/40 pb-4 text-center">
                <h1 className="font-display text-2xl font-semibold">{title}</h1>
            </div>
        </div>
    );
}
