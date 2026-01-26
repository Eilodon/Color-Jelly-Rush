import React from 'react';
import MainMenu from './MainMenu';
import HUD from './HUD';
import MobileControls from './MobileControls';
import GameOverScreen from './screens/GameOverScreen';
import LevelSelectScreen from './screens/LevelSelectScreen';
import MatchmakingScreen from './screens/MatchmakingScreen';
import TournamentLobbyScreen from './screens/TournamentLobbyScreen';
import BootScreen from './screens/BootScreen';
import GameCanvas from './GameCanvas';
import { UiOverlayManager } from './UiOverlayManager';
import { useGameSession } from '../hooks/useGameSession';

// Lazy load Pixi Canvas for performance
const PixiGameCanvas = React.lazy(() => import('./PixiGameCanvas'));

interface ScreenManagerProps {
  session: ReturnType<typeof useGameSession>;
}

const GameWorldLayer: React.FC<{ session: ScreenManagerProps['session'] }> = ({ session }) => {
  const { ui, refs, settings } = session;
  const isPlaying = ui.screen === 'playing' && refs.gameState.current;
  const inputEnabled = isPlaying && ui.overlays.length === 0;
  const usePixi = settings.usePixi;

  if (!isPlaying) return null;

  return (
    <React.Suspense fallback={<div className="absolute center text-gold-400">Summoning...</div>}>
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
            // GameCanvas legacy mouse handling
          }}
        />
      )}
    </React.Suspense>
  );
};

const UILayer: React.FC<{ session: ScreenManagerProps['session'] }> = ({ session }) => {
  const { ui, refs, isTouch } = session;
  const isPlaying = ui.screen === 'playing' && refs.gameState.current;

  if (!isPlaying) return null;

  return (
    <>
      <HUD gameStateRef={refs.gameState} isTouchInput={isTouch} />
      {isTouch && <MobileControls />}
    </>
  );
};

const ScreensLayer: React.FC<{ session: ScreenManagerProps['session'] }> = ({ session }) => {
  const { ui, state, actions, meta, settings, refs } = session;

  return (
    <div className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto">
      {ui.screen === 'boot' && <BootScreen />}

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
  );
};

export const ScreenManager: React.FC<ScreenManagerProps> = ({ session }) => {
  return (
    <>
      <GameWorldLayer session={session} />
      <UILayer session={session} />
      <ScreensLayer session={session} />
    </>
  );
};
