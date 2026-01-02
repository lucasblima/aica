/**
 * GuestWizardPage - Page Object Model for GuestIdentificationWizard
 *
 * Provides reusable methods for interacting with the Guest Identification Wizard
 * across multiple test scenarios. Supports both Public Figure and Common Person flows.
 *
 * Component: src/modules/podcast/components/GuestIdentificationWizard.tsx
 */

import { Page, Locator, expect } from '@playwright/test';

export class GuestWizardPage {
  readonly page: Page;

  // Step 0: Guest Type Selection
  readonly guestTypeTitle: Locator;
  readonly publicFigureOption: Locator;
  readonly commonPersonOption: Locator;
  readonly cancelButtonStep0: Locator;
  readonly helpTipBox: Locator;

  // Step 1a: Public Figure - Name & Reference
  readonly step1Title: Locator;
  readonly guestNameInput: Locator;
  readonly guestReferenceInput: Locator;
  readonly searchProfileButton: Locator;
  readonly searchingIndicator: Locator;
  readonly searchErrorMessage: Locator;
  readonly backButtonStep1: Locator;

  // Step 1b: Common Person - Manual Form
  readonly manualFormTitle: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly nameErrorMessage: Locator;
  readonly phoneErrorMessage: Locator;
  readonly emailErrorMessage: Locator;
  readonly continueButton: Locator;
  readonly backButtonManualForm: Locator;

  // Step 2: Profile Confirmation (Public Figure only)
  readonly step2Title: Locator;
  readonly profileCard: Locator;
  readonly profileName: Locator;
  readonly profileTitle: Locator;
  readonly profileSummary: Locator;
  readonly searchAgainButton: Locator;

  // Step 3: Episode Details
  readonly step3GuestName: Locator;
  readonly themeLabel: Locator;
  readonly aicaAutoButton: Locator;
  readonly manualThemeButton: Locator;
  readonly manualThemeInput: Locator;
  readonly seasonInput: Locator;
  readonly locationSelect: Locator;
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly backButtonStep3: Locator;
  readonly completeButton: Locator;
  readonly creatingEpisodeIndicator: Locator;

  // Progress Bar
  readonly progressBar: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 0: Guest Type Selection
    this.guestTypeTitle = page.getByText('Quem e seu convidado?').or(page.getByText('Quem é seu convidado?'));
    this.publicFigureOption = page.locator('[data-testid="guest-type-public-figure"]');
    this.commonPersonOption = page.locator('[data-testid="guest-type-common-person"]');
    this.cancelButtonStep0 = page.locator('[data-testid="guest-wizard-cancel"]');
    this.helpTipBox = page.locator('.bg-gray-50').filter({ hasText: /Dica/i });

    // Step 1a: Public Figure - Name & Reference
    this.step1Title = page.getByText('Quem será entrevistado?');
    this.guestNameInput = page.locator('[data-testid="guest-wizard-name"]');
    this.guestReferenceInput = page.locator('[data-testid="guest-wizard-reference"]');
    this.searchProfileButton = page.locator('[data-testid="guest-wizard-search"]');
    this.searchingIndicator = page.getByText(/Buscando.../i);
    this.searchErrorMessage = page.getByText(/Busca automática falhou/i);
    this.backButtonStep1 = page.locator('[data-testid="guest-wizard-back-step1"]');

    // Step 1b: Common Person - Manual Form
    this.manualFormTitle = page.getByText('Dados do Convidado');
    this.nameInput = page.locator('[data-testid="guest-manual-name"]');
    this.phoneInput = page.locator('[data-testid="guest-manual-phone"]');
    this.emailInput = page.locator('[data-testid="guest-manual-email"]');
    this.nameErrorMessage = page.locator('.text-red-600').filter({ hasText: /Nome/i });
    this.phoneErrorMessage = page.locator('.text-red-600').filter({ hasText: /Telefone/i });
    this.emailErrorMessage = page.locator('.text-red-600').filter({ hasText: /Email/i });
    this.continueButton = page.locator('[data-testid="guest-manual-submit"]');
    this.backButtonManualForm = page.locator('[data-testid="guest-manual-back"]');

    // Step 2: Profile Confirmation
    this.step2Title = page.getByText('Confirme o convidado');
    this.profileCard = page.locator('button').filter({ has: page.locator('.rounded-xl.bg-gradient-to-br, .rounded-xl.bg-white') });
    this.profileName = page.locator('.font-bold.text-ceramic-text-primary, h3.font-bold');
    this.profileTitle = page.locator('.text-ceramic-text-secondary.text-sm, p.text-gray-600');
    this.profileSummary = page.locator('.text-ceramic-text-tertiary.text-xs, p.text-xs');
    this.searchAgainButton = page.locator('[data-testid="guest-wizard-search-again"]');

    // Step 3: Episode Details
    this.step3GuestName = page.locator('.text-xl.font-bold');
    this.themeLabel = page.getByText('Tema da Conversa');
    this.aicaAutoButton = page.getByRole('button', { name: /Aica Auto/i });
    this.manualThemeButton = page.getByRole('button', { name: /Manual/i }).filter({ hasText: 'Manual' });
    this.manualThemeInput = page.getByPlaceholder(/Políticas Públicas, Empreendedorismo/i);
    this.seasonInput = page.locator('input[type="number"]').first();
    this.locationSelect = page.locator('select').first();
    this.dateInput = page.locator('input[type="date"]');
    this.timeInput = page.locator('input[type="time"]');
    this.backButtonStep3 = page.locator('[data-testid="guest-wizard-back-step3"]');
    this.completeButton = page.locator('[data-testid="guest-wizard-complete"]');
    this.creatingEpisodeIndicator = page.getByText(/Criando Episódio.../i);

    // Progress Bar
    this.progressBar = page.locator('.h-1.bg-gradient-to-r');
  }

  // ============= NAVIGATION HELPERS =============

  async openWizard() {
    const newEpisodeButton = this.page
      .getByRole('button', { name: /novo episódio|criar episódio|new episode/i })
      .or(this.page.locator('[data-testid="new-episode-button"]'))
      .or(this.page.getByText('Novo Episódio').first());

    await newEpisodeButton.click();
    await expect(this.guestTypeTitle.or(this.step1Title)).toBeVisible({ timeout: 5000 });
  }

  async navigateToPodcastView() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // Step 1: Click Podcast Copilot card on Home to navigate to Studio
    const podcastCard = this.page
      .locator('text=Podcast Copilot')
      .or(this.page.locator('text=Studio'))
      .locator('..')
      .first();

    await podcastCard.click();

    // Step 2: Wait for StudioLibrary to load
    await expect(
      this.page.locator('[data-testid="studio-library"]')
    ).toBeVisible({ timeout: 10000 });

    // Step 3: Check if any show cards exist, if not create one
    const showCards = this.page.locator('[data-testid="show-card"]');
    const showCardsCount = await showCards.count();

    if (showCardsCount === 0) {
      // No shows exist, create a default test show
      console.log('[navigateToPodcastView] No shows found, creating test show...');

      // Click "Criar Novo" button
      await this.page.locator('[data-testid="create-new-button"]').click();

      // Wait for dialog to open
      await expect(this.page.getByText('Novo Podcast')).toBeVisible({ timeout: 5000 });

      // Fill in show details
      await this.page.getByPlaceholder(/Ex: Sal na Veia/i).fill('Test Podcast Show');
      await this.page.getByPlaceholder(/Sobre o que é o seu podcast/i).fill('Test description for E2E tests');

      // Submit
      await this.page.getByRole('button', { name: /criar podcast/i }).click();

      // Wait for dialog to close
      await expect(this.page.getByText('Novo Podcast')).not.toBeVisible({ timeout: 5000 });

      // Wait for show to be created and show card to be visible in reloaded library
      await this.page.waitForTimeout(1000);
      await expect(this.page.locator('[data-testid="show-card"]').first()).toBeVisible({ timeout: 10000 });
    }

    // Step 4: Click on the first show card to navigate to PodcastShowPage
    await this.page.locator('[data-testid="show-card"]').first().click();

    // Step 5: Wait for PodcastShowPage to load (use specific testid to avoid strict mode violation)
    await expect(
      this.page.locator('[data-testid="new-episode-button"]')
    ).toBeVisible({ timeout: 10000 });
  }

  // ============= STEP 0 ACTIONS =============

  async selectPublicFigure() {
    await this.publicFigureOption.click();
  }

  async selectCommonPerson() {
    await this.commonPersonOption.click();
  }

  async expectStep0Visible() {
    await expect(this.guestTypeTitle).toBeVisible();
    await expect(this.publicFigureOption).toBeVisible();
    await expect(this.commonPersonOption).toBeVisible();
  }

  async expectPublicFigureSelected() {
    await expect(this.publicFigureOption).toHaveClass(/border-blue-500/);
  }

  async expectCommonPersonSelected() {
    await expect(this.commonPersonOption).toHaveClass(/border-green-500/);
  }

  // ============= STEP 1a ACTIONS (Public Figure) =============

  async fillGuestName(name: string) {
    await this.guestNameInput.fill(name);
  }

  async fillGuestReference(reference: string) {
    await this.guestReferenceInput.fill(reference);
  }

  async clickSearchProfile() {
    await this.searchProfileButton.click();
  }

  async searchForGuest(name: string, reference?: string) {
    await this.fillGuestName(name);
    if (reference) {
      await this.fillGuestReference(reference);
    }
    await this.clickSearchProfile();
  }

  async expectStep1PublicFigureVisible() {
    await expect(this.step1Title).toBeVisible();
    await expect(this.guestNameInput).toBeVisible();
    await expect(this.guestReferenceInput).toBeVisible();
    await expect(this.searchProfileButton).toBeVisible();
  }

  async expectSearchButtonDisabled() {
    await expect(this.searchProfileButton).toBeDisabled();
  }

  async expectSearchButtonEnabled() {
    await expect(this.searchProfileButton).toBeEnabled();
  }

  // ============= STEP 1b ACTIONS (Common Person) =============

  async fillManualForm(name: string, phone: string, email: string) {
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.emailInput.fill(email);
  }

  async submitManualForm() {
    await this.continueButton.click();
  }

  async expectStep1ManualFormVisible() {
    await expect(this.manualFormTitle).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
  }

  async expectNameError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(this.nameErrorMessage).toBeVisible();
    }
  }

  async expectPhoneError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(this.phoneErrorMessage).toBeVisible();
    }
  }

  async expectEmailError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(this.emailErrorMessage).toBeVisible();
    }
  }

  async blurNameField() {
    await this.nameInput.blur();
  }

  async blurPhoneField() {
    await this.phoneInput.blur();
  }

  async blurEmailField() {
    await this.emailInput.blur();
  }

  // ============= STEP 2 ACTIONS =============

  async confirmProfile() {
    await this.profileCard.first().click();
  }

  async clickSearchAgain() {
    await this.searchAgainButton.click();
  }

  async expectStep2Visible() {
    await expect(this.step2Title).toBeVisible();
    await expect(this.profileCard.first()).toBeVisible();
  }

  async expectProfileDisplayed(name: string) {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  // ============= STEP 3 ACTIONS =============

  async selectAutoTheme() {
    await this.aicaAutoButton.click();
  }

  async selectManualTheme() {
    await this.manualThemeButton.click();
  }

  async fillManualTheme(theme: string) {
    await this.manualThemeInput.fill(theme);
  }

  async fillSeason(season: string) {
    await this.seasonInput.fill(season);
  }

  async selectLocation(location: string) {
    await this.locationSelect.selectOption(location);
  }

  async fillScheduledDate(date: string) {
    await this.dateInput.fill(date);
  }

  async fillScheduledTime(time: string) {
    await this.timeInput.fill(time);
  }

  async completeWizard() {
    await this.completeButton.click();
  }

  async fillEpisodeDetails(options: {
    themeMode?: 'auto' | 'manual';
    theme?: string;
    season?: string;
    location?: string;
    date?: string;
    time?: string;
  }) {
    if (options.themeMode === 'manual') {
      await this.selectManualTheme();
      if (options.theme) {
        await this.fillManualTheme(options.theme);
      }
    } else {
      await this.selectAutoTheme();
    }

    if (options.season) {
      await this.fillSeason(options.season);
    }

    if (options.location) {
      await this.selectLocation(options.location);
    }

    if (options.date) {
      await this.fillScheduledDate(options.date);
    }

    if (options.time) {
      await this.fillScheduledTime(options.time);
    }
  }

  async expectStep3Visible() {
    await expect(this.themeLabel).toBeVisible();
    await expect(this.aicaAutoButton).toBeVisible();
    await expect(this.seasonInput).toBeVisible();
  }

  async expectCompleteButtonDisabled() {
    await expect(this.completeButton).toBeDisabled();
  }

  async expectCompleteButtonEnabled() {
    await expect(this.completeButton).toBeEnabled();
  }

  // ============= NAVIGATION ACTIONS =============

  async goBackFromStep1() {
    await this.backButtonStep1.click();
  }

  async goBackFromManualForm() {
    await this.backButtonManualForm.click();
  }

  async goBackFromStep3() {
    await this.backButtonStep3.click();
  }

  async cancelWizard() {
    await this.cancelButtonStep0.click();
  }

  // ============= VERIFICATION HELPERS =============

  async expectWizardClosed() {
    await expect(this.guestTypeTitle).not.toBeVisible({ timeout: 3000 });
    await expect(this.step1Title).not.toBeVisible({ timeout: 1000 });
  }

  async expectPreProductionVisible() {
    await expect(
      this.page.getByText('Pauta')
        .or(this.page.getByText('Deep Research'))
        .or(this.page.getByText('Bio'))
    ).toBeVisible({ timeout: 10000 });
  }
}

export default GuestWizardPage;
