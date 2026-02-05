/**
 * @cjr/engine - EntityFlags Compatibility Layer
 * 
 * AUTO-GENERATED compatibility re-exports from generated code.
 * This file exists to maintain backward compatibility for imports.
 * 
 * @deprecated Import from '../generated/index' or '../generated/ComponentAccessors' directly
 */

export { EntityFlags } from '../generated/ComponentAccessors';
export { MAX_ENTITIES } from '../generated/WorldState';

/**
 * Engine reserves flags 0-7, game modules use 8+
 * @deprecated This is a legacy constant. Use explicit flag values.
 */
export const ENGINE_FLAG_OFFSET = 8;

/**
 * No flags set (value = 0)
 * @deprecated Use 0 directly or import from generated/ComponentAccessors
 */
export const NONE = 0;
