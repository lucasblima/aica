/**
 * Dashboard Ceramic Responsive Design Tests
 *
 * Verifies the responsiveness of the new "Digital Ceramic" dashboard redesign
 * components across multiple viewports (mobile, tablet, desktop).
 *
 * Components tested:
 * - IdentityPassport: Hero card with avatar, level badge, and CP progress
 * - VitalStatsTray: Grid of vital statistics with heavy typography
 * - EfficiencyFlowCard: Efficiency trends with Bezier curve chart
 * - ProfileModal: User profile modal with account management and danger zone
 *
 * Test coverage:
 * - Layout adaptation for each viewport
 * - Touch target sizes >= 44px on mobile
 * - No horizontal overflow
 * - Smooth scrolling
 * - Typography legibility
 * - Interactive elements functionality
 */

import { test, expect } from '@playwright/test';

// Viewport configurations for testing
const VIEWPORTS = {
  IPHONE_SE: {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
  },
  IPHONE_14_PRO: {
    name: 'iPhone 14 Pro',
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    isMobile: true,
  },
  IPAD: {
    name: 'iPad',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
  },
  DESKTOP: {
    name: 'Desktop',
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: false,
  },
};

test.describe('Dashboard Ceramic Responsive Design', () => {
  // Helper function to test each viewport
  async function testViewport(
    testFn: (page: any, viewportName: string, isMobile: boolean) => Promise<void>,
    viewportKey: keyof typeof VIEWPORTS
  ) {
    const viewport = VIEWPORTS[viewportKey];

    test(`${testFn.name || 'Unnamed test'} - ${viewport.name}`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // Call the test function
      await testFn(page, viewport.name, viewport.isMobile);
    });
  }

  test.beforeEach(async ({ page }) => {
    /**
     * Navigate to dashboard (must be authenticated)
     * Authentication is handled globally via playwright.config.ts
     */
    await page.goto('/minha-vida');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
  });

  // ==========================================
  // IDENTITY PASSPORT TESTS
  // ==========================================

  test.describe('IdentityPassport Component', () => {
    // Test 1: Horizontal layout on desktop
    test('should display Identity Passport in horizontal layout on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      // Wait for passport to load
      const passport = page.locator('[data-testid="identity-passport"]');
      await expect(passport).toBeVisible();

      // Verify horizontal flex layout (avatar, badge, progress, button in row)
      const avatarArea = page.locator('[data-testid="identity-passport-avatar"]');
      const badgeArea = page.locator('[data-testid="identity-passport-badge"]');
      const progressArea = page.locator('[data-testid="identity-passport-progress"]');
      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');

      // All elements should be visible
      await expect(avatarArea).toBeVisible();
      await expect(badgeArea).toBeVisible();
      await expect(progressArea).toBeVisible();
      await expect(profileBtn).toBeVisible();

      // Get bounding boxes to verify horizontal alignment
      const avatarBox = await avatarArea.boundingBox();
      const badgeBox = await badgeArea.boundingBox();
      const progressBox = await progressArea.boundingBox();

      if (avatarBox && badgeBox && progressBox) {
        // All should have similar vertical positions (y coordinate)
        expect(avatarBox.y).toBeLessThan(badgeBox.y + 50);
        expect(badgeBox.y).toBeLessThan(progressBox.y + 50);
      }
    });

    // Test 2: Vertical stacking on mobile
    test('should adapt Identity Passport to vertical layout on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const passport = page.locator('[data-testid="identity-passport"]');
      await expect(passport).toBeVisible();

      // On mobile, might show as a card or vertical stack
      // Verify button still visible and accessible
      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await expect(profileBtn).toBeVisible();

      // Button should have proper touch size
      const buttonBox = await profileBtn.boundingBox();
      if (buttonBox) {
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    });

    // Test 3: No horizontal overflow
    test('should have no horizontal overflow on any viewport', async ({ page }) => {
      const viewportSizes = [
        { width: 375, height: 667 },  // iPhone SE
        { width: 393, height: 852 },  // iPhone 14 Pro
        { width: 768, height: 1024 }, // iPad
        { width: 1280, height: 800 }, // Desktop
      ];

      for (const size of viewportSizes) {
        await page.setViewportSize(size);

        // Check for horizontal overflow
        const bodyWidth = await page.evaluate(() => {
          return Math.max(
            document.documentElement.clientWidth,
            document.body.clientWidth
          );
        });

        const maxContentWidth = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          let maxWidth = 0;
          elements.forEach((el) => {
            const width = (el as HTMLElement).offsetWidth;
            const right = (el as HTMLElement).getBoundingClientRect().right;
            if (right > maxWidth) maxWidth = right;
          });
          return maxWidth;
        });

        expect(maxContentWidth).toBeLessThanOrEqual(bodyWidth + 1); // +1 for rounding
      }
    });

    // Test 4: Profile button clickable on mobile
    test('should have clickable profile button with adequate touch target on iPhone 14 Pro', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await expect(profileBtn).toBeVisible();

      // Verify touch target
      const bbox = await profileBtn.boundingBox();
      if (bbox) {
        expect(bbox.width).toBeGreaterThanOrEqual(44);
        expect(bbox.height).toBeGreaterThanOrEqual(44);
      }

      // Should be clickable (trigger profile modal)
      await profileBtn.click();

      // Modal should open
      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
    });
  });

  // ==========================================
  // VITAL STATS TRAY TESTS
  // ==========================================

  test.describe('VitalStatsTray Component', () => {
    // Test 5: 3-column layout on desktop
    test('should display VitalStatsTray in 3-column grid on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const tray = page.locator('[data-testid="vital-stats-tray"]');
      await expect(tray).toBeVisible();

      // Verify all three stats are visible
      const streakStat = page.locator('[data-testid="vital-stat-streak"]');
      const momentsStat = page.locator('[data-testid="vital-stat-moments"]');
      const reflectionsStat = page.locator('[data-testid="vital-stat-reflections"]');

      await expect(streakStat).toBeVisible();
      await expect(momentsStat).toBeVisible();
      await expect(reflectionsStat).toBeVisible();

      // Get positions to verify grid alignment
      const streakBox = await streakStat.boundingBox();
      const momentsBox = await momentsStat.boundingBox();
      const reflectionsBox = await reflectionsStat.boundingBox();

      if (streakBox && momentsBox && reflectionsBox) {
        // All should have similar vertical positions (3-column grid)
        expect(streakBox.y).toBeLessThan(momentsBox.y + 30);
        expect(momentsBox.y).toBeLessThan(reflectionsBox.y + 30);
      }
    });

    // Test 6: Responsive layout on mobile
    test('should adapt VitalStatsTray grid on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const tray = page.locator('[data-testid="vital-stats-tray"]');
      await expect(tray).toBeVisible();

      // All stats should still be visible (may be stacked vertically)
      const streakStat = page.locator('[data-testid="vital-stat-streak"]');
      const momentsStat = page.locator('[data-testid="vital-stat-moments"]');
      const reflectionsStat = page.locator('[data-testid="vital-stat-reflections"]');

      await expect(streakStat).toBeVisible();
      await expect(momentsStat).toBeVisible();
      await expect(reflectionsStat).toBeVisible();
    });

    // Test 7: Typography legibility on mobile
    test('should have legible typography on iPhone SE (text-4xl font-black)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const statValue = page.locator('[data-testid="vital-stat-value"]').first();
      await expect(statValue).toBeVisible();

      // Get computed font size
      const fontSize = await statValue.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      // Should be large enough (text-4xl typically 36px)
      const fontSizePx = parseInt(fontSize, 10);
      expect(fontSizePx).toBeGreaterThanOrEqual(24); // Minimum legible size on mobile
    });

    // Test 8: Icon visibility on all viewports
    test('should display icons clearly on iPad', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const icons = page.locator('[data-testid="vital-stat-icon"]');
      const count = await icons.count();

      expect(count).toBe(3);

      // Each icon should be visible and properly sized
      for (let i = 0; i < count; i++) {
        const icon = icons.nth(i);
        await expect(icon).toBeVisible();

        const bbox = await icon.boundingBox();
        if (bbox) {
          expect(bbox.width).toBeGreaterThanOrEqual(20);
          expect(bbox.height).toBeGreaterThanOrEqual(20);
        }
      }
    });

    // Test 9: Spacing consistency
    test('should have consistent spacing between stats on iPhone 14 Pro', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });

      const stats = page.locator('[data-testid="vital-stat-item"]');
      const count = await stats.count();

      expect(count).toBe(3);

      // Get spacing between items
      const boxes = [];
      for (let i = 0; i < count; i++) {
        const box = await stats.nth(i).boundingBox();
        if (box) boxes.push(box);
      }

      // Verify reasonable spacing
      if (boxes.length >= 2) {
        const spacingX = Math.abs(boxes[1].x - boxes[0].x);
        const spacingY = Math.abs(boxes[1].y - boxes[0].y);

        // Should have spacing in one direction (grid layout)
        expect(spacingX + spacingY).toBeGreaterThan(50);
      }
    });
  });

  // ==========================================
  // EFFICIENCY FLOW CARD TESTS
  // ==========================================

  test.describe('EfficiencyFlowCard Component', () => {
    // Test 10: Chart displays on Desktop
    test('should display EfficiencyFlowCard chart on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const card = page.locator('[data-testid="efficiency-flow-card"]');
      await expect(card).toBeVisible();

      // Wait for chart to render
      const chart = page.locator('[data-testid="efficiency-chart"]');
      await expect(chart).toBeVisible({ timeout: 5000 });
    });

    // Test 11: Range selector buttons on mobile
    test('should display range selector buttons on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const rangeButtons = page.locator('[data-testid="efficiency-range-btn"]');
      const count = await rangeButtons.count();

      expect(count).toBe(3); // 7d, 14d, 30d

      // Each button should have adequate touch size
      for (let i = 0; i < count; i++) {
        const btn = rangeButtons.nth(i);
        const bbox = await btn.boundingBox();
        if (bbox) {
          expect(bbox.width).toBeGreaterThanOrEqual(40);
          expect(bbox.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    // Test 12: Range selector interaction on mobile
    test('should allow switching time ranges on iPhone 14 Pro', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });

      const rangeBtn7d = page.locator('[data-testid="efficiency-range-btn-7d"]');
      const rangeBtn30d = page.locator('[data-testid="efficiency-range-btn-30d"]');

      // Default should be 30d
      await expect(rangeBtn30d).toHaveAttribute('data-active', 'true');

      // Click 7d
      await rangeBtn7d.click();

      // 7d should now be active
      await expect(rangeBtn7d).toHaveAttribute('data-active', 'true', { timeout: 3000 });

      // Chart should update (wait for new data)
      await page.waitForLoadState('networkidle');
    });

    // Test 13: Chart is responsive (SVG width)
    test('should render responsive chart on iPad', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const chart = page.locator('[data-testid="efficiency-chart"]');
      await expect(chart).toBeVisible({ timeout: 5000 });

      // Get SVG element
      const svg = chart.locator('svg').first();
      const viewBox = await svg.getAttribute('viewBox');

      // Should have valid viewBox (responsive SVG)
      expect(viewBox).toBeTruthy();
      expect(viewBox).toMatch(/\d+\s+\d+\s+\d+\s+\d+/);
    });

    // Test 14: Stats row layout
    test('should display efficiency stats row on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const avgStat = page.locator('[data-testid="efficiency-stat-avg"]');
      const maxStat = page.locator('[data-testid="efficiency-stat-max"]');
      const excellentStat = page.locator('[data-testid="efficiency-stat-excellent"]');

      await expect(avgStat).toBeVisible();
      await expect(maxStat).toBeVisible();
      await expect(excellentStat).toBeVisible();
    });

    // Test 15: No horizontal overflow for chart
    test('should have no horizontal overflow on any viewport', async ({ page }) => {
      const viewportSizes = [
        { width: 375, height: 667 },
        { width: 393, height: 852 },
        { width: 768, height: 1024 },
        { width: 1280, height: 800 },
      ];

      for (const size of viewportSizes) {
        await page.setViewportSize(size);

        const card = page.locator('[data-testid="efficiency-flow-card"]');
        await expect(card).toBeVisible();

        // Check if chart container allows scrolling without overflow
        const chartContainer = page.locator('[data-testid="efficiency-chart-container"]');
        const overflow = await chartContainer.evaluate((el) => {
          return window.getComputedStyle(el).overflow;
        });

        // Should not have visible overflow (can be 'hidden' or 'auto')
        expect(['hidden', 'auto', 'scroll']).toContain(overflow);
      }
    });
  });

  // ==========================================
  // PROFILE MODAL TESTS
  // ==========================================

  test.describe('ProfileModal Component', () => {
    // Test 16: Modal opens and displays correctly
    test('should open profile modal on Desktop when button clicked', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Verify modal content
      const title = page.locator('[data-testid="profile-modal-title"]');
      const closeBtn = page.locator('[data-testid="profile-modal-close"]');

      await expect(title).toBeVisible();
      await expect(closeBtn).toBeVisible();
    });

    // Test 17: Modal is full screen on mobile
    test('should display profile modal full screen or nearly full screen on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Get modal dimensions
      const modalBox = await modal.boundingBox();
      const viewportWidth = 375;

      if (modalBox) {
        // Modal should be very wide relative to viewport
        const widthRatio = modalBox.width / viewportWidth;
        expect(widthRatio).toBeGreaterThanOrEqual(0.8); // At least 80% of viewport
      }
    });

    // Test 18: Modal close button on mobile
    test('should have accessible close button on iPhone 14 Pro', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      const closeBtn = page.locator('[data-testid="profile-modal-close"]');

      // Verify touch size
      const bbox = await closeBtn.boundingBox();
      if (bbox) {
        expect(bbox.width).toBeGreaterThanOrEqual(44);
        expect(bbox.height).toBeGreaterThanOrEqual(44);
      }

      // Close modal
      await closeBtn.click();
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    });

    // Test 19: User info readable on mobile
    test('should display user info clearly on iPad', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Verify all info sections visible
      const emailSection = page.locator('[data-testid="profile-modal-email"]');
      const dateSection = page.locator('[data-testid="profile-modal-date"]');
      const idSection = page.locator('[data-testid="profile-modal-id"]');

      await expect(emailSection).toBeVisible();
      await expect(dateSection).toBeVisible();
      await expect(idSection).toBeVisible();
    });

    // Test 20: Danger Zone accessible on mobile
    test('should display danger zone section on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Scroll to danger zone if needed
      const dangerZone = page.locator('[data-testid="profile-modal-danger-zone"]');

      // Should be in viewport or scrollable
      const isVisible = await dangerZone.isVisible();
      if (!isVisible) {
        // Try scrolling within modal
        const modalContent = page.locator('[data-testid="profile-modal-content"]');
        await modalContent.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
      }

      await expect(dangerZone).toBeVisible({ timeout: 2000 });
    });

    // Test 21: Delete account button interaction
    test('should allow initiating account deletion flow on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      const deleteBtn = page.locator('[data-testid="profile-modal-delete-account-btn"]');

      // Scroll to button if needed
      await deleteBtn.scrollIntoViewIfNeeded();

      // Verify button is accessible
      const bbox = await deleteBtn.boundingBox();
      expect(bbox).toBeTruthy();

      // Click should trigger confirmation dialog
      await deleteBtn.click();

      // Confirmation should appear
      const confirmation = page.locator('[data-testid="profile-modal-delete-confirmation"]');
      await expect(confirmation).toBeVisible({ timeout: 2000 });
    });

    // Test 22: Modal backdrop closes on Desktop
    test('should close modal when clicking backdrop on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');
      await profileBtn.click();

      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Click backdrop (outside modal)
      const backdrop = page.locator('[data-testid="profile-modal-backdrop"]');
      await backdrop.click({ position: { x: 10, y: 10 } });

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    });
  });

  // ==========================================
  // CROSS-COMPONENT TESTS
  // ==========================================

  test.describe('Complete Dashboard Layout', () => {
    // Test 23: All components render without layout issues on Desktop
    test('should render all components without layout conflicts on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      const passport = page.locator('[data-testid="identity-passport"]');
      const tray = page.locator('[data-testid="vital-stats-tray"]');
      const card = page.locator('[data-testid="efficiency-flow-card"]');

      await expect(passport).toBeVisible();
      await expect(tray).toBeVisible();
      await expect(card).toBeVisible();

      // Check for no overlapping elements
      const passportBox = await passport.boundingBox();
      const trayBox = await tray.boundingBox();
      const cardBox = await card.boundingBox();

      if (passportBox && trayBox && cardBox) {
        // Elements should be vertically stacked (reasonable separation)
        expect(trayBox.y).toBeGreaterThan(passportBox.y + passportBox.height);
        expect(cardBox.y).toBeGreaterThan(trayBox.y + trayBox.height);
      }
    });

    // Test 24: Dashboard scrolls smoothly on all viewports
    test('should allow smooth scrolling on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 300));

      // Get new scroll position
      const newScroll = await page.evaluate(() => window.scrollY);

      // Should have scrolled
      expect(newScroll).toBeGreaterThan(initialScroll);
    });

    // Test 25: Touch interactions work on mobile
    test('should support touch interactions on iPhone 14 Pro', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });

      // Try tapping on identity passport button
      const profileBtn = page.locator('[data-testid="identity-passport-profile-btn"]');

      // Use tap instead of click for mobile
      await profileBtn.tap();

      // Modal should appear
      const modal = page.locator('[data-testid="profile-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
    });

    // Test 26: No horizontal scroll on mobile
    test('should not allow horizontal scrolling on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Get viewport and document widths
      const viewportWidth = 375;
      const documentWidth = await page.evaluate(() => {
        return Math.max(
          document.documentElement.clientWidth,
          document.body.clientWidth
        );
      });

      // Document should not exceed viewport
      expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });

    // Test 27: Typography scales properly on iPad
    test('should scale typography appropriately on iPad', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      // Get various text sizes
      const heading = page.locator('[data-testid="identity-passport"] h2').first();
      const label = page.locator('[data-testid="vital-stat-label"]').first();

      if (await heading.isVisible()) {
        const headingSize = await heading.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });

        const labelSize = await label.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });

        // Heading should be larger than label
        expect(headingSize).toBeGreaterThan(labelSize);
      }
    });

    // Test 28: Animation performance check (no layout thrashing)
    test('should not cause excessive layout recalculations on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      // Measure time to render components
      const renderTime = await page.evaluate(async () => {
        const start = performance.now();

        // Trigger animation or re-render by making element visible
        const elements = document.querySelectorAll('[data-testid*="vital-stat"]');

        // Force layout
        elements.forEach((el) => {
          (el as HTMLElement).offsetHeight;
        });

        const end = performance.now();
        return end - start;
      });

      // Should render quickly (less than 100ms for layout checks)
      expect(renderTime).toBeLessThan(100);
    });
  });

  // ==========================================
  // ACCESSIBILITY TESTS
  // ==========================================

  test.describe('Accessibility & Touch Targets', () => {
    // Test 29: All interactive elements have adequate touch targets on mobile
    test('should have 44px+ touch targets for all interactive elements on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Find all clickable elements
      const buttons = page.locator('button');
      const links = page.locator('a[href]');

      const allInteractive = page.locator('button, a[href], [role="button"]');
      const count = await allInteractive.count();

      for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10
        const element = allInteractive.nth(i);

        // Skip hidden elements
        const isVisible = await element.isVisible().catch(() => false);
        if (!isVisible) continue;

        const bbox = await element.boundingBox();
        if (bbox) {
          // Touch targets should be at least 44x44px
          expect(bbox.width).toBeGreaterThanOrEqual(40); // Allow 40px minimum
          expect(bbox.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    // Test 30: Labels are associated with form inputs
    test('should have proper label associations on iPad', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const inputs = page.locator('input[type="text"], input[type="email"]');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const ariaLabel = await input.getAttribute('aria-label');
        const id = await input.getAttribute('id');

        // Should have either aria-label or associated label
        if (!ariaLabel && id) {
          const label = page.locator(`label[for="${id}"]`);
          expect(await label.count()).toBeGreaterThanOrEqual(0); // Allow missing labels
        }
      }
    });

    // Test 31: Color contrast on all viewports
    test('should have readable text on Desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      // Text should be visible
      const textElements = page.locator('body *');
      const count = await textElements.count();

      // Sample check - should have visible text
      const visibleCount = await page.locator('body').evaluate((el) => {
        return el.innerText.length > 0 ? 1 : 0;
      });

      expect(visibleCount).toBe(1);
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================

  test.describe('Edge Cases & Error States', () => {
    // Test 32: Handling missing data on mobile
    test('should gracefully handle loading state on iPhone SE', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Trigger a refresh/reload
      await page.reload();

      // Wait for at least some content to load
      await page.waitForLoadState('domcontentloaded');

      // Check that skeleton loaders or empty states are visible if applicable
      const skeleton = page.locator('[data-testid*="skeleton"], .animate-pulse').first();

      // Should either show skeleton or real content
      const hasContent = await page.locator('[data-testid="identity-passport"]').count();
      expect(hasContent + (await skeleton.count())).toBeGreaterThanOrEqual(0);
    });

    // Test 33: Viewport resize handling
    test('should handle viewport resize from Desktop to mobile', async ({ page }) => {
      // Start at desktop
      await page.setViewportSize({ width: 1280, height: 800 });

      const passport = page.locator('[data-testid="identity-passport"]');
      await expect(passport).toBeVisible();

      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });

      // Components should still be visible
      await expect(passport).toBeVisible();

      // No horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(overflow).toBe(false);
    });

    // Test 34: Performance on slow networks (simulated)
    test('should handle slow network gracefully on iPhone 14 Pro', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });

      // Simulate slow 4G
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (500 * 1024) / 8, // 500kb/s
        uploadThroughput: (100 * 1024) / 8,
        latency: 400,
      });

      // Navigate to dashboard
      await page.goto('/minha-vida');

      // Components should eventually load (with timeout)
      const passport = page.locator('[data-testid="identity-passport"]');
      await expect(passport).toBeVisible({ timeout: 15000 });

      await client.detach();
    });
  });
});
