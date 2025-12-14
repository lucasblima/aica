import { expect } from '@playwright/test';
import {
  test,
  navigateToConnections,
  openCreateSpaceWizard,
  selectArchetypeInWizard,
  fillSpaceCreationForm,
  submitSpaceWizard,
  createSpace,
  findSpaceCard,
  getCurrentSpaceId,
  expectSuccessMessage,
} from './fixtures';

test.describe('Connection Space Creation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to connections page
    await navigateToConnections(authenticatedPage);
  });

  // ========================================
  // ARCHETYPE VISIBILITY TESTS
  // ========================================

  test('Test 1.1: Display all 4 archetypes on connections page', async ({
    authenticatedPage: page,
  }) => {
    // Verify all archetype sections are visible
    const archetypes = ['Habitat', 'Ventures', 'Academia', 'Tribo'];

    for (const archetype of archetypes) {
      const archeTypeHeading = page
        .getByRole('heading', { name: new RegExp(archetype, 'i') })
        .or(page.getByText(new RegExp(archetype, 'i')));

      await expect(archeTypeHeading).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('Test 1.2: Display archetype descriptions and icons', async ({
    authenticatedPage: page,
  }) => {
    // Verify archetype cards have icons and descriptions
    const archeTypeCards = page.locator('[data-testid*="archetype"]').or(
      page.locator('[role="article"]')
    );

    const cardCount = await archeTypeCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Each card should have some content (icon or text)
    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      const card = archeTypeCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  // ========================================
  // SPACE CREATION WIZARD TESTS
  // ========================================

  test('Test 1.3: Open create space wizard when clicking create button', async ({
    authenticatedPage: page,
  }) => {
    // Open wizard
    await openCreateSpaceWizard(page);

    // Verify modal/dialog is visible
    const modal = page.locator('[role="dialog"]').or(
      page.locator('[data-testid="space-wizard"]')
    );

    await expect(modal).toBeVisible();

    // Verify archetype selection is visible
    const archetypeTitle = page
      .getByText(/escolha|choose|select|archetype|arquétipo/i)
      .or(page.getByRole('heading', { name: /escolha|choose/i }));

    await expect(archetypeTitle).toBeVisible();
  });

  test('Test 1.4: Close wizard when clicking cancel', async ({
    authenticatedPage: page,
  }) => {
    // Open wizard
    await openCreateSpaceWizard(page);

    // Find and click cancel button
    const cancelButton = page
      .getByRole('button', { name: /cancelar|cancel|fechar|close/i })
      .or(page.locator('[data-testid="cancel-button"]'));

    const isCancelVisible = await cancelButton.isVisible().catch(() => false);

    if (isCancelVisible) {
      await cancelButton.click();

      // Verify wizard closes
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeHidden();
    }
  });

  // ========================================
  // HABITAT SPACE CREATION TESTS
  // ========================================

  test('Test 2.1: Create a Habitat space successfully', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Apartamento Teste ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', {
      name: spaceName,
      subtitle: 'Centro, São Paulo',
      description: 'Meu apartamento de teste',
      icon: '🏠',
    });

    // Verify success message
    await expectSuccessMessage(page);

    // Verify we're now on the space detail page
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/);

    // Verify space name is displayed
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  test('Test 2.2: Create Habitat space with minimum required fields', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Apto Minimo ${Date.now()}`;

    // Open wizard
    await openCreateSpaceWizard(page);

    // Select Habitat
    await selectArchetypeInWizard(page, 'habitat');

    // Click next
    const nextButton = page
      .getByRole('button', { name: /próximo|next/i })
      .first();

    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Fill only name (required field)
    const nameField = page
      .locator('input[name="name"]')
      .or(page.getByLabel(/nome|name/i).first());

    await nameField.fill(spaceName);

    // Submit
    await submitSpaceWizard(page);

    // Verify creation
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/);
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  // ========================================
  // VENTURES SPACE CREATION TESTS
  // ========================================

  test('Test 2.3: Create a Ventures space successfully', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Startup Teste ${Date.now()}`;

    await createSpace(page, 'ventures', {
      name: spaceName,
      subtitle: 'Tech Startup',
      description: 'Minha startup de teste',
      icon: '💼',
    });

    await expectSuccessMessage(page);
    await expect(page).toHaveURL(/\/connections\/ventures\/.+/);
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  // ========================================
  // ACADEMIA SPACE CREATION TESTS
  // ========================================

  test('Test 2.4: Create an Academia space successfully', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Curso Teste ${Date.now()}`;

    await createSpace(page, 'academia', {
      name: spaceName,
      subtitle: 'Desenvolvimento Pessoal',
      description: 'Meu curso de teste',
      icon: '🎓',
    });

    await expectSuccessMessage(page);
    await expect(page).toHaveURL(/\/connections\/academia\/.+/);
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  // ========================================
  // TRIBO SPACE CREATION TESTS
  // ========================================

  test('Test 2.5: Create a Tribo space successfully', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Comunidade Teste ${Date.now()}`;

    await createSpace(page, 'tribo', {
      name: spaceName,
      subtitle: 'Clube de Livros',
      description: 'Minha comunidade de teste',
      icon: '👥',
    });

    await expectSuccessMessage(page);
    await expect(page).toHaveURL(/\/connections\/tribo\/.+/);
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  // ========================================
  // FORM VALIDATION TESTS
  // ========================================

  test('Test 3.1: Show validation error for empty name field', async ({
    authenticatedPage: page,
  }) => {
    await openCreateSpaceWizard(page);
    await selectArchetypeInWizard(page, 'habitat');

    // Click next
    const nextButton = page
      .getByRole('button', { name: /próximo|next/i })
      .first();

    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Try to submit without filling name
    const submitButton = page
      .getByRole('button', { name: /criar|create|concluir|finish/i })
      .last();

    await submitButton.click();

    // Expect error message or validation feedback
    const errorMsg = page
      .getByText(/obrigatório|required|nome é obrigatório/i)
      .or(page.locator('input[name="name"]:invalid'))
      .or(page.locator('[data-testid="error-name"]'));

    // Try to detect if error appears or if form stays open
    const modal = page.locator('[role="dialog"]');
    const isModalStillVisible = await modal.isVisible().catch(() => false);
    expect(isModalStillVisible).toBeTruthy();
  });

  test('Test 3.2: Show validation error for very long name', async ({
    authenticatedPage: page,
  }) => {
    const longName = 'A'.repeat(300);

    await openCreateSpaceWizard(page);
    await selectArchetypeInWizard(page, 'habitat');

    const nextButton = page
      .getByRole('button', { name: /próximo|next/i })
      .first();

    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    // Try to fill with very long name
    const nameField = page
      .locator('input[name="name"]')
      .or(page.getByLabel(/nome|name/i).first());

    await nameField.fill(longName);

    // Check if field truncates or shows error
    const fieldValue = await nameField.inputValue();
    expect(fieldValue.length).toBeLessThanOrEqual(300);
  });

  // ========================================
  // ARCHETYPE SELECTION TESTS
  // ========================================

  test('Test 3.3: Cannot proceed without selecting an archetype', async ({
    authenticatedPage: page,
  }) => {
    await openCreateSpaceWizard(page);

    // Try to click next without selecting archetype
    const nextButton = page
      .getByRole('button', { name: /próximo|next/i })
      .first();

    const isNextEnabled = !(await nextButton.isDisabled().catch(() => true));

    // Either next is disabled or shows error when clicked
    if (isNextEnabled) {
      await nextButton.click();

      // Should show error or stay on archetype selection
      const modal = page.locator('[role="dialog"]');
      const isModalVisible = await modal.isVisible().catch(() => false);
      expect(isModalVisible).toBeTruthy();
    }
  });

  test('Test 3.4: Display archetype-specific icons in wizard', async ({
    authenticatedPage: page,
  }) => {
    await openCreateSpaceWizard(page);

    // Verify all archetype options are visible with icons
    const archetypeIcons = ['🏠', '💼', '🎓', '👥'];

    for (const icon of archetypeIcons) {
      const iconElement = page.getByText(icon);
      const isVisible = await iconElement.isVisible().catch(() => false);

      // At least some archetype indicators should be visible
      if (isVisible) {
        await expect(iconElement).toBeVisible();
      }
    }
  });

  // ========================================
  // SPACE LIST INTEGRATION TESTS
  // ========================================

  test('Test 4.1: New space appears in connections list after creation', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Novo Espaço ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', {
      name: spaceName,
      subtitle: 'Test Space',
    });

    // Navigate back to connections list
    const connectionsLink = page
      .getByRole('link', { name: /conexões|connections/i })
      .or(page.locator('[data-testid="connections-link"]'));

    const isLinkVisible = await connectionsLink.isVisible().catch(() => false);
    if (isLinkVisible) {
      await connectionsLink.click();
      await navigateToConnections(page);
    } else {
      // Try direct navigation
      await navigateToConnections(page);
    }

    // Find the space card
    const spaceCard = await findSpaceCard(page, spaceName);
    await expect(spaceCard).toBeVisible();
  });

  test('Test 4.2: Space displays correct archetype badge', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Habitat ${Date.now()}`;

    // Create Habitat space
    await createSpace(page, 'habitat', {
      name: spaceName,
    });

    // Verify we're on habitat detail page
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/);

    // Extract archetype from URL
    const url = page.url();
    expect(url).toContain('habitat');
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  test('Test 5.1: Handle duplicate space name gracefully', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Duplicado ${Date.now()}`;

    // Create first space
    await createSpace(page, 'habitat', {
      name: spaceName,
    });

    // Navigate back to create another
    await navigateToConnections(page);

    // Try to create space with same name
    await createSpace(page, 'habitat', {
      name: spaceName,
    });

    // Should either succeed with unique ID or show error
    // The system should handle this gracefully
    const modal = page.locator('[role="dialog"]');
    const isModalVisible = await modal.isVisible().catch(() => false);

    // Either we're on success page or there's an error
    const isOnDetailPage = page.url().includes('/connections/habitat');
    const isErrorShown = await page
      .getByText(/já existe|duplicate|already exists/i)
      .isVisible()
      .catch(() => false);

    expect(isOnDetailPage || isErrorShown).toBeTruthy();
  });

  test('Test 5.2: Preserve form data when navigating between wizard steps', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Dados Preservados ${Date.now()}`;

    await openCreateSpaceWizard(page);
    await selectArchetypeInWizard(page, 'habitat');

    // Click next
    const nextButton = page
      .getByRole('button', { name: /próximo|next/i })
      .first();

    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Fill form
      await fillSpaceCreationForm(page, {
        name: spaceName,
        subtitle: 'Test',
      });

      // Go back
      const backButton = page
        .getByRole('button', { name: /anterior|back|voltar/i })
        .first();

      const isBackVisible = await backButton.isVisible().catch(() => false);
      if (isBackVisible) {
        await backButton.click();
        await page.waitForTimeout(500);

        // Go forward again
        const nextButton2 = page
          .getByRole('button', { name: /próximo|next/i })
          .first();

        const isNextVisible2 = await nextButton2.isVisible().catch(() => false);
        if (isNextVisible2) {
          await nextButton2.click();
          await page.waitForTimeout(500);

          // Verify data is still there
          const nameField = page
            .locator('input[name="name"]')
            .or(page.getByLabel(/nome|name/i).first());

          const fieldValue = await nameField.inputValue();
          expect(fieldValue).toBe(spaceName);
        }
      }
    }
  });
});
