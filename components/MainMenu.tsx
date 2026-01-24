
import React from 'react';
import { ShapeId } from '../services/cjr/cjrTypes';

interface MainMenuProps {
  level: number;
  unlockedLevel: number;
  usePixi: boolean;
  useMultiplayer: boolean;
  networkStatus: 'offline' | 'connecting' | 'online' | 'reconnecting' | 'error';
  name: string;
  shape: ShapeId;
  onTogglePixi: (usePixi: boolean) => void;
  onOpenLevels: () => void;
  onOpenTutorial: () => void;
  onOpenSettings: () => void;
  onOpenMatchmaking: () => void;
  onOpenTournament: () => void;
  onStart: (name: string, shape: ShapeId) => void;
  onNameChange: (name: string) => void;
  onShapeChange: (shape: ShapeId) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
  level,
  unlockedLevel,
  usePixi,
  useMultiplayer,
  networkStatus,
  name,
  shape,
  onTogglePixi,
  onOpenLevels,
  onOpenTutorial,
  onOpenSettings,
  onOpenMatchmaking,
  onOpenTournament,
  onStart,
  onNameChange,
  onShapeChange,
}) => {
  const handleStart = () => {
    if (!name.trim()) return;
    onStart(name, shape);
  };

  const statusLabel = () => {
    if (networkStatus === 'online') return 'ONLINE';
    if (networkStatus === 'connecting') return 'CONNECTING';
    if (networkStatus === 'reconnecting') return 'RECONNECTING';
    if (networkStatus === 'error') return 'ERROR';
    return 'OFFLINE';
  };

  const statusColor = () => {
    if (networkStatus === 'online') return 'text-emerald-300';
    if (networkStatus === 'connecting' || networkStatus === 'reconnecting') return 'text-amber-300';
    if (networkStatus === 'error') return 'text-rose-300';
    return 'text-slate-400';
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
      <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
        COLOR JELLY RUSH
      </h1>
      <div className="text-slate-400 mb-6 tracking-widest">
        LEVEL {level} · UNLOCKED {unlockedLevel}
        <span className={`ml-3 text-xs font-bold ${statusColor()}`}>NET {statusLabel()}</span>
      </div>

      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-96">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-slate-400">YOUR NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-pink-500"
            placeholder="Enter name..."
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium mb-2 text-slate-400">CHOOSE SHAPE</label>
          <div className="flex gap-2">
            {(['circle', 'square', 'triangle', 'hex'] as ShapeId[]).map((s) => (
              <button
                key={s}
                onClick={() => onShapeChange(s)}
                className={`flex-1 p-3 rounded border capitalize ${shape === s
                    ? 'bg-pink-600 border-pink-400 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-slate-400">GRAPHICS</div>
          <button
            onClick={() => onTogglePixi(!usePixi)}
            className={`px-3 py-1 rounded border text-xs font-bold tracking-widest ${usePixi ? 'bg-violet-600/30 border-violet-400/50 text-violet-200' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
          >
            {usePixi ? 'PIXI (FULL)' : 'CANVAS (LITE)'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStart}
            disabled={!name.trim()}
            className={`w-full py-4 rounded-lg font-bold text-sm tracking-widest transition-all ${name.trim()
                ? 'bg-gradient-to-r from-pink-500 to-violet-600 hover:scale-105 shadow-glow'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
          >
            PLAY SOLO
          </button>
          <button
            onClick={onOpenMatchmaking}
            disabled={!name.trim()}
            className={`w-full py-4 rounded-lg font-bold text-sm tracking-widest transition-all ${name.trim()
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105 shadow-glow'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
          >
            ONLINE QUEUE
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {useMultiplayer ? 'Online uses authoritative netcode.' : 'Queue to start online matchmaking.'}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={onOpenLevels} className="py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm transition">LEVELS</button>
          <button onClick={onOpenTutorial} className="py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm transition">HOW</button>
          <button onClick={onOpenSettings} className="py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm transition">SET</button>
          <button onClick={onOpenMatchmaking} className="py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm transition">QUEUE</button>
          <button onClick={onOpenTournament} className="py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm transition">TOURNEY</button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
