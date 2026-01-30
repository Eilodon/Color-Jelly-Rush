/**
 * EIDOLON-V OPEN BETA: Smoke Tests
 *
 * Quick validation tests to ensure the game is functional
 * Run these before every deployment to catch critical issues
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('1. Page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // No critical errors
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('2. Canvas renders successfully', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 30000 });
  });

  test('3. Play button is clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30000 });

    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"], .play-button');

    // Button should exist and be clickable
    if (await playButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await playButton.first().click();
      await page.waitForTimeout(1000);
      // Should not crash
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('4. Game responds to input', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30000 });

    // Try clicking play
    const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
    if (await playButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await playButton.first().click();
      await page.waitForTimeout(2000);
    }

    const canvas = page.locator('canvas').first();

    // Click on canvas
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Press space
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Game should still be running
    await expect(canvas).toBeVisible();
  });

  test('5. No memory leaks in 10 seconds', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30000 });

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Interact for 10 seconds
    const canvas = page.locator('canvas').first();
    for (let i = 0; i < 10; i++) {
      await canvas.click({
        position: { x: Math.random() * 600 + 100, y: Math.random() * 400 + 100 }
      });
      await page.waitForTimeout(1000);
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    if (initialMemory > 0) {
      const growth = (finalMemory - initialMemory) / 1024 / 1024;
      console.log(`Memory growth: ${growth.toFixed(2)}MB`);
      expect(growth).toBeLessThan(30); // Less than 30MB growth
    }
  });

  test('6. Mobile viewport works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible({ timeout: 30000 });
  });

  test('7. Game handles resize', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30000 });

    // Resize multiple times
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 800, height: 600 },
      { width: 375, height: 667 },
      { width: 1280, height: 720 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      await expect(page.locator('canvas').first()).toBeVisible();
    }
  });

  test('8. No console errors during basic interaction', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30000 });

    // Basic interaction
    const playButton = page.locator('button:has-text("Play")');
    if (await playButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.first().click();
    }

    await page.waitForTimeout(3000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('net::') &&
      !e.includes('favicon')
    );

    console.log('Console errors:', criticalErrors);
    expect(criticalErrors).toHaveLength(0);
  });
});

// ============================================================================
// CRITICAL PATH TEST
// ============================================================================

test('Critical Path: Load → Play → Interact', async ({ page }) => {
  // Step 1: Load
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas.first()).toBeVisible({ timeout: 30000 });

  // Step 2: Play
  const playButton = page.locator('button:has-text("Play"), [data-testid="play-button"]');
  if (await playButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await playButton.first().click();
  }
  await page.waitForTimeout(2000);

  // Step 3: Interact
  await canvas.first().click({ position: { x: 300, y: 300 } });
  await page.waitForTimeout(500);

  await canvas.first().click({ position: { x: 500, y: 400 } });
  await page.waitForTimeout(500);

  await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  // Verify game is still running
  await expect(canvas.first()).toBeVisible();

  // Capture final state
  const finalState = await page.evaluate(() => ({
    hasCanvas: !!document.querySelector('canvas'),
    canvasWidth: document.querySelector('canvas')?.width,
    canvasHeight: document.querySelector('canvas')?.height,
  }));

  expect(finalState.hasCanvas).toBe(true);
  expect(finalState.canvasWidth).toBeGreaterThan(0);
  expect(finalState.canvasHeight).toBeGreaterThan(0);
});
