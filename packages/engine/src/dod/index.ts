/**
 * @cjr/engine - DOD Module
 * Data-Oriented Design stores and flags
 */

export { EntityFlags, MAX_ENTITIES } from './EntityFlags';
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
    resetAllStores,
} from './ComponentStores';
export {
    type IEntityLookup,
    type IEngineEntity,
    createArrayLookup,
    createMapLookup,
} from './IEntityLookup';
