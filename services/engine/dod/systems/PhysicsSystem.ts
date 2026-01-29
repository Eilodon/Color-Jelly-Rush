import { MAX_ENTITIES, EntityFlags } from '../EntityFlags';
import { TransformStore, PhysicsStore, StateStore } from '../ComponentStores';
import { FRICTION_BASE } from '../../../../constants';

export const PHY_MAP_RADIUS = 2500;

export class PhysicsSystem {
    static update(dt: number) {
        const count = MAX_ENTITIES;
        const flags = StateStore.flags;
        const pData = PhysicsStore.data;

        // Nếu game chạy đúng 60fps, scale = 1.0.
        const timeScale = dt * 60;

        // EIDOLON-V OPTIMIZATION: Hoist Fast Path Check
        // If running stable at 60FPS (timeScale ~ 1.0), skip Math.pow completely
        const useFastFriction = Math.abs(timeScale - 1.0) < 0.01;

        // EIDOLON-V OPTIMIZATION: Pre-calculate power for standard friction (Lag Spike Protection)
        const defaultFrictionUnstable = Math.pow(FRICTION_BASE, timeScale);

        for (let id = 0; id < count; id++) {
            // Bitmask Check: Chỉ xử lý Active Entity
            if ((flags[id] & EntityFlags.ACTIVE) === 0) continue;

            const pIdx = id * 8; // PhysicsStore.STRIDE hardcoded for speed

            // Lấy ma sát gốc từ Store (index 6)
            const frictionBase = pData[pIdx + 6];

            let effectiveFriction: number;

            if (useFastFriction) {
                effectiveFriction = frictionBase;
            } else {
                // Optimization: most entities use FRICTION_BASE
                if (Math.abs(frictionBase - FRICTION_BASE) < 0.0001) {
                    effectiveFriction = defaultFrictionUnstable;
                } else {
                    effectiveFriction = Math.pow(frictionBase, timeScale);
                }
            }

            this.integrateEntity(id, dt, effectiveFriction);
        }
    }

    static integrateEntity(id: number, dt: number, friction: number) {
        const tData = TransformStore.data;
        const pData = PhysicsStore.data;
        const tIdx = id * 8;
        const pIdx = id * 8;

        // 1. Unpack Velocity (Direct Array Access)
        let vx = pData[pIdx];
        let vy = pData[pIdx + 1];

        // 2. Apply Friction
        vx *= friction;
        vy *= friction;

        // 3. Snapshot for Interpolation (RenderBridge cần cái này)
        tData[tIdx + 4] = tData[tIdx];     // prevX
        tData[tIdx + 5] = tData[tIdx + 1]; // prevY
        // tData[tIdx + 6] = tData[tIdx + 2]; // prevRotation (Nếu cần)

        // 4. Integrate Position (Euler Integration)
        // Legacy scaler * 10 vẫn giữ để tương thích logic cũ
        const delta = dt * 10;
        tData[tIdx] += vx * delta;
        tData[tIdx + 1] += vy * delta;

        // 5. Write back Velocity
        pData[pIdx] = vx;
        pData[pIdx + 1] = vy;

        // 6. Map Constraints (Circle Arena)
        const r = pData[pIdx + 4]; // Radius
        const limit = PHY_MAP_RADIUS - r;
        const limitSq = limit * limit;

        const x = tData[tIdx];
        const y = tData[tIdx + 1];
        const distSq = x * x + y * y;

        if (distSq > limitSq) {
            const dist = Math.sqrt(distSq);
            const invDist = 1.0 / dist; // Phép chia tốn kém, làm 1 lần
            const nx = x * invDist;
            const ny = y * invDist;

            // Clamp position
            tData[tIdx] = nx * limit;
            tData[tIdx + 1] = ny * limit;

            // Bounce (Reflect velocity)
            const dot = vx * nx + vy * ny;
            if (dot > 0) {
                const bounceFactor = 1.5; // Magic number từ code cũ
                pData[pIdx] -= bounceFactor * dot * nx;
                pData[pIdx + 1] -= bounceFactor * dot * ny;
            }
        }
    }
}
