import { Page, expect } from '@playwright/test';
import { AuthSheetPage } from './AuthSheetPage';

/**
 * Landing Page Object Model
 * Handles interactions with the landing/home page before authentication
 */
export class LandingPage {
  readonly authSheet: AuthSheetPage;

  constructor(private page: Page) {
    this.authSheet = new AuthSheetPage(page);
  }

  // Selectors
  private readonly selectors = {
    signUpCTA: '[data-testid="landing-signup-cta"]',
    signUpButton: 'button:has-text("Começar")',
    loginCTA: '[data-testid="landing-login-cta"]',
    loginButton: 'button:has-text("Entrar")',
    heroSection: '[data-testid="landing-hero"]',
    pilaresSection: '[data-testid="landing-pilares"]',
    ctaSection: '[data-testid="landing-cta"]',
    authSheet: '[role="dialog"][aria-modal="true"]',
  };

  /**
   * Navigate to landing page
   */
  async goto() {
    await this.page.goto('/', { waitUntil: 'networkidle' });
    await this.expectHeroVisible();
  }

  /**
   * Verify hero section is visible with main content
   */
  async expectHeroVisible() {
    const hero = this.page.locator(this.selectors.heroSection);
    await expect(hero).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify all 4 pilares are visible (Atlas, Jornada, Podcast, Finance)
   */
  async expectPilaresVisible() {
    const pilares = this.page.locator(this.selectors.pilaresSection);
    await expect(pilares).toBeVisible({ timeout: 5000 });

    // Check for individual pilar cards
    const pilarNames = ['Atlas', 'Jornada', 'Podcast', 'Finance'];
    for (const pilar of pilarNames) {
      const pilarCard = this.page.locator(`text=${pilar}`);
      await expect(pilarCard).toBeVisible();
    }
  }

  /**
   * Verify CTA section with buttons is visible
   */
  async expectCTAVisible() {
    const ctaSection = this.page.locator(this.selectors.ctaSection);
    await expect(ctaSection).toBeVisible();
  }

  /**
   * Click the "Começar" (Sign Up) button
   * Opens the AuthSheet instead of navigating to a new page
   */
  async clickSignUpCTA() {
    const cta = this.page.locator(this.selectors.signUpCTA)
      .or(this.page.locator(this.selectors.signUpButton));
    await cta.click();
    // Wait for AuthSheet to open
    await this.authSheet.waitForSheetOpen();
  }

  /**
   * Click the "Entrar" (Login) button
   * Opens the AuthSheet instead of navigating to a new page
   */
  async clickLoginCTA() {
    const cta = this.page.locator(this.selectors.loginCTA)
      .or(this.page.locator(this.selectors.loginButton));
    await cta.click();
    // Wait for AuthSheet to open
    await this.authSheet.waitForSheetOpen();
  }

  /**
   * Open AuthSheet and verify it's fully rendered
   */
  async openAuthSheet() {
    await this.clickSignUpCTA();
    await this.authSheet.expectSheetFullyRendered();
  }

  /**
   * Check if AuthSheet is currently open
   */
  async isAuthSheetOpen(): Promise<boolean> {
    const sheet = this.page.locator(this.selectors.authSheet);
    return await sheet.isVisible().catch(() => false);
  }

  /**
   * Verify landing page is fully loaded
   */
  async expectPageLoaded() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.page).toHaveTitle(/Aica|Home/i);
  }

  /**
   * Check page is responsive - get viewport size
   */
  async getViewportSize() {
    return await this.page.viewportSize();
  }

  /**
   * Scroll down and verify all sections are visible
   */
  async scrollAndVerifyAllSections() {
    await this.expectHeroVisible();
    await this.page.evaluate(() => window.scrollBy(0, 400));
    await this.expectPilaresVisible();
    await this.page.evaluate(() => window.scrollBy(0, 400));
    await this.expectCTAVisible();
  }

  /**
   * Take screenshot for visual comparison
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `tests/e2e/screenshots/landing-${name}.png` });
  }
}
