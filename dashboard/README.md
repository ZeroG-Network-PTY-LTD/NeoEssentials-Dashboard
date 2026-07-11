# NeoEssentials Dashboard

A standalone, self-hostable web dashboard for the [NeoEssentials](https://github.com/ZeroG-Network-PTY-LTD/NeoEssentials)
Minecraft mod. Laravel + Inertia + React + TypeScript + Tailwind, talking to the
mod's embedded REST API (`DashboardAPI.java`) over HTTP.

**"Internal" vs "external" hosting is just a config value, not two different
builds.** Point `MC_API_URL` at `http://127.0.0.1:8642` if this app runs on the
same machine as your Minecraft server, or at a public address/tunnel if it's
hosted elsewhere. Same app either way.

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

Edit `.env`:

```
MC_API_URL=http://127.0.0.1:8642
MC_SERVICE_USERNAME=dashboard-service
MC_SERVICE_PASSWORD=a-strong-password-here
```

The mod's dashboard API uses session-based auth, not a static token, so this
app needs its own dashboard user account on the mod side to authenticate as:

1. Start the Minecraft server once so the mod bootstraps its default admin
   account, then log in and change that password immediately.
2. Create a dedicated service account for this app (don't reuse the default
   admin for machine-to-machine calls):
   ```
   POST /api/auth/users   {"username": "dashboard-service", "password": "...", "role": "ADMIN"}
   ```
   Use `role: "MODERATOR"` instead if you don't want this app able to run raw
   console commands or adjust economy balances.
3. Put those credentials in `.env` above. They're never sent to the browser —
   only the server-side `MinecraftApiService` uses them.

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
- Full auth (login/register/password reset/email verification) via Breeze
- `MinecraftApiService` — the actual integration layer calling the mod's API
- Authorization (see "Roles and permissions" above) — the `can:*` gates every
  route above references are defined and tested

Not yet implemented — the mod's dashboard API supports this, but no frontend
page exists here yet:
- Homes — the mod's dashboard API only exposes a read-only per-player homes
  lookup (`MinecraftApiService::homes()`), no home management UI yet

## Known rough edges

- `npm install` needs `--legacy-peer-deps` right now — this bootstrap was done
  against bleeding-edge Vite 8 / Laravel 13 packages with a peer-dependency
  conflict between `vite` and `@vitejs/plugin-react`. Revisit once the
  ecosystem catches up.
- No CI yet (lint/test workflows, Docker build verification).