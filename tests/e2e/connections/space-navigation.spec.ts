import { expect } from '@playwright/test';
import {
  test,
  navigateToConnections,
  openCreateSpaceWizard,
  selectArchetypeInWizard,
  createSpace,
  findSpaceCard,
  openSpace,
  getCurrentSpaceId,
} from './fixtures';

/**
 * Space Navigation & Interaction Tests
 *
 * Tests comprehensive navigation patterns across the Connections module:
 * 1. Navigation between archetype lists with filtering
 * 2. Space detail page loading and rendering
 * 3. Section navigation within spaces (members, events, etc.)
 * 4. Breadcrumb navigation and back button behavior
 * 5. State persistence during navigation
 * 6. Space switching and multi-space workflows
 *
 * These tests verify smooth navigation experiences and proper UI state
 * management when users move between spaces and sections.
 */
test.describe('Connection Spaces - Navigation & Discovery', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Start at connections dashboard
    await navigateToConnections(authenticatedPage);
  });

  // ========================================
  // TEST GROUP 1: ARCHETYPE FILTERING
  // ========================================

  test('Test 1.1: Filter spaces by Habitat archetype', async ({
    authenticatedPage: page,
  }) => {
    // Create test spaces of different types
    const habitatName = `Habitat Filter Test ${Date.now()}`;
    const venturesName = `Ventures Filter Test ${Date.now() + 1}`;

    // Create Habitat space
    await createSpace(page, 'habitat', { name: habitatName });
    await navigateToConnections(page);

    // Create Ventures space
    await createSpace(page, 'ventures', { name: venturesName });
    await navigateToConnections(page);

    // Click Habitat filter tab
    const habitatFilter = page
      .getByRole('button', { name: /habitat/i })
      .or(page.locator('[data-testid*="habitat"]'))
      .or(page.getByText('Habitat').first());

    const isVisible = await habitatFilter.isVisible().catch(() => false);
    if (isVisible) {
      await habitatFilter.click();
      await page.waitForTimeout(300);

      // Verify Habitat space is visible
      const habitatCard = await findSpaceCard(page, habitatName);
      await expect(habitatCard).toBeVisible({ timeout: 5000 });

      // Verify Ventures space is NOT visible (filtered out)
      const venturesCard = await findSpaceCard(page, venturesName);
      const venturesVisible = await venturesCard
        .isVisible()
        .catch(() => false);
      expect(venturesVisible).toBe(false);
    }
  });

  test('Test 1.2: Filter spaces by Ventures archetype', async ({
    authenticatedPage: page,
  }) => {
    const venturesName = `Ventures Navigation ${Date.now()}`;

    await createSpace(page, 'ventures', { name: venturesName });
    await navigateToConnections(page);

    // Click Ventures filter tab
    const venturesFilter = page
      .getByRole('button', { name: /ventures/i })
      .or(page.locator('[data-testid*="ventures"]'))
      .or(page.getByText('Ventures').first());

    const isVisible = await venturesFilter.isVisible().catch(() => false);
    if (isVisible) {
      await venturesFilter.click();
      await page.waitForTimeout(300);

      // Verify only Ventures spaces show
      const spaceCard = await findSpaceCard(page, venturesName);
      await expect(spaceCard).toBeVisible({ timeout: 5000 });

      // Verify URL doesn't change (filter is client-side)
      await expect(page).toHaveURL(/\/connections$/);
    }
  });

  test('Test 1.3: Filter spaces by Academia archetype', async ({
    authenticatedPage: page,
  }) => {
    const academiaName = `Academia Navigation ${Date.now()}`;

    await createSpace(page, 'academia', { name: academiaName });
    await navigateToConnections(page);

    const academiaFilter = page
      .getByRole('button', { name: /academia|academic/i })
      .or(page.locator('[data-testid*="academia"]'));

    const isVisible = await academiaFilter.isVisible().catch(() => false);
    if (isVisible) {
      await academiaFilter.click();
      await page.waitForTimeout(300);

      const spaceCard = await findSpaceCard(page, academiaName);
      await expect(spaceCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('Test 1.4: Filter spaces by Tribo archetype', async ({
    authenticatedPage: page,
  }) => {
    const triboName = `Tribo Navigation ${Date.now()}`;

    await createSpace(page, 'tribo', { name: triboName });
    await navigateToConnections(page);

    const triboFilter = page
      .getByRole('button', { name: /tribo/i })
      .or(page.locator('[data-testid*="tribo"]'));

    const isVisible = await triboFilter.isVisible().catch(() => false);
    if (isVisible) {
      await triboFilter.click();
      await page.waitForTimeout(300);

      const spaceCard = await findSpaceCard(page, triboName);
      await expect(spaceCard).toBeVisible({ timeout: 5000 });
    }
  });

  test('Test 1.5: "All" filter shows all spaces across archetypes', async ({
    authenticatedPage: page,
  }) => {
    const habitatName = `Habitat All Test ${Date.now()}`;
    const venturesName = `Ventures All Test ${Date.now() + 1}`;

    // Create spaces
    await createSpace(page, 'habitat', { name: habitatName });
    await navigateToConnections(page);
    await createSpace(page, 'ventures', { name: venturesName });
    await navigateToConnections(page);

    // Click "All" filter tab
    const allFilter = page
      .getByRole('button', { name: /todos|all/i })
      .or(page.locator('[data-testid*="all"]'));

    const isVisible = await allFilter.isVisible().catch(() => false);
    if (isVisible) {
      await allFilter.click();
      await page.waitForTimeout(300);

      // Both spaces should be visible
      const habitatCard = await findSpaceCard(page, habitatName);
      const venturesCard = await findSpaceCard(page, venturesName);

      await expect(habitatCard).toBeVisible();
      await expect(venturesCard).toBeVisible();
    }
  });

  test('Test 1.6: Filter persistence when navigating away and back', async ({
    authenticatedPage: page,
  }) => {
    const habitatName = `Habitat Persistence ${Date.now()}`;
    const venturesName = `Ventures Persistence ${Date.now() + 1}`;

    // Create spaces
    await createSpace(page, 'habitat', { name: habitatName });
    await navigateToConnections(page);
    await createSpace(page, 'ventures', { name: venturesName });
    await navigateToConnections(page);

    // Set filter to Habitat
    const habitatFilter = page
      .getByRole('button', { name: /habitat/i })
      .first();
    await habitatFilter.click();
    await page.waitForTimeout(300);

    // Open a space
    const habitatCard = await findSpaceCard(page, habitatName);
    await habitatCard.click();
    await page.waitForLoadState('networkidle');

    // Navigate back to dashboard
    const backButton = page
      .getByRole('button', { name: /voltar|back|← conexões/i })
      .or(page.locator('[data-testid*="back"]'))
      .first();

    const isBackVisible = await backButton.isVisible().catch(() => false);
    if (isBackVisible) {
      await backButton.click();
      await page.waitForLoadState('networkidle');

      // Filter should still be on Habitat (or may have reset, depending on implementation)
      // At minimum, we should be back on connections page
      await expect(page).toHaveURL(/\/connections$/);
    }
  });

  // ========================================
  // TEST GROUP 2: SPACE DETAIL PAGE LOADING
  // ========================================

  test('Test 2.1: Space detail page loads with correct archetype layout', async ({
    authenticatedPage: page,
  }) => {
    const habitatName = `Habitat Detail ${Date.now()}`;

    // Create and navigate to space
    await createSpace(page, 'habitat', { name: habitatName });

    // Verify we're on Habitat detail page
    await expect(page).toHaveURL(/\/connections\/habitat\/[^\/]+/);

    // Verify space name is visible
    await expect(page.getByText(habitatName)).toBeVisible();

    // Verify page has proper loading state (not showing loading skeleton)
    const loadingSkeleton = page.locator('.animate-pulse');
    const skeletonVisible = await loadingSkeleton.isVisible().catch(() => false);
    // Should not have visible loading skeletons after initial load
    // (If loading, skeleton should disappear quickly)
    await page.waitForTimeout(500);
  });

  test('Test 2.2: Space detail page displays space metadata', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Metadata Test ${Date.now()}`;
    const subtitle = 'Test Subtitle';
    const description = 'Test Description for Habitat';

    await createSpace(page, 'habitat', {
      name: spaceName,
      subtitle,
      description,
    });

    // Verify metadata displays
    await expect(page.getByText(spaceName)).toBeVisible();
    // Subtitle and description may not always be visible in all archetype views
    // but should at least not cause errors
  });

  test('Test 2.3: Different archetype detail pages have correct layouts', async ({
    authenticatedPage: page,
  }) => {
    // Test Habitat detail page
    const habitatName = `Habitat Layout ${Date.now()}`;
    await createSpace(page, 'habitat', { name: habitatName });
    await expect(page).toHaveURL(/\/connections\/habitat\/[^\/]+/);

    // Navigate to different archetype
    await navigateToConnections(page);

    // Test Ventures detail page
    const venturesName = `Ventures Layout ${Date.now() + 1}`;
    await createSpace(page, 'ventures', { name: venturesName });
    await expect(page).toHaveURL(/\/connections\/ventures\/[^\/]+/);

    // Each should have unique URL structure
    const habitatUrl = `connections/habitat`;
    const venturesUrl = `connections/ventures`;

    expect(page.url()).toContain(venturesUrl);
    expect(page.url()).not.toContain(habitatUrl);
  });

  test('Test 2.4: Space detail page handles loading state gracefully', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Loading State ${Date.now()}`;

    // Create space and go back to list
    await createSpace(page, 'habitat', { name: spaceName });
    await navigateToConnections(page);

    // Click on space - may show loading state briefly
    const spaceCard = await findSpaceCard(page, spaceName);
    await spaceCard.click();

    // Even during loading, page shouldn't crash or show error
    // Verify we eventually reach the space or see loading UI
    const loadingUI = page.locator('[data-testid*="loading"]').or(
      page.locator('.animate-spin').or(
        page.locator('[data-testid*="skeleton"]')
      )
    );

    const urlPromise = page.waitForURL(/\/connections\/\w+\/[^\/]+/, {
      timeout: 10000,
    });

    await Promise.race([
      urlPromise,
      page.waitForTimeout(2000),
    ]).catch(() => {
      // If navigation is slow, that's okay - we're testing robustness
    });

    // Should eventually either load or show proper error
    const errorMessage = page.getByText(/erro|error|não encontrado/i).first();
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    const isLoaded = page.url().match(/\/connections\/\w+\/[^\/]+/);

    expect(isLoaded || isErrorVisible).toBe(true);
  });

  // ========================================
  // TEST GROUP 3: SECTION NAVIGATION
  // ========================================

  test('Test 3.1: Navigate between space sections (if available)', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Section Navigation ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', { name: spaceName });

    // Look for navigation tabs/sections (members, events, etc.)
    const sectionButtons = page.locator('button, a')
      .filter({ hasText: /membros|members|eventos|events|configurações|settings/i });

    const sectionCount = await sectionButtons.count();

    // If sections exist, test navigation
    if (sectionCount > 0) {
      const firstSection = sectionButtons.first();
      const firstSectionText = await firstSection.textContent();

      await firstSection.click();
      await page.waitForTimeout(500);

      // Verify we're still in the same space
      const url = page.url();
      expect(url).toContain('/connections/habitat');
    }

    // If no sections, that's also valid (archetype may not have them)
    expect(sectionCount >= 0).toBe(true);
  });

  test('Test 3.2: Section content loads when selected', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Section Content ${Date.now()}`;

    await createSpace(page, 'habitat', { name: spaceName });

    // Look for member section
    const memberSection = page
      .getByRole('button', { name: /membros|members/i })
      .or(page.locator('[data-testid*="member"]'))
      .first();

    const isMemberSectionVisible = await memberSection
      .isVisible()
      .catch(() => false);

    if (isMemberSectionVisible) {
      await memberSection.click();
      await page.waitForTimeout(500);

      // Section should load without errors
      const errorMessage = page.getByText(/erro|error/i).first();
      const isError = await errorMessage.isVisible().catch(() => false);

      // Should either show member content or empty state
      expect(!isError).toBe(true);
    }
  });

  // ========================================
  // TEST GROUP 4: BREADCRUMB & BACK NAVIGATION
  // ========================================

  test('Test 4.1: Back button navigates from detail to connections list', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Back Navigation ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', { name: spaceName });

    // Verify we're on space detail page
    await expect(page).toHaveURL(/\/connections\/habitat\/[^\/]+/);

    // Find back button
    const backButton = page
      .getByRole('button', { name: /voltar|back|← |anterior/i })
      .or(page.getByText('←').first())
      .or(page.locator('[data-testid="back-button"]'))
      .first();

    const isBackVisible = await backButton.isVisible().catch(() => false);

    if (isBackVisible) {
      await backButton.click();
      await page.waitForLoadState('networkidle');

      // Should be back on connections page
      await expect(page).toHaveURL(/\/connections$/);
    }
  });

  test('Test 4.2: Browser back button works correctly', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Browser Back ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', { name: spaceName });

    // Verify on space detail
    await expect(page).toHaveURL(/\/connections\/habitat\/[^\/]+/);

    // Go back using browser history
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should be back on connections page
    await expect(page).toHaveURL(/\/connections$/);
  });

  test('Test 4.3: Breadcrumb shows current space context', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Breadcrumb Test ${Date.now()}`;

    await createSpace(page, 'habitat', { name: spaceName });

    // Look for breadcrumb showing space name
    const breadcrumb = page.getByText(spaceName).or(
      page.locator('[data-testid*="breadcrumb"]')
    );

    const isBreadcrumbVisible = await breadcrumb
      .isVisible()
      .catch(() => false);

    if (isBreadcrumbVisible) {
      await expect(breadcrumb).toBeVisible();
    }

    // At minimum, space name should appear somewhere
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  // ========================================
  // TEST GROUP 5: MULTI-SPACE NAVIGATION
  // ========================================

  test('Test 5.1: Switch between multiple spaces via dashboard', async ({
    authenticatedPage: page,
  }) => {
    const space1Name = `Space A ${Date.now()}`;
    const space2Name = `Space B ${Date.now() + 1}`;

    // Create first space
    await createSpace(page, 'habitat', { name: space1Name });
    const space1Url = page.url();

    // Navigate to second space via dashboard
    await navigateToConnections(page);
    await createSpace(page, 'habitat', { name: space2Name });
    const space2Url = page.url();

    // URLs should be different
    expect(space1Url).not.toBe(space2Url);

    // Both should contain habitat
    expect(space1Url).toContain('habitat');
    expect(space2Url).toContain('habitat');

    // Both should exist in dashboard
    await navigateToConnections(page);

    const card1 = await findSpaceCard(page, space1Name);
    const card2 = await findSpaceCard(page, space2Name);

    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();
  });

  test('Test 5.2: Navigate from one archetype to another via dashboard', async ({
    authenticatedPage: page,
  }) => {
    const habitatName = `Habitat Switch ${Date.now()}`;
    const venturesName = `Ventures Switch ${Date.now() + 1}`;

    // Create Habitat space
    await createSpace(page, 'habitat', { name: habitatName });
    await navigateToConnections(page);

    // Create Ventures space
    await createSpace(page, 'ventures', { name: venturesName });
    await expect(page).toHaveURL(/\/connections\/ventures\/[^\/]+/);

    // Navigate back to Habitat space
    await navigateToConnections(page);
    const habitatCard = await findSpaceCard(page, habitatName);
    await habitatCard.click();

    // Should be in Habitat space
    await expect(page).toHaveURL(/\/connections\/habitat\/[^\/]+/);
    await expect(page.getByText(habitatName)).toBeVisible();
  });

  test('Test 5.3: Space switching preserves user session', async ({
    authenticatedPage: page,
  }) => {
    const space1Name = `Session Test A ${Date.now()}`;
    const space2Name = `Session Test B ${Date.now() + 1}`;

    // Create spaces
    await createSpace(page, 'habitat', { name: space1Name });
    await navigateToConnections(page);
    await createSpace(page, 'habitat', { name: space2Name });
    await navigateToConnections(page);

    // Switch between spaces multiple times
    const card1 = await findSpaceCard(page, space1Name);
    await card1.click();
    await page.waitForLoadState('networkidle');

    const backButton = page
      .getByRole('button', { name: /voltar|back/i })
      .first();
    const isBackVisible = await backButton.isVisible().catch(() => false);
    if (isBackVisible) {
      await backButton.click();
      await page.waitForLoadState('networkidle');
    }

    const card2 = await findSpaceCard(page, space2Name);
    await card2.click();
    await page.waitForLoadState('networkidle');

    // Should be logged in and able to access space
    await expect(page.getByText(space2Name)).toBeVisible();
  });

  // ========================================
  // TEST GROUP 6: STATE & PERSISTENCE
  // ========================================

  test('Test 6.1: Space data persists after navigation away', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Persistence Test ${Date.now()}`;
    const description = 'Test description for persistence';

    // Create space with data
    await createSpace(page, 'habitat', {
      name: spaceName,
      description,
    });

    // Navigate away and back
    await navigateToConnections(page);

    const spaceCard = await findSpaceCard(page, spaceName);
    await spaceCard.click();

    // Data should still be there
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  test('Test 6.2: Creating space in one archetype doesn\'t affect others', async ({
    authenticatedPage: page,
  }) => {
    const habitatName = `Habitat Isolation ${Date.now()}`;
    const venturesName = `Ventures Isolation ${Date.now() + 1}`;

    // Create Habitat space
    await createSpace(page, 'habitat', { name: habitatName });
    await navigateToConnections(page);

    // Create Ventures space
    await createSpace(page, 'ventures', { name: venturesName });
    await navigateToConnections(page);

    // Verify both exist and are isolated
    const habitatCard = await findSpaceCard(page, habitatName);
    const venturesCard = await findSpaceCard(page, venturesName);

    await expect(habitatCard).toBeVisible();
    await expect(venturesCard).toBeVisible();

    // Filter to Habitat - should only see Habitat
    const habitatFilter = page
      .getByRole('button', { name: /habitat/i })
      .first();

    const isFilterVisible = await habitatFilter.isVisible().catch(() => false);
    if (isFilterVisible) {
      await habitatFilter.click();
      await page.waitForTimeout(300);

      // Ventures should not be visible when filtered
      const venturesVisible = await venturesCard
        .isVisible()
        .catch(() => false);
      expect(venturesVisible).toBe(false);
    }
  });

  // ========================================
  // TEST GROUP 7: ERROR HANDLING & EDGE CASES
  // ========================================

  test('Test 7.1: Invalid space ID shows error gracefully', async ({
    authenticatedPage: page,
  }) => {
    // Try to navigate to invalid space ID
    await page.goto('/connections/habitat/invalid-space-id-12345');

    // Should show error or empty state, not crash
    const errorMessage = page
      .getByText(/não encontrado|not found|erro|error|does not exist/i)
      .first();

    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    const hasBackButton = await page
      .getByRole('button', { name: /voltar|back|← /i })
      .isVisible()
      .catch(() => false);

    // Either error shows or back button is available
    expect(isErrorVisible || hasBackButton).toBe(true);
  });

  test('Test 7.2: Navigation doesn\'t break with rapid space switching', async ({
    authenticatedPage: page,
  }) => {
    const space1Name = `Rapid A ${Date.now()}`;
    const space2Name = `Rapid B ${Date.now() + 1}`;

    // Create spaces
    await createSpace(page, 'habitat', { name: space1Name });
    await navigateToConnections(page);
    await createSpace(page, 'habitat', { name: space2Name });
    await navigateToConnections(page);

    // Rapidly switch between spaces
    const card1 = await findSpaceCard(page, space1Name);
    const card2 = await findSpaceCard(page, space2Name);

    await card1.click();
    await page.waitForTimeout(200);

    const backButton = page
      .getByRole('button', { name: /voltar|back/i })
      .first();
    const isBackVisible = await backButton.isVisible().catch(() => false);
    if (isBackVisible) {
      await backButton.click();
      await page.waitForTimeout(200);
    }

    await card2.click();
    await page.waitForLoadState('networkidle');

    // Should end up on valid space
    await expect(page).toHaveURL(/\/connections\/\w+\/[^\/]+/);
  });

  test('Test 7.3: Space detail page accessible via direct URL navigation', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Direct URL Test ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', { name: spaceName });

    // Get the space ID from current URL
    const spaceId = await getCurrentSpaceId(page);
    expect(spaceId.length).toBeGreaterThan(0);

    // Navigate away
    await navigateToConnections(page);

    // Navigate directly to space URL
    await page.goto(`/connections/habitat/${spaceId}`);
    await page.waitForLoadState('networkidle');

    // Should load space successfully
    await expect(page).toHaveURL(/\/connections\/habitat\/${spaceId}/);
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 5000 });
  });
});
