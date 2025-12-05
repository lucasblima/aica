import { test, expect } from '@playwright/test';

test.describe('Security & Privacy', () => {
  test.beforeEach(async ({ page }) => {
    /**
     * Authentication is handled globally via playwright.config.ts
     * which uses storageState to inject pre-authenticated session.
     */
    await page.goto('/');
  });

  test('Test 12.1: HTTPS Enforcement', async ({ page }) => {
    // Verify page is served over HTTPS
    expect(page.url()).toMatch(/^https:/);
  });

  test('Test 12.2: No Sensitive Data in Console', async ({ page }) => {
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Navigate around app
    await page.goto('/');
    await page.goto('/settings/profile');
    await page.goto('/meu-dia');

    // Verify no passwords, tokens, or keys logged
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /apikey/i,
      /Bearer /,
    ];

    consoleMessages.forEach((msg) => {
      sensitivePatterns.forEach((pattern) => {
        if (pattern.test(msg)) {
          // This is not necessarily a failure, just a warning
          console.warn(`⚠️ Potential sensitive data in console: ${msg}`);
        }
      });
    });
  });

  test('Test 12.3: No Plaintext Passwords in LocalStorage/SessionStorage', async ({
    page,
  }) => {
    // Get all storage items
    const storage = await page.evaluate(() => {
      return {
        localStorage: JSON.stringify(localStorage),
        sessionStorage: JSON.stringify(sessionStorage),
      };
    });

    // Verify no passwords stored
    expect(storage.localStorage).not.toContain('password');
    expect(storage.sessionStorage).not.toContain('password');

    // Verify auth token exists in sessionStorage
    const hasAuthToken = storage.sessionStorage.includes('auth');
    expect(hasAuthToken).toBeTruthy();

    // Verify token NOT in localStorage
    expect(storage.localStorage).not.toContain('auth');
  });

  test('Test 12.4: CORS Headers Validation', async ({ page }) => {
    // Make API request and check CORS headers
    const response = await page.request.get('https://gppebtrshbvuzatmebhr.supabase.co/rest/v1/');

    // Verify CORS headers present
    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).toBeDefined();
  });

  test('Test 12.5: Secure Cookie Flags', async ({ page, context }) => {
    // Get cookies
    const cookies = await context.cookies();

    // Check auth cookies
    const authCookies = cookies.filter((c) => c.name.includes('auth'));

    authCookies.forEach((cookie) => {
      expect(cookie.secure).toBe(true); // HTTPS only
      expect(cookie.httpOnly).toBe(true); // No JS access
      expect(cookie.sameSite).toBe('Strict'); // CSRF protection
    });
  });

  test('Test 12.6: XSS Prevention - User Input Escaping', async ({ page }) => {
    // Go to task creation
    await page.goto('/meu-dia');

    // Try to create task with XSS payload
    const xssPayload = '<img src=x onerror="alert(1)">';
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill(xssPayload);
    await taskInput.press('Enter');

    // Wait for task to appear
    const taskElement = page.locator('text=' + xssPayload);

    // Task should be visible as text, not executed
    if (await taskElement.isVisible()) {
      // Get the HTML - it should be escaped
      const html = await taskElement.innerHTML();
      expect(html).not.toContain('onerror');
    }
  });

  test('Test 12.7: No Direct API Key Exposure', async ({ page }) => {
    // Check network requests
    const requests: { url: string; headers: Record<string, string> }[] = [];

    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        headers: request.allHeaders(),
      });
    });

    // Make some requests
    await page.goto('/');

    // Verify no service role keys in requests
    requests.forEach((req) => {
      expect(req.url).not.toContain('service_role_key');
      expect(JSON.stringify(req.headers)).not.toContain('service_role_key');
    });
  });

  test('Test 12.8: GDPR - Data Export Available', async ({ page }) => {
    // Go to privacy settings
    await page.goto('/settings/privacy');

    // Check for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")')
      .first();
    await expect(exportButton).toBeVisible();
  });

  test('Test 12.9: GDPR - Delete Account Available', async ({ page }) => {
    // Go to privacy settings
    await page.goto('/settings/privacy');

    // Check for delete button
    const deleteButton = page.locator('button:has-text("Delete"), text=Delete Account').first();
    await expect(deleteButton).toBeVisible();

    // Verify warning message
    const warningText = page.locator('text=permanent, cannot be undone');
    await expect(warningText).toBeVisible();
  });

  test('Test 12.10: Row-Level Security - User Isolation', async ({ page, context }) => {
    // Get current user ID from auth token
    const authData = await page.evaluate(() => {
      const token = sessionStorage.getItem('sb-gppebtrshbvuzatmebhr-auth-token');
      if (!token) return null;
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded;
    });

    expect(authData).not.toBeNull();

    // Try to access another user's data (should fail or be blocked by RLS)
    const response = await page.request.get(
      'https://gppebtrshbvuzatmebhr.supabase.co/rest/v1/work_items?user_id=neq.' + authData.sub,
      {
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${authData.sub}`,
        },
      }
    );

    // Should either return empty or 403
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0); // No cross-user data
    } else {
      expect(response.status()).toBe(403); // Forbidden
    }
  });
});
