/**
 * E2E Tests for Contact Cards Visibility
 *
 * Tests that contact cards remain visible and stable across different scenarios:
 * - After WhatsApp sync completes
 * - After page refresh
 * - After navigation away and back
 * - Click events work on all cards
 *
 * Issue #92: Rich WhatsApp Contact UI - Phase 1
 * PR #149: https://github.com/lucasblima/Aica_frontend/pull/149
 *
 * Architecture Decision: ContactCardGrid uses no parent-level Framer Motion animations
 * to prevent invisible card issues caused by animation conflicts.
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'contacttest@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';
const CONTACTS_PAGE_URL = `${BASE_URL}/contacts`;

// ============================================
// PAGE OBJECT MODEL
// ============================================

class ContactsPagePO {
  constructor(private page: Page) {}

  // Navigation
  async navigateToContactsPage() {
    await this.page.goto(CONTACTS_PAGE_URL);
    await this.page.waitForLoadState('networkidle');
  }

  async refreshPage() {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  // Loading state
  async waitForContactCardsToLoad() {
    // Wait for either contact cards or empty state to appear
    await Promise.race([
      this.page.waitForSelector('[data-testid="contact-card"]', { timeout: 10000 }),
      this.page.waitForSelector('[data-testid="empty-state"]', { timeout: 10000 }),
    ]);
  }

  // Contact card interactions
  async getVisibleContactCards() {
    return this.page.locator('[data-testid="contact-card"]');
  }

  async getContactCardCount(): Promise<number> {
    const cards = await this.getVisibleContactCards();
    return await cards.count();
  }

  async clickContactCard(index: number = 0) {
    const cards = await this.getVisibleContactCards();
    await cards.nth(index).click();
  }

  async isContactDetailModalVisible(): Promise<boolean> {
    const modal = this.page.locator('[data-testid="contact-detail-modal"]');
    return await modal.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async closeContactDetailModal() {
    const closeButton = this.page.locator('[data-testid="modal-close-button"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await this.page.waitForTimeout(300); // Wait for modal animation
    }
  }

  // Grid verification
  async verifyGridLayout() {
    const gridContainer = this.page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3');
    await expect(gridContainer).toBeVisible();
  }

  // Empty state
  async isEmptyStateVisible(): Promise<boolean> {
    const emptyState = this.page.locator('[data-testid="empty-state"]');
    return await emptyState.isVisible();
  }

  async getEmptyStateMessage(): Promise<string | null> {
    const emptyState = this.page.locator('[data-testid="empty-state"]');
    if (await emptyState.isVisible()) {
      return await emptyState.textContent();
    }
    return null;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function loginUser(page: Page, email: string, password: string) {
  await page.goto(BASE_URL);

  const emailInput = await page.locator('input[type="email"]').first();
  const passwordInput = await page.locator('input[type="password"]').first();
  const submitBtn = await page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 15000 });
}

async function logoutUser(page: Page) {
  try {
    await page.click('[data-testid="settings-menu-button"]');
    await page.click('[data-testid="logout-btn"]');
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
  } catch (error) {
    // Fallback: navigate directly to login
    await page.goto(`${BASE_URL}/login`);
  }
}

// ============================================
// TEST SUITE
// ============================================

test.describe('Contact Cards Visibility - Stability Tests', () => {
  let contactsPage: ContactsPagePO;

  test.beforeEach(async ({ page }) => {
    contactsPage = new ContactsPagePO(page);
    await loginUser(page, TEST_USER.email, TEST_USER.password);
  });

  test.afterEach(async ({ page }) => {
    await logoutUser(page);
  });

  // ============================================
  // SUITE 1: Initial Rendering
  // ============================================

  test('should render contact cards after page load', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    // Verify grid layout is present
    await contactsPage.verifyGridLayout();

    // Check if we have cards or empty state
    const cardCount = await contactsPage.getContactCardCount();
    const isEmpty = await contactsPage.isEmptyStateVisible();

    // Either cards should be visible OR empty state should be visible
    expect(cardCount > 0 || isEmpty).toBe(true);
  });

  test('should render contact cards with stable visibility', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCount = await contactsPage.getContactCardCount();

    if (cardCount > 0) {
      // Wait 2 seconds and verify cards are still visible
      await page.waitForTimeout(2000);
      const cardCountAfterWait = await contactsPage.getContactCardCount();

      expect(cardCountAfterWait).toBe(cardCount);

      // Verify all cards have visible content (not invisible due to animation)
      const cards = await contactsPage.getVisibleContactCards();
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        await expect(card).toBeVisible();

        // Verify card has actual content (not just placeholder)
        const cardContent = await card.textContent();
        expect(cardContent).not.toBe('');
      }
    }
  });

  test('should not have parent-level motion.div animations', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    // Verify grid container is a standard div, not motion.div
    const gridContainer = page.locator('.grid.grid-cols-1');
    await expect(gridContainer).toBeVisible();

    // The grid should not have framer-motion attributes
    const hasMotionAttributes = await gridContainer.evaluate((el) => {
      return el.hasAttribute('data-framer-appear-id') ||
             el.hasAttribute('data-framer-motion-id') ||
             el.hasAttribute('data-framer');
    });

    expect(hasMotionAttributes).toBe(false);
  });

  // ============================================
  // SUITE 2: Page Refresh Stability
  // ============================================

  test('should maintain contact cards visibility after page refresh', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const initialCardCount = await contactsPage.getContactCardCount();

    // Refresh page
    await contactsPage.refreshPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCountAfterRefresh = await contactsPage.getContactCardCount();

    // Cards should still be visible
    expect(cardCountAfterRefresh).toBe(initialCardCount);
  });

  test('should render cards quickly after refresh (no long flash)', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const initialCardCount = await contactsPage.getContactCardCount();

    if (initialCardCount > 0) {
      // Measure time until cards reappear after refresh
      const startTime = Date.now();
      await contactsPage.refreshPage();
      await contactsPage.waitForContactCardsToLoad();
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      const cardCountAfterRefresh = await contactsPage.getContactCardCount();
      expect(cardCountAfterRefresh).toBe(initialCardCount);
    }
  });

  // ============================================
  // SUITE 3: Navigation Stability
  // ============================================

  test('should maintain contact cards after navigating away and back', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const initialCardCount = await contactsPage.getContactCardCount();

    // Navigate to another page (e.g., dashboard)
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate back to contacts
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCountAfterNavigation = await contactsPage.getContactCardCount();

    // Cards should still be visible
    expect(cardCountAfterNavigation).toBe(initialCardCount);
  });

  test('should maintain cards after browser back/forward', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const initialCardCount = await contactsPage.getContactCardCount();

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Use browser back button
    await page.goBack();
    await contactsPage.waitForContactCardsToLoad();

    const cardCountAfterBack = await contactsPage.getContactCardCount();
    expect(cardCountAfterBack).toBe(initialCardCount);

    // Use browser forward button
    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Go back again
    await page.goBack();
    await contactsPage.waitForContactCardsToLoad();

    const cardCountAfterForwardBack = await contactsPage.getContactCardCount();
    expect(cardCountAfterForwardBack).toBe(initialCardCount);
  });

  // ============================================
  // SUITE 4: Click Interactions
  // ============================================

  test('should handle contact card clicks', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCount = await contactsPage.getContactCardCount();

    if (cardCount > 0) {
      // Click first contact card
      await contactsPage.clickContactCard(0);

      // Modal should open
      const isModalVisible = await contactsPage.isContactDetailModalVisible();
      expect(isModalVisible).toBe(true);

      // Close modal
      await contactsPage.closeContactDetailModal();
    }
  });

  test('should handle clicks on multiple contact cards', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCount = await contactsPage.getContactCardCount();

    if (cardCount >= 2) {
      // Click first card
      await contactsPage.clickContactCard(0);
      expect(await contactsPage.isContactDetailModalVisible()).toBe(true);
      await contactsPage.closeContactDetailModal();

      // Wait for modal close animation
      await page.waitForTimeout(300);

      // Click second card
      await contactsPage.clickContactCard(1);
      expect(await contactsPage.isContactDetailModalVisible()).toBe(true);
      await contactsPage.closeContactDetailModal();
    }
  });

  test('should maintain cards visibility after clicking and closing modal', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCount = await contactsPage.getContactCardCount();

    if (cardCount > 0) {
      // Click card and open modal
      await contactsPage.clickContactCard(0);
      await contactsPage.isContactDetailModalVisible();
      await contactsPage.closeContactDetailModal();

      // Wait for modal animation
      await page.waitForTimeout(500);

      // Verify all cards are still visible
      const cardCountAfterModal = await contactsPage.getContactCardCount();
      expect(cardCountAfterModal).toBe(cardCount);

      // Verify cards are actually visible (not invisible)
      const cards = await contactsPage.getVisibleContactCards();
      for (let i = 0; i < cardCount; i++) {
        await expect(cards.nth(i)).toBeVisible();
      }
    }
  });

  // ============================================
  // SUITE 5: Empty States
  // ============================================

  test('should display appropriate empty state when no contacts', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const cardCount = await contactsPage.getContactCardCount();
    const isEmpty = await contactsPage.isEmptyStateVisible();

    if (cardCount === 0) {
      // Empty state should be visible
      expect(isEmpty).toBe(true);

      // Empty state should have message
      const message = await contactsPage.getEmptyStateMessage();
      expect(message).not.toBe('');
      expect(message).not.toBeNull();
    } else {
      // Cards should be visible
      expect(cardCount).toBeGreaterThan(0);
      expect(isEmpty).toBe(false);
    }
  });

  // ============================================
  // SUITE 6: Performance & Regression Tests
  // ============================================

  test('should not show flashing/disappearing cards on load', async ({ page }) => {
    await contactsPage.navigateToContactsPage();

    // Start monitoring card count
    const cardCountChecks: number[] = [];

    // Check card count every 100ms for 2 seconds
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      const count = await contactsPage.getContactCardCount();
      cardCountChecks.push(count);
    }

    // If cards exist, count should be stable (not jumping around)
    const uniqueCounts = [...new Set(cardCountChecks)];

    // After initial load, count shouldn't change more than once
    // (0 to N is acceptable, but not N to 0 to N)
    if (uniqueCounts.includes(0) && uniqueCounts.some(n => n > 0)) {
      // If we have both 0 and non-zero, they should appear consecutively
      // Find first non-zero index
      const firstNonZero = cardCountChecks.findIndex(n => n > 0);

      // All subsequent checks should maintain that count
      const subsequentChecks = cardCountChecks.slice(firstNonZero);
      const subsequentUnique = [...new Set(subsequentChecks)];

      // Should only have one unique non-zero value after cards appear
      expect(subsequentUnique.length).toBe(1);
    }
  });

  test('should render cards within 2 seconds of page load', async ({ page }) => {
    const startTime = Date.now();

    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const loadTime = Date.now() - startTime;

    // Cards or empty state should appear within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should not lose cards during rapid navigation', async ({ page }) => {
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();
    const initialCount = await contactsPage.getContactCardCount();

    // Rapid navigation
    await page.goto(`${BASE_URL}/`);
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const countAfterFirst = await contactsPage.getContactCardCount();
    expect(countAfterFirst).toBe(initialCount);

    // Second rapid navigation
    await page.goto(`${BASE_URL}/`);
    await contactsPage.navigateToContactsPage();
    await contactsPage.waitForContactCardsToLoad();

    const countAfterSecond = await contactsPage.getContactCardCount();
    expect(countAfterSecond).toBe(initialCount);
  });
});

test.describe('Contact Cards - Architecture Validation', () => {
  test('should use ContactCardGrid component', async ({ page }) => {
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await page.goto(CONTACTS_PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Verify grid structure exists (from ContactCardGrid)
    const grid = page.locator('.grid.gap-4');
    await expect(grid).toBeVisible();
  });

  test('should have stable DOM structure without animation wrappers', async ({ page }) => {
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await page.goto(CONTACTS_PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Grid should be a plain div, not wrapped in motion.div
    const hasStableStructure = await page.evaluate(() => {
      const grid = document.querySelector('.grid.gap-4');
      if (!grid) return false;

      // Parent of grid should not have framer-motion attributes
      const parent = grid.parentElement;
      if (!parent) return true;

      return !parent.hasAttribute('data-framer-appear-id') &&
             !parent.hasAttribute('data-framer-motion-id');
    });

    expect(hasStableStructure).toBe(true);
  });
});
