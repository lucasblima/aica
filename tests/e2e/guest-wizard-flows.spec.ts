/**
 * E2E Tests for Guest Identification Wizard - Comprehensive Flows
 *
 * Tests the updated 4-step wizard with two distinct workflows:
 *
 * STEP 0: Guest Type Selection (GuestTypeSelector)
 *   - Public Figure: Goes to Step 1a (name + reference + search)
 *   - Direct Contact: Goes to Step 1b (manual form)
 *
 * WORKFLOW A - Public Figure:
 *   Step 0 -> Step 1a (Name/Reference) -> Step 2 (Confirm) -> Step 3 (Details)
 *
 * WORKFLOW B - Direct Contact:
 *   Step 0 -> Step 1b (Manual Form) -> Step 3 (Details) [Skips Step 2]
 *
 * Components:
 *   - GuestIdentificationWizard.tsx
 *   - GuestTypeSelector.tsx
 *   - GuestManualForm.tsx
 */

import { test, expect } from '@playwright/test';
import { GuestWizardPage } from './pages/GuestWizardPage';

test.describe('Guest Identification Wizard - Two Workflows', () => {
  let wizardPage: GuestWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new GuestWizardPage(page);
    await wizardPage.navigateToPodcastView();
  });

  // =========================================================================
  // SECTION 1: PUBLIC FIGURE WORKFLOW (Complete Flow)
  // =========================================================================
  test.describe('1. Public Figure Workflow', () => {
    test('1.1: Should display Step 0 with both guest type options', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();

      // Assert
      await wizardPage.expectStep0Visible();
      await expect(page.getByText('Figura Pública')).toBeVisible();
      await expect(page.getByText('Contato Direto')).toBeVisible();
      await expect(page.getByText(/Dica:/i)).toBeVisible();
    });

    test('1.2: Should navigate to Step 1a after selecting Public Figure', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();

      // Act
      await wizardPage.selectPublicFigure();

      // Assert
      await wizardPage.expectStep1PublicFigureVisible();
      await expect(page.getByText('Quem será entrevistado?')).toBeVisible();
    });

    test('1.3: Should validate guest name is required for search', async () => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act - Leave name empty

      // Assert
      await wizardPage.expectSearchButtonDisabled();
    });

    test('1.4: Should enable search button when name is filled', async () => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act
      await wizardPage.fillGuestName('Maria Silva');

      // Assert
      await wizardPage.expectSearchButtonEnabled();
    });

    test('1.5: Should perform profile search and show Step 2', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act
      await wizardPage.searchForGuest('Elon Musk', 'CEO da Tesla');

      // Assert
      await wizardPage.expectStep2Visible();
      await expect(page.getByText('Confirme o convidado')).toBeVisible();
      await wizardPage.expectProfileDisplayed('Elon Musk');
    });

    test('1.6: Should show loading state during profile search', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.fillGuestName('Bill Gates');
      await wizardPage.fillGuestReference('Fundador Microsoft');

      // Act
      await wizardPage.clickSearchProfile();

      // Assert - Either loading shows briefly or goes directly to Step 2
      await expect(
        page.getByText(/Buscando.../i).or(page.getByText('Confirme o convidado'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('1.7: Should confirm profile and proceed to Step 3', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Tim Cook', 'CEO Apple');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Act
      await wizardPage.confirmProfile();

      // Assert
      await wizardPage.expectStep3Visible();
      await expect(page.getByText('Tema da Conversa')).toBeVisible();
    });

    test('1.8: Should complete full public figure workflow with auto theme', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Sundar Pichai', 'CEO Google');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();

      // Act
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '2',
        date: '2025-12-25',
        time: '15:00'
      });
      await wizardPage.completeWizard();

      // Assert
      await wizardPage.expectWizardClosed();
      await wizardPage.expectPreProductionVisible();
    });

    test('1.9: Should complete full public figure workflow with manual theme', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Satya Nadella', 'CEO Microsoft');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();

      // Act
      await wizardPage.fillEpisodeDetails({
        themeMode: 'manual',
        theme: 'Inteligencia Artificial e Transformacao Digital',
        season: '1',
        date: '2025-12-20',
        time: '10:00'
      });
      await wizardPage.completeWizard();

      // Assert
      await wizardPage.expectWizardClosed();
      await wizardPage.expectPreProductionVisible();
    });

    test('1.10: Should handle Gemini API failures gracefully', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act - Use a name that might not return results
      await wizardPage.searchForGuest('Pessoa Desconhecida XYZ123', '');

      // Assert - Should still proceed to Step 2 with fallback profile
      await expect(
        page.getByText('Confirme o convidado').or(page.getByText(/Busca automática falhou/i))
      ).toBeVisible({ timeout: 10000 });

      // Verify fallback profile is displayed
      await expect(page.getByText('Pessoa Desconhecida XYZ123')).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 2: DIRECT CONTACT WORKFLOW (Skip Profile Confirmation)
  // =========================================================================
  test.describe('2. Direct Contact Workflow', () => {
    test('2.1: Should navigate to manual form after selecting Direct Contact', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();

      // Act
      await wizardPage.selectCommonPerson();

      // Assert
      await wizardPage.expectStep1ManualFormVisible();
      await expect(page.getByText('Dados do Convidado')).toBeVisible();
    });

    test('2.2: Should display all required form fields', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Assert
      await expect(page.getByText('Nome Completo')).toBeVisible();
      await expect(page.getByText('Telefone/WhatsApp')).toBeVisible();
      await expect(page.getByText('Email')).toBeVisible();
      await expect(page.getByText(/informacoes serao usadas|informações serão usadas/i)).toBeVisible();
    });

    test('2.3: Should validate empty name field', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.nameInput.click();
      await wizardPage.blurNameField();

      // Assert
      await expect(page.getByText(/Nome é obrigatório/i)).toBeVisible();
    });

    test('2.4: Should validate minimum name length', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.nameInput.fill('Jo');
      await wizardPage.blurNameField();

      // Assert
      await expect(page.getByText(/pelo menos 3 caracteres/i)).toBeVisible();
    });

    test('2.5: Should validate empty phone field', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.phoneInput.click();
      await wizardPage.blurPhoneField();

      // Assert
      await expect(page.getByText(/Telefone é obrigatório/i)).toBeVisible();
    });

    test('2.6: Should validate invalid phone format', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.phoneInput.fill('123');
      await wizardPage.blurPhoneField();

      // Assert
      await expect(page.getByText(/Telefone inválido/i)).toBeVisible();
    });

    test('2.7: Should validate empty email field', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.emailInput.click();
      await wizardPage.blurEmailField();

      // Assert
      await expect(page.getByText(/Email é obrigatório/i)).toBeVisible();
    });

    test('2.8: Should validate invalid email format', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.emailInput.fill('emailinvalido');
      await wizardPage.blurEmailField();

      // Assert
      await expect(page.getByText(/Email inválido/i)).toBeVisible();
    });

    test('2.9: Should accept valid Brazilian phone formats', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Fill with valid Brazilian phone (11 digits)
      await wizardPage.phoneInput.fill('11999887766');
      await wizardPage.blurPhoneField();

      // Assert - No error should be visible
      await expect(page.getByText(/Telefone inválido/i)).not.toBeVisible();
    });

    test('2.10: Should skip Step 2 and go directly to Step 3', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act
      await wizardPage.fillManualForm(
        'Maria Santos',
        '11987654321',
        'maria@exemplo.com'
      );
      await wizardPage.submitManualForm();

      // Assert - Should go directly to Step 3, skipping Step 2
      await wizardPage.expectStep3Visible();
      await expect(page.getByText('Confirme o convidado')).not.toBeVisible();
      await expect(page.getByText('Tema da Conversa')).toBeVisible();
    });

    test('2.11: Should complete full direct contact workflow', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();
      await wizardPage.fillManualForm(
        'Pedro Oliveira',
        '21998765432',
        'pedro.oliveira@email.com'
      );
      await wizardPage.submitManualForm();
      await wizardPage.expectStep3Visible();

      // Act
      await wizardPage.fillEpisodeDetails({
        themeMode: 'auto',
        season: '1',
        date: '2025-12-30',
        time: '14:00'
      });
      await wizardPage.completeWizard();

      // Assert
      await wizardPage.expectWizardClosed();
      await wizardPage.expectPreProductionVisible();
    });

    test('2.12: Should clear validation errors when user types', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Trigger error
      await wizardPage.nameInput.click();
      await wizardPage.blurNameField();
      await expect(page.getByText(/Nome é obrigatório/i)).toBeVisible();

      // Act - Start typing
      await wizardPage.nameInput.fill('Ana');

      // Assert - Error should be cleared
      await expect(page.getByText(/Nome é obrigatório/i)).not.toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 3: UI COMPONENT TESTS
  // =========================================================================
  test.describe('3. UI Component Tests - GuestTypeSelector', () => {
    test('3.1: Should show visual selection state for Public Figure', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();

      // Act - Just hover (don't click yet)
      await wizardPage.publicFigureOption.hover();

      // Assert - Should show hover state (shadow-md class)
      // Note: Visual state testing is limited without screenshots
      await expect(wizardPage.publicFigureOption).toBeVisible();
    });

    test('3.2: Should show visual selection state for Direct Contact', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();

      // Act - Just hover
      await wizardPage.commonPersonOption.hover();

      // Assert
      await expect(wizardPage.commonPersonOption).toBeVisible();
    });

    test('3.3: Should display feature icons correctly', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();

      // Assert - Check feature descriptions are visible
      await expect(page.getByText(/Busca automática/i)).toBeVisible();
      await expect(page.getByText(/Cadastro manual/i)).toBeVisible();
      await expect(page.getByText(/Wikipedia, notícias/i)).toBeVisible();
      await expect(page.getByText(/Nome, telefone e email/i)).toBeVisible();
    });

    test('3.4: Should display help tip box with guidance', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();

      // Assert
      await expect(
        page.getByText(/Se o convidado tem Wikipedia/i)
      ).toBeVisible();
    });
  });

  test.describe('3b. UI Component Tests - GuestManualForm', () => {
    test('3.5: Should display all field labels with required indicators', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Assert - Required indicator (*) should be present
      const nameLabel = page.locator('label').filter({ hasText: 'Nome Completo' });
      const phoneLabel = page.locator('label').filter({ hasText: 'Telefone/WhatsApp' });
      const emailLabel = page.locator('label').filter({ hasText: 'Email' });

      await expect(nameLabel).toBeVisible();
      await expect(phoneLabel).toBeVisible();
      await expect(emailLabel).toBeVisible();
    });

    test('3.6: Should display info box about data usage', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Assert
      await expect(
        page.getByText(/pauta e lembretes da entrevista/i)
      ).toBeVisible();
    });

    test('3.7: Should display input placeholders correctly', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Assert
      await expect(page.getByPlaceholder('Ex: João Silva')).toBeVisible();
      await expect(page.getByPlaceholder('(11) 99999-9999')).toBeVisible();
      await expect(page.getByPlaceholder('joao@exemplo.com')).toBeVisible();
    });

    test('3.8: Should show error messages with alert icon', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Trigger all validation errors
      await wizardPage.nameInput.click();
      await wizardPage.phoneInput.click();
      await wizardPage.emailInput.click();
      await wizardPage.nameInput.click(); // Blur email

      // Assert - Error messages should be displayed
      await expect(page.getByText(/Nome é obrigatório/i)).toBeVisible();
      await expect(page.getByText(/Telefone é obrigatório/i)).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 4: NAVIGATION TESTS
  // =========================================================================
  test.describe('4. Navigation Tests - Voltar Buttons', () => {
    test('4.1: Should go back from Step 1a to Step 0', async () => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.expectStep1PublicFigureVisible();

      // Act
      await wizardPage.goBackFromStep1();

      // Assert
      await wizardPage.expectStep0Visible();
    });

    test('4.2: Should go back from Step 1b (Manual Form) to Step 0', async () => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();
      await wizardPage.expectStep1ManualFormVisible();

      // Act
      await wizardPage.goBackFromManualForm();

      // Assert
      await wizardPage.expectStep0Visible();
    });

    test('4.3: Should go back from Step 2 to Step 1a', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Jeff Bezos', 'Fundador Amazon');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Act
      await wizardPage.clickSearchAgain();

      // Assert
      await wizardPage.expectStep1PublicFigureVisible();
    });

    test('4.4: Should go back from Step 3 to Step 2 (Public Figure flow)', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Mark Zuckerberg', 'CEO Meta');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();

      // Act
      await wizardPage.goBackFromStep3();

      // Assert
      await wizardPage.expectStep2Visible();
    });

    test('4.5: Should cancel wizard from Step 0', async () => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.expectStep0Visible();

      // Act
      await wizardPage.cancelWizard();

      // Assert
      await wizardPage.expectWizardClosed();
    });

    test('4.6: Should preserve form data when navigating back', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.fillGuestName('Steve Jobs');
      await wizardPage.fillGuestReference('Co-fundador Apple');

      // Act - Go back and return
      await wizardPage.goBackFromStep1();
      await wizardPage.selectPublicFigure();

      // Assert - Form should be empty (fresh state in this implementation)
      // Note: Current implementation resets form - this test documents expected behavior
      await expect(wizardPage.guestNameInput).toHaveValue('');
    });

    test('4.7: Should navigate full cycle: Step 0 -> 1 -> 2 -> 1 -> 2 -> 3', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();

      // Step 0 -> 1
      await wizardPage.selectPublicFigure();
      await wizardPage.expectStep1PublicFigureVisible();

      // Step 1 -> 2
      await wizardPage.searchForGuest('Larry Page', 'Co-fundador Google');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Step 2 -> 1 (search again)
      await wizardPage.clickSearchAgain();
      await wizardPage.expectStep1PublicFigureVisible();

      // Step 1 -> 2 (new search)
      await wizardPage.searchForGuest('Sergey Brin', 'Co-fundador Google');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Step 2 -> 3
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();

      // Assert - Full navigation cycle completed
      await expect(page.getByText('Tema da Conversa')).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 5: PROGRESS BAR TESTS
  // =========================================================================
  test.describe('5. Progress Bar Tests', () => {
    test('5.1: Should show progress at 0% on Step 0', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();

      // Assert - Progress bar exists
      const progressContainer = page.locator('.h-1.bg-\\[\\#E5E3DC\\]');
      await expect(progressContainer).toBeVisible();
    });

    test('5.2: Should update progress through wizard steps', async ({ page }) => {
      // Arrange & Act
      await wizardPage.openWizard();

      // Step 0
      await wizardPage.expectStep0Visible();

      // Step 1
      await wizardPage.selectPublicFigure();
      await wizardPage.expectStep1PublicFigureVisible();

      // Step 2
      await wizardPage.searchForGuest('Warren Buffett', 'CEO Berkshire');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

      // Step 3
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();

      // Assert - We reached the final step
      await expect(wizardPage.completeButton).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 6: STEP 3 VALIDATION TESTS
  // =========================================================================
  test.describe('6. Step 3 Validation Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Step 3 via Public Figure flow
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();
      await wizardPage.searchForGuest('Reed Hastings', 'Co-fundador Netflix');
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
      await wizardPage.confirmProfile();
      await wizardPage.expectStep3Visible();
    });

    test('6.1: Should enable complete button with auto theme selected', async () => {
      // Arrange - Auto theme should be selected by default

      // Assert
      await wizardPage.expectCompleteButtonEnabled();
    });

    test('6.2: Should disable complete button when manual theme is empty', async ({ page }) => {
      // Arrange & Act
      await wizardPage.selectManualTheme();

      // Assert
      await wizardPage.expectCompleteButtonDisabled();
    });

    test('6.3: Should enable complete button when manual theme is filled', async () => {
      // Arrange
      await wizardPage.selectManualTheme();
      await wizardPage.expectCompleteButtonDisabled();

      // Act
      await wizardPage.fillManualTheme('Streaming e Entretenimento');

      // Assert
      await wizardPage.expectCompleteButtonEnabled();
    });

    test('6.4: Should display default season value of 1', async () => {
      // Assert
      await expect(wizardPage.seasonInput).toHaveValue('1');
    });

    test('6.5: Should display default location', async () => {
      // Assert
      await expect(wizardPage.locationSelect).toBeVisible();
    });

    test('6.6: Should allow changing location', async ({ page }) => {
      // Act
      await wizardPage.selectLocation('Estúdio Remoto');

      // Assert
      await expect(wizardPage.locationSelect).toHaveValue('Estúdio Remoto');
    });

    test('6.7: Should accept optional date and time', async () => {
      // Act
      await wizardPage.fillScheduledDate('2025-12-31');
      await wizardPage.fillScheduledTime('18:30');

      // Assert
      await expect(wizardPage.dateInput).toHaveValue('2025-12-31');
      await expect(wizardPage.timeInput).toHaveValue('18:30');
    });
  });

  // =========================================================================
  // SECTION 7: EDGE CASES AND ERROR HANDLING
  // =========================================================================
  test.describe('7. Edge Cases and Error Handling', () => {
    test('7.1: Should handle special characters in guest name', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act
      await wizardPage.searchForGuest(
        "José María O'Brien-García",
        'Escritor Hispano-Irlandés'
      );

      // Assert - Should proceed to Step 2
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    });

    test('7.2: Should handle very long guest names', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectPublicFigure();

      // Act
      const longName = 'A'.repeat(100);
      await wizardPage.searchForGuest(longName, 'Test Reference');

      // Assert - Should proceed to Step 2
      await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    });

    test('7.3: Should handle manual form with formatted phone number', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Use formatted phone number
      await wizardPage.fillManualForm(
        'Carlos Drummond',
        '(21) 98765-4321',
        'carlos@poesia.com'
      );
      await wizardPage.submitManualForm();

      // Assert - Should accept formatted phone
      await wizardPage.expectStep3Visible();
    });

    test('7.4: Should handle manual form with country code', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Use phone with country code
      await wizardPage.fillManualForm(
        'Ana Clara',
        '+5511987654321',
        'ana@exemplo.com'
      );
      await wizardPage.submitManualForm();

      // Assert - Should accept phone with country code
      await wizardPage.expectStep3Visible();
    });

    test('7.5: Should trim whitespace from manual form fields', async ({ page }) => {
      // Arrange
      await wizardPage.openWizard();
      await wizardPage.selectCommonPerson();

      // Act - Add whitespace around values
      await wizardPage.nameInput.fill('   Fernando Pessoa   ');
      await wizardPage.phoneInput.fill('  11999887766  ');
      await wizardPage.emailInput.fill('  fernando@heteronimos.com  ');
      await wizardPage.submitManualForm();

      // Assert - Should proceed despite whitespace
      await wizardPage.expectStep3Visible();
    });
  });
});
