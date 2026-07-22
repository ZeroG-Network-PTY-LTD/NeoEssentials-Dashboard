import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import DiscordConnectionForm from './Partials/DiscordConnectionForm';
import MinecraftLinkForm from './Partials/MinecraftLinkForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <DashboardLayout>
            <Head title="Profile" />

            <h1 className="font-display text-[20px] font-semibold mb-5">Profile</h1>

            <div className="max-w-2xl space-y-5">
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
