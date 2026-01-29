import { PhysicsStore, TransformStore, InputStore } from '../ComponentStores';
import { ConfigStore } from '../ConfigStore'; // EIDOLON-V: Import ConfigStore
import { MAX_SPEED_BASE } from '../../../../constants'; // Adjust path if needed

export class MovementSystem {
    // EIDOLON-V: DOD Movement Logic (Pure Index-Based)
    static update(id: number, dt: number) {
        // 1. Read Inputs from InputStore
        const iIdx = id * InputStore.STRIDE;
        const tx = InputStore.data[iIdx];
        const ty = InputStore.data[iIdx + 1];

        // 2. Read State/Config
        const speedMult = ConfigStore.getSpeedMultiplier(id) || 1; // Default 1 if 0
        const effectiveMaxSpeed = MAX_SPEED_BASE * speedMult;

        const tIdx = id * 8;
        const pIdx = id * 8;

        const px = TransformStore.data[tIdx];
        const py = TransformStore.data[tIdx + 1];

        // 3. Logic
        const dx = tx - px;
        const dy = ty - py;
        const distSq = dx * dx + dy * dy;

        // Deadzone (Squared)
        if (distSq < 1) {
            // Stop if reached target
            // We don't set velocity to 0 immediately to allow some slide, 
            // but for precise movement we might want to dampen.
            // Let's rely on Friction in PhysicsSystem to stop us.
            return;
        }

        const dist = Math.sqrt(distSq);

        // Simple steering behavior: Seek
        // Force = (TargetVel - CurrentVel) * Factor?
        // Or just direct velocity setting with acceleration?
        // CJR original logic was likely: Acceleration towards target.

        // Let's apply Acceleration force.
        const accel = 2000; // Base acceleration
        const ax = (dx / dist) * accel * dt;
        const ay = (dy / dist) * accel * dt;

        PhysicsStore.data[pIdx] += ax;
        PhysicsStore.data[pIdx + 1] += ay;

        // Cap Speed
        const vx = PhysicsStore.data[pIdx];
        const vy = PhysicsStore.data[pIdx + 1];
        const vSq = vx * vx + vy * vy;
        const maxSq = effectiveMaxSpeed * effectiveMaxSpeed;

        if (vSq > maxSq) {
            const v = Math.sqrt(vSq);
            const scale = effectiveMaxSpeed / v;
            PhysicsStore.data[pIdx] *= scale;
            PhysicsStore.data[pIdx + 1] *= scale;
        }
    }

    static applyInputDOD(id: number, target: { x: number; y: number }, config: { maxSpeed: number; speedMultiplier: number }, dt: number) {
        // 1. Read Physics State
        const pIdx = id * 8;
        const transformerIdx = id * 8;
        const px = TransformStore.data[transformerIdx];
        const py = TransformStore.data[transformerIdx + 1];

        // 2. Logic (Same as update but with explicit target/config)
        const dx = target.x - px;
        const dy = target.y - py;
        const distSq = dx * dx + dy * dy;

        // Deadzone (Squared)
        if (distSq < 1) return;

        const dist = Math.sqrt(distSq);
        const accel = 2000;
        const ax = (dx / dist) * accel * dt;
        const ay = (dy / dist) * accel * dt;

        PhysicsStore.data[pIdx] += ax;
        PhysicsStore.data[pIdx + 1] += ay;

        // Cap Speed
        const effectiveMaxSpeed = config.maxSpeed * config.speedMultiplier;
        const vx = PhysicsStore.data[pIdx];
        const vy = PhysicsStore.data[pIdx + 1];
        const vSq = vx * vx + vy * vy;
        const maxSq = effectiveMaxSpeed * effectiveMaxSpeed;

        if (vSq > maxSq) {
            const v = Math.sqrt(vSq);
            const scale = effectiveMaxSpeed / v;
            PhysicsStore.data[pIdx] *= scale;
            PhysicsStore.data[pIdx + 1] *= scale;
        }
    }
}
