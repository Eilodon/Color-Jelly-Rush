import React, { useMemo } from 'react';
import type { TournamentQueueState, TournamentParticipant } from '../../services/meta/tournaments';

type TournamentInfo = {
  id: string;
  name: string;
  format: 'elimination' | 'round_robin' | 'swiss';
  startsIn: string;
};

type Props = {
  queue: TournamentQueueState;
  onQueue: (tournamentId: string) => void;
  onCancel: () => void;
  onBack: () => void;
};

const TOURNAMENTS: TournamentInfo[] = [
  { id: 'tourney_mystic', name: 'Mystic Trials', format: 'elimination', startsIn: '12m' },
  { id: 'tourney_vortex', name: 'Vortex Clash', format: 'swiss', startsIn: '28m' },
  { id: 'tourney_ember', name: 'Ember Cup', format: 'round_robin', startsIn: '45m' },
];

const TournamentLobbyScreen: React.FC<Props> = ({ queue, onQueue, onCancel, onBack }) => {
  const statusLabel = useMemo(() => {
    if (queue.status === 'queued') return 'QUEUED';
    if (queue.status === 'ready') return 'READY';
    if (queue.status === 'failed') return 'FAILED';
    return 'IDLE';
  }, [queue.status]);

  const statusColor = useMemo(() => {
    if (queue.status === 'ready') return 'text-emerald-300';
    if (queue.status === 'queued') return 'text-amber-300';
    if (queue.status === 'failed') return 'text-rose-300';
    return 'text-slate-400';
  }, [queue.status]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 text-white">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-950/80 border border-slate-700 p-8 shadow-2xl mx-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 tracking-widest">TOURNAMENT LOBBY</div>
            <div className="text-3xl font-black mt-2">COMPETE FOR GLORY</div>
          </div>
          <button onClick={onBack} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 transition">
            BACK
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm">
          <div className="text-slate-400">QUEUE STATUS</div>
          <div className={`font-bold ${statusColor}`}>{statusLabel}</div>
          {queue.tournamentId && <div className="text-slate-500">· {queue.tournamentId}</div>}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOURNAMENTS.map((tourney) => (
            <div key={tourney.id} className="rounded-xl bg-slate-900/70 border border-slate-700 p-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest">{tourney.format}</div>
              <div className="text-lg font-bold mt-2">{tourney.name}</div>
              <div className="text-xs text-slate-500 mt-1">Starts in {tourney.startsIn}</div>
              <div className="mt-4">
                <button
                  onClick={() => onQueue(tourney.id)}
                  className="w-full py-2 rounded bg-emerald-600/40 border border-emerald-400/40 text-emerald-100 text-xs font-bold tracking-widest hover:bg-emerald-500/50 transition"
                >
                  QUEUE
                </button>
              </div>
            </div>
          ))}
        </div>

        {queue.status === 'queued' && (
          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-900/60 border border-slate-700 p-4">
            <div className="text-sm text-slate-300">Waiting for enough contenders…</div>
            <button onClick={onCancel} className="px-4 py-2 rounded bg-rose-600/70 text-xs font-bold tracking-widest">
              LEAVE
            </button>
          </div>
        )}

        {queue.status === 'ready' && (
          <div className="mt-6 rounded-xl bg-slate-900/60 border border-emerald-600/40 p-4">
            <div className="text-emerald-200 font-bold">Tournament ready. Assemble your bracket.</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
              {(queue.participants || []).map((p: TournamentParticipant) => (
                <div key={p.id} className="px-3 py-2 rounded bg-slate-900/80 border border-slate-700">
                  {p.name} · {p.rating}
                </div>
              ))}
            </div>
          </div>
        )}

        {queue.status === 'failed' && (
          <div className="mt-6 rounded-xl bg-slate-900/60 border border-rose-600/40 p-4 text-rose-200">
            Queue failed. Try another tournament.
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentLobbyScreen;
