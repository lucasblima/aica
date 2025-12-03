import { test as setup } from '@playwright/test';

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

setup('authenticate via Supabase API', async ({ request }) => {
  /**
   * IMPORTANT: This setup assumes you have a test user account OR are using
   * Supabase's Magic Link authentication. For production use:
   *
   * Option 1: Create a dedicated test account with email/password in Supabase
   * Option 2: Use environment variables for credentials
   * Option 3: Use Supabase Admin API to create temporary test sessions
   */

  try {
    // Attempt to authenticate with email/password if configured
    if (TEST_EMAIL && TEST_PASSWORD && SUPABASE_ANON_KEY) {
      const response = await request.post(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          data: {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
          },
        }
      );

      if (response.ok()) {
        const authData = await response.json();
        // Save auth data for use in tests
        // eslint-disable-next-line no-undef
        if (typeof require !== 'undefined') {
          const fs = require('fs');
          fs.mkdirSync('tests/e2e', { recursive: true });
          fs.writeFileSync(
            authFile,
            JSON.stringify({
              session: authData.session,
              user: authData.user,
              accessToken: authData.access_token,
              refreshToken: authData.refresh_token,
              expiresAt: new Date(Date.now() + authData.expires_in * 1000).toISOString(),
            }, null, 2)
          );
        }
        console.log('✅ Authentication setup successful');
      } else {
        console.warn('⚠️ Password authentication failed, tests will attempt Google OAuth');
      }
    } else {
      console.warn('⚠️ TEST_EMAIL or TEST_PASSWORD not configured');
      console.warn('   Tests will fall back to Google OAuth flow');
      console.warn('   To use API-based auth, set environment variables:');
      console.warn('   - TEST_EMAIL');
      console.warn('   - TEST_PASSWORD');
    }
  } catch (error) {
    console.warn('⚠️ Authentication setup failed:', error);
    console.warn('   Tests will fall back to Google OAuth flow');
  }
});
