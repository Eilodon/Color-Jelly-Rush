import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState } from './types';
import { TattooId } from './services/cjr/cjrTypes';
import { ShapeId } from './services/cjr/cjrTypes';
import { createInitialState, updateClientVisuals, updateGameState } from './services/engine';
import { FixedGameLoop } from './services/engine/GameLoop'; // NEW IMPORT
import MainMenu from './components/MainMenu';
// ... imports ...
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';
import TattooPicker from './components/TattooPicker';
import ErrorBoundary from './components/ErrorBoundary';
import BootScreen from './components/screens/BootScreen';
import LevelSelectScreen from './components/screens/LevelSelectScreen';
import MatchmakingScreen from './components/screens/MatchmakingScreen';
import GameOverScreen from './components/screens/GameOverScreen';
import PauseOverlay from './components/overlays/PauseOverlay';
import SettingsOverlay from './components/overlays/SettingsOverlay';
import TutorialOverlay from './components/overlays/TutorialOverlay';
import {
  clearOverlays,
  initialUiState,
  popOverlay,
  pushOverlay,
  topOverlay,
  type UiState,
} from './services/ui/screenMachine';
import {
  defaultProgression,
  defaultSettings,
  loadProgression,
  loadSettings,
  saveProgression,
  saveSettings,
  type Progression,
  type Settings,
} from './services/ui/storage';
import { applyTattoo } from './services/cjr/tattoos';
import { networkClient } from './services/networking/NetworkClient';
import { audioExcellence } from './services/audio/AudioExcellence';
import {
  cancelQueue,
  createMatchmakingState,
  markMatched,
  startQueue,
  type MatchmakingState,
} from './services/meta/matchmaking';
import {
  createTournamentQueue,
  enqueueTournament,
  markTournamentReady,
  resetTournamentQueue,
  type TournamentQueueState,
  type TournamentParticipant,
} from './services/meta/tournaments';
import TournamentLobbyScreen from './components/screens/TournamentLobbyScreen';
import { updateProfileStats, unlockBadge } from './services/profile';
import BackgroundCanvas from './components/BackgroundCanvas';

const PixiGameCanvas = React.lazy(() => import('./components/PixiGameCanvas'));

const clampLevel = (n: number) => Math.max(1, Math.min(20, Math.round(n)));

const App: React.FC = () => {
  const [ui, setUi] = useState<UiState>(initialUiState);
  const uiRef = useRef(ui);
  useEffect(() => {
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

  // ENGINE REFS
  const gameStateRef = useRef<GameState | null>(null);
  const loopRef = useRef<FixedGameLoop | null>(null); // Fixed Loop
  const alphaRef = useRef<number>(0); // Extrapolated Alpha for Renderer

  const lastStartRef = useRef<{ name: string; shape: ShapeId } | null>(null);
  const resultHandledRef = useRef<GameState['result']>(null);
  const tattooOverlayArmedRef = useRef(false);
  const [networkStatus, setNetworkStatus] = useState<'offline' | 'connecting' | 'online' | 'reconnecting' | 'error'>('offline');

  const [isTouch, setIsTouch] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  const inputQueueRef = useRef<Array<{ type: 'skill' | 'eject'; id: string }>>([]);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // --- GAME LOOP CALLBACKS ---
  const onUpdate = useCallback((dt: number) => {
    const state = gameStateRef.current;
    if (!state) return;

    if (state.isPaused) return;

    const isNetworked = settings.useMultiplayer && networkStatus === 'online';

    if (isNetworked) {
      // Network client handles its own interpolation usually, 
      // but here we might validly just skip updateGameState and let netcode drive?
      // For now, keep existing logic:
      // networkClient.interpolateState(state, time); // Wait, time not available here?
      // Actually fixed loop passes 'dt'. NetworkClient usually needs absolute time.
      // We can track time in loop.
      // For this Refactor, assuming NetworkClient handles things internally or we need to pass accumulated time.
      // Let's use state.gameTime.
      updateClientVisuals(state, dt); // Visuals update
    } else {
      updateGameState(state, dt);
    }

    // Network Inputs
    if (isNetworked) {
      const events = [...inputQueueRef.current];
      inputQueueRef.current = [];
      networkClient.sendInput(state.player.targetPosition, state.inputs, dt, events);
    }

    // Audio
    if (state.player && !state.isPaused) {
      audioExcellence.updateTattooMix(state.player.tattoos);
    }

    // Overlays logic
    if (state.tattooChoices && !tattooOverlayArmedRef.current) {
      tattooOverlayArmedRef.current = true;
      setUi((s) => pushOverlay(s, { type: 'tattooPick' }));
    }
    if (!state.tattooChoices && tattooOverlayArmedRef.current) {
      tattooOverlayArmedRef.current = false;
      setUi((s) => popOverlay(s, 'tattooPick'));
    }

    // Win/Loss
    if (state.result && resultHandledRef.current !== state.result) {
      resultHandledRef.current = state.result;
      if (state.result === 'win') {
        setProgression((p) => ({
          ...p,
          unlockedLevel: Math.max(p.unlockedLevel, clampLevel((state.level ?? selectedLevel) + 1)),
        }));
        if (state.level === 5) unlockBadge('badge_survivor');
        if (state.level === 10) unlockBadge('badge_warrior');
        if (state.level === 20) unlockBadge('badge_champion');
      }
      updateProfileStats({
        kills: state.player.kills,
        score: state.player.score
      });
      setUi(() => ({ screen: 'gameOver', overlays: [] }));
      loopRef.current?.stop(); // Stop loop on end
    }
  }, [settings.useMultiplayer, networkStatus, selectedLevel]);

  const onRender = useCallback((alpha: number) => {
    alphaRef.current = alpha;
  }, []);

  // --- START GAME ---
  const startGame = useCallback((name: string, shape: ShapeId, nextLevel: number, useMultiplayerOverride?: boolean) => {
    console.log('🚀 startGame called:', { name, shape, nextLevel });

    if (loopRef.current) loopRef.current.stop();

    const state = createInitialState(nextLevel);
    // ... logic ...
    state.player.name = name;
    state.player.shape = shape;

    gameStateRef.current = state;
    resultHandledRef.current = null;
    tattooOverlayArmedRef.current = false;
    lastStartRef.current = { name, shape };
    setSelectedLevel(nextLevel);

    setUi(() => ({ screen: 'playing', overlays: [] }));

    const useMultiplayer = useMultiplayerOverride ?? settings.useMultiplayer;
    if (useMultiplayer) {
      networkClient.reset(); // Fix: Reset network state before binding new game state
      networkClient.setLocalState(state);
      networkClient.connectWithRetry(name, shape);
    }

    if (!progression.tutorialSeen && nextLevel <= 3) {
      // Tutorial logic
    }

    // START LOOP
    loopRef.current = new FixedGameLoop(60, onUpdate, onRender);
    loopRef.current.start();

  }, [progression.tutorialSeen, settings.useMultiplayer, onUpdate, onRender]);

  // Clean up loop on unmount or menu
  useEffect(() => {
    return () => {
      loopRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (ui.screen !== 'playing') {
      loopRef.current?.stop();
    } else if (loopRef.current && ui.screen === 'playing') {
      // Resume? createInitialState creates new loop.
      // Pause overlay just sets state.isPaused. Loop continues running.
      // So we don't need to stop/start loop on overlay push.
    }
  }, [ui.screen]);

  // ... (Keep existing Auto Start logic for testing) ...
  useEffect(() => {
    const t = window.setTimeout(() => {
      setUi(s => ({ ...s, screen: 'menu' }));
      // AUTO START
      const autoStartTimer = window.setTimeout(() => {
        startGame('TestPlayer', 'circle', 1, false);
      }, 500);
      return () => window.clearTimeout(autoStartTimer);
    }, 250);
    return () => window.clearTimeout(t);
  }, [startGame]);


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
      if (e.code === 'Space') {
        if (!state.inputs.space) {
          inputQueueRef.current.push({ type: 'skill', id: Math.random().toString(36) });
        }
        state.inputs.space = true;
      }
      if (e.code === 'KeyW') {
        if (!state.inputs.w) {
          inputQueueRef.current.push({ type: 'eject', id: Math.random().toString(36) });
        }
        state.inputs.w = true;
      }
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

  return (
    <div className="app-shell select-none">
      <BackgroundCanvas gameStateRef={gameStateRef} />
      <ErrorBoundary>
        {ui.screen === 'boot' && <BootScreen />}

        {ui.screen === 'menu' && (
          <MainMenu
            level={selectedLevel}
            unlockedLevel={progression.unlockedLevel}
            usePixi={settings.usePixi}
            useMultiplayer={settings.useMultiplayer}
            networkStatus={networkStatus}
            name={menuName}
            shape={menuShape}
            onTogglePixi={(next) => setSettings((s) => ({ ...s, usePixi: next }))}
            onOpenLevels={() => setUi((s) => ({ ...clearOverlays(s), screen: 'levelSelect' }))}
            onOpenTutorial={() => setUi((s) => pushOverlay(s, { type: 'tutorial', step: 0 }))}
            onOpenSettings={() => setUi((s) => pushOverlay(s, { type: 'settings' }))}
            onOpenMatchmaking={() => setUi((s) => ({ ...clearOverlays(s), screen: 'matchmaking' }))}
            onOpenTournament={() => setUi((s) => ({ ...clearOverlays(s), screen: 'tournament' }))}
            onStart={(name, shape) => startGame(name.trim(), shape, selectedLevel)}
            onNameChange={setMenuName}
            onShapeChange={setMenuShape}
          />
        )}

        {ui.screen === 'levelSelect' && (
          <LevelSelectScreen
            currentLevel={selectedLevel}
            unlockedLevel={progression.unlockedLevel}
            onBack={() => setUi((s) => ({ ...clearOverlays(s), screen: 'menu' }))}
            onPlay={(lvl) => {
              const next = clampLevel(lvl);
              setSelectedLevel(next);
              const last = lastStartRef.current;
              if (last) startGame(last.name, last.shape, next);
              else setUi((s) => ({ ...clearOverlays(s), screen: 'menu' }));
            }}
          />
        )}

        {ui.screen === 'matchmaking' && (
          <MatchmakingScreen
            name={menuName}
            shape={menuShape}
            region={matchmakingRegion}
            status={matchmaking.status}
            queuedAt={matchmaking.queuedAt}
            networkStatus={networkStatus}
            onRegionChange={setMatchmakingRegion}
            onQueue={() => setMatchmaking((state) => startQueue(state, matchmakingRegion))}
            onCancel={() => setMatchmaking(() => cancelQueue())}
            onBack={() => {
              setMatchmaking(() => cancelQueue());
              setUi((s) => ({ ...clearOverlays(s), screen: 'menu' }));
            }}
            onEnterMatch={() => {
              setMatchmaking(() => cancelQueue());
              setSettings((s) => ({ ...s, useMultiplayer: true }));
              startGame(menuName.trim(), menuShape, selectedLevel, true);
            }}
          />
        )}

        {ui.screen === 'tournament' && (
          <TournamentLobbyScreen
            queue={tournamentQueue}
            onQueue={(id) => setTournamentQueue(() => enqueueTournament(id))}
            onCancel={() => setTournamentQueue(() => resetTournamentQueue())}
            onBack={() => {
              setTournamentQueue(() => resetTournamentQueue());
              setUi((s) => ({ ...clearOverlays(s), screen: 'menu' }));
            }}
          />
        )}

        {ui.screen === 'playing' && gameStateRef.current && (
          <>
            <Suspense fallback={<div className="text-white">Loading Renderer…</div>}>
              <PixiGameCanvas gameStateRef={gameStateRef} inputEnabled={inputEnabled} alphaRef={alphaRef} />
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
          </>
        )}

        {ui.screen === 'gameOver' && (
          <GameOverScreen
            level={gameStateRef.current?.level ?? selectedLevel}
            result={gameStateRef.current?.result ?? 'lose'}
            canNext={(gameStateRef.current?.level ?? selectedLevel) < 20}
            onRetry={() => {
              const last = lastStartRef.current;
              if (!last) return setUi({ screen: 'menu', overlays: [] });
              startGame(last.name, last.shape, gameStateRef.current?.level ?? selectedLevel);
            }}
            onNext={() => {
              const last = lastStartRef.current;
              if (!last) return setUi({ screen: 'menu', overlays: [] });
              const next = clampLevel((gameStateRef.current?.level ?? selectedLevel) + 1);
              startGame(last.name, last.shape, next);
            }}
            onLevels={() => setUi({ screen: 'levelSelect', overlays: [] })}
          />
        )}

        {top?.type === 'pause' && (
          <PauseOverlay
            onResume={() => setUi((s) => popOverlay(s, 'pause'))}
            onRestart={() => {
              const last = lastStartRef.current;
              if (!last) return setUi({ screen: 'menu', overlays: [] });
              startGame(last.name, last.shape, gameStateRef.current?.level ?? selectedLevel);
            }}
            onQuit={() => {
              loopRef.current?.stop();
              gameStateRef.current = null;
              networkClient.disconnect();
              setUi({ screen: 'menu', overlays: [] });
            }}
            onSettings={() => setUi((s) => pushOverlay(s, { type: 'settings' }))}
          />
        )}

        {top?.type === 'settings' && (
          <SettingsOverlay
            usePixi={settings.usePixi}
            useMultiplayer={settings.useMultiplayer}
            onTogglePixi={(next) => setSettings((s) => ({ ...s, usePixi: next }))}
            onToggleMultiplayer={(next) => setSettings((s) => ({ ...s, useMultiplayer: next }))}
            onClose={() => setUi((s) => popOverlay(s, 'settings'))}
          />
        )}

        {top?.type === 'tutorial' && (
          <TutorialOverlay
            step={top.step}
            onNext={() => setUi((s) => ({ ...s, overlays: [...s.overlays.slice(0, -1), { type: 'tutorial', step: top.step + 1 }] }))}
            onPrev={() => setUi((s) => ({ ...s, overlays: [...s.overlays.slice(0, -1), { type: 'tutorial', step: Math.max(0, top.step - 1) }] }))}
            onClose={(didFinish) => {
              setUi((s) => popOverlay(s, 'tutorial'));
              if (didFinish) setProgression((p) => ({ ...p, tutorialSeen: true }));
              const state = gameStateRef.current;
              if (state && uiRef.current.screen === 'playing') {
                if (!state.result && !state.tattooChoices) state.isPaused = false;
              }
            }}
          />
        )}

        {top?.type === 'tattooPick' && gameStateRef.current?.tattooChoices && (
          <TattooPicker choices={gameStateRef.current.tattooChoices} onSelect={handleTattooSelect} />
        )}
      </ErrorBoundary>
    </div>
  );
};

export default App;
