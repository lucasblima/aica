import { Page, expect } from '@playwright/test';

/**
 * Trail Selection Page Object Model
 * Handles interactions with contextual trails (health-emotional, finance, relationships, growth)
 */
export class TrailSelectionPage {
  constructor(private page: Page) {}

  // Selectors
  private readonly selectors = {
    trailContainer: '[data-testid="trail-selection"]',
    trailsList: '[data-testid="trails-list"]',
    trailCard: '[data-testid="trail-card"]',
    trailName: '[data-testid="trail-name"]',
    trailDescription: '[data-testid="trail-description"]',
    trailIcon: '[data-testid="trail-icon"]',
    selectTrailButton: '[data-testid="select-trail-btn"]',
    skipTrailButton: '[data-testid="skip-trail-btn"]',
    questionsContainer: '[data-testid="trail-questions"]',
    questionCard: '[data-testid="question-card"]',
    questionText: '[data-testid="question-text"]',
    answerOption: '[data-testid="answer-option"]',
    singleChoiceInput: 'input[type="radio"]',
    multipleChoiceInput: 'input[type="checkbox"]',
    nextQuestionButton: '[data-testid="next-question-btn"]',
    prevQuestionButton: '[data-testid="prev-question-btn"]',
    completeTrailButton: '[data-testid="complete-trail-btn"]',
    scoreDisplay: '[data-testid="trail-score"]',
    progressBar: '[data-testid="trail-progress"]',
    requiredFieldError: '[data-testid="required-field-error"]',
  };

  /**
   * Wait for trail selection page to load
   */
  async expectPageVisible() {
    const page = this.page.locator(this.selectors.trailContainer);
    await expect(page).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get count of available trails
   */
  async getTrailCount(): Promise<number> {
    const trails = this.page.locator(this.selectors.trailCard);
    return await trails.count();
  }

  /**
   * Verify expected number of trails are displayed
   */
  async expectTrailCount(expectedCount: number) {
    const trails = this.page.locator(this.selectors.trailCard);
    await expect(trails).toHaveCount(expectedCount, { timeout: 5000 });
  }

  /**
   * Get trail name by index
   */
  async getTrailName(index: number): Promise<string | null> {
    const trail = this.page.locator(this.selectors.trailCard).nth(index);
    const name = await trail.locator(this.selectors.trailName).textContent();
    return name;
  }

  /**
   * Select a trail by index
   */
  async selectTrailByIndex(index: number) {
    const trail = this.page.locator(this.selectors.trailCard).nth(index);
    const selectButton = trail.locator(this.selectors.selectTrailButton);
    await expect(selectButton).toBeVisible();
    await selectButton.click();
    await this.page.waitForTimeout(300); // Animation time
  }

  /**
   * Select a trail by name
   */
  async selectTrailByName(name: string) {
    const trail = this.page.locator(this.selectors.trailCard).filter({ hasText: name });
    const selectButton = trail.locator(this.selectors.selectTrailButton);
    await expect(selectButton).toBeVisible();
    await selectButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Skip a trail
   */
  async skipTrail() {
    const skipButton = this.page.locator(this.selectors.skipTrailButton);
    await expect(skipButton).toBeVisible();
    await skipButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Expect questions container to be visible (trail expanded)
   */
  async expectQuestionsVisible() {
    const questions = this.page.locator(this.selectors.questionsContainer);
    await expect(questions).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get current question text
   */
  async getCurrentQuestionText(): Promise<string | null> {
    const text = await this.page.locator(this.selectors.questionText).first().textContent();
    return text;
  }

  /**
   * Get count of answer options for current question
   */
  async getAnswerOptionCount(): Promise<number> {
    const options = this.page.locator(this.selectors.answerOption);
    return await options.count();
  }

  /**
   * Select a single choice answer by option text
   */
  async selectSingleChoiceByText(optionText: string) {
    const option = this.page.locator(this.selectors.answerOption).filter({ hasText: optionText });
    await expect(option).toBeVisible();
    await option.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Select a single choice answer by index
   */
  async selectSingleChoiceByIndex(index: number) {
    const option = this.page.locator(this.selectors.answerOption).nth(index);
    await expect(option).toBeVisible();
    await option.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Select multiple choice options by text array
   */
  async selectMultipleChoices(optionTexts: string[]) {
    for (const text of optionTexts) {
      const option = this.page.locator(this.selectors.answerOption).filter({ hasText: text });
      await expect(option).toBeVisible();
      await option.click();
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Select multiple choice options by indices
   */
  async selectMultipleChoicesByIndices(indices: number[]) {
    for (const index of indices) {
      const option = this.page.locator(this.selectors.answerOption).nth(index);
      await expect(option).toBeVisible();
      await option.click();
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Click next question button
   */
  async clickNextQuestion() {
    const nextButton = this.page.locator(this.selectors.nextQuestionButton);
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Click previous question button
   */
  async clickPreviousQuestion() {
    const prevButton = this.page.locator(this.selectors.prevQuestionButton);
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete trail (click finish button)
   */
  async completeTrail() {
    const completeButton = this.page.locator(this.selectors.completeTrailButton);
    await expect(completeButton).toBeVisible();
    await completeButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify required field error is shown
   */
  async expectRequiredFieldError() {
    const error = this.page.locator(this.selectors.requiredFieldError);
    await expect(error).toBeVisible({ timeout: 3000 });
  }

  /**
   * Try to complete trail without selecting required answer (should show error)
   */
  async attemptCompleteWithoutAnswer() {
    const completeButton = this.page.locator(this.selectors.completeTrailButton);
    await completeButton.click();
    // Wait for potential error
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current score display
   */
  async getTrailScore(): Promise<string | null> {
    const scoreDisplay = this.page.locator(this.selectors.scoreDisplay);
    const score = await scoreDisplay.textContent();
    return score;
  }

  /**
   * Verify progress bar is visible and updated
   */
  async expectProgressBarUpdated() {
    const progressBar = this.page.locator(this.selectors.progressBar);
    await expect(progressBar).toBeVisible();

    // Get progress value
    const ariaValue = await progressBar.getAttribute('aria-valuenow');
    expect(ariaValue).toBeTruthy();
  }

  /**
   * Complete entire trail with random answers (for quick testing)
   */
  async completeTrailWithRandomAnswers() {
    await this.expectQuestionsVisible();

    let questionIndex = 0;
    while (true) {
      // Check if we're on the last question
      const nextButton = this.page.locator(this.selectors.nextQuestionButton).isVisible({ timeout: 1000 }).catch(() => false);

      // Get answer options count
      const optionCount = await this.getAnswerOptionCount();

      if (optionCount > 0) {
        // Randomly select an option
        const randomIndex = Math.floor(Math.random() * optionCount);
        await this.selectSingleChoiceByIndex(randomIndex);

        // Move to next question if available
        if (await nextButton) {
          await this.clickNextQuestion();
        } else {
          // Last question, complete trail
          await this.completeTrail();
          break;
        }
      }

      questionIndex++;
      if (questionIndex > 20) break; // Safety check to prevent infinite loop
    }
  }

  /**
   * Answer all questions in a trail with specific answers
   */
  async answerQuestions(answers: (string | number)[]) {
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];

      if (typeof answer === 'string') {
        await this.selectSingleChoiceByText(answer);
      } else {
        await this.selectSingleChoiceByIndex(answer);
      }

      // Move to next question if not the last one
      if (i < answers.length - 1) {
        await this.clickNextQuestion();
      }
    }

    // Complete trail on last answer
    await this.completeTrail();
  }

  /**
   * Get all visible answer options text
   */
  async getAllAnswerOptions(): Promise<string[]> {
    const options = this.page.locator(this.selectors.answerOption);
    const count = await options.count();
    const texts: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) texts.push(text);
    }

    return texts;
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `tests/e2e/screenshots/trail-${name}.png` });
  }
}
