import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, GameState, Faction, Player } from './types';
import { createPlayer, createBot, createFood, updateGameState } from './services/engine';
import { audioManager } from './services/audioManager';
import { WORLD_WIDTH, WORLD_HEIGHT, INITIAL_ZONE_RADIUS, BOT_COUNT, FOOD_COUNT } from './constants';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import HUD from './components/HUD';
import MobileControls from './components/MobileControls';

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Menu);
  const [isTouchInput, setIsTouchInput] = useState(false);
  // GameStateRef holds the TRUTH. We do not sync this to React state every frame.
  const gameStateRef = useRef<GameState | null>(null);
  
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const initGame = (playerName: string, faction: Faction) => {
    // Start Audio Context on user interaction
    audioManager.resume();
    audioManager.startBGM();

    const player = createPlayer(playerName, faction);
    const bots = Array.from({ length: BOT_COUNT }).map((_, i) => createBot(i.toString()));
    const food = Array.from({ length: FOOD_COUNT }).map(() => createFood());

    gameStateRef.current = {
      player,
      bots,
      food,
      particles: [],
      projectiles: [],
      floatingTexts: [],
      lavaZones: [],
      delayedActions: [],
      worldSize: { x: WORLD_WIDTH, y: WORLD_HEIGHT },
      zoneRadius: INITIAL_ZONE_RADIUS,
      gameTime: 0,
      currentRound: 1, // Start Round 1
      camera: player.position,
      shakeIntensity: 0,
      kingId: null,
      relicId: null,
      relicTimer: 8,
      inputs: { space: false, w: false }
    };
    
    setPhase(GamePhase.Playing);
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const gameLoop = (time: number) => {
    if (phase !== GamePhase.Playing && gameStateRef.current?.player.isDead) return;

    const dt = (time - lastTimeRef.current) / 1000; 
    lastTimeRef.current = time;

    if (gameStateRef.current) {
      // 1. Update Physics / Game Logic
      // Note: updateGameState mutates the object for performance in this architecture
      // (engine.ts was updated to support this pattern efficiently)
      const newState = updateGameState(gameStateRef.current, dt);
      gameStateRef.current = newState;

      // 2. Check Game Over
      if (newState.player.isDead) {
        setPhase(GamePhase.GameOver);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        return;
      }
      
      // CRITICAL ARCHITECTURE CHANGE: 
      // We do NOT call setUiState here. HUD reads from gameStateRef directly via its own loop.
      // This saves 60 React Reconciliations per second.
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleMouseMove = (x: number, y: number) => {
    if (gameStateRef.current) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const worldX = gameStateRef.current.camera.x + (x - screenWidth / 2);
        const worldY = gameStateRef.current.camera.y + (y - screenHeight / 2);

        gameStateRef.current.player.targetPosition = { x: worldX, y: worldY };
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!gameStateRef.current) return;
    if (e.code === 'Space') {
      gameStateRef.current.inputs.space = true;
    }
    if (e.code === 'KeyW') {
      gameStateRef.current.inputs.w = true;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!gameStateRef.current) return;
    if (e.code === 'Space') {
      gameStateRef.current.inputs.space = false;
    }
    if (e.code === 'KeyW') {
      gameStateRef.current.inputs.w = false;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    const detectTouch = () => {
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
      setIsTouchInput(hasCoarsePointer || hasTouch || window.innerWidth < 900);
    };
    detectTouch();
    window.addEventListener('resize', detectTouch);
    return () => window.removeEventListener('resize', detectTouch);
  }, []);

  const handleStickMove = (x: number, y: number) => {
    if (!gameStateRef.current) return;
    const player = gameStateRef.current.player;
    if (x === 0 && y === 0) {
      player.targetPosition = { ...player.position };
      return;
    }
    const targetDistance = 240;
    player.targetPosition = {
      x: player.position.x + x * targetDistance,
      y: player.position.y + y * targetDistance,
    };
  };

  const handleSkillStart = () => {
    if (gameStateRef.current) gameStateRef.current.inputs.space = true;
  };

  const handleSkillEnd = () => {
    if (gameStateRef.current) gameStateRef.current.inputs.space = false;
  };

  const handleEjectStart = () => {
    if (gameStateRef.current) gameStateRef.current.inputs.w = true;
  };

  const handleEjectEnd = () => {
    if (gameStateRef.current) gameStateRef.current.inputs.w = false;
  };

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden select-none">
      {phase === GamePhase.Menu && (
        <MainMenu onStart={initGame} />
      )}

      {phase === GamePhase.Playing && gameStateRef.current && (
        <>
          <GameCanvas 
            gameState={gameStateRef.current} 
            onMouseMove={handleMouseMove}
            onMouseDown={() => { 
                if (gameStateRef.current) gameStateRef.current.inputs.space = true; 
            }}
            onMouseUp={() => { 
                if (gameStateRef.current) gameStateRef.current.inputs.space = false; 
            }}
            enablePointerInput={!isTouchInput}
          />
          {/* HUD now accepts the Ref, not a state object */}
          <HUD gameStateRef={gameStateRef} isTouchInput={isTouchInput} />
          {isTouchInput && (
            <MobileControls
              onMove={handleStickMove}
              onSkillStart={handleSkillStart}
              onSkillEnd={handleSkillEnd}
              onEjectStart={handleEjectStart}
              onEjectEnd={handleEjectEnd}
            />
          )}
        </>
      )}

      {phase === GamePhase.GameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
            <div className="text-center">
                <h1 className="text-6xl text-red-600 font-fantasy mb-4">YOU DIED</h1>
                <p className="text-white text-xl mb-8">
                    Score: {gameStateRef.current?.player.score.toFixed(0)} <br/>
                    Kills: {gameStateRef.current?.player.kills}
                </p>
                <button 
                    onClick={() => setPhase(GamePhase.Menu)}
                    className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200"
                >
                    RETURN TO MENU
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
