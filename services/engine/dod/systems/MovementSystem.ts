import { TransformStore, PhysicsStore } from '../ComponentStores';

export class MovementSystem {
    // EIDOLON-V FIX: Logic to apply input forces (DOD)
    // Direct Velocity Injection (Input -> PhysicsStore)

    static applyInputDOD(
        id: number,
        target: { x: number, y: number },
        stats: { maxSpeed: number, speedMultiplier: number },
        dt: number
    ) {
        // Direct Memory Access
        const tIdx = id * TransformStore.STRIDE;
        const pIdx = id * PhysicsStore.STRIDE;

        const posX = TransformStore.data[tIdx];
        const posY = TransformStore.data[tIdx + 1];

        const dx = target.x - posX;
        const dy = target.y - posY;
        const distSq = dx * dx + dy * dy;

        if (distSq > 25) { // 5px deadzone squared
            const speed = stats.maxSpeed * stats.speedMultiplier;
            const dist = Math.sqrt(distSq);

            // Write directly to PhysicsStore (Velocity)
            PhysicsStore.data[pIdx] = (dx / dist) * speed;
            PhysicsStore.data[pIdx + 1] = (dy / dist) * speed;
        } else {
            // Apply friction
            PhysicsStore.data[pIdx] *= 0.9;
            PhysicsStore.data[pIdx + 1] *= 0.9;
        }
    }
}

