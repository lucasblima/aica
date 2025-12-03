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
    // Create directory if it doesn't exist
    fs.mkdirSync('tests/e2e', { recursive: true });

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
        console.log('✅ Authentication setup successful - API-based auth activated');
      } else {
        console.warn('⚠️ Password authentication failed');
        console.warn('   Creating empty auth file (tests may require manual Google login)');
        createEmptyAuthFile();
      }
    } else {
      console.warn('⚠️ TEST_EMAIL or TEST_PASSWORD not configured');
      console.warn('   To enable automatic API-based authentication, set environment variables:');
      console.warn('   - TEST_EMAIL=your-test-email@example.com');
      console.warn('   - TEST_PASSWORD=your-secure-password');
      console.warn('   - VITE_SUPABASE_URL=https://your-project.supabase.co');
      console.warn('   - VITE_SUPABASE_ANON_KEY=your-anon-key');
      console.warn('');
      console.warn('   Alternatively, create a test user in your Supabase project console.');
      console.warn('   For now, creating minimal auth file to prevent storage state errors...');
      createEmptyAuthFile();
    }
  } catch (error) {
    console.warn('⚠️ Authentication setup failed:', error);
    console.warn('   Creating minimal auth file as fallback...');
    createEmptyAuthFile();
  }

  // Helper function to create empty auth file
  function createEmptyAuthFile() {
    fs.writeFileSync(
      authFile,
      JSON.stringify({
        cookies: [],
      }, null, 2)
    );
    console.log('ℹ️  Created minimal auth file (no session data)');
    console.log('   Tests will proceed but may fail at authentication checks');
  }
});
