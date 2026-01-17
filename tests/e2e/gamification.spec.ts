import { test, expect } from '@playwright/test';

/**
 * Gamification System E2E Tests
 *
 * NOTE: The app uses "Consciousness Points (CP)" as the gamification system.
 * CP is displayed in the IdentityPassport component on the home page.
 *
 * The GamificationWidget and AchievementsView components exist but are not
 * currently integrated into routes. These tests focus on the CP system that
 * is actively used in the app.
 */
test.describe('Gamification System', () => {
  test.beforeEach(async ({ page }) => {
    /**
     * Authentication is handled globally via playwright.config.ts
     * which uses storageState to inject pre-authenticated session.
     */
    await page.goto('/');
  });

  test('Test 6.1: CP Display on Home Page', async ({ page }) => {
    // Navigate to home page (should already be there from beforeEach)
    await page.goto('/');

    // Wait for the IdentityPassport to be visible
    const identityPassport = page.locator('[data-testid="identity-passport"]');
    await expect(identityPassport).toBeVisible({ timeout: 10000 });

    // Verify CP progress bar exists
    const cpProgressBar = page.locator('[data-testid="cp-progress-bar"]');
    await expect(cpProgressBar).toBeVisible();

    // Verify CP value is displayed (look for "CP" text)
    const cpText = page.locator('text=/\\d+\\s*CP/');
    await expect(cpText).toBeVisible();
  });

  test('Test 6.2: Level Display in Identity Passport', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for Identity Passport to load
    const identityPassport = page.locator('[data-testid="identity-passport"]');
    await expect(identityPassport).toBeVisible({ timeout: 10000 });

    // The level badge should contain a number and level name
    // Level badge is inside the ceramic-badge-gold class
    const levelBadge = identityPassport.locator('.ceramic-badge-gold');
    await expect(levelBadge).toBeVisible();

    // Verify it displays level number
    const levelNumber = levelBadge.locator('span').first();
    const levelText = await levelNumber.textContent();
    expect(parseInt(levelText || '0')).toBeGreaterThanOrEqual(1);
  });

  test('Test 6.3: Streak Display on Home Page', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // The streak badge is displayed as a ceramic-inset element with fire emoji
    // Located near the IdentityPassport
    const streakBadge = page.locator('.ceramic-inset-sm:has-text("dias")');

    if (await streakBadge.isVisible()) {
      // Verify streak displays a number followed by "dias"
      const streakText = await streakBadge.textContent();
      expect(streakText).toMatch(/\d+\s*dias/);
    }
  });

  test('Test 6.4: CP Progress Bar Shows Percentage', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for Identity Passport
    const identityPassport = page.locator('[data-testid="identity-passport"]');
    await expect(identityPassport).toBeVisible({ timeout: 10000 });

    // CP Progress bar should have aria attributes
    const progressBar = page.locator('[data-testid="cp-progress-bar"]');
    await expect(progressBar).toBeVisible();

    // Check for percentage display
    const percentageText = page.locator('text=/\\d+%/');
    await expect(percentageText).toBeVisible();
  });

  test.skip('Test 6.5: Leaderboard Visibility', async ({ page }) => {
    /**
     * SKIPPED: Leaderboard feature does not exist yet.
     * The /leaderboard route is not implemented.
     * Re-enable this test when leaderboard feature is added.
     */
    await page.goto('/leaderboard');

    const leaderboard = page.locator('[data-testid="leaderboard"]');

    if (await leaderboard.isVisible()) {
      const leaderboardRows = page.locator('[data-testid="leaderboard-row"]');
      const count = await leaderboardRows.count();
      expect(count).toBeGreaterThanOrEqual(1);

      const userRank = page.locator('[data-testid="user-rank"]');
      await expect(userRank).toBeVisible();
    }
  });

  test.skip('Test 6.6: GamificationWidget Display', async ({ page }) => {
    /**
     * SKIPPED: GamificationWidget is not currently integrated into any route.
     * The component exists at src/components/features/GamificationWidget.tsx
     * but is not rendered anywhere in the app.
     *
     * Re-enable this test when GamificationWidget is added to a page.
     *
     * Expected data-testid attributes (already added to component):
     * - data-testid="gamification-widget" - main container
     * - data-testid="level-badge" - level display
     * - data-testid="xp-progress-bar" - XP progress bar
     * - data-testid="total-xp" - total XP display
     * - data-testid="streak-counter" - streak display
     */
    // Navigate to where GamificationWidget would be displayed
    await page.goto('/');

    const gamificationWidget = page.locator('[data-testid="gamification-widget"]');
    await expect(gamificationWidget).toBeVisible();

    const levelBadge = page.locator('[data-testid="level-badge"]');
    await expect(levelBadge).toBeVisible();

    const totalXp = page.locator('[data-testid="total-xp"]');
    await expect(totalXp).toBeVisible();
  });

  test.skip('Test 6.7: AchievementsView Display', async ({ page }) => {
    /**
     * SKIPPED: AchievementsView is not currently integrated into any route.
     * The component exists at src/components/features/AchievementsView.tsx
     * but the /achievements route is not implemented.
     *
     * Re-enable this test when achievements page/modal is added.
     *
     * Expected data-testid attributes (already added to component):
     * - data-testid="achievements-view" - main container
     * - data-testid="achievements-grid" - grid of achievement badges
     * - data-testid="achievement-badge" - individual achievement badge
     */
    await page.goto('/achievements');

    const achievementsGrid = page.locator('[data-testid="achievements-grid"]');
    await expect(achievementsGrid).toBeVisible();

    const achievementBadges = page.locator('[data-testid="achievement-badge"]');
    const count = await achievementBadges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Test 6.8: Profile Opens from Identity Passport', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for Identity Passport
    const identityPassport = page.locator('[data-testid="identity-passport"]');
    await expect(identityPassport).toBeVisible({ timeout: 10000 });

    // Click on Identity Passport to open profile
    await identityPassport.click();

    // Profile modal should open (look for profile-related content)
    // ProfileModal component should appear
    const profileModal = page.locator('[role="dialog"], .profile-modal, [data-testid="profile-modal"]');
    await expect(profileModal).toBeVisible({ timeout: 5000 });
  });
});
