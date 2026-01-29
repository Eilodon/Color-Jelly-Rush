
import { describe, it, expect } from 'vitest';
import { GameFlowTest } from './GameFlowTest';

describe('GameFlow Integration', () => {
    it('should run complete test suite successfully', async () => {
        const result = await GameFlowTest.runCompleteTestSuite();
        if (!result.passed) {
            console.error(result.summary);
            console.error(JSON.stringify(result.results.filter(r => !r.passed), null, 2));
        }
        expect(result.passed).toBe(true);
    }, 20000);
});
