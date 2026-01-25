import { describe, it, expect } from 'vitest';
import { createPlayer } from '../services/engine/factories';
import { integrateEntity } from '../services/engine/systems/physics';

describe('Deterministic Physics System', () => {
    it('should produce identical results given identical inputs over 600 frames', () => {
        // RUN 1
        const p1 = createPlayer('Tester 1');
        p1.position = { x: 0, y: 0 };
        p1.velocity = { x: 100, y: 100 }; // Moving diagonal

        // Simulate 10 seconds of 60Hz
        const DT = 1 / 60;
        for (let i = 0; i < 600; i++) {
            integrateEntity(p1, DT);
        }

        // RUN 2
        const p2 = createPlayer('Tester 2');
        p2.position = { x: 0, y: 0 };
        p2.velocity = { x: 100, y: 100 };

        for (let i = 0; i < 600; i++) {
            integrateEntity(p2, DT);
        }

        // VERIFY
        expect(p1.position.x).toBe(p2.position.x);
        expect(p1.position.y).toBe(p2.position.y);
        expect(p1.velocity.x).toBe(p2.velocity.x);

        // Ensure friction applied
        expect(p1.velocity.x).toBeLessThan(100);

        // Log for sanity
        console.log(`Final Pos: ${p1.position.x}, ${p1.position.y}`);
    });

    it('should handle prevPosition correctly', () => {
        const p = createPlayer('Interpolation Test');
        p.position = { x: 100, y: 100 };
        p.velocity = { x: 100, y: 0 }; // Velocity needed!

        const DT = 1 / 60;

        // Simulate 1 frame
        const startX = p.position.x;
        integrateEntity(p, DT);

        // prevPosition should equal startX (before move)
        expect(p.prevPosition.x).toBe(startX);
        expect(p.prevPosition.y).toBe(100);

        // position should have changed
        expect(p.position.x).not.toBe(startX);
    });
});
