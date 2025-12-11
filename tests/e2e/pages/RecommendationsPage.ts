import { Page, expect } from '@playwright/test';

/**
 * Recommendations Page Object Model
 * Handles interactions with module recommendations page
 * Allows users to accept/reject recommended modules with feedback
 */
export class RecommendationsPage {
  constructor(private page: Page) {}

  // Selectors
  private readonly selectors = {
    recommendationsContainer: '[data-testid="recommendations"]',
    recommendationCard: '[data-testid="recommendation-card"]',
    moduleTitle: '[data-testid="module-title"]',
    moduleDescription: '[data-testid="module-description"]',
    confidenceScore: '[data-testid="confidence-score"]',
    acceptButton: '[data-testid="accept-recommendation-btn"]',
    rejectButton: '[data-testid="reject-recommendation-btn"]',
    feedbackModal: '[data-testid="feedback-modal"]',
    feedbackQuestion: '[data-testid="feedback-question"]',
    feedbackOptions: '[data-testid="feedback-option"]',
    submitFeedbackButton: '[data-testid="submit-feedback-btn"]',
    closeFeedbackButton: '[data-testid="close-feedback-btn"]',
    emptyState: '[data-testid="no-recommendations"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    recommendationsCount: '[data-testid="recommendations-count"]',
    continueButton: '[data-testid="continue-btn"]',
    skipRecommendationsButton: '[data-testid="skip-recommendations-btn"]',
  };

  /**
   * Wait for recommendations page to load
   */
  async expectPageVisible() {
    const container = this.page.locator(this.selectors.recommendationsContainer);
    await expect(container).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for loading to complete
   */
  async waitForRecommendationsLoaded() {
    const loading = this.page.locator(this.selectors.loadingSpinner);
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // No loading spinner, recommendations might be already visible
    });
  }

  /**
   * Get count of recommendation cards
   */
  async getRecommendationCount(): Promise<number> {
    const cards = this.page.locator(this.selectors.recommendationCard);
    return await cards.count();
  }

  /**
   * Verify recommendations count does not exceed 6
   */
  async expectRecommendationCountMax6() {
    const count = await this.getRecommendationCount();
    expect(count).toBeLessThanOrEqual(6);
  }

  /**
   * Get recommendation card title by index
   */
  async getRecommendationTitle(index: number): Promise<string | null> {
    const card = this.page.locator(this.selectors.recommendationCard).nth(index);
    const title = await card.locator(this.selectors.moduleTitle).textContent();
    return title;
  }

  /**
   * Get recommendation card description by index
   */
  async getRecommendationDescription(index: number): Promise<string | null> {
    const card = this.page.locator(this.selectors.recommendationCard).nth(index);
    const desc = await card.locator(this.selectors.moduleDescription).textContent();
    return desc;
  }

  /**
   * Get confidence score for recommendation
   */
  async getConfidenceScore(index: number): Promise<string | null> {
    const card = this.page.locator(this.selectors.recommendationCard).nth(index);
    const score = await card.locator(this.selectors.confidenceScore).textContent();
    return score;
  }

  /**
   * Verify confidence score is displayed as percentage
   */
  async expectConfidenceScoreVisible(index: number) {
    const card = this.page.locator(this.selectors.recommendationCard).nth(index);
    const score = card.locator(this.selectors.confidenceScore);
    await expect(score).toBeVisible();

    const text = await score.textContent();
    expect(text).toMatch(/\d+%/);
  }

  /**
   * Accept recommendation by index
   */
  async acceptRecommendationByIndex(index: number) {
    const card = this.page.locator(this.selectors.recommendationCard).nth(index);
    const acceptButton = card.locator(this.selectors.acceptButton);
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Accept recommendation by title
   */
  async acceptRecommendationByTitle(title: string) {
    const card = this.page.locator(this.selectors.recommendationCard).filter({ hasText: title });
    const acceptButton = card.locator(this.selectors.acceptButton);
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reject recommendation by index
   */
  async rejectRecommendationByIndex(index: number) {
    const card = this.page.locator(this.selectors.recommendationCard).nth(index);
    const rejectButton = card.locator(this.selectors.rejectButton);
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Reject recommendation by title
   */
  async rejectRecommendationByTitle(title: string) {
    const card = this.page.locator(this.selectors.recommendationCard).filter({ hasText: title });
    const rejectButton = card.locator(this.selectors.rejectButton);
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for feedback modal to appear
   */
  async expectFeedbackModalVisible() {
    const modal = this.page.locator(this.selectors.feedbackModal);
    await expect(modal).toBeVisible({ timeout: 3000 });
  }

  /**
   * Get feedback question text
   */
  async getFeedbackQuestion(): Promise<string | null> {
    const question = this.page.locator(this.selectors.feedbackQuestion);
    return await question.textContent();
  }

  /**
   * Get count of feedback options
   */
  async getFeedbackOptionsCount(): Promise<number> {
    const options = this.page.locator(this.selectors.feedbackOptions);
    return await options.count();
  }

  /**
   * Select feedback option by text
   */
  async selectFeedbackByText(text: string) {
    const option = this.page.locator(this.selectors.feedbackOptions).filter({ hasText: text });
    await expect(option).toBeVisible();
    await option.click();
  }

  /**
   * Select feedback option by index
   */
  async selectFeedbackByIndex(index: number) {
    const option = this.page.locator(this.selectors.feedbackOptions).nth(index);
    await expect(option).toBeVisible();
    await option.click();
  }

  /**
   * Submit feedback
   */
  async submitFeedback() {
    const submitButton = this.page.locator(this.selectors.submitFeedbackButton);
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Close feedback modal without submitting
   */
  async closeFeedbackModal() {
    const closeButton = this.page.locator(this.selectors.closeFeedbackButton);
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete rejection flow: reject -> select feedback -> submit
   */
  async rejectAndProvideFeedback(recommendationIndex: number, feedbackIndex: number) {
    await this.rejectRecommendationByIndex(recommendationIndex);
    await this.expectFeedbackModalVisible();
    await this.selectFeedbackByIndex(feedbackIndex);
    await this.submitFeedback();
  }

  /**
   * Verify empty state when no recommendations
   */
  async expectEmptyState() {
    const empty = this.page.locator(this.selectors.emptyState);
    await expect(empty).toBeVisible({ timeout: 5000 });
  }

  /**
   * Click continue button to proceed
   */
  async clickContinue() {
    const continueButton = this.page.locator(this.selectors.continueButton);
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Skip recommendations and continue
   */
  async skipRecommendations() {
    const skipButton = this.page.locator(this.selectors.skipRecommendationsButton);
    const hasSkip = await skipButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSkip) {
      await skipButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Accept all displayed recommendations
   */
  async acceptAllRecommendations() {
    const count = await this.getRecommendationCount();

    for (let i = 0; i < count; i++) {
      // Refetch each time as DOM changes
      const currentCount = await this.getRecommendationCount();
      if (i < currentCount) {
        await this.acceptRecommendationByIndex(0); // Always accept first since others move up
        await this.page.waitForTimeout(300);
      }
    }
  }

  /**
   * Reject all displayed recommendations
   */
  async rejectAllRecommendations() {
    const count = await this.getRecommendationCount();

    for (let i = 0; i < count; i++) {
      const currentCount = await this.getRecommendationCount();
      if (currentCount > 0) {
        await this.rejectRecommendationByIndex(0);
        await this.expectFeedbackModalVisible();
        await this.selectFeedbackByIndex(0);
        await this.submitFeedback();
        await this.page.waitForTimeout(300);
      }
    }
  }

  /**
   * Verify all recommendations have confidence scores
   */
  async expectAllRecommendationsHaveScores() {
    const count = await this.getRecommendationCount();

    for (let i = 0; i < count; i++) {
      const score = await this.getConfidenceScore(i);
      expect(score).toBeTruthy();
      expect(score).toMatch(/\d+%/);
    }
  }

  /**
   * Get all recommendation titles
   */
  async getAllRecommendationTitles(): Promise<(string | null)[]> {
    const count = await this.getRecommendationCount();
    const titles: (string | null)[] = [];

    for (let i = 0; i < count; i++) {
      const title = await this.getRecommendationTitle(i);
      titles.push(title);
    }

    return titles;
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `tests/e2e/screenshots/recommendations-${name}.png` });
  }
}
