/** One entry of a user's per-tab dashboard permissions, resolved from the mod's
 *  webDashboard.groupPermissions[] config for their in-game primary group — mirrors
 *  the mod's own internal dashboard's AuthTabPermission shape (see webdashboard-ui/src/lib/auth.tsx). */
export interface TabPermission {
    tab: string;
    canRead: boolean;
    canWrite: boolean;
}

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
    /** Per-tab dashboard access resolved from the mod's custom group-permission mapping —
     *  null/empty/absent means no custom mapping applies for this account's in-game group. */
    permissions?: TabPermission[] | null;
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
