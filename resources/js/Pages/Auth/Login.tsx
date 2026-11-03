import Checkbox from '@/Components/Checkbox';
import DiscordAuthButton from '@/Components/DiscordAuthButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { props } = usePage<PageProps>();
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            <h1 className="font-display text-xl font-semibold text-[var(--mc-text-primary)]">
                Welcome back
            </h1>
            <p className="mt-1 text-sm text-[var(--mc-text-secondary)]">
                Log in to manage your server.
            </p>

            {status && (
                <div className="mb-4 mt-4 rounded-[var(--radius)] border border-[var(--mc-moss-400)] bg-[var(--mc-moss-50)] px-3 py-2 text-sm font-medium text-[var(--mc-moss-500)]">
                    {status}
                </div>
            )}

            {props.flash?.error && (
                <div className="mb-4 mt-4 rounded-[var(--radius)] border border-[var(--mc-ember-400)] bg-[var(--mc-ember-50)] px-3 py-2 text-sm font-medium text-[var(--mc-ember-500)]">
                    {props.flash.error}
                </div>
            )}

            <form onSubmit={submit} className="mt-6">
                <div>
                    <InputLabel htmlFor="login" value="Email or Minecraft username" />

                    <TextInput
                        id="login"
                        type="text"
                        name="login"
                        value={data.login}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('login', e.target.value)}
                    />

                    <InputError message={errors.login} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 block">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData(
                                    'remember',
                                    (e.target.checked || false) as false,
                                )
                            }
                        />
                        <span className="ms-2 text-sm text-[var(--mc-text-secondary)]">
                            Remember me
                        </span>
                    </label>
                </div>

                <div className="mt-4 flex items-center justify-end">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="rounded-md text-sm text-[var(--mc-text-secondary)] underline hover:text-[var(--mc-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--mc-cyan-500)] focus:ring-offset-2 focus:ring-offset-[var(--mc-bg-surface)]"
                        >
                            Forgot your password?
                        </Link>
                    )}

                    <PrimaryButton className="ms-4" disabled={processing}>
                        Log in
                    </PrimaryButton>
                </div>
            </form>

            <DiscordAuthButton label="Log in with Discord" />
        </GuestLayout>
    );
}
