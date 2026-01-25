
import { describe, it, expect } from 'vitest'; // or jest
import { calcMatchPercent, mixPigment } from '../services/cjr/colorMath';

describe('Color Math System (Dopamine Tuned)', () => {

    it('should be forgiving for small errors (Sigmoid check)', () => {
        const p1 = { r: 1, g: 0, b: 0 };
        const p1_close = { r: 0.9, g: 0.1, b: 0 }; // Dist ~0.14

        const match = calcMatchPercent(p1, p1_close);

        // Linear: 1 - 0.14/1.732 = 0.92
        // We want it to stay very high, maybe even boosted?
        // Let's just assert it is > 0.85 for now
        expect(match).toBeGreaterThan(0.85);
    });

    it('should drop off correctly for bad matches', () => {
        const p1 = { r: 1, g: 0, b: 0 };
        const p2 = { r: 0, g: 1, b: 0 }; // Dist ~1.414

        const match = calcMatchPercent(p1, p2);

        // Linear: 1 - 1.41/1.73 ~= 0.18
        // We want this to be low, maybe < 0.2
        expect(match).toBeLessThan(0.3);
    });

    it('should be exactly 1 for perfect match', () => {
        const p1 = { r: 0.5, g: 0.5, b: 0.5 };
        expect(calcMatchPercent(p1, p1)).toBeCloseTo(1.0);
    });

    it('should be exactly 0 (or close) for opposite', () => {
        const p1 = { r: 0, g: 0, b: 0 };
        const p2 = { r: 1, g: 1, b: 1 }; // Dist 1.732

        const match = calcMatchPercent(p1, p2);
        expect(match).toBeLessThan(0.1);
    });
});
