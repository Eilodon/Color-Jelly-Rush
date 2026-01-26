import React, { useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { useGameSession } from './hooks/useGameSession';
import { inputManager } from './services/input/InputManager';
import { ScreenManager } from './components/ScreenManager';

const App: React.FC = () => {
  const session = useGameSession();

  // Initialize Input Manager (Single Responsibility)
  useEffect(() => {
    inputManager.init();

    // EIDOLON-V FIX: Boot Sequence
    // Simulate asset loading or just delay for effect
    const timer = setTimeout(() => {
      session.actions.ui.setScreen('menu');
    }, 1500); // 1.5s boot time

    return () => clearTimeout(timer);
  }, [session.actions.ui]);

  return (
    <div className="app-shell select-none relative w-full h-full bg-ink-950 overflow-hidden">
      <ErrorBoundary>
        <ScreenManager session={session} />
      </ErrorBoundary>
    </div>
  );
};

export default App;
