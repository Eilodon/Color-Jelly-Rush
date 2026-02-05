/**
 * @cjr/engine - DOD Module
 * Data-Oriented Design stores and flags
 * 
 * EIDOLON-V UNIFICATION: This is the SINGLE SOURCE OF TRUTH for all DOD stores.
 * Client app should import from here, NOT maintain local copies.
 */

// Core types and constants
export { EntityFlags, MAX_ENTITIES } from './EntityFlags';
export { WorldState, defaultWorld, STRIDES, type IWorldConfig } from './WorldState';

// Instance-based Accessors (new API)
export {
    TransformAccess,
    PhysicsAccess,
    StateAccess,
    StatsAccess,
    SkillAccess,
    TattooAccess,
    ProjectileAccess,
    ConfigAccess,
    InputAccess,
    PigmentAccess,
} from './ComponentStores';

// Static Stores (backward compatible API)
export {
    TransformStore,
    PhysicsStore,
    StateStore,
    StatsStore,
    SkillStore,
    TattooStore,
    ProjectileStore,
    ConfigStore,
    InputStore,
    PigmentStore,
    EntityLookup,
    resetAllStores,
} from './ComponentStores';

// Entity lookup interfaces
export {
    type IEntityLookup,
    type IEngineEntity,
    createArrayLookup,
    createMapLookup,
} from './IEntityLookup';
