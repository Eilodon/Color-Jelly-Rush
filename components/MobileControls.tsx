import React, { useRef } from 'react';

interface MobileControlsProps {
  onMove: (x: number, y: number) => void;
  onSkillStart: () => void;
  onSkillEnd: () => void;
  onEjectStart: () => void;
  onEjectEnd: () => void;
}

const JOYSTICK_RADIUS = 48;
const JOYSTICK_DEADZONE = 8;

const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onSkillStart,
  onSkillEnd,
  onEjectStart,
  onEjectEnd,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);

  const updateThumb = (x: number, y: number) => {
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!baseRef.current) return;
    event.preventDefault();

    const rect = baseRef.current.getBoundingClientRect();
    originRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    pointerIdRef.current = event.pointerId;
    activeRef.current = true;
    baseRef.current.setPointerCapture(event.pointerId);
    handlePointerMove(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current || event.pointerId !== pointerIdRef.current) return;
    const dx = event.clientX - originRef.current.x;
    const dy = event.clientY - originRef.current.y;
    const distance = Math.hypot(dx, dy);
    const clampedDistance = Math.min(distance, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDistance;
    const clampedY = Math.sin(angle) * clampedDistance;

    updateThumb(clampedX, clampedY);

    if (distance < JOYSTICK_DEADZONE) {
      onMove(0, 0);
      return;
    }

    onMove(clampedX / JOYSTICK_RADIUS, clampedY / JOYSTICK_RADIUS);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointerIdRef.current) return;
    event.preventDefault();
    activeRef.current = false;
    pointerIdRef.current = null;
    updateThumb(0, 0);
    onMove(0, 0);
  };

  const handleSkillDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSkillStart();
  };

  const handleSkillUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onSkillEnd();
  };

  const handleEjectDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onEjectStart();
  };

  const handleEjectUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onEjectEnd();
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          ref={baseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-28 h-28 rounded-full bg-slate-800/70 border border-slate-600 flex items-center justify-center touch-none"
        >
          <div
            ref={thumbRef}
            className="w-12 h-12 rounded-full bg-slate-200/80 border border-slate-300 shadow-lg transition-transform"
          />
        </div>
      </div>

      <div className="absolute bottom-8 right-6 pointer-events-auto flex flex-col items-end gap-4">
        <button
          onPointerDown={handleSkillDown}
          onPointerUp={handleSkillUp}
          onPointerCancel={handleSkillUp}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold shadow-xl touch-none"
          aria-label="Skill"
        >
          SKILL
        </button>
        <button
          onPointerDown={handleEjectDown}
          onPointerUp={handleEjectUp}
          onPointerCancel={handleEjectUp}
          className="w-16 h-16 rounded-full bg-slate-700 text-white font-bold shadow-lg touch-none"
          aria-label="Eject"
        >
          EJECT
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
