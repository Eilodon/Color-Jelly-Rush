
import { CENTER_RADIUS, MAP_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from '../../constants';
import { RING_RADII } from '../cjr/cjrConstants';
import { Vector2 } from '../../types';

export const distSq = (v1: Vector2, v2: Vector2) => Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);

export const distance = (v1: Vector2, v2: Vector2) => Math.sqrt(distSq(v1, v2));

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const randomPos = (): Vector2 => {
  // Map is circular with center at (0,0) and radius MAP_RADIUS
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * (MAP_RADIUS - 200) + 100; // 100 to MAP_RADIUS-100
  return {
    x: Math.cos(angle) * r, // Center at (0,0)!
    y: Math.sin(angle) * r,
  };
};

export const randomPosInRing = (ring: 1 | 2 | 3): Vector2 => {
  let minR = 0;
  let maxR = 0;
  if (ring === 1) {
    minR = RING_RADII.R2;
    maxR = RING_RADII.R1;
  } else if (ring === 2) {
    minR = RING_RADII.R3;
    maxR = RING_RADII.R2;
  } else {
    minR = RING_RADII.CENTER;
    maxR = RING_RADII.R3;
  }

  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(randomRange(minR * minR, maxR * maxR));
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  };
};

export const randomPosInCenter = (): Vector2 => {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * (CENTER_RADIUS * 0.9);
  return {
    x: Math.cos(angle) * r, // Center at (0,0)!
    y: Math.sin(angle) * r,
  };
};

export const normalize = (v: Vector2): Vector2 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};
