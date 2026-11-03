import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <h1 className="font-display text-xl font-semibold text-[var(--mc-text-primary)]">
                Verify your email
            </h1>
            <div className="mb-4 mt-1 text-sm text-[var(--mc-text-secondary)]">
                Thanks for signing up! Before getting started, could you verify
                your email address by clicking on the link we just emailed to
                you? If you didn't receive the email, we will gladly send you
                another.
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-[var(--radius)] border border-[var(--mc-moss-400)] bg-[var(--mc-moss-50)] px-3 py-2 text-sm font-medium text-[var(--mc-moss-500)]">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mt-4 flex items-center justify-between">
                    <PrimaryButton disabled={processing}>
                        Resend Verification Email
                    </PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md text-sm text-[var(--mc-text-secondary)] underline hover:text-[var(--mc-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--mc-cyan-500)] focus:ring-offset-2 focus:ring-offset-[var(--mc-bg-surface)]"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
