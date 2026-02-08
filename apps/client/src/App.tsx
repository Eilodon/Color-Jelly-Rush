import React, { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { useGameSession } from './hooks/useGameSession';
import { BufferedInput } from './game/input/BufferedInput';
import { ScreenManager } from './components/ScreenManager';
import { AssetLoader } from './game/AssetLoader';
import { clientLogger } from './core/logging/ClientLogger';
import { mobileOptimizer } from './game/mobile/MobileOptimizer';
import { useScreenReaderAnnouncer } from './hooks/useScreenReaderAnnouncer';
import { gameStateManager } from './game/engine/GameStateManager';

import { audioEngine } from './game/audio/AudioEngine';
// EIDOLON-V: Dev tooling
import { initLevelHotReload } from './dev/LevelHotReload';
import { PacketInterceptor } from './dev/PacketInterceptor';
import { networkClient } from './network/NetworkClient';

// EIDOLON-V Phase 3: Initialize Core Registry for ComponentStores
import { registerCoreComponents, initializeAndFreezeCoreRegistry } from '@cjr/engine/core';
// EIDOLON-V Phase 3b: CJR Module registration
import { registerCJRComponents } from '@cjr/engine/modules/cjr';

const App: React.FC = () => {
  const session = useGameSession();
  const [bootError, setBootError] = useState<string | null>(null);
  const { announcement } = useScreenReaderAnnouncer();

  // Initialize Systems (Asset Loader + Input + Audio + Mobile)
  useEffect(() => {
    // EIDOLON-V PHASE1: Log Lifecycle
    clientLogger.info('App component mounted');

    const boot = async () => {
      try {
        clientLogger.info('🚀 SYSTEM BOOT INITIATED');

        // EIDOLON-V Phase 3: CRITICAL - Register core components BEFORE any ComponentStore access
        // This ensures memory convergence between ComponentRegistry and ComponentStores
        registerCoreComponents();
        clientLogger.info('✅ Core components registered');

        // EIDOLON-V Phase 3b: Register CJR-specific components (Tattoo, Pigment, etc.)
        registerCJRComponents();
        clientLogger.info('✅ CJR module components registered');

        // EIDOLON-V Phase 3c: Freeze registry - no more component registration after this point
        initializeAndFreezeCoreRegistry();
        clientLogger.info('✅ Component registry frozen');

        BufferedInput.init();
        mobileOptimizer.optimizeForMobile();
        // EIDOLON-V: Dev Tooling Init
        if (import.meta.env.DEV) {
          initLevelHotReload();
          PacketInterceptor.getInstance().install(networkClient);
        }

        // EIDOLON-V FIX: REAL LOADING (Parallel)
        // Load assets, audio, and wait for basic network handshake if needed
        await Promise.all([
          AssetLoader.init(),
          audioEngine.initialize(),
          // Optional: NetClient.connect()
        ]);

        clientLogger.info('✅ BOOT COMPLETE. ENTERING MENU.');
        session.actions.ui.setScreen('menu');
      } catch (e: unknown) {
        clientLogger.error('FATAL: Boot failed', undefined, e instanceof Error ? e : new Error(String(e)));
        setBootError(e instanceof Error ? e.message : 'Unknown Boot Error');
      }
    };

    boot();

    // EIDOLON ARCHITECT: Cleanup for HMR (Hot Module Reload)
    return () => {
      gameStateManager.dispose(); // EIDOLON-V FIX: Stop game loop to prevent undead loop
      BufferedInput.getInstance().dispose();
      mobileOptimizer.cleanup();
      clientLogger.info('App component unmounting');
    };
  }, [session.actions.ui]);

  if (bootError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-red-950 text-red-200">
        <div className="text-center p-8 border border-red-500 bg-black/80">
          <h1 className="text-3xl font-bold mb-4">SYSTEM FAILURE</h1>
          <p>{bootError}</p>
        </div>
      </div>
    );
  }

  // EIDOLON-V AUDIT FIX: Only register dev keybinds in development mode
  // (was running keydown listener on every keystroke in production)
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === 'KeyS') {
        const { stressTestController } = await import('./dev/StressTestController');
        const state = gameStateManager.getCurrentState();
        if (state) {
          stressTestController.start(state);
          console.info('Stress Test START');
        } else {
          console.warn('Cannot start Stress Test: No State');
        }
      }
      if (e.shiftKey && e.code === 'KeyD') {
        const { stressTestController } = await import('./dev/StressTestController');
        stressTestController.stop();
        console.info('Stress Test STOP');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell select-none relative w-full h-full bg-ink-950 overflow-hidden">
      {/* EIDOLON-V: Screen reader announcements for accessibility */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      >
        {announcement}
      </div>
      <ErrorBoundary>
        <ScreenManager session={session} />
      </ErrorBoundary>
    </div>
  );
};

export default App;
