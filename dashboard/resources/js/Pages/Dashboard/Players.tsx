import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import Card from '@/Components/Dashboard/Card';
import PageHeading from '@/Components/Dashboard/PageHeading';
import Badge from '@/Components/Dashboard/Badge';
import { useMcEvents } from '@/lib/useMcLive';
import type { Home, McPlayer, OfflinePlayer, PlayerLookupResult } from '@/types/minecraft';
import { Users, Clock, Search, HeartPulse, MoreHorizontal, Home as HomeIcon, VolumeX, LogOut, ShieldBan } from 'lucide-react';

interface Props {
  players: McPlayer[];
  offlinePlayers: OfflinePlayer[];
  lookupQuery: string | null;
  lookupResult: PlayerLookupResult | null;
}

const RANK_STYLE: Record<string, string> = {
  owner: 'bg-[var(--mc-ember-50)] text-[var(--mc-ember-500)]',
  op: 'bg-[var(--mc-ember-50)] text-[var(--mc-ember-500)]',
  mod: 'bg-[var(--mc-cyan-50)] text-[var(--mc-cyan-500)]',
  vip: 'bg-[var(--mc-moss-50)] text-[var(--mc-moss-500)]',
  player: 'bg-[var(--mc-bg-surface-raised)] text-[var(--mc-text-secondary)]',
};

type ActionType = 'kick' | 'ban' | 'mute';

interface PendingAction {
  type: ActionType;
  player: McPlayer;
}

const ACTION_LABEL: Record<ActionType, string> = {
  kick: 'Kick',
  ban: 'Ban',
  mute: 'Mute',
};

export default function Players({ players, offlinePlayers, lookupQuery, lookupResult }: Props) {
  const [selected, setSelected] = useState<McPlayer | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [homesFor, setHomesFor] = useState<McPlayer | null>(null);
  const [homes, setHomes] = useState<Home[] | null>(null);
  const [homesError, setHomesError] = useState<string | null>(null);
  const [lookupInput, setLookupInput] = useState(lookupQuery ?? '');

  // Live join/leave only tells us *that* it happened, not the full player record — a partial
  // reload of just these two props is the cheapest correct way to reflect it (no-ops when
  // Reverb isn't configured, same as Overview.tsx).
  useMcEvents((payload) => {
    if (payload.event === 'player_join' || payload.event === 'player_leave') {
      router.reload({ only: ['players', 'offlinePlayers'] });
    }
  });

  const runLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupInput.trim();
    if (!q) return;
    router.get(route('dashboard.players.index'), { lookup: q }, {
      preserveState: true,
      preserveScroll: true,
      only: ['lookupQuery', 'lookupResult'],
    });
  };

  const heal = (uuid: string) => router.post(route('dashboard.players.heal', uuid));

  const viewHomes = async (player: McPlayer) => {
    setSelected(null);
    setHomesFor(player);
    setHomes(null);
    setHomesError(null);
    try {
      const res = await fetch(route('dashboard.players.homes', player.uuid), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setHomes(data.homes ?? []);
    } catch (e) {
      setHomesError(e instanceof Error ? e.message : 'Failed to load homes.');
    }
  };

  const openConfirm = (type: ActionType, player: McPlayer) => {
    setSelected(null);
    setReason('');
    setDuration('');
    setPending({ type, player });
  };

  const closeConfirm = () => {
    if (submitting) return;
    setPending(null);
  };

  const submitConfirm = () => {
    if (!pending) return;
    if ((pending.type === 'kick' || pending.type === 'ban') && !reason.trim()) return;

    const routeName = `dashboard.players.${pending.type}` as const;
    const payload: Record<string, string> =
      pending.type === 'kick'
        ? { reason: reason.trim() }
        : pending.type === 'ban'
        ? { reason: reason.trim(), ...(duration.trim() ? { duration: duration.trim() } : {}) }
        : { ...(duration.trim() ? { duration: duration.trim() } : {}) };

    setSubmitting(true);
    router.post(route(routeName, pending.player.uuid), payload, {
      preserveScroll: true,
      onFinish: () => {
        setSubmitting(false);
        setPending(null);
      },
    });
  };

  return (
    <DashboardLayout>
      <Head title="Players" />
      <PageHeading title="Players" icon={Users} count={players.length} subtitle="Online players and remote moderation actions." />

      <Card title="Online now" icon={Users}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ tableLayout: 'fixed', minWidth: '640px' }}>
            <thead>
              <tr className="text-left text-[11px] text-[var(--mc-text-muted)] border-b border-[var(--mc-border)]">
                <th className="px-4 py-2.5 font-normal" style={{ width: '26%' }}>Player</th>
                <th className="px-4 py-2.5 font-normal" style={{ width: '14%' }}>Rank</th>
                <th className="px-4 py-2.5 font-normal" style={{ width: '16%' }}>Health</th>
                <th className="px-4 py-2.5 font-normal" style={{ width: '26%' }}>Position</th>
                <th className="px-4 py-2.5 font-normal" style={{ width: '18%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.uuid} className="border-b border-[var(--mc-border)] last:border-0 transition-colors hover:bg-[var(--mc-bg-surface-raised)]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`https://mc-heads.net/avatar/${p.uuid}/32`}
                        alt=""
                        className="h-6 w-6 rounded-[5px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)]"
                      />
                      {p.username}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${RANK_STYLE[p.rank]}`}>
                      {p.rank}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-data text-[12px]">
                    <span className="inline-flex items-center gap-1.5">
                      <HeartPulse size={12} className="text-[var(--mc-ember-400)]" />
                      {p.health.toFixed(0)}/{p.maxHealth.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-data text-[12px] text-[var(--mc-text-secondary)]">
                    {p.x.toFixed(0)}, {p.y.toFixed(0)}, {p.z.toFixed(0)} · {p.dimension}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => heal(p.uuid)}
                        className="text-[11px] px-2 py-1 rounded-[6px] border border-[var(--mc-border-strong)] hover:border-[var(--mc-cyan-400)] hover:text-[var(--mc-cyan-400)] transition-colors"
                      >
                        Heal
                      </button>
                      <button
                        onClick={() => setSelected(p)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-[6px] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface)] transition-colors"
                      >
                        <MoreHorizontal size={12} />
                        More
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
              Nobody's online right now.
            </div>
          )}
        </div>
      </Card>

      {/* Recently-active offline players — shown by default, no lookup needed for the common case */}
      <div className="mt-6">
        <Card title={`Recently offline (${offlinePlayers.length})`} icon={Clock} accent="purple">
          {offlinePlayers.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--mc-text-muted)]">
              No recently-active offline players on file.
            </div>
          )}
          {offlinePlayers.map((p) => (
            <div key={p.uuid} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--mc-border)] last:border-0 text-[13px] transition-colors hover:bg-[var(--mc-bg-surface-raised)]">
              <img
                src={`https://mc-heads.net/avatar/${p.uuid}/28`}
                alt=""
                className="h-5 w-5 rounded-[4px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)] grayscale opacity-80"
              />
              <span className="font-medium">{p.username}</span>
              <span className="ml-auto text-[12px] text-[var(--mc-text-muted)]">Last seen {p.lastSeen}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Lookup — for servers with more players than the offline roster's cap above */}
      <div className="mt-6">
        <Card title="Look up a player" icon={Search} accent="cyan" padded>
          <form onSubmit={runLookup} className="flex gap-1.5">
            <input
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Username (online, offline, or never joined)"
              className="flex-1 font-data text-[13px] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] rounded-[8px] px-2.5 py-1.5 text-[var(--mc-text-primary)] outline-none transition-colors focus:border-[var(--mc-cyan-400)]"
            />
            <button
              type="submit"
              className="btn-pop text-[13px] px-3 py-1.5 rounded-[var(--radius)] bg-[var(--mc-cyan-500)] text-[#0a1620] font-medium hover:bg-[var(--mc-cyan-400)] transition-colors"
            >
              Look up
            </button>
          </form>
          {lookupQuery && (
            <div className="mt-3 pt-3 border-t border-[var(--mc-border)] text-[13px]">
              {!lookupResult?.success ? (
                <div className="text-[var(--mc-ember-500)]">
                  {lookupResult?.message ?? `Could not find a player named '${lookupQuery}'.`}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <img
                    src={`https://mc-heads.net/avatar/${lookupResult.uuid}/32`}
                    alt=""
                    className="h-6 w-6 rounded-[5px] shrink-0 [image-rendering:pixelated] border border-[var(--mc-border-strong)]"
                  />
                  <span className="font-medium">{lookupResult.username}</span>
                  <Badge variant={lookupResult.online ? 'moss' : 'neutral'} dot={lookupResult.online}>
                    {lookupResult.online ? 'online' : 'offline'}
                  </Badge>
                  {!lookupResult.online && lookupResult.lastSeen && (
                    <span className="text-[12px] text-[var(--mc-text-muted)]">Last seen {lookupResult.lastSeen}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Action menu — pick which action to take on this player */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10"
          onClick={() => setSelected(null)}
        >
          <div
            className="dash-card p-5 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src={`https://mc-heads.net/avatar/${selected.uuid}/40`}
                alt=""
                className="h-8 w-8 rounded-[7px] [image-rendering:pixelated] border border-[var(--mc-border-strong)]"
              />
              <div className="font-display text-[15px] font-semibold">{selected.username}</div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { heal(selected.uuid); setSelected(null); }}
                className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] text-left transition-colors"
              >
                <HeartPulse size={14} className="text-[var(--mc-ember-400)]" />
                Heal and feed
              </button>
              <button
                onClick={() => viewHomes(selected)}
                className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] text-left transition-colors"
              >
                <HomeIcon size={14} className="text-[var(--mc-cyan-400)]" />
                View homes
              </button>
              <button
                onClick={() => openConfirm('mute', selected)}
                className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] text-left transition-colors"
              >
                <VolumeX size={14} className="text-[var(--mc-purple-400)]" />
                Mute
              </button>
              <button
                onClick={() => openConfirm('kick', selected)}
                className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] text-left transition-colors"
              >
                <LogOut size={14} className="text-[var(--mc-text-muted)]" />
                Kick
              </button>
              <button
                onClick={() => openConfirm('ban', selected)}
                className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-ember-400)] text-[var(--mc-ember-500)] hover:bg-[var(--mc-ember-50)] text-left transition-colors"
              >
                <ShieldBan size={14} />
                Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog — collects reason/duration, then submits the action */}
      {pending && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20"
          onClick={closeConfirm}
        >
          <div
            className="dash-card p-5 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-[15px] font-semibold mb-1">
              {ACTION_LABEL[pending.type]} {pending.player.username}?
            </div>
            <div className="text-[12px] text-[var(--mc-text-muted)] mb-4">
              {pending.type === 'ban'
                ? 'This immediately removes the player and prevents them from rejoining.'
                : pending.type === 'kick'
                ? 'This disconnects the player; they can rejoin immediately.'
                : 'This prevents the player from sending chat messages.'}
            </div>

            {(pending.type === 'kick' || pending.type === 'ban') && (
              <div className="mb-3">
                <label className="block text-[11px] text-[var(--mc-text-muted)] mb-1">
                  Reason (required)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={255}
                  className="w-full text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] outline-none focus:border-[var(--mc-cyan-400)]"
                  placeholder="e.g. Griefing spawn area"
                />
              </div>
            )}

            {(pending.type === 'ban' || pending.type === 'mute') && (
              <div className="mb-4">
                <label className="block text-[11px] text-[var(--mc-text-muted)] mb-1">
                  Duration (optional — blank = {pending.type === 'ban' ? 'permanent' : 'indefinite'})
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border-strong)] outline-none focus:border-[var(--mc-cyan-400)] font-data"
                  placeholder="e.g. 1d, 7d, 30m"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={closeConfirm}
                disabled={submitting}
                className="text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitConfirm}
                disabled={submitting || ((pending.type === 'kick' || pending.type === 'ban') && !reason.trim())}
                className="btn-pop text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-ember-500)] text-white hover:bg-[var(--mc-ember-600,var(--mc-ember-500))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Working…' : `Confirm ${ACTION_LABEL[pending.type]}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Homes viewer — read-only, the mod has no create/delete route to manage these */}
      {homesFor && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20"
          onClick={() => setHomesFor(null)}
        >
          <div
            className="dash-card p-5 w-96 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-[15px] font-semibold mb-3">
              {homesFor.username}'s homes
            </div>
            {homesError && <div className="text-[13px] text-[var(--mc-ember-500)]">{homesError}</div>}
            {!homesError && homes === null && (
              <div className="text-[13px] text-[var(--mc-text-muted)]">Loading…</div>
            )}
            {homes !== null && homes.length === 0 && (
              <div className="text-[13px] text-[var(--mc-text-muted)]">No homes set.</div>
            )}
            {homes && homes.length > 0 && (
              <div className="flex flex-col gap-2">
                {homes.map((h) => (
                  <div
                    key={h.name}
                    className="text-[13px] px-3 py-2 rounded-[var(--radius)] bg-[var(--mc-bg-surface-raised)] border border-[var(--mc-border)] flex items-center gap-2.5"
                  >
                    <HomeIcon size={14} className="text-[var(--mc-cyan-400)] shrink-0" />
                    <div>
                      <div className="font-medium mb-0.5">{h.name}</div>
                      <div className="font-data text-[12px] text-[var(--mc-text-muted)]">
                        {h.dimension.replace('minecraft:', '')} · {Math.round(h.x)}, {Math.round(h.y)}, {Math.round(h.z)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setHomesFor(null)}
              className="mt-4 w-full text-[13px] px-3 py-2 rounded-[var(--radius)] border border-[var(--mc-border-strong)] hover:bg-[var(--mc-bg-surface-raised)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
