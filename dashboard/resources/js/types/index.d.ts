export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    role: 'admin' | 'moderator';
    /** Set only if this account has ever linked/logged in via Discord OAuth2. */
    discord_id?: string | null;
    mc_uuid?: string | null;
    mc_username?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success: string | null;
        error: string | null;
        updateLog: string | null;
    };
};
