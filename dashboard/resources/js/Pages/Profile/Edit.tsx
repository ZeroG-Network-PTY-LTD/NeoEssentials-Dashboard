import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import DeleteUserForm from './Partials/DeleteUserForm';
import DiscordConnectionForm from './Partials/DiscordConnectionForm';
import MinecraftLinkForm from './Partials/MinecraftLinkForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const { props } = usePage<PageProps>();
    const user = props.auth.user;
    const isAdmin = user.role === 'admin';
    // Mirrors EnsureAccountLinked/DashboardLayout's same check — the middleware's flash message
    // already shows as a toast on arrival, but that fades after 5s while this stays put for as
    // long as the account is actually still missing a link.
    const isLinked = isAdmin || (!!user.mc_uuid && !!user.discord_id);

    return (
        <DashboardLayout>
            <Head title="Profile" />

            <h1 className="font-display text-[20px] font-semibold mb-5">Profile</h1>

            <div className="max-w-2xl space-y-5">
                {!isLinked && (
                    <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--mc-ember-400)] bg-[var(--mc-ember-50)] px-4 py-3 text-[13px] text-[var(--mc-ember-500)]">
                        <Lock size={16} className="shrink-0 mt-0.5" />
                        <span>
                            Link both your Minecraft account and Discord account below to unlock the
                            rest of the dashboard.
                        </span>
                    </div>
                )}

                <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 sm:p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </div>

                <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 sm:p-6">
                    <MinecraftLinkForm />
                </div>

                <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 sm:p-6">
                    <DiscordConnectionForm />
                </div>

                <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 sm:p-6">
                    <UpdatePasswordForm />
                </div>

                <div className="rounded-[var(--radius-lg)] bg-[var(--mc-bg-surface)] border border-[var(--mc-border)] p-4 sm:p-6">
                    <DeleteUserForm />
                </div>
            </div>
        </DashboardLayout>
    );
}
