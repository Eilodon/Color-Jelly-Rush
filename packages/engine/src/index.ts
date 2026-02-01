/**
 * @cjr/engine - Main Entry Point
 * 
 * Headless game engine for Color Jelly Rush
 * Runs on both client (with VFX bridge) and server (headless)
 * 
 * @example
 * ```typescript
 * import { Engine, eventBuffer, EngineEventType } from '@cjr/engine';
 * 
 * const engine = new Engine();
 * engine.update(dt);
 * 
 * // Client: drain events for VFX
 * eventBuffer.drain((event) => {
 *   if (event.type === EngineEventType.PARTICLE_BURST) {
 *     vfxSystem.playBurst(event.x, event.y, event.data);
 *   }
 * });
 * ```
 */

// DOD Module
export * from './dod';

// Events Module
export * from './events';

// Systems Module
export * from './systems';

// Config Module
export * from './config';

// CJR Game Logic Module
export * from './cjr';

// Math Module
export * from './math';

// Networking Module
export * from './networking';

// Factories Module
export * from './factories';

// Engine Class
export { Engine } from './Engine';

