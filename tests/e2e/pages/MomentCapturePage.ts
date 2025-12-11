import { Page, expect } from '@playwright/test';

/**
 * Moment Capture Page Object Model
 * Handles interactions with the moment capture flow (Step 2 of onboarding)
 * Supports: moment type, emotions, life areas, reflection, audio recording
 */
export class MomentCapturePage {
  constructor(private page: Page) {}

  // Selectors
  private readonly selectors = {
    captureContainer: '[data-testid="moment-capture"]',
    stepsIndicator: '[data-testid="capture-steps"]',
    stepNumber: '[data-testid="current-step"]',
    momentTypeSection: '[data-testid="moment-type-selection"]',
    momentTypeButton: '[data-testid="moment-type-btn"]',
    emotionSelector: '[data-testid="emotion-selector"]',
    emotionButton: '[data-testid="emotion-btn"]',
    customEmotion: '[data-testid="custom-emotion-input"]',
    lifeAreaSelection: '[data-testid="life-area-selection"]',
    lifeAreaCheckbox: '[data-testid="life-area-checkbox"]',
    reflectionTextarea: '[data-testid="reflection-textarea"]',
    reflectionInput: 'textarea[placeholder*="reflex" i]',
    socialProof: '[data-testid="social-proof"]',
    audioRecordButton: '[data-testid="audio-record-btn"]',
    audioPlayButton: '[data-testid="audio-play-btn"]',
    reviewSection: '[data-testid="capture-review"]',
    nextStepButton: '[data-testid="next-step-btn"]',
    prevStepButton: '[data-testid="prev-step-btn"]',
    saveButton: '[data-testid="save-moment-btn"]',
    submitButton: 'button:has-text("Salvar")',
    cpPointsNotification: '[data-testid="cp-points-notification"]',
    errorMessage: '[data-testid="error-message"]',
    requiredFieldError: '[data-testid="required-field-error"]',
  };

  /**
   * Wait for capture container to be visible
   */
  async expectPageVisible() {
    const container = this.page.locator(this.selectors.captureContainer);
    await expect(container).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get current step number
   */
  async getCurrentStep(): Promise<number> {
    const stepText = await this.page.locator(this.selectors.stepNumber).textContent();
    const match = stepText?.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  }

  /**
   * Verify we're on step (1-7)
   */
  async expectOnStep(stepNumber: number) {
    const current = await this.getCurrentStep();
    expect(current).toBe(stepNumber);
  }

  /**
   * Verify all 7 steps are shown in indicator
   */
  async expectAllStepsVisible() {
    const stepsIndicator = this.page.locator(this.selectors.stepsIndicator);
    await expect(stepsIndicator).toBeVisible();
    // Should show "1 of 7" or similar
    const text = await stepsIndicator.textContent();
    expect(text).toMatch(/7/);
  }

  /**
   * Get moment type options count
   */
  async getMomentTypeOptionsCount(): Promise<number> {
    const buttons = this.page.locator(this.selectors.momentTypeButton);
    return await buttons.count();
  }

  /**
   * Select moment type by text
   */
  async selectMomentTypeByText(text: string) {
    const button = this.page.locator(this.selectors.momentTypeButton).filter({ hasText: text });
    await expect(button).toBeVisible();
    await button.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Select moment type by index
   */
  async selectMomentTypeByIndex(index: number) {
    const button = this.page.locator(this.selectors.momentTypeButton).nth(index);
    await expect(button).toBeVisible();
    await button.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Get emotion options count
   */
  async getEmotionOptionsCount(): Promise<number> {
    const buttons = this.page.locator(this.selectors.emotionButton);
    return await buttons.count();
  }

  /**
   * Select emotion by text
   */
  async selectEmotionByText(text: string) {
    const button = this.page.locator(this.selectors.emotionButton).filter({ hasText: text });
    await expect(button).toBeVisible();
    await button.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Select emotion by index
   */
  async selectEmotionByIndex(index: number) {
    const button = this.page.locator(this.selectors.emotionButton).nth(index);
    await expect(button).toBeVisible();
    await button.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Enter custom emotion
   */
  async enterCustomEmotion(emotion: string) {
    const input = this.page.locator(this.selectors.customEmotion);
    await expect(input).toBeVisible();
    await input.fill(emotion);
  }

  /**
   * Get life area options count
   */
  async getLifeAreaOptionsCount(): Promise<number> {
    const checkboxes = this.page.locator(this.selectors.lifeAreaCheckbox);
    return await checkboxes.count();
  }

  /**
   * Select life area by text
   */
  async selectLifeAreaByText(text: string) {
    const checkbox = this.page.locator(this.selectors.lifeAreaCheckbox).filter({ hasText: text });
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Select multiple life areas
   */
  async selectMultipleLifeAreas(texts: string[]) {
    for (const text of texts) {
      await this.selectLifeAreaByText(text);
    }
  }

  /**
   * Verify social proof is visible
   */
  async expectSocialProofVisible() {
    const proof = this.page.locator(this.selectors.socialProof);
    await expect(proof).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get social proof text
   */
  async getSocialProofText(): Promise<string | null> {
    const proof = this.page.locator(this.selectors.socialProof);
    return await proof.textContent();
  }

  /**
   * Enter reflection text
   */
  async enterReflection(text: string) {
    const textarea = this.page.locator(this.selectors.reflectionTextarea)
      .or(this.page.locator(this.selectors.reflectionInput));
    await textarea.fill(text);
  }

  /**
   * Get reflection text
   */
  async getReflectionText(): Promise<string> {
    const textarea = this.page.locator(this.selectors.reflectionTextarea)
      .or(this.page.locator(this.selectors.reflectionInput));
    return await textarea.inputValue();
  }

  /**
   * Start audio recording
   */
  async startAudioRecording() {
    const recordButton = this.page.locator(this.selectors.audioRecordButton);
    await expect(recordButton).toBeVisible();
    await recordButton.click();
  }

  /**
   * Stop audio recording
   */
  async stopAudioRecording() {
    const recordButton = this.page.locator(this.selectors.audioRecordButton);
    // Button text/state should change to "stop" or similar
    await recordButton.click();
  }

  /**
   * Play recorded audio
   */
  async playAudio() {
    const playButton = this.page.locator(this.selectors.audioPlayButton);
    await expect(playButton).toBeVisible();
    await playButton.click();
  }

  /**
   * Verify review section is visible (summary before save)
   */
  async expectReviewVisible() {
    const review = this.page.locator(this.selectors.reviewSection);
    await expect(review).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get review summary text
   */
  async getReviewSummary(): Promise<string | null> {
    const review = this.page.locator(this.selectors.reviewSection);
    return await review.textContent();
  }

  /**
   * Move to next step
   */
  async clickNextStep() {
    const nextButton = this.page.locator(this.selectors.nextStepButton);
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Move to previous step
   */
  async clickPreviousStep() {
    const prevButton = this.page.locator(this.selectors.prevStepButton);
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Save the moment
   */
  async saveMoment() {
    const saveButton = this.page.locator(this.selectors.saveButton)
      .or(this.page.locator(this.selectors.submitButton));
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify CP points notification appears
   */
  async expectCPPointsNotification() {
    const notification = this.page.locator(this.selectors.cpPointsNotification);
    await expect(notification).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get CP points earned from notification
   */
  async getCPPointsEarned(): Promise<number> {
    const notification = this.page.locator(this.selectors.cpPointsNotification);
    const text = await notification.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * Verify error message
   */
  async expectErrorMessage(expectedText?: string) {
    const error = this.page.locator(this.selectors.errorMessage)
      .or(this.page.locator(this.selectors.requiredFieldError));
    await expect(error).toBeVisible({ timeout: 3000 });

    if (expectedText) {
      await expect(error).toContainText(expectedText);
    }
  }

  /**
   * Complete entire moment capture flow with all steps
   */
  async completeFullFlow(options: {
    momentType?: string;
    emotion?: string;
    lifeAreas?: string[];
    reflection?: string;
  }) {
    // Step 1: Select moment type
    if (options.momentType) {
      await this.selectMomentTypeByText(options.momentType);
    } else {
      await this.selectMomentTypeByIndex(0);
    }
    await this.clickNextStep();

    // Step 2: Select emotion
    if (options.emotion) {
      await this.selectEmotionByText(options.emotion);
    } else {
      await this.selectEmotionByIndex(0);
    }
    await this.clickNextStep();

    // Step 3: Select life areas
    if (options.lifeAreas && options.lifeAreas.length > 0) {
      await this.selectMultipleLifeAreas(options.lifeAreas);
    } else {
      await this.selectLifeAreaByIndex(0);
    }
    await this.clickNextStep();

    // Step 4: Social proof (just view, no action)
    await this.expectSocialProofVisible();
    await this.clickNextStep();

    // Step 5: Reflection (optional)
    if (options.reflection) {
      await this.enterReflection(options.reflection);
    }
    await this.clickNextStep();

    // Step 6: Audio (skip for now)
    await this.clickNextStep();

    // Step 7: Review and save
    await this.expectReviewVisible();
    await this.saveMoment();
  }

  /**
   * Attempt to save without required fields (should show error)
   */
  async attemptSaveWithoutRequiredFields() {
    const saveButton = this.page.locator(this.selectors.saveButton)
      .or(this.page.locator(this.selectors.submitButton));
    await saveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select life area by index
   */
  async selectLifeAreaByIndex(index: number) {
    const checkbox = this.page.locator(this.selectors.lifeAreaCheckbox).nth(index);
    await expect(checkbox).toBeVisible();
    await checkbox.click();
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `tests/e2e/screenshots/moment-capture-${name}.png` });
  }
}
