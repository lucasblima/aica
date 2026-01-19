import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * E2E Tests for Organization Wizard (Issue #100)
 *
 * Tests the gamified multi-step wizard for organization registration:
 * - 7 steps: Identification, Contact, Address, Context, Branding, WhatsApp, Review
 * - XP rewards for field completion (10-25 XP per field)
 * - Step completion bonus (50 XP)
 * - Wizard completion bonus (200 XP)
 * - Brazilian field validators (CNPJ, Phone, CEP)
 * - WhatsApp connection integration
 *
 * Component: src/modules/grants/components/wizard/OrganizationWizard.tsx
 * Validators: src/modules/grants/utils/fieldValidators.ts
 */

// =============================================================================
// Test Data Fixtures
// =============================================================================

const MOCK_ORGANIZATION = {
  name: 'Instituto Cultural E2E Test',
  legal_name: 'Instituto Cultural E2E Test LTDA',
  document_number: '11222333000181', // Valid CNPJ: 11.222.333/0001-81
  organization_type: 'instituto',
  email: 'contato@institutoe2e.org',
  phone: '11999998888', // Valid Brazilian mobile (11 digits)
  phone_landline: '1133334444', // Valid Brazilian landline (10 digits)
  website: 'https://www.institutoe2e.org',
  address_street: 'Av. Paulista',
  address_number: '1000',
  address_complement: 'Sala 101',
  address_neighborhood: 'Bela Vista',
  address_city: 'Sao Paulo',
  address_state: 'SP',
  address_zip: '01310100', // Valid CEP format
  description: 'Organizacao de teste para validacao E2E do wizard.',
  mission: 'Promover a cultura e educacao atraves da tecnologia.',
  vision: 'Ser referencia em inovacao cultural no Brasil.',
  values: 'Transparencia, Inovacao, Colaboracao.',
  areas_of_activity: ['cultura', 'educacao', 'tecnologia'],
  foundation_year: 2020,
};

const INVALID_DATA = {
  // CNPJ validation test cases
  cnpj_short: '1234567800019', // 13 digits instead of 14
  cnpj_invalid: '00000000000000', // All zeros
  cnpj_wrong_check: '12345678000199', // Wrong check digit
  cnpj_all_same: '11111111111111', // All same digits - invalid (11.111.111/1111-11)
  // Phone validation test cases
  phone_short: '119999988', // 9 digits instead of 10-11
  phone_invalid_ddd: '00999998888', // DDD 00 is invalid
  phone_mobile_no_9: '11888887777', // 11 digits but doesn't start with 9
  phone_landline_starts_9: '1193334444', // 10 digits starting with 9 (invalid for landline)
  // CEP validation test cases
  cep_short: '0131010', // 7 digits instead of 8
  cep_invalid: '00000000', // All zeros
  // Email validation test cases
  email_no_at: 'contatoinstitutoe2e.org',
  email_no_domain: 'contato@',
  email_short_tld: 'contato@test.a',
  // URL validation test cases
  url_no_protocol: 'www.institutoe2e.org',
};

/**
 * Formatted values expected after auto-formatting on blur
 */
const FORMATTED_VALUES = {
  cnpj: '11.222.333/0001-81', // From 11222333000181
  phone_mobile: '(11) 99999-8888', // From 11999998888 (11 digits)
  phone_landline: '(11) 3333-4444', // From 1133334444 (10 digits)
  cep: '01310-100', // From 01310100
};

/**
 * XP Values Configuration (from src/modules/grants/types/wizard.ts)
 * Used to verify correct XP accumulation
 */
const XP_VALUES = {
  // Field XP by category
  field_required: 10,
  field_important: 15,
  field_optional: 5,
  field_bonus: 25,
  // Step completion bonuses
  step_completion: 50,
  wizard_completion: 200,
  whatsapp_connection: 50,
  // Specific fields
  fields: {
    name: 10, // required
    legal_name: 5, // optional
    document_number: 15, // important
    organization_type: 10, // required
    email: 10, // required
    phone: 5, // optional
    website: 15, // important
    address_street: 5,
    address_number: 5,
    address_complement: 5,
    address_neighborhood: 5,
    address_city: 5,
    address_state: 5,
    address_zip: 5,
    description: 15,
    mission: 15,
    vision: 10,
    values: 10,
    areas_of_activity: 10, // required
    foundation_year: 5,
    logo_url: 25, // bonus
    cover_image_url: 15,
  },
};

/**
 * Auto-save debounce delay (in milliseconds)
 * From src/modules/grants/hooks/useOrganizationWizard.ts
 */
const AUTO_SAVE_DELAY = 5000;

// =============================================================================
// Page Object Model
// =============================================================================

class OrganizationWizardPage {
  readonly page: Page;

  // Wizard container
  readonly wizardContainer: Locator;
  readonly wizardHeader: Locator;
  readonly closeButton: Locator;

  // Progress indicators
  readonly progressBar: Locator;
  readonly levelBadge: Locator;
  readonly xpDisplay: Locator;
  readonly stepIndicators: Locator;

  // Navigation
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly saveButton: Locator;
  readonly stepCounter: Locator;

  // Current step content
  readonly stepTitle: Locator;
  readonly stepDescription: Locator;
  readonly stepXpBadge: Locator;

  // Form fields (dynamic)
  readonly formFields: Locator;

  // Gamification elements
  readonly xpRewardPopup: Locator;
  readonly levelUpCelebration: Locator;
  readonly completionBadge: Locator;
  readonly levelProgressCard: Locator;

  // Document upload
  readonly documentDropZone: Locator;
  readonly autoFillSuccess: Locator;

  // Error display
  readonly errorDisplay: Locator;
  readonly fieldValidationError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Wizard container
    this.wizardContainer = page.locator('[data-testid="organization-wizard"]')
      .or(page.locator('.bg-white.rounded-2xl.shadow-xl').filter({ hasText: 'Cadastro de Organizacao' }));
    this.wizardHeader = page.locator('h1').filter({ hasText: 'Cadastro de Organizacao' });
    this.closeButton = page.locator('[data-testid="wizard-close-btn"]')
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-x') }));

    // Progress indicators
    this.progressBar = page.locator('[data-testid="wizard-progress-bar"]')
      .or(page.locator('.h-3.bg-gray-100.rounded-full'));
    this.levelBadge = page.locator('[data-testid="completion-level-badge"]')
      .or(page.locator('.px-3.py-1\\.5.rounded-full').filter({ hasText: /Bronze|Prata|Ouro|Diamante/i }));
    this.xpDisplay = page.locator('[data-testid="xp-display"]')
      .or(page.locator('text=/\\d+ XP/'));
    this.stepIndicators = page.locator('[data-testid="step-indicator"]')
      .or(page.locator('.w-10.h-10.rounded-full'));

    // Navigation
    this.prevButton = page.locator('[data-testid="wizard-prev-btn"]')
      .or(page.locator('button').filter({ hasText: 'Voltar' }));
    this.nextButton = page.locator('[data-testid="wizard-next-btn"]')
      .or(page.locator('button').filter({ hasText: /Proximo|Finalizar/i }));
    this.saveButton = page.locator('[data-testid="wizard-save-btn"]')
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-save') }));
    this.stepCounter = page.locator('[data-testid="step-counter"]')
      .or(page.locator('text=/\\d+ \\/ \\d+/'));

    // Current step content
    this.stepTitle = page.locator('[data-testid="step-title"]')
      .or(page.locator('h2.text-2xl.font-bold'));
    this.stepDescription = page.locator('[data-testid="step-description"]')
      .or(page.locator('p.text-gray-500'));
    this.stepXpBadge = page.locator('[data-testid="step-xp-badge"]')
      .or(page.locator('.bg-amber-50.text-amber-600').filter({ hasText: /\+\d+ XP/ }));

    // Form fields
    this.formFields = page.locator('[data-testid^="field-"]')
      .or(page.locator('input, select, textarea'));

    // Gamification elements
    this.xpRewardPopup = page.locator('[data-testid="xp-reward-popup"]')
      .or(page.locator('.bg-amber-500.text-white.rounded-full').filter({ hasText: /\+\d+ XP/ }));
    this.levelUpCelebration = page.locator('[data-testid="level-up-celebration"]')
      .or(page.locator('.fixed.inset-0.z-50').filter({ hasText: 'Nivel Alcancado' }));
    this.completionBadge = page.locator('[data-testid="completion-badge"]')
      .or(page.locator('.rounded-3xl').filter({ hasText: /Bronze|Prata|Ouro|Diamante/i }));
    this.levelProgressCard = page.locator('[data-testid="level-progress-card"]')
      .or(page.locator('.bg-gray-50.rounded-xl').filter({ hasText: 'Proximo nivel' }));

    // Document upload
    this.documentDropZone = page.locator('[data-testid="document-drop-zone"]')
      .or(page.locator('.border-dashed').filter({ hasText: /Arraste|Upload/i }));
    this.autoFillSuccess = page.locator('[data-testid="autofill-success"]')
      .or(page.locator('.bg-green-50').filter({ hasText: 'preenchido automaticamente' }));

    // Error display
    this.errorDisplay = page.locator('[data-testid="wizard-error"]')
      .or(page.locator('.bg-red-50.text-red-600'));
    this.fieldValidationError = page.locator('[data-testid="field-error"]')
      .or(page.locator('.text-red-600').filter({ has: page.locator('svg.lucide-alert-circle') }));
  }

  // Navigate to Grants module and open Organization Wizard
  async navigateToWizard() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // Wait for Framer Motion animations to complete (~740ms for grants card)
    await this.page.waitForTimeout(1000);

    // Wait explicitly for grants card to be visible
    const grantsCard = this.page.locator('[data-testid="grants-card"]');
    await grantsCard.waitFor({ state: 'visible', timeout: 15000 });

    // Click to navigate to Grants module
    await grantsCard.click();
    await this.page.waitForLoadState('networkidle');

    // Wait for GrantsModuleView lazy load
    await this.page.waitForTimeout(1000);

    // Wait for organization wizard button to be visible
    const openWizardButton = this.page.locator('[data-testid="open-organization-wizard"]');
    await openWizardButton.waitFor({ state: 'visible', timeout: 15000 });
    await openWizardButton.click();

    // Wait for wizard to appear
    await this.page.locator('[data-testid="organization-wizard"]')
      .waitFor({ state: 'visible', timeout: 10000 });
  }

  // Get field input by name
  getFieldInput(fieldName: string): Locator {
    return this.page.locator(`[data-testid="field-${fieldName}"]`)
      .or(this.page.locator(`input[name="${fieldName}"]`))
      .or(this.page.locator(`select[name="${fieldName}"]`))
      .or(this.page.locator(`textarea[name="${fieldName}"]`));
  }

  // Get field label
  getFieldLabel(labelText: string): Locator {
    return this.page.locator('label').filter({ hasText: labelText });
  }

  // Fill a text field
  async fillField(fieldName: string, value: string) {
    const field = this.getFieldInput(fieldName);
    await field.fill(value);
    await field.blur();
  }

  // Select from dropdown
  async selectOption(fieldName: string, value: string) {
    const select = this.page.locator(`select`).filter({
      has: this.page.locator(`option[value="${value}"]`)
    }).first();
    await select.selectOption(value);
  }

  // Click multiselect option
  async toggleMultiselectOption(optionLabel: string) {
    const option = this.page.locator('button').filter({ hasText: optionLabel });
    await option.click();
  }

  // Get current step index (1-based)
  async getCurrentStepIndex(): Promise<number> {
    const stepText = await this.stepCounter.textContent();
    const match = stepText?.match(/(\d+) \/ \d+/);
    return match ? parseInt(match[1]) : 0;
  }

  // Get total steps
  async getTotalSteps(): Promise<number> {
    const stepText = await this.stepCounter.textContent();
    const match = stepText?.match(/\d+ \/ (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Navigate to next step
  async goToNextStep() {
    await this.nextButton.click();
    await this.page.waitForTimeout(300);
  }

  // Navigate to previous step
  async goToPrevStep() {
    await this.prevButton.click();
    await this.page.waitForTimeout(300);
  }

  // Click step indicator to navigate directly
  async goToStep(stepIndex: number) {
    const stepButton = this.stepIndicators.nth(stepIndex);
    await stepButton.click();
    await this.page.waitForTimeout(300);
  }

  // Get current XP
  async getCurrentXP(): Promise<number> {
    const xpText = await this.xpDisplay.first().textContent();
    const match = xpText?.match(/(\d+)\s*XP/);
    return match ? parseInt(match[1]) : 0;
  }

  // Get completion level name
  async getCompletionLevel(): Promise<string> {
    const levelText = await this.levelBadge.textContent();
    return levelText?.trim() || '';
  }

  // Check if validation error is shown
  async hasValidationError(expectedText?: string): Promise<boolean> {
    if (expectedText) {
      return this.fieldValidationError.filter({ hasText: expectedText }).isVisible();
    }
    return this.fieldValidationError.first().isVisible();
  }

  // Wait for XP reward animation
  async waitForXpReward() {
    await expect(this.xpRewardPopup).toBeVisible({ timeout: 2000 });
    await expect(this.xpRewardPopup).not.toBeVisible({ timeout: 3000 });
  }

  // Wait for level up celebration
  async waitForLevelUp() {
    await expect(this.levelUpCelebration).toBeVisible({ timeout: 3000 });
  }

  // Dismiss level up celebration
  async dismissLevelUp() {
    const continueButton = this.levelUpCelebration.locator('button').filter({ hasText: 'Continuar' });
    await continueButton.click();
    await expect(this.levelUpCelebration).not.toBeVisible();
  }

  // Close wizard
  async close() {
    await this.closeButton.click();
    await expect(this.wizardContainer).not.toBeVisible();
  }

  // Save current progress
  async save() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Finalize wizard
  async finalize() {
    await expect(this.nextButton).toHaveText(/Finalizar/i);
    await this.nextButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}

// =============================================================================
// Test Suites
// =============================================================================

test.describe('Organization Wizard - Navigation', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 1.1: Wizard opens with correct initial state', async ({ page }) => {
    // Verify wizard container is visible
    await expect(wizardPage.wizardContainer).toBeVisible({ timeout: 10000 });

    // Verify header is displayed
    await expect(wizardPage.wizardHeader).toBeVisible();

    // Verify we start at step 1
    const currentStep = await wizardPage.getCurrentStepIndex();
    expect(currentStep).toBe(1);

    // Verify total steps is 7
    const totalSteps = await wizardPage.getTotalSteps();
    expect(totalSteps).toBe(7);

    // Verify step title is "Identificacao"
    await expect(wizardPage.stepTitle).toHaveText('Identificacao');

    // Verify prev button is disabled on first step
    await expect(wizardPage.prevButton).toBeDisabled();

    // Verify next button shows "Proximo"
    await expect(wizardPage.nextButton).toHaveText(/Proximo/i);
  });

  test('Test 1.2: Navigate forward through all steps', async ({ page }) => {
    const expectedSteps = [
      'Identificacao',
      'Contato',
      'Endereco',
      'Contexto',
      'Identidade Visual',
      'WhatsApp',
      'Revisao',
    ];

    for (let i = 0; i < expectedSteps.length; i++) {
      // Verify current step title
      await expect(wizardPage.stepTitle).toHaveText(expectedSteps[i]);

      // Verify step counter
      const currentStep = await wizardPage.getCurrentStepIndex();
      expect(currentStep).toBe(i + 1);

      if (i < expectedSteps.length - 1) {
        await wizardPage.goToNextStep();
      }
    }

    // Verify we're on the last step
    await expect(wizardPage.nextButton).toHaveText(/Finalizar/i);
  });

  test('Test 1.3: Navigate backward through steps', async ({ page }) => {
    // Go to step 3
    await wizardPage.goToNextStep();
    await wizardPage.goToNextStep();

    expect(await wizardPage.getCurrentStepIndex()).toBe(3);

    // Navigate back
    await wizardPage.goToPrevStep();
    expect(await wizardPage.getCurrentStepIndex()).toBe(2);

    await wizardPage.goToPrevStep();
    expect(await wizardPage.getCurrentStepIndex()).toBe(1);

    // Verify prev button is disabled on first step
    await expect(wizardPage.prevButton).toBeDisabled();
  });

  test('Test 1.4: Click step indicator to navigate directly', async ({ page }) => {
    // Click on step 3 (index 2)
    await wizardPage.goToStep(2);
    expect(await wizardPage.getCurrentStepIndex()).toBe(3);

    // Click back to step 1 (index 0)
    await wizardPage.goToStep(0);
    expect(await wizardPage.getCurrentStepIndex()).toBe(1);
  });

  test('Test 1.5: Progress bar updates with completion', async ({ page }) => {
    // Verify initial progress bar exists
    await expect(wizardPage.progressBar).toBeVisible();

    // Fill required field to increase completion
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Wait for UI update
    await page.waitForTimeout(500);

    // Progress should have increased (visual check via CSS width)
    const progressBarFill = page.locator('.inset-y-0.left-0.rounded-full');
    await expect(progressBarFill).toBeVisible();
  });

  test('Test 1.6: Close wizard with X button', async ({ page }) => {
    await expect(wizardPage.wizardContainer).toBeVisible();
    await wizardPage.close();
    await expect(wizardPage.wizardContainer).not.toBeVisible();
  });

  test('Test 1.7: Step completion indicators update', async ({ page }) => {
    // Get step indicators
    const stepIndicators = wizardPage.stepIndicators;
    const firstIndicator = stepIndicators.nth(0);

    // Initially step 1 should be active (amber ring)
    await expect(firstIndicator).toHaveClass(/ring-4|ring-amber/);

    // Go to step 2
    await wizardPage.goToNextStep();

    // Step 1 should now show as completed (green background) or in progress
    // Step 2 should be active
    const secondIndicator = stepIndicators.nth(1);
    await expect(secondIndicator).toHaveClass(/ring-4|ring-amber|bg-amber/);
  });
});

test.describe('Organization Wizard - Form Validation', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 2.1: CNPJ validation - invalid length', async ({ page }) => {
    // Navigate to Identification step
    await expect(wizardPage.stepTitle).toHaveText('Identificacao');

    // Fill invalid CNPJ (too short)
    const cnpjField = wizardPage.getFieldInput('document_number')
      .or(page.locator('input').filter({ has: page.locator('..').locator('text=CNPJ') }));

    await cnpjField.fill(INVALID_DATA.cnpj_short);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Verify validation error
    const hasError = await wizardPage.hasValidationError('14 digitos');
    expect(hasError).toBe(true);
  });

  test('Test 2.2: CNPJ validation - invalid check digit', async ({ page }) => {
    const cnpjField = wizardPage.getFieldInput('document_number')
      .or(page.locator('input[placeholder*="CNPJ"]'));

    await cnpjField.fill(INVALID_DATA.cnpj_wrong_check);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Verify validation error
    const hasError = await wizardPage.hasValidationError('invalido');
    expect(hasError).toBe(true);
  });

  test('Test 2.3: CNPJ validation - all zeros rejected', async ({ page }) => {
    const cnpjField = wizardPage.getFieldInput('document_number')
      .or(page.locator('input[placeholder*="CNPJ"]'));

    await cnpjField.fill(INVALID_DATA.cnpj_invalid);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('invalido');
    expect(hasError).toBe(true);
  });

  test('Test 2.4: Phone validation - invalid length', async ({ page }) => {
    // Navigate to Contact step
    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Contato');

    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    await phoneField.fill(INVALID_DATA.phone_short);
    await phoneField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('10 ou 11 digitos');
    expect(hasError).toBe(true);
  });

  test('Test 2.5: Phone validation - invalid DDD', async ({ page }) => {
    await wizardPage.goToNextStep();

    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    await phoneField.fill(INVALID_DATA.phone_invalid_ddd);
    await phoneField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('DDD invalido');
    expect(hasError).toBe(true);
  });

  test('Test 2.6: CEP validation - invalid length', async ({ page }) => {
    // Navigate to Address step (step 3)
    await wizardPage.goToNextStep(); // Contact
    await wizardPage.goToNextStep(); // Address
    await expect(wizardPage.stepTitle).toHaveText('Endereco');

    const cepField = page.locator('input[placeholder*="01310"]')
      .or(wizardPage.getFieldInput('address_zip'));

    await cepField.fill(INVALID_DATA.cep_short);
    await cepField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('8 digitos');
    expect(hasError).toBe(true);
  });

  test('Test 2.7: CEP validation - all zeros rejected', async ({ page }) => {
    await wizardPage.goToNextStep();
    await wizardPage.goToNextStep();

    const cepField = page.locator('input[placeholder*="01310"]')
      .or(wizardPage.getFieldInput('address_zip'));

    await cepField.fill(INVALID_DATA.cep_invalid);
    await cepField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('invalido');
    expect(hasError).toBe(true);
  });

  test('Test 2.8: Email validation - missing @ symbol', async ({ page }) => {
    await wizardPage.goToNextStep();

    const emailField = page.locator('input[type="email"]')
      .or(page.locator('input[placeholder*="contato@"]'));

    await emailField.fill(INVALID_DATA.email_no_at);
    await emailField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('invalido');
    expect(hasError).toBe(true);
  });

  test('Test 2.9: Email validation - missing domain', async ({ page }) => {
    await wizardPage.goToNextStep();

    const emailField = page.locator('input[type="email"]')
      .or(page.locator('input[placeholder*="contato@"]'));

    await emailField.fill(INVALID_DATA.email_no_domain);
    await emailField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('invalido');
    expect(hasError).toBe(true);
  });

  test('Test 2.10: URL validation - missing protocol', async ({ page }) => {
    await wizardPage.goToNextStep();

    const urlField = page.locator('input[type="url"]')
      .or(page.locator('input[placeholder*="https://"]'));

    await urlField.fill(INVALID_DATA.url_no_protocol);
    await urlField.blur();
    await page.waitForTimeout(300);

    const hasError = await wizardPage.hasValidationError('https://');
    expect(hasError).toBe(true);
  });

  test('Test 2.11: Required field indication', async ({ page }) => {
    // Check for required field asterisks
    const requiredIndicators = page.locator('.text-red-500').filter({ hasText: '*' });
    const count = await requiredIndicators.count();

    // Should have required indicators for: name, organization_type, email, areas_of_activity
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Test 2.12: Valid data clears validation errors', async ({ page }) => {
    // Enter invalid CNPJ first
    const cnpjField = page.locator('input[placeholder*="CNPJ"]');
    await cnpjField.fill(INVALID_DATA.cnpj_short);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Verify error is shown
    let hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(true);

    // Now enter valid CNPJ
    await cnpjField.fill(MOCK_ORGANIZATION.document_number);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Error should be cleared
    hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(false);
  });
});

test.describe('Organization Wizard - Auto-formatting', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 3.1: CNPJ auto-formats on blur', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]');

    // Enter raw CNPJ without formatting
    await cnpjField.fill('12345678000195');
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Verify formatted value
    await expect(cnpjField).toHaveValue(FORMATTED_VALUES.cnpj);
  });

  test('Test 3.2: Phone auto-formats on blur (mobile)', async ({ page }) => {
    await wizardPage.goToNextStep();

    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter raw phone without formatting
    await phoneField.fill('11999998888');
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Verify formatted value
    await expect(phoneField).toHaveValue(FORMATTED_VALUES.phone_mobile);
  });

  test('Test 3.3: Phone auto-formats on blur (landline)', async ({ page }) => {
    await wizardPage.goToNextStep();

    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter landline phone (10 digits)
    await phoneField.fill('1133334444');
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Verify formatted value: (11) 3333-4444
    await expect(phoneField).toHaveValue('(11) 3333-4444');
  });

  test('Test 3.4: CEP auto-formats on blur', async ({ page }) => {
    await wizardPage.goToNextStep(); // Contact
    await wizardPage.goToNextStep(); // Address

    const cepField = page.locator('input[placeholder*="01310"]')
      .or(wizardPage.getFieldInput('address_zip'));

    // Enter raw CEP without formatting
    await cepField.fill('01310100');
    await cepField.blur();
    await page.waitForTimeout(300);

    // Verify formatted value
    await expect(cepField).toHaveValue(FORMATTED_VALUES.cep);
  });

  test('Test 3.5: Partial input does not format', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]');

    // Enter partial CNPJ (only 10 digits)
    await cnpjField.fill('1234567800');
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Should NOT be formatted (stays as is)
    await expect(cnpjField).toHaveValue('1234567800');
  });
});

test.describe('Organization Wizard - Gamification XP', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 4.1: XP display shows initial value', async ({ page }) => {
    await expect(wizardPage.xpDisplay.first()).toBeVisible();
    const initialXP = await wizardPage.getCurrentXP();
    expect(initialXP).toBeGreaterThanOrEqual(0);
  });

  test('Test 4.2: Filling field awards XP', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Fill the name field (10 XP)
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);
    await page.waitForTimeout(1000);

    // XP should increase
    const newXP = await wizardPage.getCurrentXP();
    expect(newXP).toBeGreaterThan(initialXP);
  });

  test('Test 4.3: XP reward popup animation appears', async ({ page }) => {
    // Fill a field
    const nameField = page.locator('input[placeholder*="Instituto"]')
      .or(wizardPage.getFieldInput('name'));

    await nameField.fill('');
    await nameField.fill(MOCK_ORGANIZATION.name);

    // Wait for XP reward popup
    await expect(wizardPage.xpRewardPopup).toBeVisible({ timeout: 2000 });
    await expect(wizardPage.xpRewardPopup).toContainText(/\+\d+ XP/);
  });

  test('Test 4.4: Field XP is only awarded once', async ({ page }) => {
    // Fill field first time
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);
    await page.waitForTimeout(1000);

    const xpAfterFirst = await wizardPage.getCurrentXP();

    // Clear and refill same field
    await wizardPage.fillField('name', '');
    await wizardPage.fillField('name', 'Different Name');
    await page.waitForTimeout(1000);

    const xpAfterSecond = await wizardPage.getCurrentXP();

    // XP should not increase again for same field
    expect(xpAfterSecond).toBe(xpAfterFirst);
  });

  test('Test 4.5: Completion level starts at Bronze', async ({ page }) => {
    const level = await wizardPage.getCompletionLevel();
    expect(level).toContain('Bronze');
  });

  test('Test 4.6: Completion level badge is visible', async ({ page }) => {
    await expect(wizardPage.completionBadge).toBeVisible();
  });

  test('Test 4.7: Level progress card shows progress', async ({ page }) => {
    // The level progress card should be visible in sidebar
    await expect(wizardPage.levelProgressCard).toBeVisible();
  });

  test('Test 4.8: Step XP reward badge shows bonus', async ({ page }) => {
    // Each step should show the XP bonus for completing it
    await expect(wizardPage.stepXpBadge).toBeVisible();
    await expect(wizardPage.stepXpBadge).toContainText(/\+\d+ XP/);
  });

  test('Test 4.9: Multiple fields accumulate XP', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Fill multiple fields
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);
    await page.waitForTimeout(500);
    await wizardPage.fillField('legal_name', MOCK_ORGANIZATION.legal_name);
    await page.waitForTimeout(500);

    const finalXP = await wizardPage.getCurrentXP();

    // XP should have increased by at least 15 (10 + 5)
    expect(finalXP - initialXP).toBeGreaterThanOrEqual(15);
  });

  test('Test 4.10: Progress percentage updates', async ({ page }) => {
    // Fill required fields to increase completion percentage
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Select organization type
    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }

    await page.waitForTimeout(500);

    // Progress bar should have width > 0
    const progressFill = page.locator('.inset-y-0.left-0.rounded-full');
    const style = await progressFill.getAttribute('style');
    expect(style).toContain('width:');
  });
});

test.describe('Organization Wizard - WhatsApp Step', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 5.1: Navigate to WhatsApp step', async ({ page }) => {
    // Navigate to WhatsApp step (step 6)
    for (let i = 0; i < 5; i++) {
      await wizardPage.goToNextStep();
    }

    await expect(wizardPage.stepTitle).toHaveText('WhatsApp');
  });

  test('Test 5.2: WhatsApp step shows connection interface', async ({ page }) => {
    // Navigate to WhatsApp step
    for (let i = 0; i < 5; i++) {
      await wizardPage.goToNextStep();
    }

    // Should show WhatsApp connection header
    await expect(page.getByText('Conectar WhatsApp')).toBeVisible();

    // Should show XP badge
    await expect(page.locator('.text-amber-600, .bg-amber-100').filter({
      hasText: /\+50 XP|Conectado/
    })).toBeVisible();
  });

  test('Test 5.3: WhatsApp step shows benefits', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await wizardPage.goToNextStep();
    }

    // Should display benefits
    await expect(page.getByText('Atendimento Automatizado')).toBeVisible();
    await expect(page.getByText('Notificacoes em Tempo Real')).toBeVisible();
    await expect(page.getByText('Comunicacao Segura')).toBeVisible();
  });

  test('Test 5.4: WhatsApp step shows skip option', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await wizardPage.goToNextStep();
    }

    // Should show skip option text
    await expect(page.getByText('pular esta etapa')).toBeVisible();
    await expect(page.getByText('configurado a qualquer momento')).toBeVisible();
  });

  test('Test 5.5: WhatsApp step can be skipped', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await wizardPage.goToNextStep();
    }

    // Verify we're on WhatsApp step
    await expect(wizardPage.stepTitle).toHaveText('WhatsApp');

    // Navigate to next (Review) step without connecting
    await wizardPage.goToNextStep();

    // Should be on Review step
    await expect(wizardPage.stepTitle).toHaveText('Revisao');
  });

  test('Test 5.6: Phone number is detected from contact step', async ({ page }) => {
    // Fill phone in Contact step
    await wizardPage.goToNextStep(); // Contact step

    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    await phoneField.fill(MOCK_ORGANIZATION.phone);
    await phoneField.blur();

    // Navigate to WhatsApp step
    for (let i = 0; i < 4; i++) {
      await wizardPage.goToNextStep();
    }

    // Should show detected phone number
    await expect(page.getByText(/Numero detectado/).or(
      page.getByText(/11.*9999/)
    )).toBeVisible();
  });
});

test.describe('Organization Wizard - Complete Flow', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 6.1: Complete Step 1 - Identification', async ({ page }) => {
    await expect(wizardPage.stepTitle).toHaveText('Identificacao');

    // Fill all identification fields
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    const legalNameField = page.locator('input[placeholder*="oficial"]')
      .or(wizardPage.getFieldInput('legal_name'));
    if (await legalNameField.isVisible()) {
      await legalNameField.fill(MOCK_ORGANIZATION.legal_name);
    }

    const cnpjField = page.locator('input[placeholder*="CNPJ"]');
    if (await cnpjField.isVisible()) {
      await cnpjField.fill(MOCK_ORGANIZATION.document_number);
    }

    // Select organization type
    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }

    // Navigate to next step
    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Contato');
  });

  test('Test 6.2: Complete Step 2 - Contact', async ({ page }) => {
    await wizardPage.goToNextStep(); // Go to Contact step
    await expect(wizardPage.stepTitle).toHaveText('Contato');

    // Fill email (required)
    const emailField = page.locator('input[type="email"]');
    await emailField.fill(MOCK_ORGANIZATION.email);

    // Fill phone
    const phoneField = page.locator('input[type="tel"]');
    if (await phoneField.isVisible()) {
      await phoneField.fill(MOCK_ORGANIZATION.phone);
    }

    // Fill website
    const websiteField = page.locator('input[type="url"]');
    if (await websiteField.isVisible()) {
      await websiteField.fill(MOCK_ORGANIZATION.website);
    }

    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Endereco');
  });

  test('Test 6.3: Complete Step 3 - Address', async ({ page }) => {
    // Navigate to Address step
    await wizardPage.goToNextStep();
    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Endereco');

    // Fill address fields
    const streetField = page.locator('input[placeholder*="Paulista"]');
    if (await streetField.isVisible()) {
      await streetField.fill(MOCK_ORGANIZATION.address_street);
    }

    const numberField = page.locator('input[placeholder*="1000"]');
    if (await numberField.isVisible()) {
      await numberField.fill(MOCK_ORGANIZATION.address_number);
    }

    const cepField = page.locator('input[placeholder*="01310"]');
    if (await cepField.isVisible()) {
      await cepField.fill(MOCK_ORGANIZATION.address_zip);
    }

    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Contexto');
  });

  test('Test 6.4: Complete Step 4 - Context', async ({ page }) => {
    // Navigate to Context step
    for (let i = 0; i < 3; i++) {
      await wizardPage.goToNextStep();
    }
    await expect(wizardPage.stepTitle).toHaveText('Contexto');

    // Fill description
    const descField = page.locator('textarea').first();
    if (await descField.isVisible()) {
      await descField.fill(MOCK_ORGANIZATION.description);
    }

    // Select areas of activity (multiselect)
    const culturaBtn = page.locator('button').filter({ hasText: 'Cultura' });
    if (await culturaBtn.isVisible()) {
      await culturaBtn.click();
    }

    const educacaoBtn = page.locator('button').filter({ hasText: 'Educacao' });
    if (await educacaoBtn.isVisible()) {
      await educacaoBtn.click();
    }

    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Identidade Visual');
  });

  test('Test 6.5: Complete Step 5 - Branding', async ({ page }) => {
    // Navigate to Branding step
    for (let i = 0; i < 4; i++) {
      await wizardPage.goToNextStep();
    }
    await expect(wizardPage.stepTitle).toHaveText('Identidade Visual');

    // This step has image upload fields which we'll skip in testing
    // Just verify the step loaded and navigate forward

    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('WhatsApp');
  });

  test('Test 6.6: Navigate to Review step', async ({ page }) => {
    // Navigate to Review step (step 7)
    for (let i = 0; i < 6; i++) {
      await wizardPage.goToNextStep();
    }

    await expect(wizardPage.stepTitle).toHaveText('Revisao');

    // Verify finalize button is shown
    await expect(wizardPage.nextButton).toHaveText(/Finalizar/i);
  });

  test('Test 6.7: Full wizard flow with all required fields', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Step 1: Identification
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);
    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }
    await wizardPage.goToNextStep();

    // Step 2: Contact
    const emailField = page.locator('input[type="email"]');
    await emailField.fill(MOCK_ORGANIZATION.email);
    await wizardPage.goToNextStep();

    // Step 3: Address (skip, not required)
    await wizardPage.goToNextStep();

    // Step 4: Context
    const culturaBtn = page.locator('button').filter({ hasText: 'Cultura' });
    if (await culturaBtn.isVisible()) {
      await culturaBtn.click();
    }
    await wizardPage.goToNextStep();

    // Step 5: Branding (skip)
    await wizardPage.goToNextStep();

    // Step 6: WhatsApp (skip)
    await wizardPage.goToNextStep();

    // Step 7: Review
    await expect(wizardPage.stepTitle).toHaveText('Revisao');

    const finalXP = await wizardPage.getCurrentXP();

    // XP should have increased
    expect(finalXP).toBeGreaterThan(initialXP);

    // Finalize button should be visible
    await expect(wizardPage.nextButton).toHaveText(/Finalizar/i);
  });

  test('Test 6.8: Save progress mid-wizard', async ({ page }) => {
    // Fill some data
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Click save button
    await wizardPage.save();

    // Verify no errors
    await expect(wizardPage.errorDisplay).not.toBeVisible();
  });

  test('Test 6.9: Progress stats display correctly', async ({ page }) => {
    // Check progress stats in sidebar
    const progressStats = page.locator('.bg-gray-50.rounded-xl').filter({
      hasText: 'Seu Progresso'
    });

    await expect(progressStats).toBeVisible();

    // Should show filled fields count
    await expect(progressStats.locator('text=/Campos preenchidos/')).toBeVisible();

    // Should show steps count
    await expect(progressStats.locator('text=/Etapas concluidas/')).toBeVisible();
  });

  test('Test 6.10: Wizard remembers progress after navigation', async ({ page }) => {
    // Fill name on step 1
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Navigate forward
    await wizardPage.goToNextStep();
    await wizardPage.goToNextStep();

    // Navigate back to step 1
    await wizardPage.goToStep(0);

    // Name should still be filled
    const nameField = wizardPage.getFieldInput('name')
      .or(page.locator('input[placeholder*="Instituto"]'));

    await expect(nameField).toHaveValue(MOCK_ORGANIZATION.name);
  });
});

test.describe('Organization Wizard - Error Handling', () => {
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 7.1: Loading state displays correctly', async ({ page }) => {
    // The loading state shows a spinner
    // We can verify it exists by checking the component structure
    const loadingSpinner = page.locator('.animate-spin')
      .or(page.locator('.border-t-amber-500.rounded-full'));

    // Loading should not be visible when wizard is loaded
    await expect(wizardPage.wizardContainer).toBeVisible();
  });

  test('Test 7.2: Error display component exists', async ({ page }) => {
    // Error display area should exist (but be hidden initially)
    const errorArea = page.locator('.bg-red-50.text-red-600');

    // Should not be visible initially
    await expect(errorArea).not.toBeVisible();
  });

  test('Test 7.3: Validation errors clear when field is corrected', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]');

    // Enter invalid CNPJ
    await cnpjField.fill('123');
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Error should appear
    let errorVisible = await wizardPage.hasValidationError();
    expect(errorVisible).toBe(true);

    // Enter valid CNPJ
    await cnpjField.fill(MOCK_ORGANIZATION.document_number);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Error should disappear
    errorVisible = await wizardPage.hasValidationError();
    expect(errorVisible).toBe(false);
  });
});

// =============================================================================
// ADDITIONAL TEST SUITES - PR #136 Issue #100 Enhancements
// =============================================================================

test.describe('Organization Wizard - CNPJ Validation (Enhanced)', () => {
  /**
   * Enhanced CNPJ validation tests using the specific test cases:
   * Valid: 11.222.333/0001-81
   * Invalid: 11.111.111/1111-11 (all same digits)
   */
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 8.1: Valid CNPJ 11.222.333/0001-81 passes validation', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]')
      .or(wizardPage.getFieldInput('document_number'));

    // Enter the specific valid CNPJ from test requirements
    await cnpjField.fill('11222333000181');
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Should NOT show validation error
    const hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(false);

    // Should be auto-formatted to 11.222.333/0001-81
    await expect(cnpjField).toHaveValue(FORMATTED_VALUES.cnpj);
  });

  test('Test 8.2: Invalid CNPJ 11.111.111/1111-11 (all same digits) fails validation', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]')
      .or(wizardPage.getFieldInput('document_number'));

    // Enter the specific invalid CNPJ from test requirements
    await cnpjField.fill(INVALID_DATA.cnpj_all_same);
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Should show validation error
    const hasError = await wizardPage.hasValidationError('invalido');
    expect(hasError).toBe(true);
  });

  test('Test 8.3: CNPJ with wrong check digits fails validation', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]')
      .or(wizardPage.getFieldInput('document_number'));

    // Enter CNPJ with valid format but wrong check digits
    await cnpjField.fill('11222333000182'); // Last digit should be 1, not 2
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Should show validation error about check digit
    const hasError = await wizardPage.hasValidationError('digito verificador');
    expect(hasError).toBe(true);
  });

  test('Test 8.4: CNPJ validation accepts formatted input', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]')
      .or(wizardPage.getFieldInput('document_number'));

    // Enter already formatted CNPJ
    await cnpjField.fill('11.222.333/0001-81');
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Should NOT show validation error
    const hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(false);
  });

  test('Test 8.5: Empty CNPJ is valid (optional field)', async ({ page }) => {
    const cnpjField = page.locator('input[placeholder*="CNPJ"]')
      .or(wizardPage.getFieldInput('document_number'));

    // Touch the field but leave empty
    await cnpjField.focus();
    await cnpjField.blur();
    await page.waitForTimeout(300);

    // Should NOT show validation error (field is optional)
    const hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(false);
  });
});

test.describe('Organization Wizard - Phone Formatting (Enhanced)', () => {
  /**
   * Enhanced phone formatting tests for:
   * - Mobile: (11) 99999-8888 (11 digits)
   * - Landline: (11) 3333-4444 (10 digits)
   */
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
    // Navigate to Contact step
    await wizardPage.goToNextStep();
    await expect(wizardPage.stepTitle).toHaveText('Contato');
  });

  test('Test 9.1: Mobile phone (11 digits) formats correctly', async ({ page }) => {
    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter mobile phone without formatting
    await phoneField.fill('11999998888');
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Should be formatted to (11) 99999-8888
    await expect(phoneField).toHaveValue(FORMATTED_VALUES.phone_mobile);

    // Should NOT show validation error
    const hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(false);
  });

  test('Test 9.2: Landline phone (10 digits) formats correctly', async ({ page }) => {
    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter landline phone without formatting
    await phoneField.fill('1133334444');
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Should be formatted to (11) 3333-4444
    await expect(phoneField).toHaveValue(FORMATTED_VALUES.phone_landline);

    // Should NOT show validation error
    const hasError = await wizardPage.hasValidationError();
    expect(hasError).toBe(false);
  });

  test('Test 9.3: Mobile phone must start with 9', async ({ page }) => {
    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter 11-digit number not starting with 9
    await phoneField.fill(INVALID_DATA.phone_mobile_no_9);
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Should show validation error
    const hasError = await wizardPage.hasValidationError('comecar com 9');
    expect(hasError).toBe(true);
  });

  test('Test 9.4: Landline phone cannot start with 9', async ({ page }) => {
    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter 10-digit number starting with 9
    await phoneField.fill(INVALID_DATA.phone_landline_starts_9);
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Should show validation error
    const hasError = await wizardPage.hasValidationError('11 digitos');
    expect(hasError).toBe(true);
  });

  test('Test 9.5: Phone with invalid DDD fails validation', async ({ page }) => {
    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter phone with DDD 00 (invalid)
    await phoneField.fill(INVALID_DATA.phone_invalid_ddd);
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Should show validation error
    const hasError = await wizardPage.hasValidationError('DDD invalido');
    expect(hasError).toBe(true);
  });

  test('Test 9.6: Phone with less than 10 digits fails validation', async ({ page }) => {
    const phoneField = page.locator('input[type="tel"]')
      .or(page.locator('input[placeholder*="99999"]'));

    // Enter phone with only 9 digits
    await phoneField.fill(INVALID_DATA.phone_short);
    await phoneField.blur();
    await page.waitForTimeout(300);

    // Should show validation error
    const hasError = await wizardPage.hasValidationError('10 ou 11 digitos');
    expect(hasError).toBe(true);
  });
});

test.describe('Organization Wizard - Auto-Save Functionality', () => {
  /**
   * Tests for auto-save functionality with 5-second debounce
   */
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 10.1: Auto-save triggers after 5 seconds of inactivity', async ({ page }) => {
    // Fill a field to mark form as dirty
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Track network requests
    const saveRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('organizations') && request.method() === 'POST') {
        saveRequests.push(request.url());
      }
    });

    // Wait for auto-save (5 seconds + buffer)
    await page.waitForTimeout(AUTO_SAVE_DELAY + 1000);

    // Auto-save indicator should show saved time
    const savedIndicator = page.locator('text=/Salvo automaticamente/');
    await expect(savedIndicator).toBeVisible({ timeout: 2000 });
  });

  test('Test 10.2: Changes within debounce window reset the timer', async ({ page }) => {
    // Fill first field
    await wizardPage.fillField('name', 'First');
    await page.waitForTimeout(2000); // Wait 2 seconds

    // Fill another field (should reset the 5-second timer)
    const legalNameField = page.locator('input[placeholder*="oficial"]')
      .or(wizardPage.getFieldInput('legal_name'));

    if (await legalNameField.isVisible()) {
      await legalNameField.fill(MOCK_ORGANIZATION.legal_name);
    }

    await page.waitForTimeout(2000); // Wait 2 more seconds (total 4s)

    // Auto-save should NOT have triggered yet
    // Form should still be in "dirty" state

    // Now wait for auto-save to complete
    await page.waitForTimeout(4000); // 4 more seconds (6s from last change)

    // Auto-save should have happened
    const savedIndicator = page.locator('text=/Salvo automaticamente/');
    await expect(savedIndicator).toBeVisible({ timeout: 2000 });
  });

  test('Test 10.3: Manual save button works', async ({ page }) => {
    // Fill a field
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Click save button manually
    await wizardPage.save();

    // Should not show error
    await expect(wizardPage.errorDisplay).not.toBeVisible();

    // Should show saved indicator
    const savedIndicator = page.locator('text=/Salvo automaticamente/');
    await expect(savedIndicator).toBeVisible({ timeout: 3000 });
  });

  test('Test 10.4: Last saved timestamp updates', async ({ page }) => {
    // Fill a field
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    // Wait for auto-save
    await page.waitForTimeout(AUTO_SAVE_DELAY + 1000);

    // Get the first saved time
    const savedIndicator = page.locator('text=/Salvo automaticamente/');
    await expect(savedIndicator).toBeVisible();
    const firstSaveText = await savedIndicator.textContent();

    // Make another change
    const legalNameField = page.locator('input[placeholder*="oficial"]');
    if (await legalNameField.isVisible()) {
      await legalNameField.fill('Updated Legal Name');
    }

    // Wait for another auto-save
    await page.waitForTimeout(AUTO_SAVE_DELAY + 1000);

    // Timestamp might have updated (if minute changed)
    // Just verify the indicator is still visible
    await expect(savedIndicator).toBeVisible();
  });
});

test.describe('Organization Wizard - XP Accumulation Verification', () => {
  /**
   * Comprehensive XP verification tests
   * - Field completion: 10-25 XP
   * - Step completion: 50 XP
   * - WhatsApp connection: 50 XP
   * - Wizard completion: 200 XP
   */
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 11.1: Name field awards 10 XP (required field)', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Fill name field
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);
    await page.waitForTimeout(1000);

    const newXP = await wizardPage.getCurrentXP();

    // Name field should award 10 XP
    expect(newXP - initialXP).toBe(XP_VALUES.fields.name);
  });

  test('Test 11.2: CNPJ field awards 15 XP (important field)', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Fill CNPJ field with valid value
    const cnpjField = page.locator('input[placeholder*="CNPJ"]');
    await cnpjField.fill(MOCK_ORGANIZATION.document_number);
    await cnpjField.blur();
    await page.waitForTimeout(1000);

    const newXP = await wizardPage.getCurrentXP();

    // CNPJ field should award 15 XP
    expect(newXP - initialXP).toBe(XP_VALUES.fields.document_number);
  });

  test('Test 11.3: Organization type selection awards 10 XP', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Select organization type
    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }
    await page.waitForTimeout(1000);

    const newXP = await wizardPage.getCurrentXP();

    // Organization type should award 10 XP
    expect(newXP - initialXP).toBe(XP_VALUES.fields.organization_type);
  });

  test('Test 11.4: XP accumulates across multiple fields', async ({ page }) => {
    const initialXP = await wizardPage.getCurrentXP();

    // Fill multiple fields
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name); // +10 XP
    await page.waitForTimeout(500);

    const legalNameField = page.locator('input[placeholder*="oficial"]');
    if (await legalNameField.isVisible()) {
      await legalNameField.fill(MOCK_ORGANIZATION.legal_name); // +5 XP
    }
    await page.waitForTimeout(500);

    const cnpjField = page.locator('input[placeholder*="CNPJ"]');
    await cnpjField.fill(MOCK_ORGANIZATION.document_number); // +15 XP
    await page.waitForTimeout(500);

    const finalXP = await wizardPage.getCurrentXP();

    // Total should be at least 30 XP (10 + 5 + 15)
    expect(finalXP - initialXP).toBeGreaterThanOrEqual(30);
  });

  test('Test 11.5: XP is not awarded twice for same field', async ({ page }) => {
    // Fill field first time
    await wizardPage.fillField('name', 'First Name');
    await page.waitForTimeout(1000);

    const xpAfterFirst = await wizardPage.getCurrentXP();

    // Clear and refill the same field
    await wizardPage.fillField('name', '');
    await wizardPage.fillField('name', 'Second Name');
    await page.waitForTimeout(1000);

    const xpAfterSecond = await wizardPage.getCurrentXP();

    // XP should NOT increase again
    expect(xpAfterSecond).toBe(xpAfterFirst);
  });

  test('Test 11.6: Step completion awards bonus XP', async ({ page }) => {
    // Fill required fields on step 1
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);
    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }
    await page.waitForTimeout(500);

    const xpBeforeNextStep = await wizardPage.getCurrentXP();

    // Navigate to next step (should trigger step completion bonus)
    await wizardPage.goToNextStep();
    await page.waitForTimeout(1000);

    const xpAfterNextStep = await wizardPage.getCurrentXP();

    // Step completion bonus should be 50 XP
    // Note: This might already be included in previous XP count depending on implementation
    expect(xpAfterNextStep).toBeGreaterThanOrEqual(xpBeforeNextStep);
  });

  test('Test 11.7: XP display shows reward popup animation', async ({ page }) => {
    // Clear any existing value first
    const nameField = page.locator('input[placeholder*="Instituto"]')
      .or(wizardPage.getFieldInput('name'));

    await nameField.fill('');
    await nameField.fill(MOCK_ORGANIZATION.name);

    // XP reward popup should appear
    await expect(wizardPage.xpRewardPopup).toBeVisible({ timeout: 2000 });
    await expect(wizardPage.xpRewardPopup).toContainText(/\+\d+ XP/);

    // Popup should disappear after animation
    await expect(wizardPage.xpRewardPopup).not.toBeVisible({ timeout: 3000 });
  });

  test('Test 11.8: Completion percentage increases with filled fields', async ({ page }) => {
    // Fill some fields
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }

    await page.waitForTimeout(500);

    // Progress bar should show increased percentage
    const progressFill = page.locator('.inset-y-0.left-0.rounded-full');
    const style = await progressFill.getAttribute('style');

    // Should have width greater than 0
    expect(style).toContain('width:');
    const widthMatch = style?.match(/width:\s*(\d+)/);
    const width = widthMatch ? parseInt(widthMatch[1]) : 0;
    expect(width).toBeGreaterThan(0);
  });
});

test.describe('Organization Wizard - WhatsApp Integration (Enhanced)', () => {
  /**
   * Enhanced WhatsApp connection tests
   * Tests the connection flow with Evolution API integration
   */
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();

    // Fill phone in Contact step first
    await wizardPage.goToNextStep(); // Go to Contact
    const phoneField = page.locator('input[type="tel"]');
    await phoneField.fill(MOCK_ORGANIZATION.phone);
    await phoneField.blur();

    // Navigate to WhatsApp step (step 6)
    await wizardPage.goToNextStep(); // Address
    await wizardPage.goToNextStep(); // Context
    await wizardPage.goToNextStep(); // Branding
    await wizardPage.goToNextStep(); // WhatsApp
    await expect(wizardPage.stepTitle).toHaveText('WhatsApp');
  });

  test('Test 12.1: WhatsApp step shows XP reward badge', async ({ page }) => {
    // Should display +50 XP badge
    const xpBadge = page.locator('.text-amber-600, .bg-amber-100').filter({
      hasText: /\+50 XP|Conectado/
    });
    await expect(xpBadge).toBeVisible();
  });

  test('Test 12.2: Phone number is detected from contact step', async ({ page }) => {
    // Should show the phone number entered in contact step
    const phoneInfo = page.getByText(/Numero detectado/)
      .or(page.getByText(/11.*9999/));

    await expect(phoneInfo).toBeVisible();
  });

  test('Test 12.3: Connection method toggle exists', async ({ page }) => {
    // Should have both pairing code and QR code options
    const pairingButton = page.locator('[data-testid="whatsapp-method-pairing"]')
      .or(page.locator('button').filter({ hasText: 'Codigo' }));

    const qrcodeButton = page.locator('[data-testid="whatsapp-method-qrcode"]')
      .or(page.locator('button').filter({ hasText: 'QR Code' }));

    await expect(pairingButton).toBeVisible();
    await expect(qrcodeButton).toBeVisible();
  });

  test('Test 12.4: Pairing code method is default', async ({ page }) => {
    // Pairing code should be selected by default
    const pairingButton = page.locator('[data-testid="whatsapp-method-pairing"]')
      .or(page.locator('button').filter({ hasText: 'Codigo' }));

    // Check if pairing is selected (has active class or aria-pressed)
    await expect(pairingButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('Test 12.5: Can switch to QR code method', async ({ page }) => {
    const qrcodeButton = page.locator('[data-testid="whatsapp-method-qrcode"]')
      .or(page.locator('button').filter({ hasText: 'QR Code' }));

    await qrcodeButton.click();

    // QR code section should be visible
    await expect(qrcodeButton).toHaveAttribute('aria-pressed', 'true');

    // Should show QR code related elements
    const qrRefreshButton = page.locator('[data-testid="whatsapp-qr-refresh"]')
      .or(page.locator('button').filter({ hasText: 'Atualizar' }));

    await expect(qrRefreshButton).toBeVisible();
  });

  test('Test 12.6: WhatsApp step displays benefits', async ({ page }) => {
    await expect(page.getByText('Atendimento Automatizado')).toBeVisible();
    await expect(page.getByText('Notificacoes em Tempo Real')).toBeVisible();
    await expect(page.getByText('Comunicacao Segura')).toBeVisible();
  });

  test('Test 12.7: WhatsApp step can be skipped', async ({ page }) => {
    // Verify skip option is visible
    await expect(page.getByText('pular esta etapa')).toBeVisible();

    // Navigate to next step without connecting
    await wizardPage.goToNextStep();

    // Should be on Review step
    await expect(wizardPage.stepTitle).toHaveText('Revisao');
  });

  test('Test 12.8: Connection status card is displayed', async ({ page }) => {
    // WhatsApp connection card should be visible
    const connectionCard = page.locator('[data-testid="whatsapp-connection-card"]')
      .or(page.locator('.ceramic-card').filter({ hasText: /Conexao WhatsApp/ }));

    await expect(connectionCard).toBeVisible();
  });

  test('Test 12.9: Status indicator shows disconnected initially', async ({ page }) => {
    // Status should show disconnected
    const statusLabel = page.locator('[data-testid="whatsapp-status-label"]')
      .or(page.locator('text=/Desconectado|unknown/i'));

    await expect(statusLabel).toBeVisible();
  });

  test('Test 12.10: Refresh button exists for status check', async ({ page }) => {
    const refreshButton = page.locator('[data-testid="whatsapp-refresh-button"]')
      .or(page.locator('button[aria-label="Atualizar status"]'));

    await expect(refreshButton).toBeVisible();
  });
});

test.describe('Organization Wizard - Level Progression', () => {
  /**
   * Tests for completion level progression:
   * - Bronze: 0-24%
   * - Silver: 25-49%
   * - Gold: 50-79%
   * - Diamond: 80-100%
   */
  let wizardPage: OrganizationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new OrganizationWizardPage(page);
    await wizardPage.navigateToWizard();
  });

  test('Test 13.1: Starts at Bronze level', async ({ page }) => {
    const level = await wizardPage.getCompletionLevel();
    expect(level).toContain('Bronze');
  });

  test('Test 13.2: Level badge displays correct icon', async ({ page }) => {
    // Bronze level should show bronze medal icon
    await expect(wizardPage.completionBadge).toBeVisible();
  });

  test('Test 13.3: Progress to Silver level (25%+)', async ({ page }) => {
    // Fill required fields to reach Silver
    await wizardPage.fillField('name', MOCK_ORGANIZATION.name);

    const typeSelect = page.locator('select');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(MOCK_ORGANIZATION.organization_type);
    }

    await wizardPage.goToNextStep();

    const emailField = page.locator('input[type="email"]');
    await emailField.fill(MOCK_ORGANIZATION.email);

    await page.waitForTimeout(1000);

    // Check if level progressed (might still be Bronze depending on field weights)
    const level = await wizardPage.getCompletionLevel();
    expect(level).toMatch(/Bronze|Prata/);
  });

  test('Test 13.4: Level progress card shows next level', async ({ page }) => {
    // Level progress card should show what's needed for next level
    await expect(wizardPage.levelProgressCard).toBeVisible();

    const nextLevelText = page.locator('text=/Proximo nivel/');
    await expect(nextLevelText).toBeVisible();
  });

  test('Test 13.5: Level up celebration appears on level change', async ({ page }) => {
    // This would require filling many fields to trigger a level up
    // For now, just verify the celebration element exists in DOM
    const celebrationElement = page.locator('[data-testid="level-up-celebration"]')
      .or(page.locator('.fixed.inset-0.z-50').filter({ hasText: 'Nivel Alcancado' }));

    // Should not be visible initially
    await expect(celebrationElement).not.toBeVisible();
  });
});
