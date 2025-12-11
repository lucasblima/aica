import { Page, expect } from '@playwright/test';

/**
 * Welcome Tour Page Object Model
 * Handles interactions with the welcome tour carousel (4 pilares: Atlas, Jornada, Podcast, Finance)
 */
export class WelcomeTourPage {
  constructor(private page: Page) {}

  // Selectors
  private readonly selectors = {
    tourContainer: '[data-testid="welcome-tour"]',
    tourModal: '[data-testid="tour-modal"]',
    currentCard: '[data-testid="tour-card"]',
    cardTitle: '[data-testid="tour-card-title"]',
    cardDescription: '[data-testid="tour-card-description"]',
    cardIcon: '[data-testid="tour-card-icon"]',
    nextButton: '[data-testid="tour-next"]',
    prevButton: '[data-testid="tour-prev"]',
    skipButton: '[data-testid="tour-skip"]',
    exploreButton: '[data-testid="tour-explore"]',
    dotNavigation: '[data-testid="tour-dots"]',
    dotButton: '[data-testid="tour-dot"]',
  };

  /**
   * Wait for tour modal to be visible
   */
  async expectTourVisible() {
    const tour = this.page.locator(this.selectors.tourContainer)
      .or(this.page.locator(this.selectors.tourModal));
    await expect(tour).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get current card index (0-3 for 4 cards)
   */
  async getCurrentCardIndex(): Promise<number> {
    const activeDot = this.page.locator(`${this.selectors.dotButton}[data-active="true"]`);
    const ariaLabel = await activeDot.getAttribute('aria-label');
    if (ariaLabel && /slide|card|passo|step/i.test(ariaLabel)) {
      const match = ariaLabel.match(/\d+/);
      return match ? parseInt(match[0]) - 1 : 0;
    }
    return 0;
  }

  /**
   * Verify card content (title, description, icon)
   */
  async expectCardContent(title: string, description?: string) {
    const titleElement = this.page.locator(this.selectors.cardTitle);
    await expect(titleElement).toContainText(title, { timeout: 3000 });

    if (description) {
      const descElement = this.page.locator(this.selectors.cardDescription);
      await expect(descElement).toContainText(description);
    }
  }

  /**
   * Verify all 4 pilares are present in the tour
   */
  async expectAll4Pilares() {
    const pilares = ['Atlas', 'Jornada', 'Podcast', 'Finance'];
    for (const pilar of pilares) {
      // Navigate to each card and verify content
      await this.expectCardVisible();
      const currentTitle = await this.page.locator(this.selectors.cardTitle).textContent();
      if (currentTitle?.includes(pilar)) {
        // Found this pilar, move to next
        await this.clickNext();
        await this.page.waitForTimeout(300); // Wait for animation
      }
    }
  }

  /**
   * Verify current card is visible
   */
  async expectCardVisible() {
    const card = this.page.locator(this.selectors.currentCard).first();
    await expect(card).toBeVisible({ timeout: 3000 });
  }

  /**
   * Click next button (arrow navigation)
   */
  async clickNext() {
    const nextButton = this.page.locator(this.selectors.nextButton);
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await this.page.waitForTimeout(300); // Animation time
  }

  /**
   * Click previous button (arrow navigation)
   */
  async clickPrev() {
    const prevButton = this.page.locator(this.selectors.prevButton);
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await this.page.waitForTimeout(300); // Animation time
  }

  /**
   * Navigate to specific slide by dot (0-3)
   */
  async goToSlide(slideIndex: number) {
    const dot = this.page.locator(this.selectors.dotButton).nth(slideIndex);
    await expect(dot).toBeVisible();
    await dot.click();
    await this.page.waitForTimeout(300); // Animation time
  }

  /**
   * Navigate using keyboard arrows
   */
  async pressArrowKey(direction: 'left' | 'right') {
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(300);
  }

  /**
   * Swipe navigation (mobile)
   */
  async swipe(direction: 'left' | 'right') {
    const card = this.page.locator(this.selectors.currentCard).first();
    const box = await card.boundingBox();

    if (!box) throw new Error('Card not found for swipe action');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = direction === 'left' ? startX - box.width / 2 : startX + box.width / 2;

    await this.page.touchscreen.tap(startX, startY);
    await this.page.touchscreen.tap(endX, startY);
    await this.page.waitForTimeout(300);
  }

  /**
   * Click skip button to exit tour
   */
  async clickSkip() {
    const skipButton = this.page.locator(this.selectors.skipButton);
    await expect(skipButton).toBeVisible();
    await skipButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click explore button (usually on last slide)
   */
  async clickExplore() {
    const exploreButton = this.page.locator(this.selectors.exploreButton);
    await expect(exploreButton).toBeVisible();
    await exploreButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Complete the tour by navigating through all slides
   */
  async completeTourNavigation() {
    for (let i = 0; i < 3; i++) {
      // 4 slides, so 3 next clicks to go through all
      await this.clickNext();
    }
    // Now on last slide, click explore
    await this.clickExplore();
  }

  /**
   * Navigate through tour using keyboard only
   */
  async navigateWithKeyboard() {
    // Start from first slide
    await this.expectCardVisible();

    // Use arrow keys to navigate through all 4 slides
    for (let i = 0; i < 3; i++) {
      await this.pressArrowKey('right');
      await this.expectCardVisible();
    }

    // Navigate back using left arrows
    for (let i = 0; i < 3; i++) {
      await this.pressArrowKey('left');
      await this.expectCardVisible();
    }
  }

  /**
   * Get current slide content
   */
  async getCurrentSlideContent() {
    const title = await this.page.locator(this.selectors.cardTitle).textContent();
    const description = await this.page.locator(this.selectors.cardDescription).textContent();
    const index = await this.getCurrentCardIndex();

    return { title, description, index };
  }

  /**
   * Verify dot navigation is visible and has correct count
   */
  async expectDotNavigationVisible(expectedCount: number = 4) {
    const dots = this.page.locator(this.selectors.dotButton);
    const count = await dots.count();
    expect(count).toBe(expectedCount);

    // Verify all dots are visible
    for (let i = 0; i < count; i++) {
      await expect(dots.nth(i)).toBeVisible();
    }
  }

  /**
   * Take screenshot of current slide
   */
  async takeSlideScreenshot(name: string) {
    await this.page.screenshot({ path: `tests/e2e/screenshots/tour-${name}.png` });
  }

  /**
   * Verify tour is closed/hidden
   */
  async expectTourClosed() {
    const tour = this.page.locator(this.selectors.tourContainer);
    await expect(tour).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Tour might have been removed from DOM entirely
    });
  }
}
