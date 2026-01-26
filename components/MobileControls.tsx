import React, { useRef, memo } from 'react';
import { inputManager } from '../services/input/InputManager';

// Remove props interface usage in component signature, but keep for compat if needed (but we want to clean up)
// Since App.tsx calls it with no props now, we can remove it.

const MobileControls: React.FC = memo(() => {
  const stickRef = useRef<HTMLDivElement>(null);

<<<<<<< Updated upstream
  // Joystick logic (simplified for MVP)
  // ...
=======
  const updateStick = (clientX: number, clientY: number) => {
    if (!baseRef.current || !stickRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const maxDist = rect.width / 2;
    const dist = Math.hypot(dx, dy);

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    stickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

    // Normalize -1..1 and send to InputManager
    inputManager.setJoystick(dx / maxDist, dy / maxDist);
  };

  const handleEnd = (e: React.TouchEvent) => {
    // Logic check touchId
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
    if (touch) {
      touchIdRef.current = null;
      if (stickRef.current) stickRef.current.style.transform = `translate(0px, 0px)`;
      inputManager.setJoystick(0, 0);
    }
  };
>>>>>>> Stashed changes

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Joystick Area */}
<<<<<<< Updated upstream
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full pointer-events-auto"
        onTouchMove={(e) => {
          // Calculate delta
          const touch = e.touches[0];
          // normalized -1..1
          onMove(0.5, 0.5); // Placeholder
        }}
      />

      {/* Action Buttons */}
      <div className="absolute bottom-10 right-10 flex gap-4 pointer-events-auto">
        <button
          className="w-20 h-20 bg-red-500/50 rounded-full font-bold text-white shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          onTouchStart={() => onAction('eject')}
          onTouchEnd={() => onActionEnd('eject')}
=======
      <div
        ref={baseRef}
        className="absolute bottom-8 left-8 w-40 h-40 bg-white/10 rounded-full pointer-events-auto backdrop-blur-sm border-2 border-white/20"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          touchIdRef.current = t.identifier;
          updateStick(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          if (touchIdRef.current === null) return;
          const t = Array.from(e.changedTouches).find(T => T.identifier === touchIdRef.current);
          if (t) updateStick(t.clientX, t.clientY);
        }}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
      >
        <div ref={stickRef} className="absolute top-1/2 left-1/2 w-16 h-16 -ml-8 -mt-8 bg-white rounded-full shadow-lg pointer-events-none" />
      </div>

      {/* Buttons - Direct calls to InputManager */}
      <div className="absolute bottom-8 right-8 flex gap-6 pointer-events-auto items-end">
        <button
          className="w-16 h-16 bg-red-500/80 rounded-full font-bold text-white shadow-lg backdrop-blur-sm active:scale-90 transition-transform flex items-center justify-center border-2 border-white/20"
          onTouchStart={(e) => { e.preventDefault(); inputManager.setButton('eject', true); }}
          onTouchEnd={(e) => { e.preventDefault(); inputManager.setButton('eject', false); }}
>>>>>>> Stashed changes
        >
          EJECT
        </button>

        <button
<<<<<<< Updated upstream
          className="w-24 h-24 bg-blue-500/50 rounded-full font-bold text-white shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          onTouchStart={() => onAction('skill')}
          onTouchEnd={() => onActionEnd('skill')}
=======
          className="w-24 h-24 bg-blue-500/80 rounded-full font-bold text-white shadow-lg backdrop-blur-sm active:scale-90 transition-transform flex items-center justify-center border-4 border-white/20"
          onTouchStart={(e) => { e.preventDefault(); inputManager.setButton('skill', true); }}
          onTouchEnd={(e) => { e.preventDefault(); inputManager.setButton('skill', false); }}
>>>>>>> Stashed changes
        >
          SKILL
        </button>
      </div>
    </div>
  );
});

export default MobileControls;
