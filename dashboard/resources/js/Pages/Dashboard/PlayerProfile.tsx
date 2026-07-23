import { Head, Link } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import type {
  BanEntry,
  KickEntry,
  MuteEntry,
  NoteEntry,
  PermissionGroup,
  PermissionUserLookupResult,
  PlayerInventory,
  PlayerLookupResult,
  WarnEntry,
} from '@/types/minecraft';
import {
  ArrowLeft,
  Gamepad2,
  UserCog,
  Coins,
  ShieldBan,
  VolumeX,
  LogOut,
  StickyNote,
  Backpack,
  Shield,
  Plus,
  X,
  Feather,
  Sparkles,
  Utensils,
  Flame,
  Gauge,
  Tag,
  Navigation,
  Snowflake,
  EyeOff,
  Lock,
  Package,
  Skull,
  Zap,
  Bug,
  Terminal,
  CloudSun,
  Trash2,
} from 'lucide-react';

type Gamemode = 'survival' | 'creative' | 'adventure' | 'spectator';

interface Props {
  username: string;
}

// --- Small local toast — this page fires many independent JSON actions and shows a
// toast per response, unlike the rest of the app which uses Inertia's session-flash
// FlashToast (that only fires after a full redirect, which this page never does).
function useLocalToast() {
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 3500);
  };
  return { toast, showToast };
}

function xsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function apiFetch(url: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-XSRF-TOKEN': xsrfToken(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? `Request failed (${res.status}).`);
  return data;
}

export default function PlayerProfile({ username }: Props) {
  const { toast, showToast } = useLocalToast();

  const [lookup, setLookup] = useState<PlayerLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [balance, setBalance] = useState<string | null>(null);
  const [permInfo, setPermInfo] = useState<PermissionUserLookupResult | null>(null);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);

  const [bans, setBans] = useState<BanEntry[]>([]);
  const [mutes, setMutes] = useState<MuteEntry[]>([]);
  const [kicks, setKicks] = useState<KickEntry[]>([]);
  const [warns, setWarns] = useState<WarnEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);

  const [frozen, setFrozen] = useState(false);
  const [vanished, setVanished] = useState(false);
  const [jailed, setJailed] = useState(false);
  const [jails, setJails] = useState<string[]>([]);
  const [jailChoice, setJailChoice] = useState('');

  const [flyEnabled, setFlyEnabled] = useState<boolean | null>(null);
  const [godEnabled, setGodEnabled] = useState<boolean | null>(null);
  const [speedValue, setSpeedValue] = useState('5');
  const [speedType, setSpeedType] = useState<'walk' | 'fly'>('walk');
  const [nicknameInput, setNicknameInput] = useState('');
  const [teleportTarget, setTeleportTarget] = useState('');

  const [giveItemId, setGiveItemId] = useState('');
  const [giveAmount, setGiveAmount] = useState('1');
  const [burnSeconds, setBurnSeconds] = useState('10');
  const [effectId, setEffectId] = useState('');
  const [effectDuration, setEffectDuration] = useState('30');
  const [effectAmplifier, setEffectAmplifier] = useState('0');
  const [mobId, setMobId] = useState('');
  const [mobAmount, setMobAmount] = useState('1');

  const [sudoCommand, setSudoCommand] = useState('');
  const [sudoIsChat, setSudoIsChat] = useState(false);
  const [ptime, setPtimeState] = useState<number | null>(null);
  const [ptimeInput, setPtimeInput] = useState('6000');
  const [pweather, setPweatherState] = useState<string | null>(null);

  const [newPermission, setNewPermission] = useState('');
  const [newNote, setNewNote] = useState('');
  const [economyAmount, setEconomyAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const r = (name: string) => route(`dashboard.players.profile.${name}`, username);

  const load = () => {
    setLoading(true);
    setNotFound(false);
    fetch(r('lookup'), { headers: { Accept: 'application/json' } })
      .then((res) => res.json())
      .then(async (result: PlayerLookupResult) => {
        setLookup(result);
        if (!result.success || !result.uuid) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const fetches: Array<Promise<any>> = [
          fetch(r('balance')).then((r) => r.json()),
          fetch(r('permission-info')).then((r) => r.json()),
          fetch(route('dashboard.players.profile.groups')).then((r) => r.json()),
          fetch(r('inventory')).then((r) => r.json()),
          fetch(r('bans')).then((r) => r.json()),
          fetch(r('mutes')).then((r) => r.json()),
          fetch(r('kicks')).then((r) => r.json()),
          fetch(r('warns')).then((r) => r.json()),
          fetch(r('notes')).then((r) => r.json()),
          fetch(r('freeze')).then((r) => r.json()),
          fetch(r('vanish')).then((r) => r.json()),
          fetch(r('jail')).then((r) => r.json()),
          fetch(route('dashboard.players.profile.jails')).then((r) => r.json()),
          fetch(r('ptime.get')).then((r) => r.json()),
          fetch(r('pweather.get')).then((r) => r.json()),
        ];
        const [
          bal, perm, grp, inv, banList, muteList, kickList, warnList, noteList,
          freeze, vanish, jail, jailList, ptimeRes, pweatherRes,
        ] = await Promise.allSettled(fetches);

        if (bal.status === 'fulfilled') setBalance(bal.value.balance);
        if (perm.status === 'fulfilled') setPermInfo(perm.value);
        if (grp.status === 'fulfilled') setGroups(grp.value);
        if (inv.status === 'fulfilled') setInventory(inv.value);
        if (banList.status === 'fulfilled') setBans(banList.value);
        if (muteList.status === 'fulfilled') setMutes(muteList.value);
        if (kickList.status === 'fulfilled') setKicks(kickList.value);
        if (warnList.status === 'fulfilled') setWarns(warnList.value);
        if (noteList.status === 'fulfilled') setNotes(noteList.value);
        if (freeze.status === 'fulfilled') setFrozen(freeze.value.frozen);
        if (vanish.status === 'fulfilled') setVanished(vanish.value.vanished);
        if (jail.status === 'fulfilled') setJailed(jail.value.jailed);
        if (jailList.status === 'fulfilled') setJails(jailList.value);
        if (ptimeRes.status === 'fulfilled') setPtimeState(ptimeRes.value.ticks);
        if (pweatherRes.status === 'fulfilled') setPweatherState(pweatherRes.value.type);
        setLoading(false);
      });
  };

  useEffect(load, [username]);

  const runAction = async (label: string, fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    try {
      await fn();
      showToast(label);
      after?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : `${label} failed.`, true);
    } finally {
      setBusy(false);
    }
  };

  const changeGroup = (group: string) =>
    runAction(`Group set to '${group}'.`, () => apiFetch(r('group'), 'POST', { group }), () =>
      setPermInfo((p) => (p ? { ...p, group } : p)),
    );

  const changeGamemode = (gamemode: Gamemode) =>
    runAction(`Game mode set to ${gamemode}.`, () => apiFetch(r('gamemode'), 'POST', { gamemode }));

  const toggleFly = (enable: boolean) =>
    runAction(`Flight ${enable ? 'enabled' : 'disabled'}.`, () => apiFetch(r('fly'), 'POST', { enable }), () => setFlyEnabled(enable));

  const toggleGod = (enable: boolean) =>
    runAction(`God mode ${enable ? 'enabled' : 'disabled'}.`, () => apiFetch(r('god'), 'POST', { enable }), () => setGodEnabled(enable));

  const doFeed = () => runAction('Fed.', () => apiFetch(r('feed'), 'POST'));

  const doExtinguish = () => runAction('Extinguished.', () => apiFetch(r('extinguish'), 'POST'));

  const applySpeed = () => {
    const speed = Number(speedValue);
    if (!Number.isFinite(speed) || speed < 0 || speed > 10) return;
    runAction(`${speedType === 'fly' ? 'Fly' : 'Walk'} speed set to ${speed}.`, () => apiFetch(r('speed'), 'POST', { type: speedType, speed }));
  };

  const applyNickname = (e: FormEvent) => {
    e.preventDefault();
    runAction('Nickname updated.', () => apiFetch(r('nickname'), 'POST', { nickname: nicknameInput.trim() || null }));
  };

  const clearNickname = () =>
    runAction('Nickname cleared.', () => apiFetch(r('nickname'), 'POST', { nickname: null }), () => setNicknameInput(''));

  const doTeleport = (e: FormEvent) => {
    e.preventDefault();
    const target = teleportTarget.trim();
    if (!target) return;
    runAction(`Teleported to ${target}.`, () => apiFetch(r('teleport'), 'POST', { targetUsername: target }), () => setTeleportTarget(''));
  };

  const toggleFreeze = () =>
    frozen
      ? runAction('Unfrozen.', () => apiFetch(r('unfreeze'), 'DELETE'), () => setFrozen(false))
      : runAction('Frozen.', () => apiFetch(r('freeze'), 'POST'), () => setFrozen(true));

  const toggleVanish = () =>
    vanished
      ? runAction('Unvanished.', () => apiFetch(r('unvanish'), 'DELETE'), () => setVanished(false))
      : runAction('Vanished.', () => apiFetch(r('vanish'), 'POST'), () => setVanished(true));

  const toggleJail = () => {
    if (jailed) {
      runAction('Unjailed.', () => apiFetch(r('unjail'), 'DELETE'), () => setJailed(false));
    } else {
      if (!jailChoice) return;
      runAction(`Jailed in '${jailChoice}'.`, () => apiFetch(r('jail'), 'POST', { jailName: jailChoice }), () => setJailed(true));
    }
  };

  const addPermission = (e: FormEvent) => {
    e.preventDefault();
    const perm = newPermission.trim();
    if (!perm) return;
    runAction(`Added permission '${perm}'.`, () => apiFetch(r('permissions.add'), 'POST', { permission: perm }), () => {
      setNewPermission('');
      setPermInfo((p) => (p ? { ...p, permissions: [...(p.permissions ?? []), perm] } : p));
    });
  };

  const removePermission = (perm: string) =>
    runAction(`Removed permission '${perm}'.`, () => apiFetch(route('dashboard.players.profile.permissions.remove', [username, perm]), 'DELETE'), () =>
      setPermInfo((p) => (p ? { ...p, permissions: (p.permissions ?? []).filter((x) => x !== perm) } : p)),
    );

  const adjustBalance = (action: 'give' | 'take' | 'set') => {
    const amount = Number(economyAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    runAction(
      `Balance ${action === 'give' ? 'increased' : action === 'take' ? 'decreased' : 'set'}.`,
      () => apiFetch(r('economy'), 'POST', { action, amount }),
      async () => {
        setEconomyAmount('');
        const bal = await fetch(r('balance')).then((res) => res.json());
        setBalance(bal.balance);
      },
    );
  };

  const doUnban = (uuid: string) =>
    runAction('Ban lifted.', () => apiFetch(r('unban'), 'DELETE'), () =>
      setBans((b) => b.map((x) => (x.playerId === uuid ? { ...x, active: false } : x))),
    );

  const doUnmute = () =>
    runAction('Unmuted.', () => apiFetch(r('unmute'), 'DELETE'), () =>
      setMutes((m) => m.map((x) => ({ ...x, active: false }))),
    );

  const doRemoveWarn = (id: string) =>
    runAction('Warning removed.', () => apiFetch(route('dashboard.players.profile.warns.remove', [username, id]), 'DELETE'), () =>
      setWarns((w) => w.filter((x) => x.id !== id)),
    );

  const addNote = (e: FormEvent) => {
    e.preventDefault();
    const text = newNote.trim();
    if (!text) return;
    runAction('Note added.', () => apiFetch(r('notes.add'), 'POST', { text }), () => {
      setNewNote('');
      load();
    });
  };

  const doRemoveNote = (id: string) =>
    runAction('Note removed.', () => apiFetch(route('dashboard.players.profile.notes.remove', [username, id]), 'DELETE'), () =>
      setNotes((n) => n.filter((x) => x.id !== id)),
    );

  const doGive = (e: FormEvent) => {
    e.preventDefault();
    const item = giveItemId.trim();
    const amount = Number(giveAmount);
    if (!item || !Number.isFinite(amount) || amount < 1) return;
    runAction(`Gave ${amount}x ${item}.`, () => apiFetch(r('give'), 'POST', { item, amount }), () => setGiveItemId(''));
  };

  const doBurn = () => {
    const seconds = Number(burnSeconds);
    if (!Number.isFinite(seconds) || seconds < 1) return;
    runAction(`Set on fire for ${seconds}s.`, () => apiFetch(r('burn'), 'POST', { seconds }));
  };

  const doKill = () => runAction('Killed.', () => apiFetch(r('kill'), 'POST'));

  const doApplyEffect = (e: FormEvent) => {
    e.preventDefault();
    const effect = effectId.trim();
    const duration = Number(effectDuration);
    const amplifier = Number(effectAmplifier);
    if (!effect || !Number.isFinite(duration) || duration < 1 || !Number.isFinite(amplifier) || amplifier < 0) return;
    runAction(`Applied ${effect}.`, () => apiFetch(r('effect'), 'POST', { effect, duration, amplifier }), () => setEffectId(''));
  };

  const doClearEffects = () => runAction('Effects cleared.', () => apiFetch(r('effect.clear'), 'DELETE'));

  const doLightning = () => runAction('Lightning struck.', () => apiFetch(r('lightning'), 'POST'));

  const doSpawnMob = (e: FormEvent) => {
    e.preventDefault();
    const mob = mobId.trim();
    const amount = Number(mobAmount);
    if (!mob || !Number.isFinite(amount) || amount < 1) return;
    runAction(`Spawned ${amount}x ${mob}.`, () => apiFetch(r('spawnmob'), 'POST', { mob, amount }), () => setMobId(''));
  };

  const doSudo = (e: FormEvent) => {
    e.preventDefault();
    const command = sudoCommand.trim();
    if (!command) return;
    runAction(`Ran on ${username}.`, () => apiFetch(r('sudo'), 'POST', { command, isChat: sudoIsChat }), () => setSudoCommand(''));
  };

  const doClearInventory = () => runAction('Inventory cleared.', () => apiFetch(r('clear-inventory'), 'POST'));

  const applyPtime = () => {
    const ticks = Number(ptimeInput);
    if (!Number.isFinite(ticks) || ticks < 0) return;
    runAction(`Ptime set to ${ticks}.`, () => apiFetch(r('ptime.set'), 'POST', { ticks }), () => setPtimeState(ticks));
  };

  const resetPtime = () => runAction('Ptime reset.', () => apiFetch(r('ptime.set'), 'POST', { ticks: null }), () => setPtimeState(null));

  const applyPweather = (type: string) =>
    runAction(`Pweather set to ${type}.`, () => apiFetch(r('pweather.set'), 'POST', { type }), () => setPweatherState(type));

  const resetPweather = () => runAction('Pweather reset.', () => apiFetch(r('pweather.set'), 'POST', { type: null }), () => setPweatherState(null));

  if (loading) {
    return (
      <DashboardLayout>
        <Head title={`${username} — Profile`} />
        <div className="text-[13px] text-[var(--mc-text-muted)]">Loading…</div>
      </DashboardLayout>
    );
  }

  if (notFound || !lookup) {
    return (
      <DashboardLayout>
        <Head title={`${username} — Profile`} />
        <PageHeading title={username} icon={UserCog} />
        <div className="text-[13px] text-[var(--mc-ember-500)]">
          {lookup?.message ?? `Could not find a player named '${username}'.`}
        </div>
        <Link href={route('dashboard.players.index')} className="mt-3 inline-block text-[13px] text-[var(--mc-cyan-400)]">
          <ArrowLeft size={13} className="inline -mt-0.5 mr-1" /> Back to players
        </Link>
      </DashboardLayout>
    );
  }

  const activeBans = bans.filter((b) => b.active);
  const activeMutes = mutes.filter((m) => m.active);
  const inventorySlots = [
    ...(inventory?.main ?? []).filter((i) => i.id),
    ...(inventory?.armor ?? []).filter((i) => i.id),
    ...(inventory?.offhand ?? []).filter((i) => i.id),
  ];

  return (
    <DashboardLayout>
      <Head title={`${username} — Profile`} />

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-[var(--radius)] px-4 py-2.5 text-[13px] shadow-lg ${
            toast.isError ? 'bg-[var(--mc-ember-500)] text-white' : 'bg-[var(--mc-cyan-500)] text-[#0a1620]'
          }`}
        >
          {toast.message}
        </div>
      )}

      <PageHeading
        title={lookup.username ?? username}
        icon={UserCog}
        subtitle="Full single-player control — moderation history, economy, permissions, and inventory."
        action={
          <Link
            href={route('dashboard.players.index')}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
          >
            <ArrowLeft size={13} />
            Back to players
          </Link>
        }
      />

      <div className="flex items-center gap-4 mb-6">
        <img
          src={`https://mc-heads.net/player/${lookup.uuid}/80`}
          alt=""
          className="h-20 shrink-0 [image-rendering:pixelated] drop-shadow-lg"
        />
        <div>
          <div className="font-display text-[16px] font-semibold flex items-center gap-2">
            {lookup.username}
            <Badge variant={lookup.online ? 'moss' : 'neutral'} dot={lookup.online}>
              {lookup.online ? 'online' : 'offline'}
            </Badge>
            {activeBans.length > 0 && <Badge variant="ember">banned</Badge>}
            {activeMutes.length > 0 && <Badge variant="purple">muted</Badge>}
          </div>
          <div className="font-data text-[12px] text-[var(--mc-text-muted)]">
            {lookup.uuid}
            {!lookup.online && lookup.lastSeen && ` · Last seen ${lookup.lastSeen}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Quick actions" icon={Shield} padded>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              disabled={busy}
              onClick={() => runAction('Healed and fed.', () => apiFetch(r('heal'), 'POST'))}
              className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors"
            >
              Heal
            </button>
            <button
              disabled={busy}
              onClick={() => runAction('Kicked.', () => apiFetch(r('kick'), 'POST', { reason: 'Kicked from dashboard' }), load)}
              className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors"
            >
              <LogOut size={12} /> Kick
            </button>
            {activeMutes.length > 0 ? (
              <button
                disabled={busy}
                onClick={doUnmute}
                className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors"
              >
                <VolumeX size={12} /> Unmute
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => runAction('Muted.', () => apiFetch(r('mute'), 'POST'), load)}
                className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors"
              >
                <VolumeX size={12} /> Mute
              </button>
            )}
            {activeBans.length === 0 && (
              <button
                disabled={busy}
                onClick={() => runAction('Banned.', () => apiFetch(r('ban'), 'POST', { reason: 'Banned from dashboard' }), load)}
                className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-ember-400)] text-[var(--mc-ember-500)] hover:bg-[var(--mc-ember-50)] disabled:opacity-50 transition-colors"
              >
                <ShieldBan size={12} /> Ban
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Gamepad2 size={13} />
            Game mode
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {(['survival', 'creative', 'adventure', 'spectator'] as Gamemode[]).map((gm) => (
              <button
                key={gm}
                disabled={busy}
                onClick={() => changeGamemode(gm)}
                className="text-[11px] px-2 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] capitalize disabled:opacity-50 transition-colors"
              >
                {gm}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <UserCog size={13} />
            Permission group
          </div>
          <select
            value={permInfo?.group ?? ''}
            disabled={busy || groups.length === 0}
            onChange={(e) => changeGroup(e.target.value)}
            className="w-full text-[13px] px-2.5 py-1.5 rounded-[6px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] outline-none focus:border-[var(--mc-cyan-400)] disabled:opacity-50"
          >
            <option value="" disabled>
              {groups.length === 0 ? 'Loading groups…' : 'Select group'}
            </option>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>{g.name}</option>
            ))}
          </select>
        </Card>

        <Card title="Player state" icon={Sparkles} padded>
          {!lookup.online && (
            <div className="text-[12px] text-[var(--mc-text-muted)] mb-3">
              {lookup.username} is offline — these controls only work while online.
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            <button disabled={busy || !lookup.online} onClick={() => toggleFly(true)} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              <Feather size={12} /> Fly on
            </button>
            <button disabled={busy || !lookup.online} onClick={() => toggleFly(false)} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Fly off
            </button>
            <button disabled={busy || !lookup.online} onClick={() => toggleGod(true)} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              <Shield size={12} /> God on
            </button>
            <button disabled={busy || !lookup.online} onClick={() => toggleGod(false)} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              God off
            </button>
            <button disabled={busy || !lookup.online} onClick={doFeed} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              <Utensils size={12} /> Feed
            </button>
            <button disabled={busy || !lookup.online} onClick={doExtinguish} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              <Flame size={12} /> Extinguish
            </button>
            {flyEnabled !== null && <Badge variant={flyEnabled ? 'moss' : 'neutral'}>fly: {flyEnabled ? 'on' : 'off'}</Badge>}
            {godEnabled !== null && <Badge variant={godEnabled ? 'moss' : 'neutral'}>god: {godEnabled ? 'on' : 'off'}</Badge>}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Gauge size={13} />
            Speed (0-10)
          </div>
          <div className="flex gap-1.5 mb-3">
            <select
              value={speedType}
              onChange={(e) => setSpeedType(e.target.value as 'walk' | 'fly')}
              className="text-[13px] px-2 py-1.5 rounded-[6px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] outline-none focus:border-[var(--mc-cyan-400)]"
            >
              <option value="walk">Walk</option>
              <option value="fly">Fly</option>
            </select>
            <input
              type="number" min="0" max="10" step="0.5"
              value={speedValue}
              onChange={(e) => setSpeedValue(e.target.value)}
              className="w-20 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button disabled={busy || !lookup.online} onClick={applySpeed} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Set
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Tag size={13} />
            Nickname
          </div>
          <form onSubmit={applyNickname} className="flex gap-1.5 mb-3">
            <input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="New nickname"
              className="flex-1 text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Set
            </button>
            <button type="button" disabled={busy} onClick={clearNickname} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Clear
            </button>
          </form>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Navigation size={13} />
            Teleport to another online player
          </div>
          <form onSubmit={doTeleport} className="flex gap-1.5">
            <input
              value={teleportTarget}
              onChange={(e) => setTeleportTarget(e.target.value)}
              placeholder="Target username"
              className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy || !lookup.online} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Teleport
            </button>
          </form>
        </Card>

        <Card title="Freeze, vanish & jail" icon={Lock} padded>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button disabled={busy} onClick={toggleFreeze} className={`flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border transition-colors disabled:opacity-50 ${frozen ? 'border-[var(--mc-cyan-400)] text-[var(--mc-cyan-400)]' : 'border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)]'}`}>
              <Snowflake size={12} /> {frozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button disabled={busy || !lookup.online} onClick={toggleVanish} className={`flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border transition-colors disabled:opacity-50 ${vanished ? 'border-[var(--mc-purple-400)] text-[var(--mc-purple-400)]' : 'border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)]'}`}>
              <EyeOff size={12} /> {vanished ? 'Unvanish' : 'Vanish'}
            </button>
            {frozen && <Badge variant="cyan">frozen</Badge>}
            {vanished && <Badge variant="purple">vanished</Badge>}
            {jailed && <Badge variant="ember">jailed</Badge>}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Lock size={13} />
            Jail
          </div>
          {jailed ? (
            <button disabled={busy} onClick={toggleJail} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Release from jail
            </button>
          ) : (
            <div className="flex gap-1.5">
              <select
                value={jailChoice}
                onChange={(e) => setJailChoice(e.target.value)}
                className="flex-1 text-[13px] px-2.5 py-1.5 rounded-[6px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] outline-none focus:border-[var(--mc-cyan-400)]"
              >
                <option value="" disabled>{jails.length === 0 ? 'No jails set up' : 'Select a jail'}</option>
                {jails.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              <button disabled={busy || !jailChoice} onClick={toggleJail} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
                Jail
              </button>
            </div>
          )}
        </Card>

        <Card title="Items & fun" icon={Zap} padded>
          {!lookup.online && (
            <div className="text-[12px] text-[var(--mc-text-muted)] mb-3">
              {lookup.username} is offline — these controls only work while online.
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Package size={13} />
            Give item
          </div>
          <form onSubmit={doGive} className="flex gap-1.5 mb-3">
            <input
              value={giveItemId}
              onChange={(e) => setGiveItemId(e.target.value)}
              placeholder="minecraft:diamond_sword"
              className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <input
              type="number" min="1" max="3456"
              value={giveAmount}
              onChange={(e) => setGiveAmount(e.target.value)}
              className="w-16 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy || !lookup.online} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Give
            </button>
          </form>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Bug size={13} />
            Potion effect
          </div>
          <form onSubmit={doApplyEffect} className="flex gap-1.5 mb-1.5">
            <input
              value={effectId}
              onChange={(e) => setEffectId(e.target.value)}
              placeholder="speed"
              className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <input
              type="number" min="1" placeholder="sec"
              value={effectDuration}
              onChange={(e) => setEffectDuration(e.target.value)}
              className="w-16 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <input
              type="number" min="0" max="255" placeholder="amp"
              value={effectAmplifier}
              onChange={(e) => setEffectAmplifier(e.target.value)}
              className="w-16 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy || !lookup.online} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Apply
            </button>
          </form>
          <button disabled={busy || !lookup.online} onClick={doClearEffects} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors mb-3">
            Clear all effects
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Skull size={13} />
            Spawn mob
          </div>
          <form onSubmit={doSpawnMob} className="flex gap-1.5 mb-3">
            <input
              value={mobId}
              onChange={(e) => setMobId(e.target.value)}
              placeholder="zombie"
              className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <input
              type="number" min="1" max="100"
              value={mobAmount}
              onChange={(e) => setMobAmount(e.target.value)}
              className="w-16 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy || !lookup.online} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Spawn
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="1" max="600"
                value={burnSeconds}
                onChange={(e) => setBurnSeconds(e.target.value)}
                className="w-16 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
              />
              <button disabled={busy || !lookup.online} onClick={doBurn} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
                <Flame size={12} /> Burn (sec)
              </button>
            </div>
            <button disabled={busy || !lookup.online} onClick={doLightning} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              <Zap size={12} /> Lightning
            </button>
            <button disabled={busy || !lookup.online} onClick={doKill} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-ember-400)] text-[var(--mc-ember-500)] hover:bg-[var(--mc-ember-50)] disabled:opacity-50 transition-colors">
              <Skull size={12} /> Kill
            </button>
          </div>
        </Card>

        <Card title="Admin tools" icon={Terminal} padded>
          {!lookup.online && (
            <div className="text-[12px] text-[var(--mc-text-muted)] mb-3">
              {lookup.username} is offline — these controls only work while online.
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <Terminal size={13} />
            Sudo (run as player)
          </div>
          <form onSubmit={doSudo} className="flex gap-1.5 mb-1.5">
            <input
              value={sudoCommand}
              onChange={(e) => setSudoCommand(e.target.value)}
              placeholder={sudoIsChat ? 'chat message' : 'command (no leading /)'}
              className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy || !lookup.online} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Run
            </button>
          </form>
          <label className="flex items-center gap-1.5 text-[11px] text-[var(--mc-text-muted)] mb-3">
            <input type="checkbox" checked={sudoIsChat} onChange={(e) => setSudoIsChat(e.target.checked)} />
            Send as chat message instead of a command
          </label>

          <div className="flex items-center gap-2 text-[11px] text-[var(--mc-text-muted)] mb-1.5">
            <CloudSun size={13} />
            Per-player time & weather
          </div>
          <div className="flex gap-1.5 mb-1.5">
            <input
              type="number" min="0"
              value={ptimeInput}
              onChange={(e) => setPtimeInput(e.target.value)}
              className="w-24 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button disabled={busy || !lookup.online} onClick={applyPtime} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Set ptime
            </button>
            <button disabled={busy || !lookup.online || ptime === null} onClick={resetPtime} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Reset
            </button>
            {ptime !== null && <Badge variant="cyan">ptime: {ptime}</Badge>}
          </div>
          <div className="flex gap-1.5 mb-3">
            <button disabled={busy || !lookup.online} onClick={() => applyPweather('sun')} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Sun
            </button>
            <button disabled={busy || !lookup.online} onClick={() => applyPweather('storm')} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Storm
            </button>
            <button disabled={busy || !lookup.online || pweather === null} onClick={resetPweather} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">
              Reset
            </button>
            {pweather !== null && <Badge variant="cyan">pweather: {pweather}</Badge>}
          </div>

          <button disabled={busy || !lookup.online} onClick={doClearInventory} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-ember-400)] text-[var(--mc-ember-500)] hover:bg-[var(--mc-ember-50)] disabled:opacity-50 transition-colors">
            <Trash2 size={12} /> Clear inventory
          </button>
        </Card>

        <Card title="Economy" icon={Coins} padded>
          <div className="text-[20px] font-display font-semibold mb-3">
            {balance !== null ? `$${balance}` : '…'}
          </div>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="0"
              value={economyAmount}
              onChange={(e) => setEconomyAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button disabled={busy} onClick={() => adjustBalance('give')} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">Give</button>
            <button disabled={busy} onClick={() => adjustBalance('take')} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">Take</button>
            <button disabled={busy} onClick={() => adjustBalance('set')} className="text-[12px] px-2.5 py-1.5 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors">Set</button>
          </div>
        </Card>

        <Card title="Individual permissions" icon={Shield} padded>
          <form onSubmit={addPermission} className="flex gap-1.5 mb-3">
            <input
              value={newPermission}
              onChange={(e) => setNewPermission(e.target.value)}
              placeholder="neoessentials.some.permission"
              className="flex-1 font-data text-[12px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-[6px] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] disabled:opacity-50 transition-colors">
              <Plus size={12} /> Add
            </button>
          </form>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {(permInfo?.permissions ?? []).length === 0 && (
              <div className="text-[12px] text-[var(--mc-text-muted)]">No individual permission overrides — only the group's permissions apply.</div>
            )}
            {(permInfo?.permissions ?? []).map((perm) => (
              <div key={perm} className="flex items-center justify-between font-data text-[12px] px-2 py-1 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                <span className="break-all">{perm}</span>
                <button disabled={busy} onClick={() => removePermission(perm)} className="text-[var(--mc-text-muted)] hover:text-[var(--mc-ember-500)] shrink-0 ml-2">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Inventory" icon={Backpack} padded>
          {inventory?.error && <div className="text-[12px] text-[var(--mc-text-muted)]">{inventory.error}</div>}
          {!inventory?.error && inventorySlots.length === 0 && (
            <div className="text-[12px] text-[var(--mc-text-muted)]">No items, or inventory data isn't available for this player.</div>
          )}
          {inventorySlots.length > 0 && (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto font-data text-[12px]">
              {inventorySlots.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                  <span>{item.displayName ?? item.id}</span>
                  <span className="text-[var(--mc-text-muted)]">×{item.count ?? 1}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Moderation history (${bans.length + mutes.length + kicks.length + warns.length})`} icon={ShieldBan} padded>
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto text-[12px]">
            {bans.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-2 py-1.5 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                <div>
                  <span className={b.active ? 'text-[var(--mc-ember-500)]' : 'text-[var(--mc-text-muted)]'}>
                    {b.active ? 'Banned' : 'Ban (lifted)'}
                  </span>
                  {': '}{b.reason} <span className="text-[var(--mc-text-muted)]">— by {b.bannedBy}</span>
                </div>
                {b.active && (
                  <button disabled={busy} onClick={() => doUnban(b.playerId)} className="text-[11px] px-2 py-1 rounded-[5px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface)] shrink-0 ml-2 transition-colors">
                    Unban
                  </button>
                )}
              </div>
            ))}
            {mutes.map((m) => (
              <div key={m.id} className="px-2 py-1.5 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                <span className={m.active ? 'text-[var(--mc-purple-400)]' : 'text-[var(--mc-text-muted)]'}>
                  {m.active ? 'Muted' : 'Mute (lifted)'}
                </span>
                {m.reason ? `: ${m.reason}` : ''} <span className="text-[var(--mc-text-muted)]">— by {m.mutedBy}</span>
              </div>
            ))}
            {kicks.map((k) => (
              <div key={k.id} className="px-2 py-1.5 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                Kicked: {k.reason} <span className="text-[var(--mc-text-muted)]">— by {k.kickedBy}</span>
              </div>
            ))}
            {warns.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-2 py-1.5 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                <div>Warned: {w.reason} <span className="text-[var(--mc-text-muted)]">— by {w.warnedBy}</span></div>
                <button disabled={busy} onClick={() => doRemoveWarn(w.id)} className="text-[11px] px-2 py-1 rounded-[5px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface)] shrink-0 ml-2 transition-colors">
                  Remove
                </button>
              </div>
            ))}
            {bans.length + mutes.length + kicks.length + warns.length === 0 && (
              <div className="text-[var(--mc-text-muted)]">No moderation history on file.</div>
            )}
          </div>
        </Card>

        <Card title="Notes" icon={StickyNote} padded>
          <form onSubmit={addNote} className="flex gap-1.5 mb-3">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a private admin note…"
              className="flex-1 text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[6px] px-2.5 py-1.5 outline-none focus:border-[var(--mc-cyan-400)]"
            />
            <button type="submit" disabled={busy} className="text-[12px] px-2.5 py-1.5 rounded-[6px] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] disabled:opacity-50 transition-colors">
              Add
            </button>
          </form>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {notes.length === 0 && <div className="text-[12px] text-[var(--mc-text-muted)]">No notes yet.</div>}
            {notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between text-[12px] px-2 py-1.5 rounded-[5px] bg-[var(--mc-bg-surface-raised)]">
                <div>
                  <div>{n.text}</div>
                  <div className="text-[var(--mc-text-muted)] mt-0.5">— {n.authorName}</div>
                </div>
                <button disabled={busy} onClick={() => doRemoveNote(n.id)} className="text-[var(--mc-text-muted)] hover:text-[var(--mc-ember-500)] shrink-0 ml-2">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
