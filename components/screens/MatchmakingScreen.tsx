import React, { useEffect, useMemo, useState } from 'react';
import type { ShapeId } from '../../services/cjr/cjrTypes';
import type { MatchmakingStatus } from '../../services/meta/matchmaking';

type Props = {
  name: string;
  shape: ShapeId;
  region: string;
  status: MatchmakingStatus;
  queuedAt?: number;
  networkStatus: 'offline' | 'connecting' | 'online' | 'reconnecting' | 'error';
  onRegionChange: (region: string) => void;
  onQueue: () => void;
  onCancel: () => void;
  onBack: () => void;
  onEnterMatch: () => void;
};

const REGIONS = ['NA', 'EU', 'ASIA', 'SA', 'OCE'];

const MatchmakingScreen: React.FC<Props> = ({
  name,
  shape,
  region,
  status,
  queuedAt,
  networkStatus,
  onRegionChange,
  onQueue,
  onCancel,
  onBack,
  onEnterMatch,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'queuing') return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [status]);

  const statusText = useMemo(() => {
    if (status === 'matched') return 'MATCH FOUND';
    if (status === 'failed') return 'QUEUE FAILED';
    if (status === 'queuing') return 'SEARCHING';
    return 'IDLE';
  }, [status]);

  const statusColor = useMemo(() => {
    if (status === 'matched') return 'text-emerald-300';
    if (status === 'failed') return 'text-rose-300';
    if (status === 'queuing') return 'text-amber-300';
    return 'text-slate-400';
  }, [status]);

  const networkColor = useMemo(() => {
    if (networkStatus === 'online') return 'text-emerald-300';
    if (networkStatus === 'connecting' || networkStatus === 'reconnecting') return 'text-amber-300';
    if (networkStatus === 'error') return 'text-rose-300';
    return 'text-slate-400';
  }, [networkStatus]);

  const queuedSeconds = useMemo(() => {
    if (status !== 'queuing' || !queuedAt) return 0;
    return Math.max(0, Math.floor((now - queuedAt) / 1000));
  }, [now, queuedAt, status]);

  const canQueue = Boolean(name.trim());

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 text-white">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-950/80 border border-slate-700 p-8 shadow-2xl mx-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400 tracking-widest">MATCHMAKING</div>
            <div className="text-3xl font-black mt-2">ENTER THE ARENA</div>
          </div>
          <button onClick={onBack} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 transition">
            BACK
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-4">
            <div className="text-xs text-slate-400">PLAYER</div>
            <div className="text-lg font-bold mt-2">{name || 'Anonymous'}</div>
            <div className="text-xs text-slate-500 uppercase mt-1">Shape: {shape}</div>
          </div>

          <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-4">
            <div className="text-xs text-slate-400">REGION</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => onRegionChange(r)}
                  className={`px-3 py-1 rounded border text-xs font-bold tracking-widest ${r === region ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-4">
            <div className="text-xs text-slate-400">STATUS</div>
            <div className={`text-lg font-bold mt-2 ${statusColor}`}>{statusText}</div>
            <div className="text-xs text-slate-500 mt-1">NET <span className={networkColor}>{networkStatus.toUpperCase()}</span></div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-900/60 border border-slate-700 p-4 text-sm text-slate-300">
          {status === 'queuing' && <div>Searching in {region}… {queuedSeconds}s elapsed</div>}
          {status === 'matched' && <div className="text-emerald-200 font-bold">Match found. Ready to deploy.</div>}
          {status === 'failed' && <div className="text-rose-200 font-bold">Matchmaking failed. Try again.</div>}
          {status === 'idle' && <div>Queue up to enter competitive arena.</div>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {status === 'idle' && (
            <button
              onClick={onQueue}
              disabled={!canQueue}
              className={`px-6 py-3 rounded-lg font-bold tracking-widest ${canQueue ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
            >
              QUEUE
            </button>
          )}
          {status === 'queuing' && (
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-lg font-bold tracking-widest bg-rose-600 hover:bg-rose-500"
            >
              CANCEL
            </button>
          )}
          {status === 'matched' && (
            <button
              onClick={onEnterMatch}
              className="px-6 py-3 rounded-lg font-bold tracking-widest bg-emerald-600 hover:bg-emerald-500"
            >
              ENTER MATCH
            </button>
          )}
          {status === 'failed' && (
            <button
              onClick={onQueue}
              className="px-6 py-3 rounded-lg font-bold tracking-widest bg-amber-600 hover:bg-amber-500"
            >
              RETRY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchmakingScreen;
