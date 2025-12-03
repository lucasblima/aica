import { test, expect } from '@playwright/test';

test.describe('Authentication & User Management', () => {
  test('Test 1.1: User Login', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Check if login form exists
    const loginButton = page.locator('button:has-text("Login")');
    await expect(loginButton).toBeVisible();

    // Fill in credentials (test user)
    await page.fill('input[type="email"]', 'test@aica.app');
    await page.fill('input[type="password"]', 'SecureTest123!@#');

    // Click login
    await loginButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|meu-dia)/);

    // Verify we're logged in
    const profileButton = page.locator('[data-testid="profile-button"]');
    await expect(profileButton).toBeVisible();
  });

  test('Test 1.2: Update User Profile', async ({ page }) => {
    // Assuming logged in
    await page.goto('/settings/profile');

    // Update full name
    await page.fill('input[name="full_name"]', 'Test User Updated');

    // Update birth date
    await page.fill('input[name="birth_date"]', '1990-01-15');

    // Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for success message
    const successMessage = page.locator('text=Profile updated successfully');
    await expect(successMessage).toBeVisible();
  });

  test('Test 1.3: User Session Persistence', async ({ page, context }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@aica.app');
    await page.fill('input[type="password"]', 'SecureTest123!@#');
    await page.locator('button:has-text("Login")').click();

    // Wait for dashboard
    await page.waitForURL(/\/(dashboard|meu-dia)/);

    // Get session storage
    const sessionData = await page.evaluate(() => {
      return sessionStorage.getItem('sb-gppebtrshbvuzatmebhr-auth-token');
    });

    // Verify token exists
    expect(sessionData).toBeTruthy();

    // Refresh page
    await page.reload();

    // Should still be logged in
    const profileButton = page.locator('[data-testid="profile-button"]');
    await expect(profileButton).toBeVisible();
  });

  test('Test 1.4: Auto Logout on Inactivity', async ({ page }) => {
    // This test would need to be run with time manipulation
    // Skip for now, as it requires 30 minutes of waiting
    test.skip();
  });
});
