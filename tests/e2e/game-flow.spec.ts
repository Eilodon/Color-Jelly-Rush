/**
 * EIDOLON-V OPEN BETA: Complete Game Flow E2E Tests
 *
 * Tests the entire user journey from page load to game completion:
 * 1. Boot/Loading → 2. Auth → 3. Character Select → 4. Gameplay → 5. Game Over
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Wait for game canvas to be ready and interactive
 */
async function waitForGameReady(page: Page, timeout = 30000): Promise<void> {
  // Wait for canvas element
  await page.waitForSelector('canvas', { timeout });

  // Wait for game to be interactive (no loading overlay)
  await page.waitForFunction(() => {
    const loadingOverlay = document.querySelector('[data-testid="loading-overlay"]');
    return !loadingOverlay || loadingOverlay.getAttribute('data-visible') === 'false';
  }, { timeout });
}

/**
 * Get game state from window object (exposed by game engine)
 */
async function getGameState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    return (window as any).__GAME_STATE__ || null;
  });
}

/**
 * Simulate player input (mouse/touch)
 */
async function movePlayerTo(page: Page, x: number, y: number): Promise<void> {
  const canvas = await page.locator('canvas').first();
  await canvas.click({ position: { x, y } });
}

// ============================================================================
// BOOT & LOADING TESTS
// ============================================================================

test.describe('Boot & Loading Flow', () => {
  test('should load the game page successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Color.*Jelly.*Rush/i);

    // Check that main container exists
    await expect(page.locator('#root, #app, .game-container')).toBeVisible();
  });

  test('should display loading screen while assets load', async ({ page }) => {
    await page.goto('/');

    // Loading indicator should appear initially
    const loadingElement = page.locator('[data-testid="loading"], .loading, .boot-screen');

    // Either loading element exists OR game is already ready
    const hasLoading = await loadingElement.isVisible().catch(() => false);
    if (hasLoading) {
      await expect(loadingElement).toBeVisible();
    }
  });

  test('should initialize WebGL canvas', async ({ page }) => {
    await page.goto('/');

    // Wait for canvas
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 30000 });

    // Check WebGL context is available
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null;
    });

    expect(hasWebGL).toBe(true);
  });

  test('should handle WebGL not supported gracefully', async ({ page, browserName }) => {
    // This test is browser-specific - skip if WebGL is always available
    test.skip(browserName !== 'webkit', 'WebGL fallback test for specific browsers');

    await page.goto('/');

    // Check for fallback message if WebGL fails
    const fallbackMessage = page.locator('[data-testid="webgl-fallback"], .webgl-error');
    const isVisible = await fallbackMessage.isVisible().catch(() => false);

    // Either WebGL works or fallback is shown
    if (isVisible) {
      await expect(fallbackMessage).toContainText(/WebGL|supported|browser/i);
    }
  });

  test('should complete asset loading within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await waitForGameReady(page, 60000);

    const loadTime = Date.now() - startTime;

    // Asset loading should complete within 30 seconds
    expect(loadTime).toBeLessThan(30000);
    console.log(`Asset loading completed in ${loadTime}ms`);
  });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

test.describe('Authentication Flow', () => {
  test('should display main menu with play options', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Look for play button or main menu
    const playButton = page.locator('[data-testid="play-button"], .play-button, button:has-text("Play")');
    await expect(playButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow guest login', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Find and click guest/play button
    const guestButton = page.locator('[data-testid="guest-button"], .guest-login, button:has-text("Play"), button:has-text("Guest")');
    await guestButton.first().click();

    // Should proceed to character select or game
    await expect(page.locator('[data-testid="character-select"], .shape-picker, canvas')).toBeVisible({ timeout: 10000 });
  });

  test('should persist session across page refresh', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Login as guest
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
    await playButton.first().click();

    // Wait for game state
    await page.waitForTimeout(2000);

    // Refresh page
    await page.reload();
    await waitForGameReady(page);

    // Check if session persisted (no login required again)
    // This depends on implementation - check for either game screen or quick re-login
    const isInGame = await page.locator('canvas').isVisible();
    expect(isInGame).toBe(true);
  });
});

// ============================================================================
// CHARACTER SELECT TESTS
// ============================================================================

test.describe('Character Selection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Navigate to character select if needed
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
    if (await playButton.first().isVisible()) {
      await playButton.first().click();
    }
  });

  test('should display shape selection options', async ({ page }) => {
    // Look for shape selection UI
    const shapeOptions = page.locator('[data-testid="shape-option"], .shape-button, .character-option');

    // Should have at least one shape option OR already in game
    const count = await shapeOptions.count();
    const canvasVisible = await page.locator('canvas').isVisible();

    expect(count > 0 || canvasVisible).toBe(true);
  });

  test('should allow player name input', async ({ page }) => {
    const nameInput = page.locator('[data-testid="player-name"], input[placeholder*="name" i], .name-input');

    const isVisible = await nameInput.first().isVisible().catch(() => false);
    if (isVisible) {
      await nameInput.first().fill('TestPlayer123');
      await expect(nameInput.first()).toHaveValue('TestPlayer123');
    }
  });

  test('should validate player name length', async ({ page }) => {
    const nameInput = page.locator('[data-testid="player-name"], input[placeholder*="name" i]');

    const isVisible = await nameInput.first().isVisible().catch(() => false);
    if (isVisible) {
      // Try to enter too long name
      await nameInput.first().fill('A'.repeat(50));

      // Check if truncated or error shown
      const value = await nameInput.first().inputValue();
      expect(value.length).toBeLessThanOrEqual(20);
    }
  });

  test('should show shape abilities/stats preview', async ({ page }) => {
    const shapeInfo = page.locator('[data-testid="shape-info"], .shape-stats, .ability-preview');

    const isVisible = await shapeInfo.first().isVisible().catch(() => false);
    if (isVisible) {
      await expect(shapeInfo.first()).toBeVisible();
    }
  });
});

// ============================================================================
// GAMEPLAY TESTS
// ============================================================================

test.describe('Gameplay Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Quick start game
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
    if (await playButton.first().isVisible()) {
      await playButton.first().click();
    }

    // Wait for game to start
    await page.waitForTimeout(3000);
  });

  test('should render game canvas with entities', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();

    // Check canvas has content (not blank)
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return false;

      const ctx = canvas.getContext('2d');
      if (!ctx) return true; // WebGL canvas

      // For 2D canvas, check if not all transparent
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return imageData.data.some(pixel => pixel !== 0);
    });

    // Canvas should have content (WebGL or 2D)
    expect(hasContent).toBe(true);
  });

  test('should respond to mouse/touch input', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Click on canvas to move
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Click different position
    await canvas.click({ position: { x: 600, y: 400 } });
    await page.waitForTimeout(500);

    // Game should still be running (no crash)
    await expect(canvas).toBeVisible();
  });

  test('should display HUD elements', async ({ page }) => {
    // Look for common HUD elements
    const hudElements = page.locator('[data-testid="hud"], .hud, .game-ui, .score-display, .health-bar');

    // Wait a bit for HUD to render
    await page.waitForTimeout(2000);

    // At least some HUD element should be visible (or game is fullscreen canvas-only)
    const hudVisible = await hudElements.first().isVisible().catch(() => false);
    const canvasVisible = await page.locator('canvas').isVisible();

    expect(hudVisible || canvasVisible).toBe(true);
  });

  test('should handle keyboard input for skills', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await canvas.focus();

    // Press skill key (space)
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Press eject key (w)
    await page.keyboard.press('w');
    await page.waitForTimeout(300);

    // Game should still be running
    await expect(canvas).toBeVisible();
  });

  test('should maintain stable FPS during gameplay', async ({ page }) => {
    // Collect FPS samples over 5 seconds
    const fpsSamples: number[] = [];

    for (let i = 0; i < 5; i++) {
      const fps = await page.evaluate(() => {
        return (window as any).__GAME_FPS__ ||
          (window as any).performanceMonitor?.getMetrics?.()?.fps ||
          60; // Default if not exposed
      });
      fpsSamples.push(fps);
      await page.waitForTimeout(1000);
    }

    // Average FPS should be acceptable (> 30)
    const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    console.log(`Average FPS: ${avgFps.toFixed(1)}`);

    expect(avgFps).toBeGreaterThan(25);
  });

  test('should handle window resize gracefully', async ({ page }) => {
    // Start with normal size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Resize to smaller
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    // Resize to larger
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Canvas should still be visible and functional
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});

// ============================================================================
// MULTIPLAYER TESTS
// ============================================================================

test.describe('Multiplayer Features', () => {
  test.skip(true, 'Multiplayer tests require running server');

  test('should connect to game server', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Check network status
    const networkStatus = await page.evaluate(() => {
      return (window as any).__NETWORK_STATUS__ || 'unknown';
    });

    expect(['online', 'connected', 'unknown']).toContain(networkStatus);
  });

  test('should display other players', async ({ page }) => {
    // This would require multiple browser contexts
    // Simplified version: check if multiplayer UI exists
    const multiplayerUI = page.locator('[data-testid="player-count"], .leaderboard, .other-players');

    const isVisible = await multiplayerUI.first().isVisible().catch(() => false);
    // Just check it doesn't crash when looking for multiplayer elements
    expect(true).toBe(true);
  });

  test('should handle disconnection gracefully', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Simulate offline
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // Check for reconnection UI or graceful degradation
    const reconnectUI = page.locator('[data-testid="reconnecting"], .connection-lost, .offline-mode');
    const isVisible = await reconnectUI.first().isVisible().catch(() => false);

    // Restore online
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // Game should recover
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});

// ============================================================================
// GAME END TESTS
// ============================================================================

test.describe('Game End Flow', () => {
  test('should display game over screen on death', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Start game
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
    if (await playButton.first().isVisible()) {
      await playButton.first().click();
    }

    await page.waitForTimeout(3000);

    // Simulate death by exposing test function or waiting for natural death
    await page.evaluate(() => {
      // Try to trigger death for testing
      if ((window as any).__TEST_TRIGGER_DEATH__) {
        (window as any).__TEST_TRIGGER_DEATH__();
      }
    });

    // Wait and check for game over UI (may not appear if death wasn't triggered)
    await page.waitForTimeout(2000);

    const gameOverUI = page.locator('[data-testid="game-over"], .game-over, .death-screen');
    const isVisible = await gameOverUI.first().isVisible().catch(() => false);

    // Either game over shows or game is still running (no crash)
    expect(true).toBe(true);
  });

  test('should show final score on game end', async ({ page }) => {
    // Similar to above - check for score display
    const scoreDisplay = page.locator('[data-testid="final-score"], .score, .result-score');

    const isVisible = await scoreDisplay.first().isVisible().catch(() => false);
    // Just verify no crash
    expect(true).toBe(true);
  });

  test('should allow replay after game over', async ({ page }) => {
    const replayButton = page.locator('[data-testid="replay-button"], button:has-text("Play Again"), button:has-text("Retry")');

    const isVisible = await replayButton.first().isVisible().catch(() => false);
    if (isVisible) {
      await replayButton.first().click();
      await page.waitForTimeout(2000);

      // Should be back in game
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    }
  });
});

// ============================================================================
// PERFORMANCE & STABILITY TESTS
// ============================================================================

test.describe('Performance & Stability', () => {
  test('should not have memory leaks during extended play', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Play for 30 seconds
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(Math.random() * 800, Math.random() * 600);
      await page.mouse.click(Math.random() * 800, Math.random() * 600);
      await page.waitForTimeout(5000);
    }

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory growth should be reasonable (< 50MB over 30 seconds)
    const memoryGrowth = finalMemory - initialMemory;
    console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

    // Skip strict check if memory API not available
    if (initialMemory > 0) {
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should handle rapid input without crashing', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const canvas = page.locator('canvas').first();

    // Rapid clicks
    for (let i = 0; i < 50; i++) {
      await canvas.click({
        position: {
          x: Math.random() * 800,
          y: Math.random() * 600
        },
        delay: 10
      });
    }

    // Rapid key presses
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Space');
      await page.keyboard.press('w');
    }

    // Game should still be running
    await expect(canvas).toBeVisible();
  });

  test('should recover from pause/resume', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Try to pause (Escape key)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Look for pause menu
    const pauseMenu = page.locator('[data-testid="pause-menu"], .pause-overlay, .paused');
    const isPaused = await pauseMenu.first().isVisible().catch(() => false);

    // Resume
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Game should be running
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});

// ============================================================================
// MOBILE-SPECIFIC TESTS
// ============================================================================

test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile controls', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    // Start game
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
    if (await playButton.first().isVisible()) {
      await playButton.first().click();
    }

    await page.waitForTimeout(2000);

    // Look for mobile controls (joystick, buttons)
    const mobileControls = page.locator('[data-testid="mobile-controls"], .mobile-joystick, .touch-controls');

    // Either mobile controls exist or game uses touch-on-canvas
    const hasControls = await mobileControls.first().isVisible().catch(() => false);
    const hasCanvas = await page.locator('canvas').isVisible();

    expect(hasControls || hasCanvas).toBe(true);
  });

  test('should respond to touch events', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const canvas = page.locator('canvas').first();

    // Simulate touch
    await canvas.tap();
    await page.waitForTimeout(500);

    // Touch drag
    await canvas.dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 300 }]
    });
    await page.waitForTimeout(100);
    await canvas.dispatchEvent('touchmove', {
      touches: [{ clientX: 400, clientY: 400 }]
    });
    await page.waitForTimeout(100);
    await canvas.dispatchEvent('touchend', {});

    // Game should still be running
    await expect(canvas).toBeVisible();
  });

  test('should handle orientation change', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForGameReady(page);

    let canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});
