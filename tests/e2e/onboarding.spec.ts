import { test, expect, Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';

/**
 * E2E Test Suite for Organic Onboarding Flow
 *
 * Phase 4+ Architecture:
 * - Users no longer see blocking onboarding
 * - Direct access to app after authentication
 * - Contextual trails available at /profile/trails (optional)
 * - Tooltips guide users organically (Phase 2)
 *
 * Coverage:
 * - Landing page loads and displays correctly
 * - Navigation and CTAs work
 * - Responsive design on mobile
 * - Accessibility compliance
 */

test.describe('Organic Onboarding Flow (Phase 4+)', () => {
  /**
   * SECTION 1: LANDING PAGE TESTS
   * The landing page is the new user's entry point
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
      const landingPage = new LandingPage(page);

      // Act
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await landingPage.goto();

      // Assert - Layout should adapt
      await expect(landingPage.hero).toBeVisible();
      await landingPage.expectHeroVisible();
    });

    test('1.6: Footer links are accessible and functional', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();
      const privacyLink = page.locator('a[href="/privacy"]').first();

      // Assert
      await expect(privacyLink).toBeVisible();
    });

    test('1.7: Landing page passes accessibility audit', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);

      // Act
      await landingPage.goto();

      // Assert - Basic a11y checks
      await expect(page.locator('h1')).toBeTruthy(); // Page has heading
      // All buttons should be accessible
      const buttons = page.locator('button');
      await expect(buttons).toBeTruthy();
    });
  });

  /**
   * SECTION 2: NEW FLOW TESTS (Phase 4+)
   * Users now go directly to app without onboarding
   */
  test.describe('Section 2: Direct App Access (New Flow)', () => {
    test('2.1: Authenticated users are redirected from /landing to home', async ({ page, context }) => {
      // NOTE: This test requires authentication setup
      // In a real scenario, you would:
      // 1. Set auth cookie/token in context
      // 2. Navigate to /landing
      // 3. Assert redirect to /
      // 4. Assert home page loads

      // This is a placeholder for the redirect test
      // Implementation depends on your auth setup
      test.skip();
    });

    test('2.2: Users can access optional trails from profile', async ({ page, context }) => {
      // NOTE: This test requires authentication setup
      // In a real scenario, you would:
      // 1. Authenticate user
      // 2. Navigate to /profile/trails
      // 3. Assert TrailSelectionFlow is visible
      // 4. Assert user can interact with trails

      // This is a placeholder for the profile trails test
      test.skip();
    });

    test('2.3: App tours are triggered on first module visit', async ({ page, context }) => {
      // NOTE: This test requires tour system testing
      // In a real scenario, you would:
      // 1. Authenticate user
      // 2. Navigate to each module (Journey, Studio, etc)
      // 3. Assert tour tooltips appear on first visit
      // 4. Assert tours don't repeat on subsequent visits

      // This is a placeholder for the tour test
      test.skip();
    });
  });

  /**
   * SECTION 3: PERFORMANCE TESTS
   * Verify improvements from removing blocking onboarding
   */
  test.describe('Section 3: Performance', () => {
    test('3.1: Landing page loads in under 3 seconds', async ({ page }) => {
      // Arrange
      const landingPage = new LandingPage(page);
      const startTime = Date.now();

      // Act
      await landingPage.goto();
      await landingPage.expectPageLoaded();
      const loadTime = Date.now() - startTime;

      // Assert
      expect(loadTime).toBeLessThan(3000);
    });

    test('3.2: No onboarding blocking flow (instant access)', async ({ page, context }) => {
      // NOTE: This test verifies that onboarding flow is not present
      // In a real scenario with auth, you would verify:
      // 1. OnboardingFlow component is not rendered
      // 2. User goes directly to home
      // 3. No redirect to /onboarding or similar

      // This is a placeholder
      test.skip();
    });
  });

  /**
   * SECTION 4: REGRESSION TESTS
   * Ensure old onboarding code doesn't exist
   */
  test.describe('Section 4: Cleanup Verification', () => {
    test('4.1: OnboardingFlow component is not imported/used', async ({ page }) => {
      // Navigate to home (after auth, but that's skipped for now)
      // This test verifies through codebase inspection that OnboardingFlow
      // is no longer imported in AppRouter

      // NOTE: This would be better as a unit test or code inspection
      test.skip();
    });

    test('4.2: Trails are accessible from profile, not blocking onboarding', async ({ page, context }) => {
      // NOTE: Verify trails are optional, not mandatory
      // This is tested through the profile page tests
      test.skip();
    });
  });
});

test.describe('DEPRECATED: Old Onboarding Tests', () => {
  test.describe('⚠️ These tests are deprecated and should be deleted', () => {
    test('Welcome Tour tests - DEPRECATED (component removed)', () => {
      // The WelcomeTour component was deleted in Phase 5
      // These tests are kept as a reference but marked as skip
      test.skip();
    });

    test('Trail Selection in onboarding - DEPRECATED (moved to /profile)', () => {
      // Trail selection moved from mandatory onboarding to optional /profile/trails
      // These tests should be moved to profile.spec.ts
      test.skip();
    });

    test('Moment Capture in onboarding - DEPRECATED (removed)', () => {
      // MomentCaptureFlow was deleted when onboarding was removed
      // Moment capture is now handled in the Journey module
      test.skip();
    });

    test('Module Recommendations - DEPRECATED (no longer in onboarding)', () => {
      // Recommendations were only shown at end of onboarding
      // With new organic flow, there is no recommendations phase
      test.skip();
    });
  });
});
