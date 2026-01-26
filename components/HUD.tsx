import React, { useEffect, useRef, memo } from 'react';
import { GameState } from '../types';
import { getColorHint } from '../services/cjr/colorMath';
// import { THRESHOLDS } from '../services/cjr/cjrConstants'; // Assuming this exists, or inline

interface HUDProps {
  gameStateRef: React.MutableRefObject<GameState | null>;
  isTouchInput?: boolean;
}

// EIDOLON-V: Dùng memo để chặn re-render từ cha
const HUD: React.FC<HUDProps> = memo(({ gameStateRef }) => {
  // 1. Static Refs (Không gây re-render)
  const scoreRef = useRef<HTMLSpanElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const percentCircleRef = useRef<SVGCircleElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  // Cache giá trị cũ để tránh thao tác DOM dư thừa
  const cache = useRef({ score: -1, percent: -1, hint: '', ring: 1 });

  useEffect(() => {
    let rafId: number;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    const loop = () => {
      const state = gameStateRef.current;
      if (!state || !state.player) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      const p = state.player;

      // --- OPTIMIZED UPDATES ---

      // 1. Score
      const s = Math.floor(p.score);
      if (s !== cache.current.score) {
        if (scoreRef.current) scoreRef.current.textContent = s.toLocaleString();
        cache.current.score = s;
      }

      // 2. Match %
      const pct = Math.floor(p.matchPercent * 100);
      if (pct !== cache.current.percent) {
        cache.current.percent = pct;
        if (percentRef.current) percentRef.current.textContent = `${pct}%`;
        if (percentCircleRef.current) {
          const offset = circumference - (p.matchPercent * circumference);
          percentCircleRef.current.style.strokeDashoffset = offset.toString();
          // Đổi màu trực tiếp
          const color = pct >= 90 ? '#fbbf24' : (pct >= 50 ? '#3b82f6' : '#ef4444');
          percentCircleRef.current.style.stroke = color;
        }
      }

      // 3. Hint (Throttled logic nếu cần)
      const hint = getColorHint(p.pigment, p.targetPigment);
      if (hint !== cache.current.hint) {
        cache.current.hint = hint;
        if (hintRef.current) {
          hintRef.current.textContent = hint;
          // Fade in/out logic simple (transition class handles it if opacity set)
          hintRef.current.style.opacity = hint ? '1' : '0';
        }
      }

      // 4. Wave Timer
      if (waveRef.current) {
        const now = state.gameTime;
        // Assuming 10s wave timer for visual flair or use state.levelConfig logic
        // Just an example visual
        const timer = (10.0 - (now % 10.0));
        waveRef.current.textContent = `WAVE IN ${timer.toFixed(1)}s`;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []); // Empty deps = Run once, never re-run

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-sans overflow-hidden p-4">
      {/* Top Center: Match Meter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full drop-shadow-xl rotate-[-90deg] overflow-visible">
            <circle cx="72" cy="72" r="60" stroke="rgba(0,0,0,0.6)" strokeWidth="10" fill="rgba(0,0,0,0.2)" />
            <circle
              ref={percentCircleRef}
              cx="72" cy="72" r="60"
              stroke="#ef4444"
              strokeWidth="10"
              fill="none"
              strokeDasharray={377}
              strokeDashoffset={377}
              strokeLinecap="round"
              className="transition-all duration-100 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span ref={percentRef} className="text-3xl font-black text-white">0%</span>
            <span className="text-[10px] uppercase tracking-widest text-white/50">MATCH</span>
          </div>
        </div>
        <div ref={hintRef} className="mt-2 text-sm font-bold px-4 py-1 rounded-full bg-black/40 border border-white/10 text-white transition-opacity duration-300 opacity-0">
          ...
        </div>
      </div>

      {/* Top Right: Stats */}
      <div className="absolute top-6 right-6 text-right">
        <div className="text-white font-bold text-xl drop-shadow-lg">
          SCORE <span ref={scoreRef} className="text-yellow-400">0</span>
        </div>
        <div ref={waveRef} className="text-white/60 text-xs font-mono uppercase">WAVE READY</div>
      </div>
<<<<<<< Updated upstream

      {/* --- BOTTOM LEFT: MINIMAP --- */}
      <div className="absolute bottom-6 left-6 w-32 h-32 bg-black/50 rounded-full border-2 border-white/10 backdrop-blur-sm overflow-hidden flex items-center justify-center pointer-events-auto">
        {/* Rings */}
        <div className="absolute w-[100%] h-[100%] rounded-full border border-white/10 box-border" />
        <div className="absolute w-[62%] h-[62%] rounded-full border border-blue-500/30 box-border" /> {/* R2 */}
        <div className="absolute w-[31%] h-[31%] rounded-full border border-red-500/30 box-border bg-red-900/10" /> {/* R3 */}
        <div className="absolute w-[9%] h-[9%] rounded-full bg-yellow-500/20 box-border" /> {/* Center */}

        {/* Player Dot */}
        {minimapData && (
          <div
            className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_4px_white]"
            style={{
              transform: `translate(${minimapData.x * 64}px, ${minimapData.y * 64}px)`
            }}
          />
        )}
      </div>

      {/* --- CENTER: WIN HOLD OVERLAY --- */}
      {isWinHold && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center animate-pulse">
          <div className="text-yellow-400 font-display text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            CHANNELING
          </div>
          <div className="w-64 h-3 bg-black/50 rounded mt-2 overflow-hidden border border-yellow-500/50">
            <div
              className="h-full bg-yellow-400 shadow-[0_0_10px_#fbbf24]"
              style={{ width: `${Math.min(100, (winTimer / 1.5) * 100)}%` }}
            />
          </div>
        </div>
      )}

=======
>>>>>>> Stashed changes
    </div>
  );
});

export default HUD;
