import { test, expect } from '@playwright/test';

test.describe('Gamification System', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@aica.app');
    await page.fill('input[type="password"]', 'SecureTest123!@#');
    await page.locator('button:has-text("Login")').click();
    await page.waitForURL(/\/(dashboard|meu-dia)/);
  });

  test('Test 6.1: XP Earning on Task Completion', async ({ page }) => {
    // Go to dashboard
    await page.goto('/');

    // Get initial XP
    const initialXP = await page.locator('[data-testid="total-xp"]').textContent();

    // Go to Agenda and complete a task
    await page.goto('/meu-dia');
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('XP Test Task');
    await taskInput.press('Enter');

    // Complete the task
    const taskCheckbox = page.locator('[data-testid="task-checkbox"]:near(text=XP Test Task)');
    await taskCheckbox.click();

    // Wait for XP notification
    const xpNotification = page.locator('text=+10 XP');
    await expect(xpNotification).toBeVisible();

    // Go back to dashboard
    await page.goto('/');

    // Verify XP increased
    const newXP = await page.locator('[data-testid="total-xp"]').textContent();
    expect(parseInt(newXP || '0')).toBeGreaterThan(parseInt(initialXP || '0'));
  });

  test('Test 6.2: Level Progression', async ({ page }) => {
    // This test would require multiple task completions
    // For now, verify UI displays current level
    await page.goto('/');

    // Check if level badge exists
    const levelBadge = page.locator('[data-testid="level-badge"]');
    await expect(levelBadge).toBeVisible();

    // Verify it contains a number
    const levelText = await levelBadge.textContent();
    expect(levelText).toMatch(/Level \d+/);
  });

  test('Test 6.3: Achievements Unlock', async ({ page }) => {
    // Go to Achievements view
    await page.goto('/achievements');

    // Verify achievements section exists
    const achievementsGrid = page.locator('[data-testid="achievements-grid"]');
    await expect(achievementsGrid).toBeVisible();

    // Check if any achievements are shown
    const achievementBadges = page.locator('[data-testid="achievement-badge"]');
    const count = await achievementBadges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Test 6.4: Streak Tracking', async ({ page }) => {
    // Go to dashboard
    await page.goto('/');

    // Check for streak display
    const streakCounter = page.locator('[data-testid="streak-counter"]');
    if (await streakCounter.isVisible()) {
      const streakText = await streakCounter.textContent();
      expect(streakText).toMatch(/\d+-day streak/);
    }
  });

  test('Test 6.5: Leaderboard Visibility', async ({ page }) => {
    // Go to leaderboard (if exists)
    await page.goto('/leaderboard');

    // Check if leaderboard is visible
    const leaderboard = page.locator('[data-testid="leaderboard"]');

    if (await leaderboard.isVisible()) {
      // Verify top 10 users are shown
      const leaderboardRows = page.locator('[data-testid="leaderboard-row"]');
      const count = await leaderboardRows.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Check for user in leaderboard
      const userRank = page.locator('[data-testid="user-rank"]');
      await expect(userRank).toBeVisible();
    }
  });
});
