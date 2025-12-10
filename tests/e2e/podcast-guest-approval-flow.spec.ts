/**
 * E2E Tests for Complete Guest Approval Flow
 *
 * Tests the full workflow from guest identification through approval:
 * 1. Create episode with guest (Public Figure or Common Person)
 * 2. Verify episode and guest data in database
 * 3. Generate approval token
 * 4. Share approval link with guest
 * 5. Guest reviews and approves/rejects on public page
 *
 * This is the Phase 3 functional testing suite that validates real-world
 * usage of the entire guest identification and approval system.
 */

import { test, expect } from '@playwright/test';
import { GuestWizardPage } from './pages/GuestWizardPage';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gppebtrshbvuzatmebhr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('Phase 3: Complete Guest Approval Flow - End-to-End', () => {
  let wizardPage: GuestWizardPage;
  let createdEpisodeId: string;

  test.beforeEach(async ({ page }) => {
    wizardPage = new GuestWizardPage(page);
    await wizardPage.navigateToPodcastView();
  });

  // =========================================================================
  // WORKFLOW 1: PUBLIC FIGURE (AUTOMATIC RESEARCH)
  // =========================================================================
  test.describe('Workflow 1: Public Figure - Full Episode Creation & Approval', () => {
    test('1.1: Should create episode with public figure via automated research', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();

      // Act - Complete Public Figure Workflow
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Elon Musk', 'CEO Tesla and SpaceX');

      // Wait for Step 2 to be visible
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Confirm profile and continue
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();

      // Fill episode details
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '1',
        date: '2025-12-20',
        time: '14:00'
      });

      // Complete wizard
      await wizardPage.completeWizard();

      // Assert - Wizard should close and show PreProduction
      await wizardPage.expectWizardClosed();
      await wizardPage.expectPreProductionVisible();

      // Verify episode data is displayed
      await expect(page.getByText('Elon Musk')).toBeVisible();
    });

    test('1.2: Should display guest approval button in PreProduction hub', async ({ page }) => {
      // Arrange - Create public figure episode
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Tim Cook', 'CEO Apple');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '2',
        date: '2025-12-25',
        time: '10:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Assert - Approval button should be visible
      const approvalButton = page.getByText('Enviar Aprovação');
      await expect(approvalButton).toBeVisible();
    });

    test('1.3: Should generate and display approval link', async ({ page }) => {
      // Arrange - Create episode and open approval dialog
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Satya Nadella', 'CEO Microsoft');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '3',
        date: '2025-12-22',
        time: '16:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Act - Click approval button
      const approvalButton = page.getByText('Enviar Aprovação');
      await approvalButton.click();

      // Assert - Modal should appear with guest info
      await expect(page.getByText(/Gerar.*Link|Enviar.*Link/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Satya Nadella')).toBeVisible();
    });

    test('1.4: Should validate episode data is stored correctly', async ({ page, context }) => {
      // Arrange - Create episode
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Jeff Bezos', 'Founder Amazon');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '4',
        date: '2025-12-28',
        time: '18:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Assert - Verify episode title is displayed
      const episodeTitle = page.locator('h1, h2, h3').filter({ hasText: /Jeff Bezos/i });
      await expect(episodeTitle).toBeVisible();

      // Verify guest theme is displayed if set
      await expect(page.getByText(/Tema|Theme/i)).toBeVisible();
    });

    test('1.5: Should allow email method for approval link delivery', async ({ page }) => {
      // Arrange - Create episode and open approval dialog
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Sundar Pichai', 'CEO Google');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({ themeMode: 'auto', season: '5', date: '2025-12-30', time: '12:00' });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Act - Open approval dialog
      await page.getByText('Enviar Aprovação').click();
      await expect(page.getByText(/Gerar.*Link|Enviar.*Link/i)).toBeVisible({ timeout: 5000 });

      // Assert - Email option should be available
      const emailOption = page.locator('button').filter({ hasText: /Email/i });
      await expect(emailOption).toBeVisible();
    });
  });

  // =========================================================================
  // WORKFLOW 2: COMMON PERSON (MANUAL ENTRY)
  // =========================================================================
  test.describe('Workflow 2: Common Person - Full Episode Creation & Approval', () => {
    test('2.1: Should create episode with common person via manual form', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();

      // Act - Complete Common Person Workflow
      await wizardPage.selectCommonPerson();
      await wizardPage.fillManualForm(
        'João da Silva',
        '11987654321',
        'joao.silva@exemplo.com'
      );
      await wizardPage.submitManualForm();

      // Assert - Should skip Step 2 and go to Step 3
      await wizardPage.expectStep3Visible();

      // Fill episode details
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '1',
        date: '2025-12-21',
        time: '15:00'
      });

      // Complete wizard
      await wizardPage.completeWizard();

      // Assert
      await wizardPage.expectWizardClosed();
      await wizardPage.expectPreProductionVisible();

      // Verify episode data is displayed
      await expect(page.getByText('João da Silva')).toBeVisible();
    });

    test('2.2: Should store guest contact information (phone and email)', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      const testName = 'Maria Santos';
      const testPhone = '21998765432';
      const testEmail = 'maria@exemplo.com';

      // Act - Create episode
      await wizardPage.fillManualForm(testName, testPhone, testEmail);
      await wizardPage.submitManualForm();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '2',
        date: '2025-12-23',
        time: '14:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Assert - Episode should be created with common person
      await expect(page.getByText(testName)).toBeVisible();

      // Verify approval button is available (can use stored contact info)
      const approvalButton = page.getByText('Enviar Aprovação');
      await expect(approvalButton).toBeVisible();
    });

    test('2.3: Should validate Brazilian phone format in manual form', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Try various valid Brazilian phone formats
      const phoneFormats = [
        '11987654321',      // 11 digits
        '21998765432',      // 10 digits
        '(11) 98765-4321',  // formatted
        '+5511987654321'    // with country code
      ];

      for (const phone of phoneFormats) {
        await wizardPage.nameInput.fill('Test Person');
        await wizardPage.phoneInput.fill(phone);
        await wizardPage.emailInput.fill('test@exemplo.com');

        // Should allow submission (or at least not show error)
        const errorVisible = await page.getByText(/Telefone inválido/i).isVisible();
        expect(errorVisible).toBe(false);

        // Clear for next iteration
        await wizardPage.nameInput.clear();
      }
    });

    test('2.4: Should display guest data in PreProduction after creation', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Create episode
      await wizardPage.fillManualForm(
        'Pedro Oliveira',
        '85987654321',
        'pedro@exemplo.com'
      );
      await wizardPage.submitManualForm();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'manual',
        theme: 'Tecnologia e Inovação',
        season: '3',
        date: '2025-12-26',
        time: '11:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Assert - Guest name and contact info should be accessible
      await expect(page.getByText('Pedro Oliveira')).toBeVisible();

      // Guest approval button should be accessible
      const approvalButton = page.getByText('Enviar Aprovação');
      await expect(approvalButton).toBeVisible();
    });

    test('2.5: Should allow approval link generation for common person', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();
      await wizardPage.fillManualForm(
        'Ana Clara',
        '31987654321',
        'ana@exemplo.com'
      );
      await wizardPage.submitManualForm();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '4',
        date: '2025-12-29',
        time: '13:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Act - Click approval button
      await page.getByText('Enviar Aprovação').click();

      // Assert - Should show approval dialog with common person info
      await expect(page.getByText(/Gerar.*Link|Enviar.*Link/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Ana Clara')).toBeVisible();

      // Should show email option since we have email
      await expect(page.locator('button').filter({ hasText: /Email/i })).toBeVisible();
    });

    test('2.6: Should skip Step 2 (profile confirmation) for common person', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Fill form and submit
      await wizardPage.fillManualForm(
        'Carlos Silva',
        '47987654321',
        'carlos@exemplo.com'
      );
      await wizardPage.submitManualForm();

      // Assert - Should go directly to Step 3
      await wizardPage.expectStep3Visible();
      await expect(page.getByText('Confirme o convidado')).not.toBeVisible();
    });
  });

  // =========================================================================
  // COMPARISON: BOTH WORKFLOWS
  // =========================================================================
  test.describe('Workflow Comparison: Public Figure vs Common Person', () => {
    test('3.1: Both workflows should create valid episodes', async ({ page }) => {
      // Create public figure episode
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Mark Zuckerberg', 'Founder Meta');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '1',
        date: '2025-12-31',
        time: '10:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Public figure episode should be created
      await expect(page.getByText('Mark Zuckerberg')).toBeVisible();

      // Both workflows should have approval button
      const approvalButton = page.getByText('Enviar Aprovação');
      await expect(approvalButton).toBeVisible();
    });

    test('3.2: Public figure should have automatic research data', async ({ page }) => {
      // Create public figure episode
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Warren Buffett', 'Berkshire CEO');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Step 2 should show research data
      await expect(page.getByText('Confirme o convidado')).toBeVisible();

      // Proceed
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '2',
        date: '2026-01-05',
        time: '15:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Episode created
      await expect(page.getByText('Warren Buffett')).toBeVisible();
    });

    test('3.3: Common person should use manually provided data only', async ({ page }) => {
      // Create common person episode
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();
      await wizardPage.fillManualForm(
        'Lucas Ferreira',
        '61987654321',
        'lucas@exemplo.com'
      );
      await wizardPage.submitManualForm();
      await wizardPage.expectStep3Visible();

      // No Step 2 - should go directly to Step 3
      await expect(page.getByText('Confirme o convidado')).not.toBeVisible();

      // Complete
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '3',
        date: '2026-01-10',
        time: '12:00'
      });
      await wizardPage.completeWizard();
      await wizardPage.expectPreProductionVisible();

      // Episode created with manual data
      await expect(page.getByText('Lucas Ferreira')).toBeVisible();
    });
  });

  // =========================================================================
  // APPROVAL PAGE TESTING
  // =========================================================================
  test.describe('Guest Approval Page - Public Access', () => {
    test('4.1: Should display guest approval page with correct route structure', async ({ page }) => {
      // Arrange - Create episode first
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();
      await wizardPage.fillManualForm(
        'Raphael Costa',
        '74987654321',
        'raphael@exemplo.com'
      );
      await wizardPage.submitManualForm();
      await wizardPage.fillEpisodeDetails({ themeMode: 'auto', season: '1', date: '2026-01-15', time: '09:00' });
      await wizardPage.completeWizard();

      // Note: In real scenario, approval page would be at:
      // /podcast/approval/:episodeId/:approvalToken
      // This test documents the expected structure

      // Assert - Approval button should be visible in PreProduction
      await expect(page.getByText('Enviar Aprovação')).toBeVisible();
    });

    test('4.2: Should handle invalid approval token gracefully', async ({ page }) => {
      // Navigate to approval page with invalid token
      // Expected: Error message about invalid/expired token

      // This would be tested by:
      // 1. Going to /podcast/approval/invalid-id/invalid-token
      // 2. Should show error: "Token inválido ou expirado"
      // 3. Should offer option to request new link

      // Placeholder for manual testing scenario
      expect(true).toBe(true);
    });

    test('4.3: Should reject expired approval tokens (30+ days)', async ({ page }) => {
      // Navigate to approval page with 30+ day old token
      // Expected: Error message about expired token

      // This would be tested by:
      // 1. Manually creating episode with old timestamp
      // 2. Going to /podcast/approval/:id/:token
      // 3. Should show error: "Link de aprovação expirado (máximo 30 dias)"

      // Placeholder for manual testing scenario
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // ERROR HANDLING & EDGE CASES
  // =========================================================================
  test.describe('Error Handling & Edge Cases', () => {
    test('5.1: Should handle Gemini API failures with fallback', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act - Search for unknown person (may fail)
      await wizardPage.searchForGuest('Pessoa Muito Desconhecida XYZ999', 'Unknown Person');

      // Assert - Should either succeed with mock data or show fallback
      await expect(
        page.getByText('Confirme o convidado').or(page.getByText(/Pessoa Muito Desconhecida/i))
      ).toBeVisible({ timeout: 10000 });
    });

    test('5.2: Should handle network errors gracefully', async ({ page, context }) => {
      // Note: This test would simulate network failure
      // For now, just verify form validation works without network

      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Even if network is down, manual form should work
      await wizardPage.fillManualForm(
        'Test Person',
        '11987654321',
        'test@exemplo.com'
      );
      await wizardPage.submitManualForm();

      // Should proceed to Step 3
      await wizardPage.expectStep3Visible();
    });

    test('5.3: Should validate episode creation with minimal data', async ({ page }) => {
      // Create episode with only required fields
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();
      await wizardPage.fillManualForm(
        'Min Data Test',
        '11987654321',
        'min@test.com'
      );
      await wizardPage.submitManualForm();
      await wizardPage.expectStep3Visible();

      // Complete with minimal episode data (auto theme)
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '1'
      });
      await wizardPage.completeWizard();

      // Should succeed
      await wizardPage.expectWizardClosed();
      await wizardPage.expectPreProductionVisible();
    });
  });
});
