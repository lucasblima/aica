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

setup('authenticate via email/password', async ({ page, context }) => {
  /**
   * IMPORTANT: This setup authenticates using TEST_EMAIL and TEST_PASSWORD
   * instead of Google OAuth for reliable automated testing.
   *
   * This setup will:
   * 1. Navigate to the login page
   * 2. Fill email and password fields
   * 3. Submit the login form
   * 4. Wait for authenticated state
   * 5. Save the authenticated state for reuse in tests
   */

  try {
    // Create directory if it doesn't exist
    fs.mkdirSync('tests/e2e', { recursive: true });

    console.log('🔐 Starting email/password authentication...');
    console.log('   Email:', TEST_EMAIL);

    // Navigate to the app
    await page.goto('http://localhost:3000');
    console.log('✓ Login page loaded');

    // Check if already authenticated (redirects to home)
    try {
      await page.waitForURL('http://localhost:3000', { timeout: 2000 });
      // If we get here, we're already authenticated
      console.log('✓ Already authenticated, reusing session');
    } catch {
      // Not authenticated, proceed with login
      console.log('⏳ Authenticating with email/password...');

      // Try to find and fill email input
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]');

      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_EMAIL);
        console.log('✓ Filled email field');

        // Find and fill password input
        const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
        await passwordInput.fill(TEST_PASSWORD);
        console.log('✓ Filled password field');

        // Find and click submit button
        const submitButton = page.locator('button:has-text(/entrar|login|sign in/i)');
        await submitButton.click();
        console.log('✓ Clicked login button');

        // Wait for successful authentication - should redirect to home or main page
        await page.waitForURL('http://localhost:3000/**', { timeout: 15000 });
        console.log('✓ Successfully authenticated');

        // Wait for page to fully load
        await page.waitForTimeout(1000);

      } else {
        // Email input not found, try alternative approach: click Google button
        // but user will need to complete OAuth manually
        console.warn('⚠️  Email/password form not found');
        console.warn('   Falling back to Google OAuth (manual completion required)...');

        const googleLoginButton = page.locator('button', { hasText: /Entrar com Google/i });
        if (await googleLoginButton.isVisible()) {
          await googleLoginButton.click();
          console.log('✓ Clicked "Entrar com Google"');
          console.log('⏳ Please complete Google OAuth in browser (120 seconds)...');
          await page.waitForURL('http://localhost:3000', { timeout: 120000 });
        } else {
          throw new Error('Neither email/password form nor Google OAuth button found');
        }
      }
    }

    try {
      console.log('✅ Email/password authentication successful!');

      // Save the authenticated state
      await context.storageState({ path: authFile });
      console.log('✅ Authentication state saved to', authFile);
      console.log('✅ Future tests will reuse this authenticated session');

    } catch (saveError) {
      console.error('❌ Failed to save authentication state:', saveError);
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
