import { Page, expect, Locator } from '@playwright/test';

/**
 * AuthSheet Page Object Model
 * Handles interactions with the iOS-style authentication bottom sheet
 */
export class AuthSheetPage {
  readonly page: Page;

  // Locators
  readonly backdrop: Locator;
  readonly sheet: Locator;
  readonly dragHandle: Locator;
  readonly logo: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly googleButton: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly termsText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Sheet structure
    this.backdrop = page.locator('[aria-hidden="true"]').filter({ has: page.locator('[style*="backdrop-filter"]') });
    this.sheet = page.locator('[role="dialog"][aria-modal="true"]');
    this.dragHandle = this.sheet.locator('.cursor-grab, .cursor-grabbing').first();

    // Content elements
    this.logo = this.sheet.locator('img[alt*="logo"], [data-testid="aica-logo"]').or(
      this.sheet.locator('.rounded-2xl').filter({ has: page.locator('img') }).first()
    );
    this.title = this.sheet.locator('h1:has-text("Aica Life OS")');
    this.subtitle = this.sheet.locator('text=Sistema operacional para sua vida');
    this.googleButton = this.sheet.locator('button:has-text("Entrar com Google")');
    this.loadingSpinner = this.sheet.locator('button:has-text("Conectando")');
    this.errorMessage = this.sheet.locator('.ceramic-inset-shallow');
    this.termsText = this.sheet.locator('text=termos de serviço');
  }

  /**
   * Wait for the sheet to be fully visible and animated in
   */
  async waitForSheetOpen() {
    await expect(this.sheet).toBeVisible({ timeout: 5000 });
    // Wait for animation to complete
    await this.page.waitForTimeout(400);
  }

  /**
   * Wait for the sheet to be closed
   */
  async waitForSheetClosed() {
    await expect(this.sheet).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify sheet is fully rendered with all elements
   */
  async expectSheetFullyRendered() {
    await this.waitForSheetOpen();
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.googleButton).toBeVisible();
    await expect(this.termsText).toBeVisible();
  }

  /**
   * Verify the backdrop blur is visible
   */
  async expectBackdropVisible() {
    // Check for any fixed overlay with blur
    const overlay = this.page.locator('.fixed.inset-0.z-40');
    await expect(overlay).toBeVisible();
  }

  /**
   * Close sheet by clicking backdrop
   */
  async closeByBackdropClick() {
    const backdrop = this.page.locator('.fixed.inset-0.z-40').first();
    await backdrop.click({ position: { x: 10, y: 10 } });
    await this.waitForSheetClosed();
  }

  /**
   * Close sheet by pressing Escape key
   */
  async closeByEscapeKey() {
    await this.page.keyboard.press('Escape');
    await this.waitForSheetClosed();
  }

  /**
   * Simulate swipe down gesture to close
   */
  async closeBySwipeDown() {
    const sheetBounds = await this.sheet.boundingBox();
    if (!sheetBounds) throw new Error('Sheet not visible');

    const startX = sheetBounds.x + sheetBounds.width / 2;
    const startY = sheetBounds.y + 50; // Start near drag handle
    const endY = startY + 200; // Swipe down 200px

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX, endY, { steps: 10 });
    await this.page.mouse.up();

    await this.waitForSheetClosed();
  }

  /**
   * Click Google login button
   */
  async clickGoogleLogin() {
    await this.googleButton.click();
  }

  /**
   * Verify loading state is shown
   */
  async expectLoadingState() {
    await expect(this.loadingSpinner).toBeVisible({ timeout: 2000 });
  }

  /**
   * Verify error message is displayed
   */
  async expectErrorVisible(errorText?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (errorText) {
      await expect(this.errorMessage).toContainText(errorText);
    }
  }

  /**
   * Get sheet position for animation testing
   */
  async getSheetPosition() {
    const bounds = await this.sheet.boundingBox();
    return bounds;
  }

  /**
   * Verify sheet has correct ARIA attributes for accessibility
   */
  async expectAccessibleStructure() {
    // Check dialog role
    await expect(this.sheet).toHaveAttribute('role', 'dialog');
    await expect(this.sheet).toHaveAttribute('aria-modal', 'true');

    // Check for accessible title
    const titleId = await this.sheet.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();

    // Verify title element exists
    const titleElement = this.page.locator(`#${titleId}`);
    await expect(titleElement).toBeAttached();
  }

  /**
   * Verify button is keyboard focusable
   */
  async expectKeyboardNavigable() {
    // Tab to the Google button
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');

    // Check if button is focused
    const focusedElement = await this.page.evaluate(() => {
      return document.activeElement?.textContent;
    });

    expect(focusedElement).toContain('Google');
  }

  /**
   * Take screenshot for visual regression testing
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/auth-sheet-${name}.png`,
      fullPage: false
    });
  }
}
