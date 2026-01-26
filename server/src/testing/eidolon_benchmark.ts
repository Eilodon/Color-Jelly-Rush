
import { ColorMixingSystem } from '../systems/ColorMixingSystem';
import { AuthService } from '../auth/AuthService';
import { optimizer } from '../performance/Optimizer';

async function runBenchmark() {
    console.log('🔮 EIDOLON-V BENCHMARK PROTOCOL INITIATED 🔮');
    console.log('============================================');

    // --- TEST 1: ZERO-COPY COLOR MIXING ---
    console.log('\n[TEST 1] Color Mixing (Float32Array vs Objects)');
    const ITERATIONS = 100000;

    // Setup
    const id = 'test-entity';
    ColorMixingSystem.register(id, { r: 1, g: 0, b: 0 });

    const startMix = process.hrtime();
    for (let i = 0; i < ITERATIONS; i++) {
        const idx = ColorMixingSystem.getIndex(id);
        ColorMixingSystem.mixPigment(idx, 0, 1, 0, 0.1);
    }
    const endMix = process.hrtime(startMix);
    console.log(`✓ 100k Mixes (Zero-Copy): ${(endMix[0] * 1000 + endMix[1] / 1e6).toFixed(2)}ms`);

    // --- TEST 2: MILITARY GRADE SECURITY ---
    console.log('\n[TEST 2] Auth Security (Argon2id)');
    const startAuth = Date.now();
    const hash = await AuthService.hashPassword('super-secret');
    const hashTime = Date.now() - startAuth;
    console.log(`✓ Argon2id Hash Time: ${hashTime}ms (Should be > 100ms for security)`);

    const verify = await AuthService.verifyPassword('super-secret', hash);
    console.log(`✓ Verification Result: ${verify}`);

    // --- TEST 3: SPATIAL GRID ---
    console.log('\n[TEST 3] Spatial Grid (Flat Arrays)');
    // Gen 2000 entities
    const entities = [];
    for (let i = 0; i < 2000; i++) {
        entities.push({
            id: `e-${i}`,
            position: { x: Math.random() * 6000 - 3000, y: Math.random() * 6000 - 3000 },
            radius: 50,
            isDead: false
        });
    }

    const startGrid = process.hrtime();
    optimizer.detectCollisions(entities, 100);
    const endGrid = process.hrtime(startGrid);
    console.log(`✓ 2000 Entity Collision Check: ${(endGrid[0] * 1000 + endGrid[1] / 1e6).toFixed(2)}ms`);

    console.log('\n============================================');
    console.log('✅ BENCHMARK COMPLETE. SYSTEMS NOMINAL.');
}

runBenchmark().catch(console.error);
