# NeoEssentials Dashboard

A standalone, self-hostable web dashboard for the [NeoEssentials](https://github.com/ZeroG-Network-PTY-LTD/NeoEssentials)
Minecraft mod. Laravel + Inertia + React + TypeScript + Tailwind, talking to the
mod's embedded REST API (`DashboardAPI.java`) over HTTP.

**"Internal" vs "external" hosting is just a config value, not two different
builds.** Point `MC_API_URL` at `http://127.0.0.1:8642` if this app runs on the
same machine as your Minecraft server, or at a public address/tunnel if it's
hosted elsewhere. Same app either way.

**On shared/cPanel hosting with no shell access?** See [INSTALL.md](INSTALL.md)
for the pre-built `*_installer.zip` + web setup wizard instead of the steps
below.

## Quick start (no MySQL/Redis required)

```bash
composer install
npm install --legacy-peer-deps   # see "Known rough edges" below
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm run build
php artisan serve
```

Then open `http://127.0.0.1:8000`, register an account, and log in.

## Connecting to your Minecraft server

Set `MC_API_URL` in `.env` to wherever the mod's API is reachable, then pair the
two sides — no keys to copy by hand:

1. Log into this dashboard as an admin and open **Configuration → Minecraft
   Server Connection**, then click **Generate Pairing Code**.
2. Run the command it shows (`/dashboard pair "<dashboardUrl>" <code>`) on the
   Minecraft server's console, or in-game if you're OP.
3. That's it — in one round trip the mod mints an API key for this app to use,
   and this app mints a token back for the mod's outbound account-sync
   webhook. Both are stored in the database, never typed in by hand, and
   never sent to the browser.

The same flow is also the last step of the `/install` setup wizard on a fresh
deploy. Run `/dashboard unpair` on the mod's console (and click **Unpair**
here) if you ever need to disconnect and re-pair, e.g. after moving the
dashboard to a new host.

See `config/minecraft.php` for the full list of tunable options (timeouts,
cache TTLs).

## Roles and permissions (this app's own users, not the mod's)

Two roles: `admin` (full access) and `moderator` (can view everything and mute
players, but not kick/ban, adjust economy balances, or run console commands).
**The first account ever registered becomes `admin` automatically** — every
account after that defaults to `moderator`.

To promote/demote someone later:

```bash
php artisan dashboard:set-role someone@example.com admin
```

The `can:players.kick` / `players.ban` / `players.mute` / `economy.manage` /
`console.run` gates backing this live in `AppServiceProvider::registerDashboardGates()`
— adjust the logic there if the two-role split doesn't match how your team
actually wants to split responsibilities.

## Docker

```bash
docker compose up --build
```

**Untested in this repo as of the initial bootstrap** — the `Dockerfile`/
`docker-compose.yml` were written to the intended single-container (PHP
built-in server + SQLite, no nginx/php-fpm) design, but there was no working
Docker engine available to actually build/run them at the time this was
committed. Treat it as a starting point to verify, not a confirmed-working path,
until someone builds it for real.

## What's implemented vs. what's still missing

Implemented:
- Overview, Players, Economy, Commands, Logs pages (ported from the original
  in-mod-repo scaffold)
- Warps (full CRUD — the mod's `/api/warps` imposes no admin requirement
  beyond being logged in, so any moderator/admin here can manage them)
- Kits (read-only — the mod's `KitsEndpoint` has no create/update/delete/give
  routes, only list/stats/single-view; kit configuration still happens
  in-game or via `kits.json`)
- Mod dashboard account management (`/dashboard/users` — admin-only, both in
  this app and on the mod side: create/delete accounts, change role, reset
  password, enable/disable, view + revoke active sessions). This manages
  logins for the **mod's own** embedded dashboard, including the service
  account this app itself authenticates as — distinct from this app's own
  `admin`/`moderator` accounts.
- Holograms (full CRUD — same no-extra-gate rule as Warps. The edit form only
  exposes placement/text/visibility; animation knobs like spin/hover/billboard
  and per-line frames round-trip untouched rather than being editable here)
- Discord integration (`/dashboard/discord`) — status and recent event log are
  visible to any logged-in account; clearing the event log, sending a test
  message, and editing the account-linking auth config (OAuth2 client id/
  secret/redirect URI, auto-registration, default role) are admin-only, both
  in this app (`can:discord.manage`) and on the mod side (`DiscordEndpoint`).
  This is admin *configuration* of the linking feature, not a per-user "link
  my Discord" flow (that lives elsewhere in the mod, outside this endpoint).
- Permissions (`/dashboard/permissions`) — group/user permission node management,
  group create/delete, group and (online) user permission add/remove, group
  membership changes, and permission aliases. Read-only for everyone when the
  mod is using an external permission plugin (LuckPerms/FTB Ranks) — mutations
  are gated behind `can:permissions.manage` (admin-only), matching the mod's
  own self-escalation protection on every non-GET `PermissionEndpoint` route.
  Contextual and temporary (timed) permission overrides aren't exposed in this
  UI yet, only permanent group/user nodes.
- Backups / cloud storage (`/dashboard/backups`) — create/restore/delete local
  snapshots, download a snapshot ZIP, and configure + upload to Dropbox/Google
  Drive. Status/list/file-browsing is readable by any logged-in account;
  everything that mutates state is gated behind `can:backups.manage`
  (admin-only), matching `BackupEndpoint`/`CloudStorageEndpoint`'s own
  admin-only write routes.
- Homes — a read-only "View homes" action on the Players page. The mod only
  exposes a per-player homes lookup that resolves live off the online player
  object (`MinecraftApiService::homes()`), so there's no create/rename/delete
  route to wire up, and it only works for online players.
- Full auth (login/register/password reset/email verification) via Breeze
- `MinecraftApiService` — the actual integration layer calling the mod's API
- Authorization (see "Roles and permissions" above) — the `can:*` gates every
  route above references are defined and tested

Every dashboard feature area the mod's API supports now has a page here.

## Known rough edges

- `npm install` needs `--legacy-peer-deps` right now — this bootstrap was done
  against bleeding-edge Vite 8 / Laravel 13 packages with a peer-dependency
  conflict between `vite` and `@vitejs/plugin-react`. Revisit once the
  ecosystem catches up.
- No CI yet (lint/test workflows, Docker build verification).