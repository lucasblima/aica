import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential para evitar rate limiting da API
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1, // 1 worker para evitar rate limit
  reporter: [['html'], ['list']],

  // Global timeout for tests (AI operations podem demorar)
  timeout: 90 * 1000, // 90s para operações com IA
  expect: {
    timeout: 15 * 1000,
  },

  use: {
    baseURL: process.env.VITE_APP_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
    // Hide automation to avoid Google OAuth blocking
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
      ],
    },
  },

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    // Setup project - runs FIRST to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Test projects - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth.json', // Only set if setup succeeded
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth.json',
      },
      dependencies: ['setup'],
    },
  ],
});
