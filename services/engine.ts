import { 
  GameState, Player, Bot, Food, Vector2, Faction, SizeTier, Particle, Entity, Projectile, FloatingText, LavaZone, DelayedAction 
} from '../types';
import { 
  WORLD_WIDTH, WORLD_HEIGHT, MAP_RADIUS, PLAYER_START_RADIUS, FOOD_COUNT, 
  FOOD_RADIUS, EAT_THRESHOLD_RATIO, DANGER_THRESHOLD_RATIO, 
  FACTION_CONFIG, INITIAL_ZONE_RADIUS, TRAIL_LENGTH,
  EJECT_MASS_COST, EJECT_SPEED, SPAWN_PROTECTION_TIME, ELEMENTAL_ADVANTAGE,
  TURN_SPEED_BASE, ACCELERATION_BASE, FRICTION_BASE, MAX_SPEED_BASE, CENTER_RADIUS, GRID_CELL_SIZE
} from '../constants';
import { audioManager } from './audioManager';

// --- Optimization: Persistent Spatial Grid ---
// WE DO NOT DESTROY THE GRID EVERY FRAME. WE REUSE THE ARRAYS.
class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, Entity[]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }
  
  clear() { 
    // Optimization: Don't delete keys, just empty the arrays. 
    // This reduces GC pressure significantly.
    for (const bucket of this.grid.values()) {
        bucket.length = 0;
    }
  }
  
  insert(entity: Entity) {
    const cellX = Math.floor(entity.position.x / this.cellSize);
    const cellY = Math.floor(entity.position.y / this.cellSize);
    const key = `${cellX},${cellY}`;
    
    let bucket = this.grid.get(key);
    if (!bucket) {
        bucket = [];
        this.grid.set(key, bucket);
    }
    bucket.push(entity);
  }
  
  getNearby(entity: Entity): Entity[] {
    const cellX = Math.floor(entity.position.x / this.cellSize);
    const cellY = Math.floor(entity.position.y / this.cellSize);
    
    const nearby: Entity[] = [];
    for(let dx = -1; dx <= 1; dx++) {
      for(let dy = -1; dy <= 1; dy++) {
        const key = `${cellX+dx},${cellY+dy}`;
        const bucket = this.grid.get(key);
        if (bucket && bucket.length > 0) {
          // Fast array copy
          for (let i = 0; i < bucket.length; i++) {
              nearby.push(bucket[i]);
          }
        }
      }
    }
    return nearby;
  }
}

const spatialGrid = new SpatialGrid(GRID_CELL_SIZE);

// --- Optimization: Particle Pooling ---
class ParticlePool {
  private pool: Particle[] = [];
  
  get(x: number, y: number, color: string, speed: number): Particle {
    const p = this.pool.pop() || this.createNew();
    p.position.x = x;
    p.position.y = y;
    p.velocity.x = randomRange(-speed, speed);
    p.velocity.y = randomRange(-speed, speed);
    p.color = color;
    p.life = 1.0;
    p.isDead = false;
    p.radius = randomRange(3, 8);
    return p;
  }
  
  release(particle: Particle) {
    this.pool.push(particle);
  }
  
  private createNew(): Particle {
    return {
      id: Math.random().toString(),
      position: {x:0, y:0},
      velocity: {x:0, y:0},
      radius: 0,
      color: '',
      life: 0,
      maxLife: 1.0,
      isDead: true,
      trail: []
    };
  }
}

const particlePool = new ParticlePool();

// --- Math Helpers ---
const distSq = (v1: Vector2, v2: Vector2) => Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);
const dist = (v1: Vector2, v2: Vector2) => Math.sqrt(distSq(v1, v2));

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const randomPos = (): Vector2 => {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (MAP_RADIUS - 200) + 200; 
    return {
        x: WORLD_WIDTH / 2 + Math.cos(angle) * r,
        y: WORLD_HEIGHT / 2 + Math.sin(angle) * r
    };
};

const normalize = (v: Vector2): Vector2 => {
  const len = Math.sqrt(v.x*v.x + v.y*v.y);
  return len === 0 ? {x:0, y:0} : {x: v.x/len, y: v.y/len};
}

const getZoneCenter = (faction: Faction): Vector2 => {
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;
    const zoneOrder = [Faction.Wood, Faction.Water, Faction.Earth, Faction.Metal, Faction.Fire];
    const index = zoneOrder.indexOf(faction);
    const sector = (Math.PI * 2) / 5;
    const startAngle = -Math.PI / 2 - (sector / 2); 
    const midAngle = startAngle + (index + 0.5) * sector;
    const r = MAP_RADIUS * 0.6;
    return {
        x: cx + Math.cos(midAngle) * r,
        y: cy + Math.sin(midAngle) * r
    };
};

const getZoneFromPosition = (pos: Vector2): Faction | 'Center' => {
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dSq = dx*dx + dy*dy;

    if (dSq < CENTER_RADIUS * CENTER_RADIUS) return 'Center';

    let angle = Math.atan2(dy, dx); 
    if (angle < 0) angle += 2 * Math.PI;

    const sector = (Math.PI * 2) / 5;
    const adjustedAngle = (angle + (Math.PI / 2) + (sector / 2)) % (Math.PI * 2);
    const index = Math.floor(adjustedAngle / sector);
    const zones = [Faction.Wood, Faction.Water, Faction.Earth, Faction.Metal, Faction.Fire];
    return zones[index] || Faction.Fire;
};

// --- Factory Methods ---
export const createPlayer = (name: string, faction: Faction): Player => {
  const stats = FACTION_CONFIG[faction].stats;
  return {
    id: 'player',
    name,
    faction,
    position: randomPos(), 
    velocity: { x: 0, y: 0 },
    radius: PLAYER_START_RADIUS,
    color: FACTION_CONFIG[faction].color,
    isDead: false,
    score: 0,
    kills: 0,
    maxHealth: 100 * stats.health,
    currentHealth: 100 * stats.health,
    tier: SizeTier.Larva,
    targetPosition: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
    trail: [],
    isInvulnerable: true,
    skillCooldown: 0,
    maxSkillCooldown: 6,
    acceleration: 0, 
    maxSpeed: MAX_SPEED_BASE * stats.speed,
    friction: 0.1, 
    
    defense: stats.defense,
    damageMultiplier: stats.damage,

    statusEffects: {
      speedBoost: 1,
      shielded: false,
      burning: false,
      slowed: false,
      poisoned: false,
      regen: 0,
      airborne: false
    }
  };
};

export const createBot = (id: string): Bot => {
  const factions = Object.values(Faction);
  const faction = factions[Math.floor(Math.random() * factions.length)];
  const base = createPlayer(`Bot ${id}`, faction);
  return {
    ...base,
    id: `bot-${id}`,
    position: randomPos(), 
    aiState: 'wander',
    targetEntityId: null,
    isInvulnerable: true,
    aiReactionTimer: 0,
  };
};

export const createFood = (pos?: Vector2, isEjected: boolean = false): Food => ({
  id: Math.random().toString(36).substr(2, 9),
  position: pos ? { ...pos } : randomPos(),
  velocity: { x: 0, y: 0 },
  radius: isEjected ? FOOD_RADIUS * 1.5 : (FOOD_RADIUS + Math.random() * 4),
  color: isEjected ? '#FFFFFF' : `hsl(${Math.random() * 360}, 70%, 60%)`,
  isDead: false,
  value: isEjected ? 5 : 1,
  trail: [],
  isEjected,
});

export const createParticle = (x: number, y: number, color: string, speed: number = 8): Particle => {
  return particlePool.get(x, y, color, speed);
};

export const createProjectile = (owner: Player | Bot, type: 'web' | 'ice' | 'sting'): Projectile => {
    const dir = normalize(owner.velocity.x === 0 && owner.velocity.y === 0 ? {x:1, y:0} : owner.velocity);
    const speed = 20; 
    const baseDamage = 15;
    const finalDamage = baseDamage * owner.damageMultiplier;

    return {
        id: Math.random().toString(),
        position: { ...owner.position },
        velocity: { x: dir.x * speed + owner.velocity.x, y: dir.y * speed + owner.velocity.y },
        radius: 12,
        color: type === 'ice' ? '#bae6fd' : '#4CAF50',
        isDead: false,
        trail: [],
        ownerId: owner.id,
        damage: finalDamage,
        type,
        duration: 2.0 
    };
};

const createFloatingText = (pos: Vector2, text: string, color: string, size: number = 20): FloatingText => ({
    id: Math.random().toString(),
    position: { x: pos.x, y: pos.y - 20 },
    text,
    color,
    size,
    life: 1.0,
    velocity: { x: randomRange(-1, 1), y: -3 } // Float up
});

// --- Physics Logic (FLUID DYNAMICS) ---

const applyPhysics = (entity: Player | Bot, target: Vector2, dt: number, currentZone: Faction | 'Center') => {
    if (entity.statusEffects.airborne) return; 

    // PHYSICS 4.0: VECTOR FORCE CONTROL
    // Controls: Direct Force Application (Tighter, Snappier)
    // No more "tank turning". We apply force in the direction of the target.

    const dx = target.x - entity.position.x;
    const dy = target.y - entity.position.y;
    const distToTarget = Math.sqrt(dx*dx + dy*dy);

    // 1. Calculate Stats Modifiers
    // Size Penalty: Less penalty than before for better high-level play
    const sizePenalty = Math.max(0.6, PLAYER_START_RADIUS / Math.max(PLAYER_START_RADIUS, entity.radius * 0.7)); 
    
    let currentMaxSpeed = entity.maxSpeed * sizePenalty * entity.statusEffects.speedBoost;
    if (entity.statusEffects.slowed) currentMaxSpeed *= 0.5;
    
    // Zone Friction
    let friction = FRICTION_BASE;
    if (currentZone === Faction.Water) {
        friction = 0.96; // Slidier in water
        if (entity.faction === Faction.Water) currentMaxSpeed *= 1.3;
    } else if (currentZone === Faction.Metal) {
        currentMaxSpeed *= 1.2;
    } else if (currentZone === Faction.Wood) {
        if (entity.faction !== Faction.Wood) currentMaxSpeed *= 0.85; 
    }

    // 2. Calculate Force
    const dirX = distToTarget > 0 ? dx / distToTarget : 0;
    const dirY = distToTarget > 0 ? dy / distToTarget : 0;

    let thrust = ACCELERATION_BASE;
    
    // 3. Counter-Thrust (The "Snappy" Factor)
    // If the entity is trying to move opposite to its current velocity, apply EXTRA force.
    const speed = Math.sqrt(entity.velocity.x*entity.velocity.x + entity.velocity.y*entity.velocity.y);
    if (speed > 1) {
        const vX = entity.velocity.x / speed;
        const vY = entity.velocity.y / speed;
        const dot = vX * dirX + vY * dirY; // 1.0 = Same Dir, -1.0 = Opposite Dir
        
        // If turning sharp or reversing (dot < 0.5), apply massive breaking/turning force
        if (dot < 0.5) {
            thrust *= 2.5; 
            friction *= 0.9; // Apply extra friction to kill old momentum
        }
    }

    // 4. Apply Force
    entity.velocity.x += dirX * thrust;
    entity.velocity.y += dirY * thrust;

    // 5. Cap Speed
    const newSpeed = Math.sqrt(entity.velocity.x**2 + entity.velocity.y**2);
    if (newSpeed > currentMaxSpeed) {
        const scale = currentMaxSpeed / newSpeed;
        entity.velocity.x *= scale;
        entity.velocity.y *= scale;
    }

    // 6. Apply Friction
    entity.velocity.x *= friction;
    entity.velocity.y *= friction;
    
    // 7. Arrival Damping (Anti-jitter when close to cursor)
    if (distToTarget < 20) {
        entity.velocity.x *= 0.8;
        entity.velocity.y *= 0.8;
    }

    // 8. Integration
    entity.position.x += entity.velocity.x;
    entity.position.y += entity.velocity.y;

    // Map Constraints
    const mapCenterX = WORLD_WIDTH / 2;
    const mapCenterY = WORLD_HEIGHT / 2;
    const dxCenter = entity.position.x - mapCenterX;
    const dyCenter = entity.position.y - mapCenterY;
    const distFromCenterSq = dxCenter*dxCenter + dyCenter*dyCenter;
    const mapRadiusSq = MAP_RADIUS * MAP_RADIUS;

    if (distFromCenterSq > mapRadiusSq) {
        const angleToCenter = Math.atan2(dyCenter, dxCenter);
        entity.position.x = mapCenterX + Math.cos(angleToCenter) * (MAP_RADIUS - 5);
        entity.position.y = mapCenterY + Math.sin(angleToCenter) * (MAP_RADIUS - 5);
        entity.velocity.x *= -0.5;
        entity.velocity.y *= -0.5;
    }

    if (!entity.trail) entity.trail = [];
    if (newSpeed > 3 && Math.random() > 0.7) {
        entity.trail.unshift({ x: entity.position.x, y: entity.position.y });
        if (entity.trail.length > TRAIL_LENGTH) entity.trail.pop();
    }
};

const updateTier = (player: Player) => {
  const progress = (player.radius - PLAYER_START_RADIUS) / 200; 
  if (progress < 0.2) player.tier = SizeTier.Larva;
  else if (progress < 0.4) player.tier = SizeTier.Juvenile;
  else if (progress < 0.6) player.tier = SizeTier.Adult;
  else if (progress < 0.8) player.tier = SizeTier.Elder;
  else player.tier = SizeTier.AncientKing;
};

// --- Zone Logic (Phase 4) ---
const updateZoneRadius = (gameTime: number): number => {
    if (gameTime < 150) { 
        return INITIAL_ZONE_RADIUS;
    } else if (gameTime < 300) { 
        const progress = (gameTime - 150) / 150;
        return INITIAL_ZONE_RADIUS * (1 - progress * 0.3); 
    } else if (gameTime < 450) { 
        const progress = (gameTime - 300) / 150;
        return INITIAL_ZONE_RADIUS * 0.7 * (1 - progress * 0.43); 
    } else { 
        const progress = Math.min(1, (gameTime - 450) / 30); 
        return Math.max(CENTER_RADIUS, INITIAL_ZONE_RADIUS * 0.4 * (1 - progress));
    }
};

// --- Main Game Loop ---

export const updateGameState = (state: GameState, dt: number): GameState => {
  const newState = state; // MUTATING STATE DIRECTLY FOR PERFORMANCE (React is decoupled now)
  
  newState.gameTime += dt;
  
  if (newState.gameTime > SPAWN_PROTECTION_TIME) {
    newState.player.isInvulnerable = false;
    newState.bots.forEach(b => b.isInvulnerable = false);
  }

  // Decay Screen Shake
  if (newState.shakeIntensity > 0) newState.shakeIntensity *= 0.9;
  if (newState.shakeIntensity < 0.5) newState.shakeIntensity = 0;

  // --- Round Logic ---
  const previousRound = newState.currentRound;
  let newRound = 1;
  if (newState.gameTime >= 450) newRound = 4; 
  else if (newState.gameTime >= 300) newRound = 3; 
  else if (newState.gameTime >= 150) newRound = 2; 
  
  newState.currentRound = newRound;

  if (newRound > previousRound) {
      audioManager.playWarning();
      newState.shakeIntensity = 1.0;
      let roundText = '';
      if (newRound === 2) roundText = "BO ROUND 1: TOXIC SPREADING!";
      if (newRound === 3) roundText = "BO ROUND 2: MAP SHRINKING!";
      if (newRound === 4) roundText = "SUDDEN DEATH: SURVIVE!";

      newState.floatingTexts.push({
          id: Math.random().toString(),
          position: { ...newState.player.position, y: newState.player.position.y - 100 },
          text: roundText,
          color: '#ef4444',
          size: 32,
          life: 4.0,
          velocity: { x: 0, y: -2 }
      });
  }

  newState.zoneRadius = updateZoneRadius(newState.gameTime);

  // --- Process Delayed Actions (Skills) ---
  for (let i = newState.delayedActions.length - 1; i >= 0; i--) {
    const action = newState.delayedActions[i];
    action.timer -= dt;
    if (action.timer <= 0) {
        executeDelayedAction(action, newState);
        newState.delayedActions.splice(i, 1);
    }
  }

  // --- King Logic ---
  const allEntities = [newState.player, ...newState.bots].filter(e => !e.isDead);
  let maxR = 0;
  let newKingId = null;
  allEntities.forEach(e => {
      if (e.radius > maxR) {
          maxR = e.radius;
          newKingId = e.id;
      }
  });
  newState.kingId = newKingId;

  // --- 1. Player Abilities ---
  if (state.inputs.w && newState.player.radius > PLAYER_START_RADIUS + EJECT_MASS_COST) {
     newState.player.radius -= EJECT_MASS_COST * 0.5; 
     const dir = normalize(newState.player.velocity);
     if (dir.x === 0 && dir.y === 0) dir.x = 1;
     
     const food = createFood({
        x: newState.player.position.x + dir.x * (newState.player.radius + 15),
        y: newState.player.position.y + dir.y * (newState.player.radius + 15)
     }, true);
     
     // Recoil
     newState.player.velocity.x -= dir.x * 2; 
     newState.player.velocity.y -= dir.y * 2;

     food.velocity = { x: dir.x * EJECT_SPEED, y: dir.y * EJECT_SPEED };
     newState.food.push(food);
     audioManager.playEject();
     state.inputs.w = false;
  }

  if (newState.player.skillCooldown > 0) newState.player.skillCooldown -= dt;
  if (state.inputs.space && newState.player.skillCooldown <= 0) {
      castSkill(newState.player, newState, dt);
      state.inputs.space = false;
  }

  // --- 2. Update Entities ---
  const entities = [newState.player, ...newState.bots];
  
  // Optimization: REUSE Spatial Grid logic
  spatialGrid.clear();
  newState.food.forEach(f => spatialGrid.insert(f));
  entities.forEach(e => !e.isDead && spatialGrid.insert(e));

  entities.forEach(entity => {
      if (entity.isDead) return;

      const currentZone = getZoneFromPosition(entity.position);

      // Status Effects Update
      if (entity.statusEffects.speedBoost > 1) {
          entity.statusEffects.speedBoost -= dt * 2.0; 
          if (entity.faction === Faction.Metal) {
             newState.particles.push(createParticle(entity.position.x, entity.position.y, '#94a3b8', 5));
          }
      } else entity.statusEffects.speedBoost = 1;
      
      if (entity.statusEffects.shielded && entity.skillCooldown < entity.maxSkillCooldown - 3) {
          entity.statusEffects.shielded = false; 
      }

      if (entity.statusEffects.poisoned) {
          entity.currentHealth -= 3 * dt;
          if (Math.random() < 0.1) newState.floatingTexts.push(createFloatingText(entity.position, "☠", '#84cc16', 12));
          if (Math.random() < 0.01) entity.statusEffects.poisoned = false; 
      }

      if (entity.statusEffects.burning) {
          entity.currentHealth -= 5 * dt;
          if (Math.random() < 0.1) newState.floatingTexts.push(createFloatingText(entity.position, "🔥", '#f97316', 12));
      }

      if (entity.statusEffects.regen > 0) {
          entity.currentHealth = Math.min(entity.maxHealth, entity.currentHealth + entity.statusEffects.regen * dt);
          entity.statusEffects.regen -= dt * 2; 
          if (entity.statusEffects.regen < 0) entity.statusEffects.regen = 0;
      }

      if (entity.id === 'player') {
          applyPhysics(entity, entity.targetPosition, dt, currentZone);
      } else {
          updateBotAI(entity as Bot, newState, dt, currentZone);
      }

      updateTier(entity);

      // --- ZONE HAZARDS & BUFFS ---
      if (currentZone === Faction.Fire) {
          if (entity.faction !== Faction.Fire) {
              if (!entity.isInvulnerable && !entity.statusEffects.airborne) {
                  entity.currentHealth -= (8 / entity.defense) * dt; 
                  if (Math.random() < 0.1) newState.particles.push(createParticle(entity.position.x, entity.position.y, '#f97316', 3));
              }
          } else {
              if (entity.currentHealth < entity.maxHealth) entity.currentHealth += 5 * dt;
          }
      }
      if (currentZone === Faction.Wood && entity.faction === Faction.Wood) {
           if (entity.currentHealth < entity.maxHealth) entity.currentHealth += 8 * dt;
      }
      
      const distCenterSq = Math.pow(entity.position.x - WORLD_WIDTH/2, 2) + Math.pow(entity.position.y - WORLD_HEIGHT/2, 2);
      if (distCenterSq > newState.zoneRadius * newState.zoneRadius) {
        entity.currentHealth -= 15 * dt; 
        if (entity.currentHealth <= 0) entity.isDead = true;
      } else {
          if (entity.currentHealth < entity.maxHealth) {
              entity.currentHealth += 1 * dt;
          }
      }
  });

  // --- 2.5 Lava Zones ---
  if (!newState.lavaZones) newState.lavaZones = [];
  for (let i = newState.lavaZones.length - 1; i >= 0; i--) {
      const zone = newState.lavaZones[i];
      zone.life -= dt;
      
      // Lava Damage
      entities.forEach(e => {
          if (!e.isDead && !e.statusEffects.airborne && e.id !== zone.ownerId && distSq(e.position, zone.position) < zone.radius * zone.radius) {
              e.currentHealth -= zone.damage * dt;
              if (!e.statusEffects.burning) e.statusEffects.burning = true;
          }
      });

      if (zone.life <= 0) newState.lavaZones.splice(i, 1);
  }


  // --- 3. Projectiles ---
  newState.projectiles.forEach(proj => {
      proj.position.x += proj.velocity.x * dt * 10; 
      proj.position.y += proj.velocity.y * dt * 10;
      proj.duration -= dt;
      if (proj.duration <= 0) proj.isDead = true;
      
      newState.particles.push(createParticle(proj.position.x, proj.position.y, proj.color, 2));

      entities.forEach(target => {
          if (target.id === proj.ownerId || target.isDead || target.isInvulnerable || target.statusEffects.airborne) return;
          const dSq = distSq(proj.position, target.position);
          if (dSq < target.radius * target.radius) {
              proj.isDead = true;
              applyProjectileEffect(proj, target, newState);
          }
      });
  });
  newState.projectiles = newState.projectiles.filter(p => !p.isDead);

  // --- 4. Collision & Consumption (OPTIMIZED) ---
  entities.forEach(entity => {
    if (entity.isDead || entity.statusEffects.airborne) return;
    const rSq = entity.radius * entity.radius;

    const neighbors = spatialGrid.getNearby(entity);
    
    for(const neighbor of neighbors) {
        if (neighbor.id === entity.id) continue;
        if (neighbor.isDead) continue;
        
        if ('value' in neighbor) { 
             const f = neighbor as Food;
             if (f.isDead) continue; 
             
             if (f.isEjected) {
                 f.position.x += f.velocity.x * dt * 10;
                 f.position.y += f.velocity.y * dt * 10;
                 f.velocity.x *= 0.90;
                 f.velocity.y *= 0.90;
             }

             const dSq = distSq(entity.position, f.position);
             if (dSq < rSq) {
                 f.isDead = true; 
                 const growth = f.value * 0.15;
                 entity.radius += growth;
                 entity.score += f.value;
                 if (entity.id === 'player') audioManager.playEat();
                 if (f.value > 2) newState.floatingTexts.push(createFloatingText(entity.position, `+${f.value}`, '#4ade80', 16));
             }
        } 
        else if ('faction' in neighbor) {
             const other = neighbor as Player | Bot;
             if (other.isDead || other.isInvulnerable || other.statusEffects.airborne) continue;
             if (entity.isInvulnerable) continue;

             const dSq = distSq(entity.position, other.position);
             const minDist = entity.radius + other.radius;
             
             if (dSq < minDist * minDist * 0.9) {
                const ratio = entity.radius / other.radius;
                const charging = entity.faction === Faction.Metal && entity.statusEffects.speedBoost > 1.5;
                const otherCharging = other.faction === Faction.Metal && other.statusEffects.speedBoost > 1.5;
                
                if (ratio >= DANGER_THRESHOLD_RATIO && !other.statusEffects.shielded && !otherCharging) {
                    consume(entity, other, newState);
                } else if (ratio <= EAT_THRESHOLD_RATIO && !entity.statusEffects.shielded && !charging) {
                   // handled by other loop
                } 
                else {
                    resolveCombat(entity, other, dt, newState, charging, otherCharging);
                }
             }
        }
    }
  });

  // Cleanup dead food efficiently
  let writeIdx = 0;
  for (let i = 0; i < newState.food.length; i++) {
      if (!newState.food[i].isDead) {
          newState.food[writeIdx++] = newState.food[i];
      }
  }
  newState.food.length = writeIdx;
  
  while (newState.food.length < FOOD_COUNT) {
    newState.food.push(createFood());
  }

  // --- 5. Polish (Particles & Text) ---
  for (let i = newState.particles.length - 1; i >= 0; i--) {
      const p = newState.particles[i];
      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      p.life -= 0.05;
      if (p.life <= 0) {
          p.isDead = true;
          particlePool.release(p);
          newState.particles.splice(i, 1);
      }
  }

  newState.floatingTexts.forEach(t => {
      t.position.x += t.velocity.x;
      t.position.y += t.velocity.y;
      t.life -= 0.02;
  });
  newState.floatingTexts = newState.floatingTexts.filter(t => t.life > 0);

  // Camera Logic (Smoother & Faster Tracking)
  if (!newState.player.isDead) {
    const camSpeed = 0.15; // Increased from 0.1 for tighter tracking
    const lookAheadX = newState.player.velocity.x * 25; // Look ahead more
    const lookAheadY = newState.player.velocity.y * 25;
    
    const shakeX = (Math.random() - 0.5) * newState.shakeIntensity * 20;
    const shakeY = (Math.random() - 0.5) * newState.shakeIntensity * 20;

    const targetCamX = newState.player.position.x + lookAheadX;
    const targetCamY = newState.player.position.y + lookAheadY;

    newState.camera.x = newState.camera.x * (1-camSpeed) + targetCamX * camSpeed + shakeX;
    newState.camera.y = newState.camera.y * (1-camSpeed) + targetCamY * camSpeed + shakeY;
  }

  return newState;
};

// --- Sub-Systems (Keep existing implementation but ensure optimized access) ---

const performDash = (caster: Player | Bot, state: GameState) => {
    const angle = Math.atan2(caster.velocity.y, caster.velocity.x);
    caster.velocity.x += Math.cos(angle) * 30; 
    caster.velocity.y += Math.sin(angle) * 30;
    caster.statusEffects.speedBoost = 2.5; 
    
    for(let j=0; j<10; j++) {
      state.particles.push(createParticle(caster.position.x, caster.position.y, '#e2e8f0', 8));
    }

    const neighbors = spatialGrid.getNearby(caster);
    neighbors.forEach(e => {
        if ('faction' in e && e.id !== caster.id && !e.isDead && distSq(caster.position, e.position) < (caster.radius*2)**2) {
            const victim = e as Player | Bot;
            victim.currentHealth -= 10;
            state.floatingTexts.push(createFloatingText(victim.position, '-10', '#3b82f6', 16));
        }
    });
};

const executeDelayedAction = (action: DelayedAction, state: GameState) => {
    const caster = action.ownerId === 'player' ? state.player : state.bots.find(b => b.id === action.ownerId);
    if (!caster || caster.isDead) return;

    if (action.type === 'metal_dash') {
        performDash(caster, state);
        audioManager.playSkill();
    }
    else if (action.type === 'water_shot') {
        const { angleOffset } = action.data;
        const currentAngle = Math.atan2(caster.velocity.y, caster.velocity.x);
        const finalAngle = currentAngle + angleOffset;
        
        const iceProj = createProjectile(caster, 'ice');
        const speed = 20;
        iceProj.velocity = { x: Math.cos(finalAngle) * speed, y: Math.sin(finalAngle) * speed };
        state.projectiles.push(iceProj);
    }
    else if (action.type === 'fire_land') {
        caster.statusEffects.airborne = false;
        state.particles.push(createParticle(caster.position.x, caster.position.y, '#f97316', 15));
        
        const impactRadius = caster.radius * 3;
        
        const neighbors = spatialGrid.getNearby(caster);
        neighbors.forEach(e => {
            if ('faction' in e && e.id !== caster.id && !e.isDead && distSq(caster.position, e.position) < impactRadius**2) {
                const victim = e as Player | Bot;
                const damage = 25 * caster.damageMultiplier / victim.defense;
                victim.currentHealth -= damage;
                victim.statusEffects.burning = true;
                
                const pushAngle = Math.atan2(victim.position.y - caster.position.y, victim.position.x - caster.position.x);
                victim.velocity.x += Math.cos(pushAngle) * 30;
                victim.velocity.y += Math.sin(pushAngle) * 30;
                
                state.floatingTexts.push(createFloatingText(victim.position, `-${Math.floor(damage)}`, '#ef4444', 20));
            }
        });

        if (!state.lavaZones) state.lavaZones = [];
        state.lavaZones.push({
            id: Math.random().toString(),
            position: { ...caster.position },
            radius: caster.radius * 2,
            damage: 20 * caster.damageMultiplier,
            ownerId: caster.id,
            life: 5.0
        });
        
        if (caster.id === 'player') state.shakeIntensity = 1.0;
    }
}

const castSkill = (caster: Player | Bot, state: GameState, dt: number) => {
    caster.skillCooldown = caster.maxSkillCooldown;
    audioManager.playSkill();
    state.floatingTexts.push(createFloatingText(caster.position, "SKILL!", '#fbbf24', 24));

    if (!state.delayedActions) state.delayedActions = [];

    switch(caster.faction) {
        case Faction.Metal: 
            performDash(caster, state);
            if (caster.tier === SizeTier.AncientKing) {
                state.delayedActions.push({ id: Math.random().toString(), type: 'metal_dash', timer: 0.2, ownerId: caster.id });
                state.delayedActions.push({ id: Math.random().toString(), type: 'metal_dash', timer: 0.4, ownerId: caster.id });
            }
            break;

        case Faction.Wood: 
            const web = createProjectile(caster, 'web');
            state.projectiles.push(web);
            break;

        case Faction.Water: 
            state.projectiles.push(createProjectile(caster, 'ice'));
            state.delayedActions.push({ id: Math.random().toString(), type: 'water_shot', timer: 0.1, ownerId: caster.id, data: { angleOffset: -0.3 } });
            state.delayedActions.push({ id: Math.random().toString(), type: 'water_shot', timer: 0.2, ownerId: caster.id, data: { angleOffset: 0.3 } });
            break;

        case Faction.Earth: 
            caster.statusEffects.shielded = true;
            for(let i=0;i<15;i++) state.particles.push(createParticle(caster.position.x, caster.position.y, '#fde047', 10));
            break;
            
        case Faction.Fire: 
            caster.statusEffects.airborne = true;
            state.floatingTexts.push(createFloatingText(caster.position, "JUMP!", '#ea580c', 20));
            state.delayedActions.push({ id: Math.random().toString(), type: 'fire_land', timer: 0.6, ownerId: caster.id });
            break;
    }
};

const applyProjectileEffect = (proj: Projectile, target: Player | Bot, state: GameState) => {
    if (target.statusEffects.shielded) {
        state.floatingTexts.push(createFloatingText(target.position, "BLOCK", '#fde047', 18));
        for(let k=0;k<5;k++) state.particles.push(createParticle(proj.position.x, proj.position.y, '#fff', 5));
        
        const owner = state.player.id === proj.ownerId ? state.player : state.bots.find(b => b.id === proj.ownerId);
        if (target.faction === Faction.Earth && target.tier === SizeTier.AncientKing && owner) {
             owner.statusEffects.poisoned = true;
             state.floatingTexts.push(createFloatingText(owner.position, "REFLECT POISON!", '#84cc16', 16));
        }
        return; 
    }

    const owner = state.player.id === proj.ownerId ? state.player : state.bots.find(b => b.id === proj.ownerId);
    const damageDealt = proj.damage / target.defense;
    target.currentHealth -= damageDealt;
    
    state.floatingTexts.push(createFloatingText(target.position, `-${Math.floor(damageDealt)}`, '#93c5fd', 18));
    for(let k=0;k<5;k++) state.particles.push(createParticle(target.position.x, target.position.y, proj.color));

    if (proj.type === 'ice') {
        target.statusEffects.slowed = true;
        state.floatingTexts.push(createFloatingText(target.position, "SLOW", '#bae6fd', 16));
        setTimeout(() => { target.statusEffects.slowed = false; }, 4000); 
    } 
    else if (proj.type === 'web') {
        target.velocity.x *= 0.1;
        target.velocity.y *= 0.1;
        state.floatingTexts.push(createFloatingText(target.position, "ROOT", '#4ade80', 16));
        
        if (owner) {
            const pullAngle = Math.atan2(owner.position.y - target.position.y, owner.position.x - target.position.x);
            target.velocity.x += Math.cos(pullAngle) * 35; 
            target.velocity.y += Math.sin(pullAngle) * 35;
            
            owner.statusEffects.regen += 20; 
            owner.currentHealth = Math.min(owner.maxHealth, owner.currentHealth + 10);
            state.floatingTexts.push(createFloatingText(owner.position, "+HP", '#4ade80', 14));
            
            target.statusEffects.poisoned = true;
        }
    }
};

const consume = (predator: Player | Bot, prey: Player | Bot, state: GameState) => {
    prey.isDead = true;
    const gain = prey.radius * 0.3; 
    predator.radius += gain;
    predator.kills++;
    predator.score += prey.radius * 10;
    predator.currentHealth = Math.min(predator.maxHealth, predator.currentHealth + 40);
    
    state.floatingTexts.push(createFloatingText(predator.position, "DEVOUR!", '#ef4444', 30));
    if (predator.id === 'player') state.shakeIntensity = 0.8;

    for(let k=0; k<25; k++) {
        state.particles.push(createParticle(prey.position.x, prey.position.y, prey.color, 12));
    }
    if (predator.id === 'player') audioManager.playKill();
};

const resolveCombat = (e1: Player | Bot, e2: Player | Bot, dt: number, state: GameState, c1: boolean, c2: boolean) => {
    const angle = Math.atan2(e2.position.y - e1.position.y, e2.position.x - e1.position.x);
    const pushForce = 12; 
    e1.velocity.x -= Math.cos(angle) * pushForce;
    e1.velocity.y -= Math.sin(angle) * pushForce;
    e2.velocity.x += Math.cos(angle) * pushForce;
    e2.velocity.y += Math.sin(angle) * pushForce;

    const e1CountersE2 = ELEMENTAL_ADVANTAGE[e1.faction] === e2.faction;
    const e2CountersE1 = ELEMENTAL_ADVANTAGE[e2.faction] === e1.faction;
    const e1Shield = e1.statusEffects.shielded;
    const e2Shield = e2.statusEffects.shielded;

    const baseDmg = 5.0 * dt;
    let e1Dmg = baseDmg * (e2.damageMultiplier / e1.defense); 
    let e2Dmg = baseDmg * (e1.damageMultiplier / e2.defense); 

    if (e1CountersE2) e2Dmg *= 3;
    else if (e2CountersE1) e1Dmg *= 3;

    if (c1) e2Dmg += 20 * (1 / e2.defense); 
    if (c2) e1Dmg += 20 * (1 / e1.defense);

    if (e1Shield) { 
        e1Dmg = 0; 
        if (e1.faction === Faction.Earth) {
            e2Dmg += 2 * e1.damageMultiplier;
            if (e1.tier === SizeTier.AncientKing && !e2.statusEffects.poisoned) {
                e2.statusEffects.poisoned = true;
                state.floatingTexts.push(createFloatingText(e2.position, "POISONED!", '#84cc16', 16));
            }
        }
        if (Math.random() < 0.1) state.floatingTexts.push(createFloatingText(e1.position, "BLOCK", '#fde047', 14));
    } 
    if (e2Shield) { 
        e2Dmg = 0; 
        if (e2.faction === Faction.Earth) {
            e1Dmg += 2 * e2.damageMultiplier;
             if (e2.tier === SizeTier.AncientKing && !e1.statusEffects.poisoned) {
                e1.statusEffects.poisoned = true;
                state.floatingTexts.push(createFloatingText(e1.position, "POISONED!", '#84cc16', 16));
            }
        }
        if (Math.random() < 0.1) state.floatingTexts.push(createFloatingText(e2.position, "BLOCK", '#fde047', 14));
    }

    e1.currentHealth -= e1Dmg;
    e2.currentHealth -= e2Dmg;

    if (Math.random() < 0.1 && e1Dmg > 1) state.floatingTexts.push(createFloatingText(e1.position, Math.floor(e1Dmg).toString(), '#fff', 12));
    if (Math.random() < 0.1 && e2Dmg > 1) state.floatingTexts.push(createFloatingText(e2.position, Math.floor(e2Dmg).toString(), '#fff', 12));

    if (Math.random() > 0.3) state.particles.push(createParticle((e1.position.x+e2.position.x)/2, (e1.position.y+e2.position.y)/2, '#fff', 5));

    if (e1.currentHealth <= 0) consume(e2, e1, state);
    else if (e2.currentHealth <= 0) consume(e1, e2, state);
};

const updateBotAI = (bot: Bot, state: GameState, dt: number, currentZone: Faction | 'Center') => {
    bot.aiReactionTimer += dt;
    if (bot.aiReactionTimer < 0.1) { 
        applyPhysics(bot, bot.targetPosition, dt, currentZone);
        return; 
    }
    bot.aiReactionTimer = 0;

    let target = bot.targetPosition;
    let closestThreat: Entity | null = null;
    let closestFood: Entity | null = null;
    let closestPrey: Entity | null = null;
    let minDistSq = Infinity;

    const scanRadiusSq = 500 * 500;
    const neighbors = spatialGrid.getNearby(bot);
    
    neighbors.forEach(e => {
        if (e.id === bot.id || e.isDead) return;

        const isInvulnerable = 'isInvulnerable' in e ? (e as Player).isInvulnerable : false;
        if (isInvulnerable) return;
        
        if ('value' in e) {
             const dSq = distSq(bot.position, e.position);
             if (dSq < minDistSq) {
                 minDistSq = dSq;
                 closestFood = e as Food;
             }
             return;
        }

        if (!('faction' in e)) return;
        const entity = e as Player | Bot;
        
        const dSq = distSq(bot.position, entity.position);
        if (dSq > scanRadiusSq) return;

        const ratio = entity.radius / bot.radius;
        const ICounterThem = ELEMENTAL_ADVANTAGE[bot.faction] === entity.faction;
        const TheyCounterMe = ELEMENTAL_ADVANTAGE[entity.faction] === bot.faction;

        if (ratio >= DANGER_THRESHOLD_RATIO || (ratio > 0.9 && TheyCounterMe)) {
            if (!closestThreat || dSq < distSq(bot.position, closestThreat.position)) closestThreat = entity;
        } 
        else if (ratio <= EAT_THRESHOLD_RATIO || (ratio < 1.1 && ICounterThem)) {
            if (!closestPrey || dSq < distSq(bot.position, closestPrey.position)) closestPrey = entity;
        }
    });

    if (closestThreat) {
        bot.aiState = 'flee';
        const dx = bot.position.x - closestThreat.position.x;
        const dy = bot.position.y - closestThreat.position.y;
        target = { x: bot.position.x + dx, y: bot.position.y + dy };
        if (bot.skillCooldown <= 0 && distSq(bot.position, closestThreat.position) < 300*300) castSkill(bot, state, dt);
    } 
    else if (closestPrey) {
        bot.aiState = 'chase';
        target = { 
            x: closestPrey.position.x + closestPrey.velocity.x * 10, 
            y: closestPrey.position.y + closestPrey.velocity.y * 10 
        };
        if (bot.skillCooldown <= 0 && distSq(bot.position, closestPrey.position) < 400*400) castSkill(bot, state, dt);
    } 
    else if (closestFood) {
        bot.aiState = 'chase';
        target = closestFood.position;
    } 
    else {
        if (Math.random() < 0.2) {
             const homeCenter = getZoneCenter(bot.faction);
             const biasStrength = 0.3; 
             const randomX = bot.position.x + randomRange(-400, 400);
             const randomY = bot.position.y + randomRange(-400, 400);
             
             target = {
                 x: randomX * (1-biasStrength) + homeCenter.x * biasStrength,
                 y: randomY * (1-biasStrength) + homeCenter.y * biasStrength
             };
        }
    }
    
    const mapCenterX = WORLD_WIDTH / 2;
    const mapCenterY = WORLD_HEIGHT / 2;
    const distFromMapCenterSq = distSq(target, { x: mapCenterX, y: mapCenterY });
    
    if (distFromMapCenterSq > (state.zoneRadius * 0.9)**2) {
        target = { x: mapCenterX, y: mapCenterY };
    } else if (distFromMapCenterSq > (MAP_RADIUS * 0.9)**2) {
        target = { x: mapCenterX, y: mapCenterY };
    }

    bot.targetPosition = target;
    applyPhysics(bot, target, dt, currentZone);
}