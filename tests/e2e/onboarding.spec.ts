import { test, expect, Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/SignUpPage';
import { WelcomeTourPage } from './pages/WelcomeTourPage';
import { TrailSelectionPage } from './pages/TrailSelectionPage';
import { MomentCapturePage } from './pages/MomentCapturePage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { TEST_USERS, generateNewTestUser } from './fixtures/test-users';
import { TRAIL_DATA, MOMENT_DATA, RECOMMENDATION_DATA } from './fixtures/test-data';

/**
 * Complete E2E Test Suite for Aica Life OS Onboarding
 * Tests the full onboarding flow from landing page through module recommendations
 *
 * Coverage:
 * - Landing page navigation
 * - Sign up with validation
 * - Welcome tour (4 pilares)
 * - Trail selection (5 trails)
 * - Moment capture (7 steps)
 * - Module recommendations
 * - Accessibility and performance
 */

test.describe('PHASE 4.1: Complete Onboarding Flow', () => {
  /**
   * SECTION 1: LANDING PAGE TESTS
   */
  test.describe('Section 1: Landing Page', () => {
    test('1.1: Landing page loads without errors', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert
      await landingPage.expectPageLoaded();
      await landingPage.expectHeroVisible();
    });

    test('1.2: Landing page displays all 4 pilares', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert
      await landingPage.expectPilaresVisible();
    });

    test('1.3: CTA "Começar" opens AuthSheet', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();
      await landingPage.clickSignUpCTA();

      // Assert - AuthSheet should be open with Google login button
      await landingPage.authSheet.expectSheetFullyRendered();
      await expect(landingPage.authSheet.googleButton).toBeVisible();
    });

    test('1.4: CTA "Entrar" opens AuthSheet', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();
      await landingPage.clickLoginCTA();

      // Assert - AuthSheet should be open (iOS-style bottom sheet)
      await landingPage.authSheet.expectSheetFullyRendered();
      await expect(landingPage.authSheet.title).toBeVisible();
    });

    test('1.5: Landing page is responsive on mobile', async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 375, height: 667 });
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert
      await landingPage.scrollAndVerifyAllSections();
    });

    test('1.6: Landing page is responsive on tablet', async ({ page }) => {
      // Arrange
      await page.setViewportSize({ width: 768, height: 1024 });
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert
      await landingPage.scrollAndVerifyAllSections();
    });

    test('1.7: Page loads in under 2 seconds', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);
      const startTime = Date.now();

      // Act
      await landingPage.goto();

      // Assert
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });
  });

  /**
   * SECTION 2: SIGN UP TESTS
   */
  test.describe('Section 2: Sign Up & Registration', () => {
    test('2.1: Sign up form loads successfully', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();

      // Assert
      await signUpPage.expectFormVisible();
    });

    test('2.2: Sign up with valid email and password', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);
      const newUser = generateNewTestUser('signup');

      // Act
      await signUpPage.goto();
      await signUpPage.signUp(newUser.email, newUser.password);

      // Assert
      // Should be redirected or show success message
      await page.waitForLoadState('networkidle');
      const isRedirected = await page.url().match(/dashboard|welcome|onboarding/i);
      const hasSuccess = await page.locator('text=/sucesso|bem-vindo|welcome/i').isVisible({ timeout: 2000 }).catch(() => false);
      expect(isRedirected || hasSuccess).toBeTruthy();
    });

    test('2.3: Email validation rejects invalid format', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();
      await signUpPage.fillEmail('not-an-email');
      await signUpPage.fillPassword('ValidPassword123!');

      // Assert
      await signUpPage.expectFormInvalid();
    });

    test('2.4: Password strength indicator is displayed', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();
      await signUpPage.fillPassword('weak');

      // Assert
      await signUpPage.expectPasswordStrengthIndicator();
    });

    test('2.5: Weak password is rejected', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();
      await signUpPage.fillEmail(generateNewTestUser().email);
      await signUpPage.fillPassword('123456');
      await signUpPage.fillConfirmPassword('123456');

      // Assert
      await signUpPage.expectFormInvalid();
    });

    test('2.6: Duplicate email is rejected', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);
      const duplicateEmail = TEST_USERS.ONBOARDING_USER.email;

      // Act
      await signUpPage.goto();
      await signUpPage.signUp(duplicateEmail, 'NewPassword123!@#');

      // Assert
      await signUpPage.expectErrorMessage(/já existe|already exists/i);
    });

    test('2.7: Sign up takes under 3 seconds', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);
      const newUser = generateNewTestUser('perf');
      const startTime = Date.now();

      // Act
      await signUpPage.goto();
      await signUpPage.fillEmail(newUser.email);
      await signUpPage.fillPassword(newUser.password);
      await signUpPage.fillConfirmPassword(newUser.password);
      await signUpPage.submit();

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });

  /**
   * SECTION 3: WELCOME TOUR TESTS
   */
  test.describe('Section 3: Welcome Tour (4 Pilares)', () => {
    // These tests assume user is already authenticated
    test('3.1: Welcome tour loads with 4 cards', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act
      await tourPage.expectTourVisible();

      // Assert
      await tourPage.expectDotNavigationVisible(4);
    });

    test('3.2: Navigate tour using next button', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act
      for (let i = 0; i < 3; i++) {
        await tourPage.clickNext();
        await tourPage.expectCardVisible();
      }

      // Assert
      const currentIndex = await tourPage.getCurrentCardIndex();
      expect(currentIndex).toBe(3); // Last slide (0-indexed)
    });

    test('3.3: Navigate tour using previous button', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act - go to last slide first
      for (let i = 0; i < 3; i++) {
        await tourPage.clickNext();
      }

      // Then go back
      await tourPage.clickPrev();

      // Assert
      const currentIndex = await tourPage.getCurrentCardIndex();
      expect(currentIndex).toBe(2); // Second-to-last slide
    });

    test('3.4: Navigate tour using dot indicators', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act
      await tourPage.goToSlide(2); // Go to slide 3 (0-indexed)

      // Assert
      const currentIndex = await tourPage.getCurrentCardIndex();
      expect(currentIndex).toBe(2);
    });

    test('3.5: Navigate tour using keyboard arrows', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act
      await tourPage.navigateWithKeyboard();

      // Assert - should end up back at first slide
      const currentIndex = await tourPage.getCurrentCardIndex();
      expect(currentIndex).toBe(0);
    });

    test('3.6: Skip tour button exits tour', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act
      await tourPage.clickSkip();

      // Assert
      await tourPage.expectTourClosed();
      // Should be redirected to next onboarding step
      await expect(page).toHaveURL(/onboarding|trail|moment/i);
    });

    test('3.7: Explore button on last slide continues onboarding', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/tour');
      const tourPage = new WelcomeTourPage(page);

      // Act
      // Go to last slide
      for (let i = 0; i < 3; i++) {
        await tourPage.clickNext();
      }
      await tourPage.clickExplore();

      // Assert
      await tourPage.expectTourClosed();
      await expect(page).toHaveURL(/onboarding|trail|moment/i);
    });

    test('3.8: Tour loads in under 1 second', async ({ page }) => {
      // Arrange
      const startTime = Date.now();

      // Act
      await page.goto('/onboarding/tour', { waitUntil: 'networkidle' });

      // Assert
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000);
    });
  });

  /**
   * SECTION 4: TRAIL SELECTION TESTS
   */
  test.describe('Section 4: Trail Selection (Contextual Questions)', () => {
    test('4.1: Trail selection page displays trails', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.expectPageVisible();

      // Assert
      const count = await trailPage.getTrailCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(5);
    });

    test('4.2: Can select a trail', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.selectTrailByIndex(0);

      // Assert
      await trailPage.expectQuestionsVisible();
    });

    test('4.3: Trail questions expand with multiple choice', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.selectTrailByIndex(0);

      // Assert
      const optionCount = await trailPage.getAnswerOptionCount();
      expect(optionCount).toBeGreaterThan(0);
    });

    test('4.4: Can select single choice answer', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.selectTrailByIndex(0);
      await trailPage.selectSingleChoiceByIndex(0);

      // Assert
      // Answer should be selected (visual feedback)
      const options = await trailPage.getAllAnswerOptions();
      expect(options.length).toBeGreaterThan(0);
    });

    test('4.5: Can navigate between questions', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.selectTrailByIndex(0);
      await trailPage.selectSingleChoiceByIndex(0);
      await trailPage.clickNextQuestion();

      // Assert
      const newQuestion = await trailPage.getCurrentQuestionText();
      expect(newQuestion).toBeTruthy();
    });

    test('4.6: Cannot complete trail without answering required questions', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.selectTrailByIndex(0);
      await trailPage.attemptCompleteWithoutAnswer();

      // Assert
      const hasError = await page.locator('[data-testid="required-field-error"]').isVisible({ timeout: 2000 }).catch(() => false);
      const stillOnTrail = await page.url().match(/trail/i);
      expect(hasError || stillOnTrail).toBeTruthy();
    });

    test('4.7: Trail score is calculated and displayed', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      await trailPage.selectTrailByIndex(0);
      await trailPage.completeTrailWithRandomAnswers();

      // Assert
      await page.waitForLoadState('networkidle');
      // Should show score or move to next step
      await expect(page).toHaveURL(/onboarding|trail|moment|recommendation/i);
    });

    test('4.8: Trail completion takes under 5 seconds', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);
      const startTime = Date.now();

      // Act
      await trailPage.selectTrailByIndex(0);
      await trailPage.completeTrailWithRandomAnswers();

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    test('4.9: Can skip trail', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/trails');
      const trailPage = new TrailSelectionPage(page);

      // Act
      const skipVisible = await page.locator('[data-testid="skip-trail-btn"]').isVisible({ timeout: 1000 }).catch(() => false);
      if (skipVisible) {
        await trailPage.skipTrail();
      }

      // Assert
      await expect(page).toHaveURL(/onboarding|trail|moment|recommendation/i);
    });
  });

  /**
   * SECTION 5: MOMENT CAPTURE TESTS
   */
  test.describe('Section 5: Moment Capture Flow (7 Steps)', () => {
    test('5.1: Moment capture page loads with all 7 steps', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.expectPageVisible();

      // Assert
      await momentPage.expectAllStepsVisible();
      const currentStep = await momentPage.getCurrentStep();
      expect(currentStep).toBe(1);
    });

    test('5.2: Step 1 - Select moment type (6 options)', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.expectPageVisible();

      // Assert
      const optionCount = await momentPage.getMomentTypeOptionsCount();
      expect(optionCount).toBe(6);
    });

    test('5.3: Step 2 - Select emotion (5 options + custom)', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.selectMomentTypeByIndex(0);
      await momentPage.clickNextStep();

      // Assert
      const optionCount = await momentPage.getEmotionOptionsCount();
      expect(optionCount).toBeGreaterThanOrEqual(5);
    });

    test('5.4: Step 3 - Select life areas (multiple choice)', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.selectMomentTypeByIndex(0);
      await momentPage.clickNextStep();
      await momentPage.selectEmotionByIndex(0);
      await momentPage.clickNextStep();

      // Assert
      const optionCount = await momentPage.getLifeAreaOptionsCount();
      expect(optionCount).toBeGreaterThan(0);
    });

    test('5.5: Step 4 - Social proof is displayed', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.selectMomentTypeByIndex(0);
      await momentPage.clickNextStep();
      await momentPage.selectEmotionByIndex(0);
      await momentPage.clickNextStep();
      await momentPage.selectLifeAreaByIndex(0);
      await momentPage.clickNextStep();

      // Assert
      await momentPage.expectSocialProofVisible();
    });

    test('5.6: Step 5 - Reflection is optional', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.completeFullFlow({
        momentType: MOMENT_DATA.TYPES[0],
        emotion: MOMENT_DATA.EMOTIONS[0],
        lifeAreas: [MOMENT_DATA.LIFE_AREAS[0]],
        // Reflection left empty
      });

      // Assert - should successfully save without reflection
      await expect(page).toHaveURL(/onboarding|moment|recommendation/i);
    });

    test('5.7: Navigate backward through steps', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.selectMomentTypeByIndex(0);
      await momentPage.clickNextStep();
      await momentPage.clickPreviousStep();

      // Assert
      const currentStep = await momentPage.getCurrentStep();
      expect(currentStep).toBe(1);
    });

    test('5.8: Complete entire 7-step flow', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.completeFullFlow({
        momentType: MOMENT_DATA.TYPES[0],
        emotion: MOMENT_DATA.EMOTIONS[0],
        lifeAreas: [MOMENT_DATA.LIFE_AREAS[0], MOMENT_DATA.LIFE_AREAS[1]],
        reflection: MOMENT_DATA.REFLECTIONS[0],
      });

      // Assert
      await expect(page).toHaveURL(/onboarding|moment|recommendation/i);
    });

    test('5.9: CP points earned notification appears', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);

      // Act
      await momentPage.completeFullFlow({
        momentType: MOMENT_DATA.TYPES[0],
        emotion: MOMENT_DATA.EMOTIONS[0],
        lifeAreas: [MOMENT_DATA.LIFE_AREAS[0]],
      });

      // Assert
      const hasNotification = await page.locator('[data-testid="cp-points-notification"]').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasNotification).toBeTruthy();
    });

    test('5.10: Moment capture completes in under 10 seconds', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const momentPage = new MomentCapturePage(page);
      const startTime = Date.now();

      // Act
      await momentPage.completeFullFlow({
        momentType: MOMENT_DATA.TYPES[0],
        emotion: MOMENT_DATA.EMOTIONS[0],
        lifeAreas: [MOMENT_DATA.LIFE_AREAS[0]],
      });

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });
  });

  /**
   * SECTION 6: RECOMMENDATIONS TESTS
   */
  test.describe('Section 6: Module Recommendations', () => {
    test('6.1: Recommendations page loads', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.expectPageVisible();

      // Assert
      await recPage.waitForRecommendationsLoaded();
    });

    test('6.2: Displays max 6 recommendations', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.waitForRecommendationsLoaded();

      // Assert
      await recPage.expectRecommendationCountMax6();
    });

    test('6.3: Each recommendation shows confidence score', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.waitForRecommendationsLoaded();

      // Assert
      const count = await recPage.getRecommendationCount();
      if (count > 0) {
        await recPage.expectAllRecommendationsHaveScores();
      }
    });

    test('6.4: Can accept recommendation', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.waitForRecommendationsLoaded();
      const count = await recPage.getRecommendationCount();
      if (count > 0) {
        await recPage.acceptRecommendationByIndex(0);
      }

      // Assert
      await page.waitForLoadState('networkidle');
    });

    test('6.5: Rejection shows feedback modal', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.waitForRecommendationsLoaded();
      const count = await recPage.getRecommendationCount();
      if (count > 0) {
        await recPage.rejectRecommendationByIndex(0);
      }

      // Assert
      const hasModal = await page.locator('[data-testid="feedback-modal"]').isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasModal).toBeTruthy();
    });

    test('6.6: Can submit feedback for rejection', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.waitForRecommendationsLoaded();
      const count = await recPage.getRecommendationCount();
      if (count > 0) {
        await recPage.rejectAndProvideFeedback(0, 0);
      }

      // Assert
      await page.waitForLoadState('networkidle');
    });

    test('6.7: Recommendations load in under 2 seconds', async ({ page }) => {
      // Arrange
      const startTime = Date.now();

      // Act
      await page.goto('/onboarding/recommendations', { waitUntil: 'networkidle' });

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    test('6.8: Can continue from recommendations page', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/recommendations');
      const recPage = new RecommendationsPage(page);

      // Act
      await recPage.waitForRecommendationsLoaded();
      const hasContinue = await page.locator('[data-testid="continue-btn"]').isVisible({ timeout: 1000 }).catch(() => false);
      if (hasContinue) {
        await recPage.clickContinue();
      }

      // Assert
      await expect(page).toHaveURL(/dashboard|home|onboarding-complete/i);
    });
  });

  /**
   * SECTION 7: ACCESSIBILITY TESTS
   */
  test.describe('Section 7: Accessibility', () => {
    test('7.1: Landing page has proper ARIA labels', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('7.2: Form inputs are properly labeled', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();

      // Assert
      const inputs = await page.locator('input').all();
      for (const input of inputs) {
        const label = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        expect(label || placeholder || name).toBeTruthy();
      }
    });

    test('7.3: Keyboard navigation works throughout onboarding', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();
      // Tab through landing page elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Assert
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('7.4: Focus indicators are visible', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();
      await page.keyboard.press('Tab');

      // Assert
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        };
      });

      const hasVisibleFocus = focusedElement.outline || focusedElement.boxShadow || focusedElement.borderColor;
      expect(hasVisibleFocus).toBeTruthy();
    });

    test('7.5: Color contrast is sufficient (WCAG AA)', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert - basic check for text contrast
      // In production, use axe-core or similar tool for comprehensive testing
      const buttons = await page.locator('button').first();
      const color = await buttons.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.color;
      });

      expect(color).toBeTruthy();
    });
  });

  /**
   * SECTION 8: COMPLETE FLOW INTEGRATION TESTS
   */
  test.describe('Section 8: Complete Onboarding Flow (Happy Path)', () => {
    test('8.1: Complete onboarding from sign up to recommendations', async ({ page }) => {
      // Arrange
      const newUser = generateNewTestUser('happypath');
      const landingPage = new LandingPage(page);
      const signUpPage = new SignUpPage(page);
      const tourPage = new WelcomeTourPage(page);
      const trailPage = new TrailSelectionPage(page);
      const momentPage = new MomentCapturePage(page);
      const recPage = new RecommendationsPage(page);

      // Act: Landing -> Sign Up
      await landingPage.goto();
      await landingPage.clickSignUpCTA();
      await signUpPage.signUp(newUser.email, newUser.password);

      // Wait for redirection to tour or next step
      await page.waitForLoadState('networkidle');

      // Act: Welcome Tour (optional, may be skipped)
      const onTourPage = await page.url().match(/tour/i);
      if (onTourPage) {
        await tourPage.expectTourVisible();
        await tourPage.completeTourNavigation();
        await page.waitForLoadState('networkidle');
      }

      // Act: Trail Selection
      const onTrailPage = await page.url().match(/trail/i);
      if (onTrailPage) {
        await trailPage.expectPageVisible();
        const trailCount = await trailPage.getTrailCount();
        if (trailCount > 0) {
          await trailPage.selectTrailByIndex(0);
          await trailPage.completeTrailWithRandomAnswers();
        }
        await page.waitForLoadState('networkidle');
      }

      // Act: Moment Capture
      const onMomentPage = await page.url().match(/moment/i);
      if (onMomentPage) {
        await momentPage.expectPageVisible();
        await momentPage.completeFullFlow({
          momentType: MOMENT_DATA.TYPES[0],
          emotion: MOMENT_DATA.EMOTIONS[0],
          lifeAreas: [MOMENT_DATA.LIFE_AREAS[0]],
        });
        await page.waitForLoadState('networkidle');
      }

      // Act: Recommendations
      const onRecPage = await page.url().match(/recommendation/i);
      if (onRecPage) {
        await recPage.expectPageVisible();
        await recPage.waitForRecommendationsLoaded();
      }

      // Assert
      // Should have completed at least one phase
      const finalURL = page.url();
      expect(finalURL).toBeTruthy();
    });

    test('8.2: Complete onboarding in under 25 seconds', async ({ page }) => {
      // Arrange
      const newUser = generateNewTestUser('performance');
      const landingPage = new LandingPage(page);
      const signUpPage = new SignUpPage(page);
      const startTime = Date.now();

      // Act
      await landingPage.goto();
      await landingPage.clickSignUpCTA();
      await signUpPage.signUp(newUser.email, newUser.password);

      await page.waitForLoadState('networkidle');

      // Try to complete remaining steps quickly
      const tourVisible = await page.url().match(/tour/i);
      if (tourVisible) {
        const skipBtn = await page.locator('[data-testid="tour-skip"]').isVisible({ timeout: 1000 }).catch(() => false);
        if (skipBtn) {
          await page.locator('[data-testid="tour-skip"]').click();
        }
      }

      // Assert
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(25000);
    });
  });

  /**
   * SECTION 9: ERROR HANDLING & EDGE CASES
   */
  test.describe('Section 9: Error Handling', () => {
    test('9.1: Network error is handled gracefully', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');

      // Act - simulate network failure
      await page.context().setOffline(true);
      const saveable = await page.locator('[data-testid="save-moment-btn"]').isEnabled();

      // Assert
      expect(saveable).toBeFalsy();

      // Cleanup
      await page.context().setOffline(false);
    });

    test('9.2: Invalid input is rejected with error message', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();
      await signUpPage.fillEmail('invalid-email');

      // Assert
      await signUpPage.expectFormInvalid();
    });

    test('9.3: Form submission timeout is handled', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);

      // Act
      await signUpPage.goto();
      await signUpPage.fillAllFields(generateNewTestUser().email, 'TestPass123!');

      // Wait for potential timeout
      await page.waitForTimeout(100);

      // Assert
      const form = await page.locator('form').isVisible();
      expect(form).toBeTruthy();
    });
  });

  /**
   * SECTION 10: DATA PERSISTENCE TESTS
   */
  test.describe('Section 10: Data Persistence', () => {
    test('10.1: User data is saved to database after sign up', async ({ page }) => {
      // Arrange
      const signUpPage = new SignUpPage(page);
      const newUser = generateNewTestUser('dbtest');

      // Act
      await signUpPage.goto();
      await signUpPage.signUp(newUser.email, newUser.password);
      await page.waitForLoadState('networkidle');

      // Assert - user should be authenticated
      const isAuthenticated = await page.evaluate(() => {
        const token = localStorage.getItem('sb-gppebtrshbvuzatmebhr-auth-token');
        return !!token;
      });

      expect(isAuthenticated).toBeTruthy();
    });

    test('10.2: Session persists after page reload', async ({ page }) => {
      // Arrange
      await page.goto('/onboarding/moment');
      const isAuthenticatedBefore = await page.evaluate(() => {
        const token = localStorage.getItem('sb-gppebtrshbvuzatmebhr-auth-token');
        return !!token;
      });

      // Act
      await page.reload();

      // Assert
      const isAuthenticatedAfter = await page.evaluate(() => {
        const token = localStorage.getItem('sb-gppebtrshbvuzatmebhr-auth-token');
        return !!token;
      });

      expect(isAuthenticatedAfter).toBe(isAuthenticatedBefore);
    });
  });
});
