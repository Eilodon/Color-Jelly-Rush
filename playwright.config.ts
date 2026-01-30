/**
 * EIDOLON-V OPEN BETA: Playwright E2E Test Configuration
 *
 * Comprehensive end-to-end testing for Color-Jelly-Rush game
 * Tests the complete user flow from page load to game completion
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list']
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Game-specific settings
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Game server configuration
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    // Uncomment when server is ready for E2E
    // {
    //   command: 'npm run server:dev',
    //   url: 'http://localhost:2567/health',
    //   reuseExistingServer: !process.env.CI,
    //   timeout: 120000,
    //   cwd: './server',
    // },
  ],

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers (critical for .io games)
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  // Output directories
  outputDir: 'test-results/e2e',
});
