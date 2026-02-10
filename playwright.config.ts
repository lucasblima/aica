import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env files (in priority order)
// .env.local overrides .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });

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
    baseURL: process.env.VITE_APP_URL || 'http://localhost:3000',
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
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
    // Wait for server to be ready by checking if we get a response
    // stdout: 'pipe' helps detect when Vite is ready
    stdout: 'pipe',
    stderr: 'pipe',
  },

  projects: [
    // Setup project - runs FIRST to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Unauthenticated project - for Landing Page tests
    {
      name: 'unauthenticated',
      testMatch: [/onboarding\.spec\.ts/, /auth-sheet\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        // NO storageState - tests run without authentication
      },
    },
    // Test projects - depend on setup
    {
      name: 'chromium',
      testIgnore: [/onboarding\.spec\.ts/, /auth-sheet\.spec\.ts/], // Landing page tests run in 'unauthenticated' project
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth.json', // Only set if setup succeeded
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: [/onboarding\.spec\.ts/, /auth-sheet\.spec\.ts/], // Landing page tests run in 'unauthenticated' project
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth.json',
      },
      dependencies: ['setup'],
    },
  ],
});
