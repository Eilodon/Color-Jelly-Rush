import React, { useRef, useEffect } from 'react';
import { GameState, Entity, Player } from '../types';
import { MAP_RADIUS, CENTER_RADIUS, WORLD_WIDTH, WORLD_HEIGHT } from '../constants';
import { COLOR_PALETTE_HEX as COLOR_PALETTE, RING_RADII } from '../constants';
import type { PigmentVec3 } from '../services/cjr/cjrTypes';
import { intToHex } from '../services/cjr/colorMath'; // EIDOLON-V: Import color helper

import { Canvas2DRingRenderer } from '../services/rendering/RingRenderer';
// Note: We are gradually migrating to RenderTypes but keeping compatibility for now
// import { EntityType, PickupType } from '../services/rendering/RenderTypes';

interface GameCanvasProps {
  gameStateRef: React.MutableRefObject<GameState | null>;
  width: number;
  height: number;
  onMouseMove?: (x: number, y: number) => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  enablePointerInput?: boolean;
}

// Helper to get color string from number or string
const getColor = (c: any, defaultColor: string = '#ffffff'): string => {
  if (typeof c === 'number') return intToHex(c);
  if (typeof c === 'string') return c;
  return defaultColor;
};

// ------------------------------------------------------------------
// RENDER STRATEGIES (Zero-GC Draw Calls)
// ------------------------------------------------------------------

const drawPolygon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number) => {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
};

const DrawStrategies = {
  Player: (ctx: CanvasRenderingContext2D, p: any) => {
    ctx.translate(p.position.x, p.position.y);

    // Draw Body
    ctx.fillStyle = getColor(p.color, '#ffffff');
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Name
    if (p.name) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px Sora';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, 0, -p.radius - 5);
    }
  },

  Food: (ctx: CanvasRenderingContext2D, f: any) => {
    ctx.translate(f.position.x, f.position.y);

    // Check kind (legacy string or new enum)
    const kind = f.kind;

    if (kind === 'shield') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(0, -f.radius);
      ctx.lineTo(f.radius, f.radius);
      ctx.lineTo(-f.radius, f.radius);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'catalyst') {
      ctx.fillStyle = '#d946ef';
      drawPolygon(ctx, 0, 0, f.radius, 6);
    } else if (kind === 'solvent') {
      ctx.fillStyle = '#a5b4fc';
      ctx.fillRect(-f.radius * 0.7, -f.radius * 0.7, f.radius * 1.4, f.radius * 1.4);
    } else if (kind === 'neutral') {
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(0, 0, f.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pigment or default
      ctx.fillStyle = getColor(f.color, '#ffffff');
      ctx.beginPath();
      ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  Projectile: (ctx: CanvasRenderingContext2D, p: any) => {
    ctx.translate(p.position.x, p.position.y);
    ctx.fillStyle = getColor(p.color, '#ff0000');
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawParticle = (ctx: CanvasRenderingContext2D, p: any) => {
  if (p.isIcon && p.iconSymbol) {
    ctx.globalAlpha = Math.max(0, Math.min(1, (p.fadeOut ? p.life / p.maxLife : 1)));
    ctx.fillStyle = getColor(p.iconColor || p.color, '#ffffff');
    ctx.font = `${p.fontSize || 24}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(p.iconSymbol, p.position.x, p.position.y);
    ctx.globalAlpha = 1;
    return;
  }

  const baseAlpha = p.fadeOut ? p.life / p.maxLife : 1;
  const opacity = p.bubbleOpacity ?? p.waveOpacity ?? p.auraIntensity ?? 1;
  const alpha = Math.max(0, Math.min(1, baseAlpha * opacity));

  // Resolve raw color first (could be number)
  const rawColor =
    p.color ||
    p.rippleColor ||
    p.pulseColor ||
    p.shockwaveColor ||
    p.waveColor ||
    p.auraColor ||
    p.bubbleColor ||
    p.shieldColor ||
    p.fieldColor ||
    p.orbColor ||
    0xFFFFFF;

  const color = getColor(rawColor, '#ffffff');

  ctx.globalAlpha = alpha;

  if (p.style === 'line') {
    const len = p.lineLength || p.radius * 2;
    const angle = p.angle || 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = p.lineWidth || 2;
    ctx.beginPath();
    ctx.moveTo(p.position.x, p.position.y);
    ctx.lineTo(
      p.position.x + Math.cos(angle) * len,
      p.position.y + Math.sin(angle) * len
    );
    ctx.stroke();
  } else if (p.style === 'ring' || p.isRipple || p.isPulse || p.isShockwave || p.isCleansingWave) {
    const ringRadius = p.rippleRadius || p.pulseRadius || p.shockwaveRadius || (p.isCleansingWave ? p.radius : 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = p.lineWidth || 2;
    ctx.beginPath();
    ctx.arc(p.position.x, p.position.y, ringRadius || p.radius, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Default / Geometric
    const sides = p.geometricSides || (p.isHexagonShield ? 6 : 0);
    if (p.isGeometric || p.isHexagonShield || sides > 0) {
      const radius = p.geometricRadius || p.radius;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2 + (p.angle || 0);
        const px = p.position.x + Math.cos(angle) * radius;
        const py = p.position.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (p.isHexagonShield) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fill();
      }
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

// ------------------------------------------------------------------
// GAME CANVAS COMPONENT
// ------------------------------------------------------------------

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameStateRef,
  width,
  height,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  enablePointerInput = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRendererRef = useRef<Canvas2DRingRenderer | null>(null);

  // EIDOLON ARCHITECT: Cache canvas bounds to avoid getBoundingClientRect in mousemove
  const canvasRectRef = useRef<DOMRect | null>(null);

  // Update cached rect on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initial cache
    canvasRectRef.current = canvas.getBoundingClientRect();

    // CRITICAL: ResizeObserver to update cache only when canvas resizes
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        canvasRectRef.current = canvas.getBoundingClientRect();
      }
    });

    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  // Input Handling: Use Ref to avoid re-binding listeners on prop change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enablePointerInput) return;

    // EIDOLON ARCHITECT: Zero-allocation mouse move using cached rect
    const handleMove = (e: MouseEvent) => {
      const rect = canvasRectRef.current;
      if (!rect) return;

      // CRITICAL: Read from cached rect (no getBoundingClientRect call)
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      if (onMouseMove) onMouseMove(x, y);
    };

    const handleDown = () => onMouseDown && onMouseDown();
    const handleUp = () => onMouseUp && onMouseUp();

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mouseup', handleUp);
    };
  }, [width, height, onMouseMove, onMouseDown, onMouseUp, enablePointerInput]);

  // RENDER LOOP (Zero-GC)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: alpha false if full opaque
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const state = gameStateRef.current;

      // 1. Clear Screen
      ctx.fillStyle = COLOR_PALETTE.background;
      ctx.fillRect(0, 0, width, height);

      if (!state?.player) {
        animationId = requestAnimationFrame(render);
        return;
      }

      // 2. Camera Transform
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.translate(-state.camera.x, -state.camera.y);

      // 3. Draw Background / Rings
      // EIDOLON-V: Draw Grid
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Simple Grid
      const gridSize = 300;
      const offsetX = state.camera.x % gridSize;
      const offsetY = state.camera.y % gridSize;
      const startX = state.camera.x - width / 2;
      const startY = state.camera.y - height / 2;

      // Vertical Lines
      for (let x = Math.floor(startX / gridSize) * gridSize; x < startX + width; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + height);
      }
      // Horizontal Lines
      for (let y = Math.floor(startY / gridSize) * gridSize; y < startY + height; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + width, y);
      }
      ctx.stroke();

      if (!ringRendererRef.current) ringRendererRef.current = new Canvas2DRingRenderer();
      ringRendererRef.current.drawRings(ctx, state.gameTime);

      // 4. Draw Map Border
      ctx.strokeStyle = COLOR_PALETTE.rings.r1;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, MAP_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Draw Entities (Zero-GC Iteration)

      // Food (Draw FIRST so it is BELOW players)
      for (let i = 0; i < state.food.length; i++) {
        const f = state.food[i];
        if (f.isDead) continue;
        ctx.save();
        DrawStrategies.Food(ctx, f);
        ctx.restore();
      }

      // Players
      if (!state.player.isDead) {
        ctx.save();
        DrawStrategies.Player(ctx, state.player);
        ctx.restore();
      }

      // Bots
      for (let i = 0; i < state.bots.length; i++) {
        const b = state.bots[i];
        if (b.isDead) continue;
        ctx.save();
        DrawStrategies.Player(ctx, b); // Bots use Player strategy
        ctx.restore();
      }

      // Projectiles (EIDOLON ARCHITECT: Manual transforms - no save/restore)
      for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p.isDead) continue;

        // CRITICAL: Manual transform + reset (eliminates canvas stack overhead)
        const px = p.position.x;
        const py = p.position.y;
        ctx.translate(px, py);

        ctx.fillStyle = getColor(p.color, '#ff0000');
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // CRITICAL: Manual reset instead of restore()
        ctx.translate(-px, -py);
      }

      // Particles (EIDOLON ARCHITECT: Already optimized - no transform needed)
      for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        // Particles draw at absolute positions - no transform needed
        drawParticle(ctx, p);
      }

      // Floating Texts
      for (let i = 0; i < state.floatingTexts.length; i++) {
        const t = state.floatingTexts[i];
        const alpha = Math.max(0, Math.min(1, t.life));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = t.color;
        ctx.font = `${t.size}px Sora`;
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.position.x, t.position.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [gameStateRef, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="block" />;
};

export default GameCanvas;
