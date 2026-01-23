import { CENTER_RADIUS, MAP_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from '../../constants';
import { Faction, Vector2 } from '../../types';

export const distSq = (v1: Vector2, v2: Vector2) => Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const randomPos = (): Vector2 => {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * (MAP_RADIUS - 200) + 200;
  return {
    x: WORLD_WIDTH / 2 + Math.cos(angle) * r,
    y: WORLD_HEIGHT / 2 + Math.sin(angle) * r,
  };
};

export const randomPosInZone = (faction: Faction): Vector2 => {
  let pos = randomPos();
  let attempts = 0;
  while (getZoneFromPosition(pos) !== faction && attempts < 50) {
    pos = randomPos();
    attempts += 1;
  }
  return pos;
};

export const randomPosInCenter = (): Vector2 => {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * (CENTER_RADIUS * 0.9);
  return {
    x: WORLD_WIDTH / 2 + Math.cos(angle) * r,
    y: WORLD_HEIGHT / 2 + Math.sin(angle) * r,
  };
};

export const randomRelicPos = (): Vector2 => {
  const angle = Math.random() * Math.PI * 2;
  const minR = CENTER_RADIUS * 1.2;
  const maxR = MAP_RADIUS * 0.6;
  const r = Math.sqrt(Math.random()) * (maxR - minR) + minR;
  return {
    x: WORLD_WIDTH / 2 + Math.cos(angle) * r,
    y: WORLD_HEIGHT / 2 + Math.sin(angle) * r,
  };
};

export const normalize = (v: Vector2): Vector2 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const getZoneCenter = (faction: Faction): Vector2 => {
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;
  const zoneOrder = [Faction.Wood, Faction.Water, Faction.Earth, Faction.Metal, Faction.Fire];
  const index = zoneOrder.indexOf(faction);
  const sector = (Math.PI * 2) / 5;
  const startAngle = -Math.PI / 2 - sector / 2;
  const midAngle = startAngle + (index + 0.5) * sector;
  const r = MAP_RADIUS * 0.6;
  return {
    x: cx + Math.cos(midAngle) * r,
    y: cy + Math.sin(midAngle) * r,
  };
};

export const getZoneFromPosition = (pos: Vector2): Faction | 'Center' => {
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const dSq = dx * dx + dy * dy;

  if (dSq < CENTER_RADIUS * CENTER_RADIUS) return 'Center';

  let angle = Math.atan2(dy, dx);
  if (angle < 0) angle += 2 * Math.PI;

  const sector = (Math.PI * 2) / 5;
  const adjustedAngle = (angle + Math.PI / 2 + sector / 2) % (Math.PI * 2);
  const index = Math.floor(adjustedAngle / sector);
  const zones = [Faction.Wood, Faction.Water, Faction.Earth, Faction.Metal, Faction.Fire];
  return zones[index] || Faction.Fire;
};
