
// EIDOLON-V: DATA-DRIVEN PHYSICS CONFIG
// Designed for "Game Juice" - Curves over flat numbers.
// SOTA 2026

export const PhysicsConfig = {
    movement: {
        baseSpeed: 2.3, // Matches reduced speed in constants
        turnSpeed: 0.25,
        friction: 0.93,

        // EIDOLON-V: CURVES
        // Input sensitivity curve (1.0 = linear, 1.2 = exponential "snappy" feel)
        accelerationCurve: 1.2,

        // "Drift" mechanic when turning sharply (>90 degrees)
        brakeStrength: 0.85,
    },

    interactions: {
        ejectCost: 8,
        ejectSpeed: 18,
        ejectDecay: 0.95, // Independent friction for ejected mass
    },

    // Future: Import this into Wasm engine
    network: {
        interpolationDelay: 2, // frames
        predictionLimit: 150, // ms
    }
};
