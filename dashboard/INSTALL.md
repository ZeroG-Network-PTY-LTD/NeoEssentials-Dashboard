# Installing NeoEssentials Dashboard

This page covers both ways to get the dashboard running: uploading a
pre-built package to shared/cPanel hosting with no shell access, or setting
it up manually if you already have a server with SSH/Composer/Node. It's
written as a standalone page so it can be pasted directly into this repo's
GitHub wiki without edits — every heading below can also become its own
wiki page later if you'd rather split it up.

**On this page:**
- [Which install method do I need?](#which-install-method-do-i-need)
- [Option A — Shared/cPanel hosting (installer package)](#option-a--sharedcpanel-hosting-installer-package)
- [Option B — Manual install (SSH/Composer/Node available)](#option-b--manual-install-sshcomposernode-available)
- [Pairing the dashboard with your Minecraft server](#pairing-the-dashboard-with-your-minecraft-server)
- [Keeping it updated](#keeping-it-updated)
- [Roles and permissions](#roles-and-permissions)
- [Troubleshooting](#troubleshooting)

---

## Which install method do I need?

| You have... | Use |
|---|---|
| cPanel / shared hosting, no SSH, no Composer/Node | **Option A** — upload the pre-built `*_installer.zip`, everything else happens in your browser |
| A VPS/dedicated box, or local dev machine, with SSH + Composer + Node | **Option B** — clone the repo and run the usual Laravel setup commands |

Both end up at the same place: a working dashboard, connected to your
Minecraft server, with an admin account. Option A just does the equivalent
work through a web wizard instead of a terminal, because typical shared
hosting disables `proc_open`/`exec`, so there's no shell to run `composer`
or `npm` in even if you wanted to.

---

## Option A — Shared/cPanel hosting (installer package)

### 1. Get the package

Download the latest `NeoEssentials-Dashboard_v{version}_installer.zip` from
the [releases page](https://github.com/ZeroG-Network-PTY-LTD/NeoEssentials-Dashboard/releases)
(or wherever your team publishes builds). It already contains the app's PHP
dependencies (`vendor/`) and the compiled frontend (`public/build/`) — you
never need to run Composer or npm yourself.

### 2. Upload and extract

1. In cPanel, open **File Manager** and go to the folder your domain (or
   subdomain) serves from.
2. Upload the zip and use cPanel's **Extract** action on it (or extract
   locally and upload the folder via FTP/SFTP — either works).
3. **Point the domain's document root at the package's `public/` folder**,
   not the package root. In cPanel this is usually a "Document Root" field
   when you create the (sub)domain, or an *Addon Domain* setting. If your
   host only lets you serve from a fixed folder like `public_html/`, put the
   whole package one level up and make `public_html/` a symlink to
   `.../public`, or ask your host how to repoint the document root — serving
   from the package root instead of `public/` exposes files (like `.env`)
   that should never be web-reachable.

### 3. Open the site — you'll land on the setup wizard automatically

Every request is redirected to `/install` until setup finishes, so just
visiting your domain is enough to start.

### 4. Verify the setup token

The wizard generates a one-time token and writes it to
`storage/app/install-token.txt` inside the package — this proves whoever is
running the wizard has file access to the hosting account, not just the URL.
Open that file with cPanel's File Manager (or FTP/SFTP), copy its contents,
and paste it into the wizard.

### 5. Requirements check

Confirms PHP ≥ 8.3, the required extensions, and that `storage/`,
`bootstrap/cache/`, and `.env` are writable. If anything fails, it's almost
always a folder permission — set it to `775` via File Manager's permissions
dialog and reload the page.

### 6. Environment

Set your **App URL** (your domain, `https://...`) and choose a database:

- **SQLite** (default) — zero configuration, the package already ships an
  empty database file. Good for most single-server setups.
- **MySQL** — if you'd rather use a database your host manages. Create one
  via cPanel's *MySQL Databases* tool first, then enter the host/port/name/
  user/password here and hit **Test connection** before continuing.

### 7. Database

Click **Run migrations** — this creates every table the dashboard needs. Safe
to click again if it fails partway through (e.g. a connection hiccup).

### 8. Connect to your Minecraft server

See [Pairing the dashboard with your Minecraft server](#pairing-the-dashboard-with-your-minecraft-server)
below — you can also skip this step and configure it later from the
dashboard's own **Updates** page if the server isn't ready yet.

### 9. Finish

This writes `storage/installed.lock` (the wizard won't run again after this)
and deletes the setup token file, then sends you to the registration page.
**The first account you register becomes the admin account automatically.**

---

## Option B — Manual install (SSH/Composer/Node available)

```bash
git clone https://github.com/ZeroG-Network-PTY-LTD/NeoEssentials-Dashboard.git
cd NeoEssentials-Dashboard/dashboard

composer install
npm install --legacy-peer-deps   # see "Known rough edges" in README.md
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm run build
php artisan serve
```

Then open `http://127.0.0.1:8000`, register an account (the first one
becomes admin automatically), and log in. Set `MC_API_URL` in `.env` and pair
with the mod as described below.

### Optional: live dashboard updates (Reverb)

Only possible here, on Option B — it needs a persistent background process,
which shared/cPanel hosting can't run:

```bash
php artisan reverb:install     # generates REVERB_* keys in .env, once
npm run build                  # picks up the new VITE_REVERB_* values
```

Then keep two more processes running alongside `queue:work` (Supervisor,
systemd, `screen`/`tmux` — whatever you already use to keep `php artisan
serve` itself alive):

```bash
php artisan reverb:start        # browser-facing broadcast server
php artisan dashboard:mc-bridge # relays the mod's own WebSocket feed into it
```

Without this, the dashboard works exactly as it does today — status,
players, and logs refresh on navigation, not live. Nothing else changes or
breaks by skipping it.

---

## Pairing the dashboard with your Minecraft server

Both sides authenticate with an API key, exchanged automatically via a
one-time pairing code — nothing to type in by hand:

1. **Generate a code.** In the install wizard's "Connect to the Minecraft
   server" step (or on the dashboard's **Configuration** page after setup),
   click **Generate pairing code**. It's valid for 10 minutes.
2. **Run the command it shows** on the Minecraft server's console (or
   in-game, if you're OP):
   ```
   /dashboard pair "<dashboardUrl>" <code>
   ```
3. In that single round trip, the mod mints an API key for this app to use
   and this app mints a token back for the mod's outbound account-sync
   webhook. Both are stored in the database automatically — neither is ever
   sent to the browser, and there's nothing to keep in sync by hand.

Run `/dashboard unpair` on the mod's console (and click **Unpair** on the
Configuration page) to disconnect, e.g. before re-pairing with a different
dashboard instance. See `config/minecraft.php` for other tunable options
(timeouts, cache TTLs).

---

## Keeping it updated

Once installed, updates happen from the dashboard's own **Updates** page
(admin-only) — see `config/selfupdate.php` for the tracked repo/branch.

- **If the server has git + Composer + Node on its PATH** (a VPS, not
  typical shared hosting): click **Update now** to fetch and fast-forward
  from GitHub, then automatically reinstall dependencies and rebuild.
- **If it doesn't** (shared/cPanel hosting): upload a
  `NeoEssentials-Dashboard_v{version}-updater.zip` package on the same page
  instead — same idea as the installer package, but it overlays onto your
  *existing* install rather than setting up a fresh one. `.env`, `storage/`,
  `vendor/`, `node_modules/`, and your database are never touched by an
  uploaded package, no matter what's in it.

---

## Roles and permissions

Two roles on the dashboard's own accounts (separate from the mod's own
dashboard accounts under `/dashboard/users`): `admin` (full access) and
`moderator` (can view everything and mute players, but not kick/ban, adjust
economy balances, or run console commands). **The first account ever
registered becomes `admin` automatically** — every account after that
defaults to `moderator`. To promote/demote someone later:

```bash
php artisan dashboard:set-role someone@example.com admin
```

(No shell access? Have an existing admin do it from `/dashboard/users`
instead — that manages the mod's own accounts, not these ones, but is the
same idea. For this app's own admin/moderator roles specifically, shell
access via `artisan` is currently the only way to change them after the
first account.)

---

## Troubleshooting

**"Refusing to extract unsafe archive entry"** — the uploaded zip contains a
path trying to escape the target folder (`../`) and was rejected. Re-download
the package from a trusted source; don't hand-edit installer/updater zips.

**Requirements check keeps failing on a writable-folder check** — set that
folder to `775` (or `777` as a last resort on very restrictive hosts) via
your file manager's permissions dialog.

**"APP_KEY missing" on the requirements page** — the package's bundled
`.env` was deleted or replaced by hand. Re-extract the original package, or
if you have shell access, run `php artisan key:generate`.

**Mod API test fails** — check `MC_API_URL` is reachable *from the
dashboard's server*, not just from your own browser (if the dashboard is on
different hosting than the Minecraft server, `127.0.0.1` won't resolve to
the game server — use its public address or a tunnel instead). Also confirm
pairing actually completed (Configuration page shows "Paired") — if it
didn't, re-generate a code and make sure the mod can reach *this* dashboard's
`MC_API_URL`-equivalent address (the URL you gave `/dashboard pair`) over
the network, same reachability requirement in reverse.

**I'm on a VPS/SSH box and landed on a screen asking me to open a file over
FTP** — that's the `/install` wizard's setup-access step (see [Option
A](#4-verify-the-setup-token)), which means the Option B manual bootstrap
(`composer install` → `.env` → `key:generate` → `migrate` → register) wasn't
fully finished — `EnsureInstalled` correctly sends any incomplete install
through `/install`, but the page's default instructions assume no shell
access, which isn't your situation. Since you have SSH, either:
- Run `php artisan install:token` and paste what it prints into the form
  (the page now shows this option too — no FTP client needed), then continue
  through the rest of the wizard (it ends at the same mod-pairing step
  described above); or
- Skip the wizard entirely and just finish [Option B](#option-b--manual-install-sshcomposernode-available)'s
  command sequence by hand from where it stopped.

**Setup wizard won't go away after I already configured everything by
hand** — it auto-detects an already-configured install (a working `APP_KEY`
+ at least one existing user account) and locks itself on the next request.
If you're seeing it anyway, something in that check didn't pass — easiest
fix is finishing the wizard normally (it's safe to run against an existing
DB; migrations are idempotent).
