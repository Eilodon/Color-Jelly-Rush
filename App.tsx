import React, { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { useGameSession } from './hooks/useGameSession';
import { inputManager } from './services/input/InputManager';
import { ScreenManager } from './components/ScreenManager';
import { AssetLoader } from './services/AssetLoader';

import { audioEngine } from './services/audio/AudioEngine';

const App: React.FC = () => {
  const session = useGameSession();
  const [bootError, setBootError] = useState<string | null>(null);

  // Initialize Systems (Asset Loader + Input + Audio)
  useEffect(() => {
    const boot = async () => {
      try {
        console.log('🚀 SYSTEM BOOT INITIATED');
        inputManager.init();

        // EIDOLON-V FIX: REAL LOADING (Parallel)
        // Load assets, audio, and wait for basic network handshake if needed
        await Promise.all([
          AssetLoader.init(),
          audioEngine.initialize(),
          // Optional: NetClient.connect()
        ]);

        console.log('✅ BOOT COMPLETE. ENTERING MENU.');
        session.actions.ui.setScreen('menu');
      } catch (e: any) {
        console.error("FATAL: Boot failed", e);
        setBootError(e.message || "Unknown Boot Error");
      }
    };

    boot();
    // No cleanup required for singletons
  }, []);

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

  return (
    <div className="app-shell select-none relative w-full h-full bg-ink-950 overflow-hidden">
      <ErrorBoundary>
        <ScreenManager session={session} />
      </ErrorBoundary>
    </div>
  );
};

export default App;
