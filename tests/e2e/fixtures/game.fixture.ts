/**
 * EIDOLON-V OPEN BETA: Playwright Test Fixtures
 *
 * Reusable fixtures for E2E testing
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';

// ============================================================================
// CUSTOM TYPES
// ============================================================================

export interface GameTestOptions {
  autoLogin: boolean;
  playerName: string;
  selectedShape: 'circle' | 'square' | 'triangle' | 'hex';
  skipIntro: boolean;
}

export interface GamePage extends Page {
  waitForGameReady: (timeout?: number) => Promise<void>;
  getGameState: () => Promise<any>;
  getPlayerPosition: () => Promise<{ x: number; y: number }>;
  getPlayerHealth: () => Promise<number>;
  getPlayerScore: () => Promise<number>;
  movePlayerTo: (x: number, y: number) => Promise<void>;
  useSkill: () => Promise<void>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
}

// ============================================================================
// GAME FIXTURE
// ============================================================================

export const test = base.extend<{
  gamePage: GamePage;
  gameOptions: GameTestOptions;
}>({
  // Default game options
  gameOptions: async ({}, use) => {
    await use({
      autoLogin: true,
      playerName: 'E2ETestPlayer',
      selectedShape: 'circle',
      skipIntro: true,
    });
  },

  // Enhanced page with game utilities
  gamePage: async ({ page, gameOptions }, use) => {
    const gamePage = page as GamePage;

    // Add custom methods
    gamePage.waitForGameReady = async (timeout = 30000) => {
      await page.waitForSelector('canvas', { timeout });
      await page.waitForFunction(
        () => {
          const loading = document.querySelector('[data-testid="loading-overlay"]');
          return !loading || getComputedStyle(loading).display === 'none';
        },
        { timeout }
      );
    };

    gamePage.getGameState = async () => {
      return await page.evaluate(() => (window as any).__GAME_STATE__);
    };

    gamePage.getPlayerPosition = async () => {
      return await page.evaluate(() => {
        const state = (window as any).__GAME_STATE__;
        return state?.player?.position || { x: 0, y: 0 };
      });
    };

    gamePage.getPlayerHealth = async () => {
      return await page.evaluate(() => {
        const state = (window as any).__GAME_STATE__;
        return state?.player?.currentHealth || 0;
      });
    };

    gamePage.getPlayerScore = async () => {
      return await page.evaluate(() => {
        const state = (window as any).__GAME_STATE__;
        return state?.player?.score || 0;
      });
    };

    gamePage.movePlayerTo = async (x: number, y: number) => {
      const canvas = await page.locator('canvas').first();
      await canvas.click({ position: { x, y } });
    };

    gamePage.useSkill = async () => {
      await page.keyboard.press('Space');
    };

    gamePage.pauseGame = async () => {
      await page.keyboard.press('Escape');
    };

    gamePage.resumeGame = async () => {
      await page.keyboard.press('Escape');
    };

    // Navigate and setup
    await page.goto('/');
    await gamePage.waitForGameReady();

    // Auto-login if enabled
    if (gameOptions.autoLogin) {
      const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
      if (await playButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await playButton.first().click();
        await page.waitForTimeout(2000);
      }
    }

    await use(gamePage);
  },
});

export { expect };

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for specific game event
 */
export async function waitForGameEvent(
  page: Page,
  eventName: string,
  timeout = 10000
): Promise<any> {
  return await page.evaluate(
    ({ eventName, timeout }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${eventName}`)), timeout);

        const handler = (event: any) => {
          clearTimeout(timer);
          window.removeEventListener(eventName, handler);
          resolve(event.detail);
        };

        window.addEventListener(eventName, handler);
      });
    },
    { eventName, timeout }
  );
}

/**
 * Take screenshot with game state overlay
 */
export async function captureGameState(page: Page, name: string): Promise<void> {
  const state = await page.evaluate(() => {
    const gameState = (window as any).__GAME_STATE__;
    if (!gameState) return null;

    return {
      player: {
        position: gameState.player?.position,
        health: gameState.player?.currentHealth,
        score: gameState.player?.score,
      },
      entityCount: (gameState.players?.length || 0) + (gameState.bots?.length || 0) + (gameState.food?.length || 0),
      gameTime: gameState.gameTime,
    };
  });

  console.log(`[${name}] Game State:`, JSON.stringify(state, null, 2));
  await page.screenshot({ path: `test-results/screenshots/${name}.png` });
}

/**
 * Simulate realistic player behavior
 */
export async function simulatePlayerSession(page: Page, durationMs: number): Promise<void> {
  const canvas = await page.locator('canvas').first();
  const startTime = Date.now();

  while (Date.now() - startTime < durationMs) {
    // Random movement
    await canvas.click({
      position: {
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400,
      },
    });

    // Occasional skill use
    if (Math.random() > 0.8) {
      await page.keyboard.press('Space');
    }

    await page.waitForTimeout(500 + Math.random() * 1000);
  }
}

/**
 * Check for console errors
 */
export async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}
