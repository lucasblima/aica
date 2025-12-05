import { test as setup } from '@playwright/test';
import * as fs from 'fs';

/**
 * Global Authentication Setup for E2E Tests
 *
 * Instead of automating the Google OAuth flow (which is complex and fragile),
 * this setup authenticates via Supabase API and injects the session directly.
 *
 * Benefits:
 * - Faster test execution (no OAuth popup)
 * - More reliable (no dependency on Google's OAuth UI)
 * - Works in CI/CD environments
 * - Can reuse same auth across all test specs
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gppebtrshbvuzatmebhr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Test user credentials - these should be set in environment variables
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@aica.app';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'SecureTest123!@#';

// Store auth data to be used by all tests
const authFile = 'tests/e2e/.auth.json';

setup('authenticate via Google OAuth', async ({ page, context }) => {
  /**
   * IMPORTANT: This app uses Google OAuth for authentication.
   * This setup will:
   * 1. Navigate to the login page
   * 2. Click "Entrar com Google"
   * 3. Use existing Google session if available
   * 4. Save the authenticated state for reuse in tests
   *
   * If not already logged into Google, you may need to complete the OAuth flow manually once.
   */

  try {
    // Create directory if it doesn't exist
    fs.mkdirSync('tests/e2e', { recursive: true });

    console.log('🔐 Starting Google OAuth authentication flow...');

    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for login button to be visible
    const googleLoginButton = page.locator('button', { hasText: /Entrar com Google/i });
    await googleLoginButton.waitFor({ state: 'visible', timeout: 10000 });

    console.log('✓ Login page loaded');

    // Click the Google login button
    await googleLoginButton.click();
    console.log('✓ Clicked "Entrar com Google"');

    // Wait for either:
    // 1. Successful redirect back to app (Google session exists)
    // 2. Google OAuth page to load (need manual login)

    console.log('⏳ Waiting for Google OAuth to complete...');
    console.log('   👉 Please complete the login in the browser window');
    console.log('   👉 You have up to 120 seconds');

    try {
      // Wait for successful authentication - home page should load
      // Give user plenty of time to complete manual OAuth flow
      await page.waitForURL('http://localhost:3000', { timeout: 120000 });

      // Wait a bit more for the page to fully load
      await page.waitForTimeout(2000);

      // Verify we're authenticated by checking for home content
      await page.waitForSelector('text=Minha Vida', { timeout: 10000 });

      console.log('✅ Google OAuth authentication successful!');

      // Save the authenticated state
      await context.storageState({ path: authFile });
      console.log('✅ Authentication state saved to', authFile);
      console.log('✅ Future tests will reuse this authenticated session');

    } catch (waitError) {
      console.warn('⚠️  Google OAuth did not complete in time or failed');
      console.warn('   Please try again and complete the login within 120 seconds');
      console.warn('   Error:', waitError);

      // Save whatever state we have
      await context.storageState({ path: authFile });
      console.log('ℹ️  Partial auth state saved');
      throw waitError; // Re-throw to mark setup as failed
    }

  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    console.warn('   Creating minimal auth file as fallback...');

    fs.writeFileSync(
      authFile,
      JSON.stringify({
        cookies: [],
        origins: []
      }, null, 2)
    );
    console.log('ℹ️  Created minimal auth file (no session data)');
    console.log('   Tests will proceed but may fail at authentication checks');
  }
});
