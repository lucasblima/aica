import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

/**
 * Global Authentication Setup for E2E Tests
 *
 * Authenticates via Supabase API directly (no UI interaction needed).
 * This is more reliable than UI-based authentication for E2E tests.
 *
 * Benefits:
 * - Faster test execution (no UI interaction)
 * - More reliable (no dependency on UI elements or OAuth)
 * - Works in CI/CD environments
 * - Can reuse same auth across all test specs
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uzywajqzbdbrfammshdg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Test user credentials - these should be set in environment variables
const TEST_EMAIL = process.env.TEST_EMAIL || 'usuario_teste@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'SenhaSegura123!';

// Store auth data to be used by all tests
const authFile = 'tests/e2e/.auth.json';

setup('authenticate via Supabase API', async ({ page, context }) => {
  /**
   * CRITICAL: This setup uses Supabase Auth API directly instead of UI interaction.
   * This is more reliable for E2E tests since the Login component only has Google OAuth.
   *
   * This setup will:
   * 1. Authenticate via Supabase API (signInWithPassword)
   * 2. Inject the session into browser localStorage
   * 3. Navigate to authenticated home page
   * 4. Save the authenticated state for reuse in tests
   */

  // Capture browser console logs for debugging
  page.on('console', msg => {
    if (msg.text().includes('[AppRouter]')) {
      console.log(`🌐 [Browser Console] ${msg.text()}`);
    }
  });

  try {
    // Create directory if it doesn't exist
    fs.mkdirSync('tests/e2e', { recursive: true });

    console.log('🔐 Starting Supabase API authentication...');
    console.log('   Email:', TEST_EMAIL);

    // STEP 1: Authenticate via Supabase API
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) {
      throw new Error(`Supabase authentication failed: ${error.message}`);
    }

    if (!data.session) {
      throw new Error('No session returned from Supabase');
    }

    console.log('✓ Supabase API authentication successful');
    console.log('   User ID:', data.user.id);
    console.log('   Access Token:', data.session.access_token.substring(0, 20) + '...');

    // STEP 2: Navigate to the app and set up localStorage BEFORE the app loads
    const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

    // Navigate to about:blank first to get a context where we can set localStorage
    await page.goto('about:blank');

    // Set up cookies with the session data (Supabase SSR uses cookies, not localStorage)
    await page.addInitScript((authData) => {
      const projectRef = authData.supabaseUrl.split('//')[1].split('.')[0];
      const key = `sb-${projectRef}-auth-token`;
      const value = JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_at: authData.expires_at,
        expires_in: authData.expires_in,
        token_type: authData.token_type,
        user: authData.user,
      });

      // Set cookie (Supabase SSR expects cookies, not localStorage)
      const encodedValue = encodeURIComponent(value);
      document.cookie = `${key}=${encodedValue}; Path=/; SameSite=lax; Max-Age=${60 * 60 * 24 * 7}`;
      console.log('✓ Pre-loaded session into cookie:', key);

      // Also set localStorage for backward compatibility and debugging
      localStorage.setItem(key, value);
    }, {
      ...data.session,
      supabaseUrl: SUPABASE_URL,
    });

    console.log('✓ Auth script added to initialize before page load');

    // Now navigate to the actual app - the session will already be in localStorage
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    console.log('✓ Navigated to', BASE_URL, 'with pre-loaded auth session');

    // CRITICAL: Wait for Supabase Auth to initialize and read from localStorage
    // The useAuth hook needs time to pick up the session from localStorage
    console.log('⏳ Waiting for auth state to initialize...');

    // Wait up to 10 seconds for the page to navigate away from /landing
    // If auth works properly, the app will redirect to / or show the home page
    try {
      await page.waitForFunction(() => {
        return !window.location.pathname.includes('/landing');
      }, { timeout: 10000 });
      console.log('✓ Auth initialized, navigated away from landing page');
    } catch (timeoutError) {
      console.warn('⚠️  Timeout waiting for navigation from landing page');
      console.log('   Current URL:', page.url());
      // Continue anyway to see what state we're in
    }

    // STEP 5: Debug - Check what page we're actually on
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log('📍 Current page title:', pageTitle);
    console.log('📍 Current page URL:', pageUrl);

    // Check localStorage to verify session is there
    const storedSession = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      console.log('🔑 LocalStorage keys:', keys);
      return keys.map(key => ({
        key,
        valueLength: localStorage.getItem(key)?.length || 0
      }));
    });
    console.log('🔑 LocalStorage contents:', JSON.stringify(storedSession, null, 2));

    // STEP 6: Verify we're on authenticated home page (not landing page)
    const isOnLandingPage = await page.locator('text=/Conheça a si mesmo|Começar a usar/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (isOnLandingPage) {
      console.log('⚠️  Still on landing page - taking screenshot for debugging');
      await page.screenshot({ path: 'test-results/auth-debug-landing.png', fullPage: true });

      // Check what text is actually on the page
      const bodyText = await page.locator('body').innerText();
      console.log('📄 Page content (first 500 chars):', bodyText.substring(0, 500));

      throw new Error('Still on landing page after authentication - session injection failed');
    }

    console.log('✓ Successfully authenticated and on home page');

    // STEP 7: Mark onboarding as completed to avoid onboarding screen in tests
    try {
      const { error: onboardingError } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_version: 2, // CURRENT_ONBOARDING_VERSION
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id);

      if (onboardingError) {
        console.warn('⚠️  Failed to mark onboarding as completed:', onboardingError);
      } else {
        console.log('✓ Onboarding marked as completed (version 2)');
      }
    } catch (onboardingError) {
      console.warn('⚠️  Error marking onboarding as completed:', onboardingError);
      // Continue anyway - tests might still work
    }

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    try {
      console.log('✅ Email/password authentication successful!');

      // Save the authenticated state (cookies + localStorage)
      const storageState = await context.storageState({ path: authFile });

      // CRITICAL: Supabase Auth uses localStorage, not cookies!
      // We need to manually capture localStorage and add it to the storage state
      const localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      // Create origins array with localStorage data for Supabase
      const supabaseUrl = SUPABASE_URL;
      const origins = storageState.origins || [];

      // Find or create origin entry for Supabase
      let supabaseOrigin = origins.find(o => o.origin === supabaseUrl);
      if (!supabaseOrigin) {
        supabaseOrigin = {
          origin: supabaseUrl,
          localStorage: []
        };
        origins.push(supabaseOrigin);
      }

      // Add localStorage items to origin
      supabaseOrigin.localStorage = Object.entries(localStorage).map(([name, value]) => ({
        name,
        value
      }));

      // Also add localhost origin with localStorage
      const localhostOrigin = origins.find(o => o.origin === 'http://localhost:3000');
      if (localhostOrigin) {
        localhostOrigin.localStorage = Object.entries(localStorage).map(([name, value]) => ({
          name,
          value
        }));
      } else {
        origins.push({
          origin: 'http://localhost:3000',
          localStorage: Object.entries(localStorage).map(([name, value]) => ({
            name,
            value
          }))
        });
      }

      // Save updated storage state with localStorage
      const updatedStorageState = {
        ...storageState,
        origins
      };

      fs.writeFileSync(authFile, JSON.stringify(updatedStorageState, null, 2));
      console.log('✅ Authentication state saved to', authFile);
      console.log('✅ Saved localStorage items:', Object.keys(localStorage).length);
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
