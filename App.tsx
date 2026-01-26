<<<<<<< Updated upstream
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState } from './types';
import { TattooId } from './services/cjr/cjrTypes';
import { ShapeId } from './services/cjr/cjrTypes';
import { createInitialState, updateClientVisuals, updateGameState } from './services/engine';
=======
import React, { Suspense, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { useGameSession } from './hooks/useGameSession';
import { UiOverlayManager } from './components/UiOverlayManager';
import { inputManager } from './services/input/InputManager';
>>>>>>> Stashed changes
import MainMenu from './components/MainMenu';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';
import GameOverScreen from './components/screens/GameOverScreen';
import LevelSelectScreen from './components/screens/LevelSelectScreen';
import MatchmakingScreen from './components/screens/MatchmakingScreen';
import TournamentLobbyScreen from './components/screens/TournamentLobbyScreen';
import BootScreen from './components/screens/BootScreen';
import GameCanvas from './components/GameCanvas';

const PixiGameCanvas = React.lazy(() => import('./components/PixiGameCanvas'));

const App: React.FC = () => {
  const session = useGameSession();
  const { ui, state, actions, refs, settings, isTouch, meta } = session;

  const isPlaying = ui.screen === 'playing' && refs.gameState.current;
  const inputEnabled = isPlaying && ui.overlays.length === 0;

  // Render Strategy: Choose renderer based on settings
  const usePixi = settings.usePixi;

  // Initialize Input Manager
  useEffect(() => {
<<<<<<< Updated upstream
    uiRef.current = ui;
  }, [ui]);

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return typeof window !== 'undefined' ? loadSettings() : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [progression, setProgression] = useState<Progression>(() => {
    try {
      return typeof window !== 'undefined' ? loadProgression() : defaultProgression;
    } catch {
      return defaultProgression;
    }
  });

  const [menuName, setMenuName] = useState('Jelly');
  const [menuShape, setMenuShape] = useState<ShapeId>('circle');
  const [matchmakingRegion, setMatchmakingRegion] = useState('NA');
  const [matchmaking, setMatchmaking] = useState<MatchmakingState>(() => createMatchmakingState());
  const [tournamentQueue, setTournamentQueue] = useState<TournamentQueueState>(() => createTournamentQueue());

  const [selectedLevel, setSelectedLevel] = useState(() => clampLevel(progression.unlockedLevel));

  useEffect(() => {
    try {
      saveSettings(settings);
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      saveProgression(progression);
    } catch {
      // ignore
    }
  }, [progression]);

  useEffect(() => {
    if (matchmaking.status !== 'queuing') return;
    const timeout = window.setTimeout(() => {
      setMatchmaking((state) => {
        if (state.status !== 'queuing') return state;
        return markMatched(state, `match_${Date.now().toString(36)}`);
      });
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [matchmaking.status]);

  useEffect(() => {
    if (tournamentQueue.status !== 'queued') return;
    const timeout = window.setTimeout(() => {
      setTournamentQueue((state) => {
        if (state.status !== 'queued') return state;
        const participants: TournamentParticipant[] = [
          { id: 'local', name: menuName || 'Jelly', rating: 1380 },
          { id: 'bot_ember', name: 'Ember', rating: 1320 },
          { id: 'bot_nyx', name: 'Nyx', rating: 1405 },
          { id: 'bot_sable', name: 'Sable', rating: 1290 },
          { id: 'bot_ash', name: 'Ash', rating: 1340 },
          { id: 'bot_luxe', name: 'Luxe', rating: 1412 },
        ];
        return markTournamentReady(state, participants);
      });
    }, 2600);
    return () => window.clearTimeout(timeout);
  }, [menuName, tournamentQueue.status]);

  const gameStateRef = useRef<GameState | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastStartRef = useRef<{ name: string; shape: ShapeId } | null>(null);
  const resultHandledRef = useRef<GameState['result']>(null);
  const tattooOverlayArmedRef = useRef(false);
  const [networkStatus, setNetworkStatus] = useState<'offline' | 'connecting' | 'online' | 'reconnecting' | 'error'>('offline');

  const [isTouch, setIsTouch] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startGame = useCallback((name: string, shape: ShapeId, nextLevel: number, useMultiplayerOverride?: boolean) => {
    console.log('🚀 startGame called:', { name, shape, nextLevel, useMultiplayerOverride });

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = 0;

    const state = createInitialState(nextLevel);
    console.log('🎮 Initial state created:', {
      player: !!state.player,
      bots: state.bots.length,
      food: state.food.length,
      playerRadius: state.player.radius
    });

    state.player.name = name;
    state.player.shape = shape;

    gameStateRef.current = state;
    resultHandledRef.current = null;
    tattooOverlayArmedRef.current = false;
    lastStartRef.current = { name, shape };
    setSelectedLevel(nextLevel);

    console.log('🎮 Setting UI to playing state');
    setUi(() => ({ screen: 'playing', overlays: [] }));

    const useMultiplayer = useMultiplayerOverride ?? settings.useMultiplayer;
    if (useMultiplayer) {
      networkClient.setLocalState(state);
      networkClient.connectWithRetry(name, shape);
    }

    if (!progression.tutorialSeen && nextLevel <= 3) {
      console.log('🎮 Tutorial overlay would show, but skipping for testing');
      // state.isPaused = true;
      // setUi((s) => pushOverlay(s, { type: 'tutorial', step: 0 }));
    }
  }, [progression.tutorialSeen, settings.useMultiplayer]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setUi(s => ({ ...s, screen: 'menu' }));
      console.log('🎮 Game UI State: Menu screen activated');

      // AUTO START FOR TESTING - FORCE IMMEDIATE
      const autoStartTimer = window.setTimeout(() => {
        console.log('🚀 AUTO STARTING GAME FOR TESTING');
        console.log('🎮 Current UI State:', ui);
        startGame('TestPlayer', 'circle', 1, false);
      }, 500); // REDUCED TO 500MS

      return () => window.clearTimeout(autoStartTimer);
    }, 250);
    return () => window.clearTimeout(t);
  }, [startGame]);

  const gameLoop = useCallback((time: number) => {
    const state = gameStateRef.current;
    if (!state) return;

    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const safeDt = Math.min(dt, 0.1);
    const isNetworked = settings.useMultiplayer && networkStatus === 'online';

    if (isNetworked) {
      networkClient.interpolateState(state, time);
      updateClientVisuals(state, safeDt);
    } else if (!state.isPaused) {
      updateGameState(state, safeDt);
    }

    if (settings.useMultiplayer && networkStatus === 'online') {
      networkClient.sendInput(state.player.targetPosition, state.inputs, safeDt);
    }

    // Audio Mix Update
    if (state.player && !state.isPaused) {
      audioExcellence.updateTattooMix(state.player.tattoos);
    }

    if (state.tattooChoices && !tattooOverlayArmedRef.current) {
      tattooOverlayArmedRef.current = true;
      setUi((s) => pushOverlay(s, { type: 'tattooPick' }));
    }
    if (!state.tattooChoices && tattooOverlayArmedRef.current) {
      tattooOverlayArmedRef.current = false;
      setUi((s) => popOverlay(s, 'tattooPick'));
    }

    if (state.result && resultHandledRef.current !== state.result) {
      resultHandledRef.current = state.result;

      if (state.result === 'win') {
        setProgression((p) => ({
          ...p,
          unlockedLevel: Math.max(p.unlockedLevel, clampLevel((state.level ?? selectedLevel) + 1)),
        }));
        // Metagame Unlocks
        if (state.level === 5) unlockBadge('badge_survivor');
        if (state.level === 10) unlockBadge('badge_warrior');
        if (state.level === 20) unlockBadge('badge_champion');
      }

      // Save Stats
      updateProfileStats({
        kills: state.player.kills,
        score: state.player.score
      });

      setUi(() => ({ screen: 'gameOver', overlays: [] }));
      return;
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [selectedLevel, networkStatus, settings.useMultiplayer]);

  useEffect(() => {
    networkClient.setStatusListener(setNetworkStatus);
    networkClient.enableAutoReconnect(true);
    return () => networkClient.setStatusListener(undefined);
  }, []);

  useEffect(() => {
    if (ui.screen === 'playing') return;
    if (networkStatus === 'offline') return;
    networkClient.disconnect();
  }, [ui.screen, networkStatus]);

  useEffect(() => {
    if (ui.screen !== 'playing' || !gameStateRef.current) return;

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = 0;
    };
  }, [ui.screen, gameLoop]);

  useEffect(() => {
    const state = gameStateRef.current;
    if (!state) return;
    if (ui.screen !== 'playing') return;
    if (state.result) return;
    if (state.tattooChoices) return;
    state.isPaused = ui.overlays.length > 0;
  }, [ui.overlays.length, ui.screen]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (!state) return;
      if (uiRef.current.screen !== 'playing') return;
      if (uiRef.current.overlays.length > 0) return;
      if (e.code === 'Space') state.inputs.space = true;
      if (e.code === 'KeyW') state.inputs.w = true;
    };
    const handleUp = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (!state) return;
      if (e.code === 'Space') state.inputs.space = false;
      if (e.code === 'KeyW') state.inputs.w = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (uiRef.current.screen !== 'playing') return;
      e.preventDefault();
      setUi((s) => {
        const top = topOverlay(s);
        if (top?.type === 'pause') return popOverlay(s, 'pause');
        return pushOverlay(s, { type: 'pause' });
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleTattooSelect = useCallback((id: TattooId) => {
    const state = gameStateRef.current;
    if (!state) return;
    applyTattoo(state.player, id, state);
    state.tattooChoices = null;
    state.isPaused = false;
    setUi((s) => popOverlay(s, 'tattooPick'));
  }, []);

  const inputEnabled = ui.screen === 'playing' && ui.overlays.length === 0;
  const top = useMemo(() => topOverlay(ui), [ui]);

=======
    inputManager.init();
  }, []);

>>>>>>> Stashed changes
  return (
    <div className="app-shell select-none relative w-full h-full bg-ink-950 overflow-hidden">
      <ErrorBoundary>

        {/* GAME WORLD LAYER */}
        {isPlaying && (
          <Suspense fallback={<div className="absolute center text-gold-400">Summoning...</div>}>
            {usePixi ? (
              <PixiGameCanvas
                gameStateRef={refs.gameState}
                inputEnabled={inputEnabled}
                alphaRef={refs.alpha}
              />
            ) : (
              <GameCanvas
                gameStateRef={refs.gameState}
                width={window.innerWidth}
                height={window.innerHeight}
                enablePointerInput={inputEnabled}
                onMouseMove={(x, y) => {
                  // Keep pure for GameCanvas if needed, or wire to inputManager here
                  // For now, GameCanvas handles its own mouse listeners internally mostly, 
                  // or we can bridge if we update GameCanvas.
                }}
              />
            )}
          </Suspense>
        )}

        {/* UI LAYER */}
        {isPlaying && (
          <>
<<<<<<< Updated upstream
            <Suspense fallback={<div className="text-white">Loading Renderer…</div>}>
              <PixiGameCanvas gameStateRef={gameStateRef} inputEnabled={inputEnabled} />
            </Suspense>
            <MobileControls
              onMove={(dx, dy) => {
                const state = gameStateRef.current;
                if (!state || !inputEnabled) return;
                state.player.targetPosition = {
                  x: state.player.position.x + dx,
                  y: state.player.position.y + dy,
                };
              }}
              onAction={(btn) => {
                const state = gameStateRef.current;
                if (!state || !inputEnabled) return;
                if (btn === 'skill') {
                  state.inputs.space = true;
                } else if (btn === 'eject') {
                  state.inputs.w = true;
                }
              }}
              onActionEnd={(btn) => {
                const state = gameStateRef.current;
                if (!state || !inputEnabled) return;
                if (btn === 'skill') {
                  state.inputs.space = false;
                } else if (btn === 'eject') {
                  state.inputs.w = false;
                }
              }}
            />
=======
            <HUD gameStateRef={refs.gameState} isTouchInput={isTouch} />
            {isTouch && <MobileControls />}
>>>>>>> Stashed changes
          </>
        )}

        {/* SCREENS */}
        <div className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto">
          {ui.screen === 'boot' && <BootScreen />}

<<<<<<< Updated upstream
        {top?.type === 'pause' && (
          <PauseOverlay
            onResume={() => setUi((s) => popOverlay(s, 'pause'))}
            onRestart={() => {
              const last = lastStartRef.current;
              if (!last) return setUi({ screen: 'menu', overlays: [] });
              startGame(last.name, last.shape, gameStateRef.current?.level ?? selectedLevel);
            }}
            onQuit={() => {
              if (requestRef.current) cancelAnimationFrame(requestRef.current);
              requestRef.current = 0;
              gameStateRef.current = null;
              networkClient.disconnect();
              setUi({ screen: 'menu', overlays: [] });
            }}
            onSettings={() => setUi((s) => pushOverlay(s, { type: 'settings' }))}
          />
        )}
=======
          {ui.screen === 'menu' && (
            <MainMenu
              level={meta.selectedLevel}
              unlockedLevel={session.progression.unlockedLevel}
              usePixi={settings.usePixi}
              useMultiplayer={settings.useMultiplayer}
              networkStatus={meta.networkStatus || 'offline'}
              name={meta.menuName}
              shape={meta.menuShape}
              onStart={(n, s) => actions.game.start(n, s, meta.selectedLevel)}
              onNameChange={actions.meta.setName}
              onShapeChange={actions.meta.setShape}
              onTogglePixi={actions.ui.togglePixi}
              onOpenLevels={() => actions.ui.setScreen('levelSelect')}
              onOpenSettings={() => actions.ui.pushOverlay({ type: 'settings' })}
              onOpenTutorial={() => actions.ui.pushOverlay({ type: 'tutorial', step: 0 })}
              onOpenMatchmaking={() => actions.ui.setScreen('matchmaking')}
              onOpenTournament={() => actions.ui.setScreen('tournament')}
            />
          )}
>>>>>>> Stashed changes

          {ui.screen === 'levelSelect' && (
            <LevelSelectScreen
              currentLevel={meta.selectedLevel}
              unlockedLevel={session.progression.unlockedLevel}
              onBack={() => actions.ui.setScreen('menu')}
              onPlay={(l) => { actions.meta.setLevel(l); actions.ui.setScreen('menu'); }}
            />
          )}

          {ui.screen === 'matchmaking' && (
            <MatchmakingScreen
              name={meta.menuName}
              shape={meta.menuShape}
              region={meta.matchmakingRegion}
              status={meta.matchmaking.status}
              queuedAt={meta.matchmaking.queuedAt}
              networkStatus={meta.networkStatus}
              onRegionChange={actions.ui.setMatchmakingRegion}
              onQueue={actions.meta.startQueue}
              onCancel={actions.meta.cancelQueue}
              onBack={() => { actions.meta.cancelQueue(); actions.ui.setScreen('menu'); }}
              onEnterMatch={() => {
                actions.meta.cancelQueue();
                actions.ui.toggleMultiplayer(true);
                actions.game.start(meta.menuName, meta.menuShape, meta.selectedLevel, true);
              }}
            />
          )}

          {ui.screen === 'tournament' && (
            <TournamentLobbyScreen
              queue={meta.tournamentQueue}
              onQueue={actions.meta.startTournamentQueue}
              onCancel={actions.meta.cancelTournamentQueue}
              onBack={() => { actions.meta.cancelTournamentQueue(); actions.ui.setScreen('menu'); }}
            />
          )}

          {ui.screen === 'gameOver' && (
            <GameOverScreen
              level={state.level ?? meta.selectedLevel}
              result={state.lastResult ?? 'lose'}
              canNext={(state.level ?? meta.selectedLevel) < 20}
              onRetry={actions.game.retry}
              onNext={actions.game.nextLevel}
              onLevels={() => actions.ui.setScreen('levelSelect')}
              onHome={actions.ui.returnToMenu}
            />
          )}

          <UiOverlayManager
            overlays={ui.overlays}
            actions={actions.ui}
            gameStateRef={refs.gameState}
            settings={settings}
          />
        </div>

      </ErrorBoundary>
    </div>
  );
};

export default App;
