import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Manual Login Helper for E2E Tests
 *
 * This script opens a REAL browser (not automated) so you can login manually.
 * After login, it saves the session to .auth.json for tests to reuse.
 *
 * Usage:
 *   npx ts-node tests/e2e/manual-login.ts
 *
 * Steps:
 * 1. Browser window will open
 * 2. Login with Google normally
 * 3. Wait until you see "Minha Vida" (home page)
 * 4. Press ENTER in the terminal
 * 5. Session will be saved automatically
 */

const AUTH_FILE = path.join(__dirname, '.auth.json');

async function saveAuthManually() {
  console.log('🚀 Starting manual login helper...\n');

  // Launch browser in headed mode (visible window)
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled', // Hide automation
    ]
  });

  const context = await browser.newContext({
    // Use a clean context (no existing cookies)
  });

  const page = await context.newPage();

  console.log('✅ Browser opened!');
  console.log('📱 Navigating to http://localhost:3000...\n');

  // Navigate to the app
  await page.goto('http://localhost:3000');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 PLEASE COMPLETE THE FOLLOWING STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  1. Click "Entrar com Google" in the browser window');
  console.log('  2. Complete the Google OAuth flow');
  console.log('  3. Wait until you see "Minha Vida" (home screen)');
  console.log('  4. Come back here and press ENTER');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Wait for user to press Enter
  await waitForEnter();

  console.log('\n⏳ Saving authentication state...');

  try {
    // Verify we're actually logged in
    const isLoggedIn = await page.locator('text=Minha Vida').isVisible().catch(() => false);

    if (!isLoggedIn) {
      console.warn('\n⚠️  WARNING: Could not detect "Minha Vida" text.');
      console.warn('   Are you sure you\'re logged in and on the home page?');
      console.warn('   Saving state anyway, but tests may fail...\n');
    }

    // Save the authenticated state
    await context.storageState({ path: AUTH_FILE });

    console.log('✅ Authentication state saved successfully!');
    console.log(`   File: ${AUTH_FILE}`);
    console.log('');
    console.log('🎉 All done! You can now run your E2E tests.');
    console.log('   The tests will automatically use this saved session.');
    console.log('');
    console.log('   Example:');
    console.log('   npx playwright test tests/e2e/podcast-wizard.spec.ts --headed');
    console.log('');

  } catch (error) {
    console.error('\n❌ Failed to save authentication state:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Helper to wait for Enter key
function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    console.log('⌨️  Waiting for you to press ENTER...');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string) => {
      // Ctrl+C
      if (key === '\u0003') {
        process.exit();
      }

      // Enter key
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        resolve();
      }
    };

    process.stdin.on('data', onData);
  });
}

// Run the script
saveAuthManually()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
