import { Page, expect } from '@playwright/test';

/**
 * Sign Up Page Object Model
 * Handles interactions with the user registration/sign up flow
 */
export class SignUpPage {
  constructor(private page: Page) {}

  // Selectors
  private readonly selectors = {
    emailInput: 'input[type="email"]',
    emailInputByPlaceholder: 'input[placeholder*="email" i]',
    passwordInput: 'input[type="password"]',
    passwordByName: 'input[name*="password" i]',
    confirmPasswordInput: 'input[placeholder*="confirm" i]',
    submitButton: 'button[type="submit"]',
    submitByText: 'button:has-text("Cadastrar")',
    errorMessage: '[data-testid="error-message"]',
    errorText: 'text=/Erro|Error|já existe|already exists/i',
    successMessage: '[data-testid="success-message"]',
    backButton: 'button:has-text("Voltar")',
    loginLink: 'a:has-text("Entrar")',
    formContainer: '[data-testid="signup-form"]',
  };

  /**
   * Navigate to sign up page
   */
  async goto() {
    // Sign up is typically reached from landing page or /signup route
    await this.page.goto('/signup', { waitUntil: 'networkidle' });
    await this.expectFormVisible();
  }

  /**
   * Verify sign up form is visible
   */
  async expectFormVisible() {
    const form = this.page.locator(this.selectors.formContainer)
      .or(this.page.locator('form'));
    await expect(form).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string) {
    const emailInput = this.page.locator(this.selectors.emailInput)
      .or(this.page.locator(this.selectors.emailInputByPlaceholder));
    await emailInput.fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string) {
    const passwordInput = this.page.locator(this.selectors.passwordInput)
      .or(this.page.locator(this.selectors.passwordByName));
    await passwordInput.fill(password);
  }

  /**
   * Fill confirm password field if required
   */
  async fillConfirmPassword(password: string) {
    const confirmPasswordInput = this.page.locator(this.selectors.confirmPasswordInput);
    const isVisible = await confirmPasswordInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await confirmPasswordInput.fill(password);
    }
  }

  /**
   * Submit the sign up form
   */
  async submit() {
    const submitButton = this.page.locator(this.selectors.submitButton)
      .or(this.page.locator(this.selectors.submitByText));
    await submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Perform complete sign up with email and password
   */
  async signUp(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.submit();
  }

  /**
   * Verify success message
   */
  async expectSuccessMessage() {
    const success = this.page.locator(this.selectors.successMessage)
      .or(this.page.locator('text=/sucesso|success|bem-vindo/i'));
    await expect(success).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify error message is shown
   */
  async expectErrorMessage(expectedText?: string) {
    const error = this.page.locator(this.selectors.errorMessage)
      .or(this.page.locator(this.selectors.errorText));
    await expect(error).toBeVisible({ timeout: 5000 });

    if (expectedText) {
      await expect(error).toContainText(expectedText);
    }
  }

  /**
   * Verify email validation error for invalid format
   */
  async expectEmailValidationError() {
    const emailInput = this.page.locator(this.selectors.emailInput)
      .or(this.page.locator(this.selectors.emailInputByPlaceholder));
    const invalidMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(invalidMessage).toBeTruthy();
  }

  /**
   * Verify password strength indicator is visible
   */
  async expectPasswordStrengthIndicator() {
    const indicator = this.page.locator('[data-testid="password-strength"]')
      .or(this.page.locator('text=/força|strength|fraco|weak|forte|strong/i'));
    await expect(indicator).toBeVisible({ timeout: 3000 });
  }

  /**
   * Get password strength level
   */
  async getPasswordStrengthLevel(): Promise<string> {
    const indicator = this.page.locator('[data-testid="password-strength"]');
    const level = await indicator.getAttribute('data-level');
    return level || '';
  }

  /**
   * Click link to go back to login
   */
  async clickBackToLogin() {
    const link = this.page.locator(this.selectors.loginLink);
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill all sign up form fields
   */
  async fillAllFields(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
  }

  /**
   * Get current form values (for testing)
   */
  async getFormValues() {
    const email = await this.page.locator(this.selectors.emailInput)
      .or(this.page.locator(this.selectors.emailInputByPlaceholder))
      .inputValue();

    const password = await this.page.locator(this.selectors.passwordInput)
      .or(this.page.locator(this.selectors.passwordByName))
      .inputValue();

    return { email, password };
  }

  /**
   * Verify form is in invalid state
   */
  async expectFormInvalid() {
    const submitButton = this.page.locator(this.selectors.submitButton)
      .or(this.page.locator(this.selectors.submitByText));

    // Submit button may be disabled or form shows error
    const isDisabled = await submitButton.isDisabled();
    const hasError = await this.page.locator(this.selectors.errorMessage).isVisible({ timeout: 1000 }).catch(() => false);

    expect(isDisabled || hasError).toBeTruthy();
  }
}
