import React, { Suspense, useRef } from 'react';

// EIDOLON-V: Lazy load PixiGameCanvas for shader warm-up
const PixiGameCanvas = React.lazy(() => import('../PixiGameCanvas'));

const BootScreen: React.FC = () => {
  // EIDOLON-V: Dummy refs for PixiGameCanvas props
  const dummyGameStateRef = useRef(null);
  const dummyAlphaRef = useRef(0);

  return (
    <div className="menu-shell">
      {/* EIDOLON-V: Silent Shader Warm-up
          Render PixiGameCanvas invisibly to force WebGL context initialization
          and shader compilation BEFORE the game starts. This eliminates first-frame jank. */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 opacity-0 pointer-events-none" aria-hidden="true">
          <PixiGameCanvas
            gameStateRef={dummyGameStateRef}
            inputEnabled={false}
            alphaRef={dummyAlphaRef}
          />
        </div>
      </Suspense>

      <div className="flex flex-col items-center justify-center">
        <div className="ritual-title ritual-title-gradient text-4xl sm:text-5xl">
          COLOR-JELLY-RUSH
        </div>
        <div className="mt-6 text-[color:var(--mist-400)] tracking-[0.3em] uppercase text-xs">
          Mixing pigments…
        </div>
        <div className="mt-4 w-64 h-2 rounded bg-[color:var(--ink-900)] overflow-hidden">
          <div className="h-full w-1/2 bg-[linear-gradient(120deg,#d1b06a,#c16c35)] animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default BootScreen;
