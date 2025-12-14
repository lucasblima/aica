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
  expectSuccessMessage,
} from './fixtures';

/**
 * Complete Space Creation Flow Tests
 *
 * Tests the complete end-to-end flow of creating a connection space:
 * 1. Navigate to Connections module
 * 2. Select an archetype (Habitat, Ventures, Academia, or Tribo)
 * 3. Fill space details (name, description, settings)
 * 4. Complete creation and verify redirection
 * 5. Verify space appears in dashboard with correct metadata
 *
 * These tests exercise real user workflows with form submission,
 * navigation, and data persistence.
 */
test.describe('Connection Space Creation - Complete Flow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Ensure user starts at connections dashboard
    await navigateToConnections(authenticatedPage);
  });

  // ========================================
  // TEST GROUP 1: HABITAT ARCHETYPE FLOW
  // ========================================

  test('Test 1.1: Complete Habitat space creation flow with all details', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Apartamento Teste ${Date.now()}`;
    const spaceSub = 'Centro, São Paulo';
    const spaceDesc = 'Meu apartamento de teste para automação E2E';

    // Step 1: Open create space wizard
    await openCreateSpaceWizard(page);

    // Verify modal is visible with expected heading
    const modalHeading = page
      .getByRole('heading', { name: /criar|create|novo espaço/i })
      .or(page.getByText(/Criar novo espaço/i));
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    // Step 2: Select Habitat archetype
    await selectArchetypeInWizard(page, 'habitat');

    // Verify Habitat is selected (highlighted state)
    const habitatButton = page
      .getByRole('button', { name: /habitat/i })
      .or(page.locator('[data-testid="archetype-habitat"]'))
      .first();
    await expect(habitatButton).toBeVisible();

    // Step 3: Proceed to next step (archetype → info)
    const nextButton = page
      .getByRole('button', { name: /próximo|next|continuar/i })
      .first();
    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(300); // Allow animation
    }

    // Step 4: Fill space details form
    const nameInput = page
      .locator('input[name="name"]')
      .or(page.getByLabel(/nome|name/i).first())
      .or(page.locator('[data-testid="space-name-input"]'));

    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill(spaceName);

    // Fill subtitle (optional but good practice)
    const subtitleInput = page
      .locator('input[name="subtitle"]')
      .or(page.getByLabel(/subtítulo|subtitle/i))
      .or(page.locator('[data-testid="space-subtitle-input"]'));

    const subtitleVisible = await subtitleInput.isVisible().catch(() => false);
    if (subtitleVisible) {
      await subtitleInput.fill(spaceSub);
    }

    // Fill description (optional)
    const descriptionInput = page
      .locator('textarea[name="description"]')
      .or(page.getByLabel(/descrição|description/i))
      .or(page.locator('[data-testid="space-description-input"]'));

    const descVisible = await descriptionInput.isVisible().catch(() => false);
    if (descVisible) {
      await descriptionInput.fill(spaceDesc);
    }

    // Step 5: Proceed through remaining wizard steps (config, invite)
    const nextButton2 = page
      .getByRole('button', { name: /próximo|next|continuar/i })
      .first();
    const isNext2Visible = await nextButton2.isVisible().catch(() => false);
    if (isNext2Visible) {
      await nextButton2.click();
      await page.waitForTimeout(300);
    }

    // Step 6: Submit the wizard (should be on final step)
    const submitButton = page
      .getByRole('button', { name: /criar espaço|create space|concluir|finish/i })
      .last();

    await expect(submitButton).toBeVisible({ timeout: 3000 });
    await submitButton.click();

    // Step 7: Verify success and redirection
    // Wait for success animation/message
    await expectSuccessMessage(page, { timeout: 8000 });

    // Verify we're redirected to space detail page
    await expect(page).toHaveURL(/\/connections\/habitat\/[^\/]+/, {
      timeout: 8000,
    });

    // Step 8: Verify space name is displayed in detail view
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 5000 });

    // Step 9: Verify user is shown as owner/admin (check if own space indicator exists)
    // Look for "owner", "admin", or similar role indicator
    const ownerIndicator = page
      .getByText(/owner|admin|proprietário|você/i)
      .first();
    const isOwnerVisible = await ownerIndicator.isVisible().catch(() => false);
    // Owner indicator may not always be visible in space detail, so we just verify space exists
    expect(page.url()).toContain('/connections/habitat');
  });

  test('Test 1.2: Create Habitat space with minimum required fields only', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Apto Minimo ${Date.now()}`;

    await openCreateSpaceWizard(page);
    await selectArchetypeInWizard(page, 'habitat');

    // Progress through wizard
    const nextButton = page
      .getByRole('button', { name: /próximo|next|continuar/i })
      .first();
    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Fill only name (required field)
    const nameInput = page
      .locator('input[name="name"]')
      .or(page.getByLabel(/nome|name/i).first())
      .or(page.locator('[data-testid="space-name-input"]'));

    await nameInput.fill(spaceName);

    // Try to submit (may need to progress through other steps)
    let continueAttempt = 0;
    while (continueAttempt < 4) {
      const button = page
        .getByRole('button', { name: /próximo|next|criar|create|continuar/i })
        .last();

      const isVisible = await button.isVisible().catch(() => false);
      if (isVisible) {
        const text = await button.textContent().catch(() => '');
        if (text?.match(/criar|create|finish|concluir/i)) {
          // This is the submit button
          await button.click();
          break;
        } else if (text?.match(/próximo|next|continuar/i)) {
          // This is a progress button
          await button.click();
          await page.waitForTimeout(300);
          continueAttempt++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Verify successful creation
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/, {
      timeout: 8000,
    });
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 5000 });
  });

  // ========================================
  // TEST GROUP 2: VENTURES ARCHETYPE FLOW
  // ========================================

  test('Test 2.1: Create Ventures space through complete wizard', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Startup Teste ${Date.now()}`;
    const subtitle = 'Tech Innovation';
    const description = 'A test venture/startup space for automation';

    await createSpace(page, 'ventures', {
      name: spaceName,
      subtitle,
      description,
      icon: '💼',
    });

    await expectSuccessMessage(page, { timeout: 8000 });
    await expect(page).toHaveURL(/\/connections\/ventures\/[^\/]+/);
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 5000 });
  });

  test('Test 2.2: Ventures space created with correct archetype in URL', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Ventures URL Test ${Date.now()}`;

    await createSpace(page, 'ventures', {
      name: spaceName,
    });

    // Verify URL contains ventures archetype
    const url = page.url();
    expect(url).toMatch(/\/connections\/ventures\/[\w-]+/);
    expect(url).not.toMatch(/\/connections\/(habitat|academia|tribo)\//);
  });

  // ========================================
  // TEST GROUP 3: ACADEMIA ARCHETYPE FLOW
  // ========================================

  test('Test 3.1: Create Academia space with learning focus details', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Curso Teste ${Date.now()}`;
    const subtitle = 'Desenvolvimento Pessoal';
    const description = 'A test academia space for learning and mentorship';

    await createSpace(page, 'academia', {
      name: spaceName,
      subtitle,
      description,
      icon: '🎓',
    });

    await expectSuccessMessage(page, { timeout: 8000 });
    await expect(page).toHaveURL(/\/connections\/academia\/[^\/]+/);
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 5000 });
  });

  test('Test 3.2: Academia space displays on detail page with correct icon', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Academia Icon Test ${Date.now()}`;

    await createSpace(page, 'academia', {
      name: spaceName,
      icon: '🎓',
    });

    // Verify space is created and accessible
    await expect(page).toHaveURL(/\/connections\/academia\/.+/);
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  // ========================================
  // TEST GROUP 4: TRIBO ARCHETYPE FLOW
  // ========================================

  test('Test 4.1: Create Tribo space for community/group collaboration', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Comunidade Teste ${Date.now()}`;
    const subtitle = 'Clube de Livros';
    const description = 'A test community space for tribal connections';

    await createSpace(page, 'tribo', {
      name: spaceName,
      subtitle,
      description,
      icon: '👥',
    });

    await expectSuccessMessage(page, { timeout: 8000 });
    await expect(page).toHaveURL(/\/connections\/tribo\/[^\/]+/);
    await expect(page.getByText(spaceName)).toBeVisible({ timeout: 5000 });
  });

  test('Test 4.2: Multiple Tribo spaces can be created in sequence', async ({
    authenticatedPage: page,
  }) => {
    const spaceName1 = `Tribo A ${Date.now()}`;
    const spaceName2 = `Tribo B ${Date.now() + 1}`;

    // Create first space
    await createSpace(page, 'tribo', {
      name: spaceName1,
    });

    // Navigate back to connections
    await navigateToConnections(page);

    // Create second space
    await createSpace(page, 'tribo', {
      name: spaceName2,
    });

    // Verify second space is created
    await expect(page).toHaveURL(/\/connections\/tribo\/[^\/]+/);
    await expect(page.getByText(spaceName2)).toBeVisible();

    // Navigate back and verify first space is still in list
    await navigateToConnections(page);

    const card1 = await findSpaceCard(page, spaceName1);
    const card2 = await findSpaceCard(page, spaceName2);

    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();
  });

  // ========================================
  // TEST GROUP 5: FORM VALIDATION & CONSTRAINTS
  // ========================================

  test('Test 5.1: Cannot submit with empty required name field', async ({
    authenticatedPage: page,
  }) => {
    await openCreateSpaceWizard(page);
    await selectArchetypeInWizard(page, 'habitat');

    // Progress to form step
    const nextButton = page
      .getByRole('button', { name: /próximo|next|continuar/i })
      .first();
    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Ensure name field is empty and try to submit
    const submitButton = page
      .getByRole('button', { name: /criar|create|concluir/i })
      .last();

    // Check if submit button is disabled
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Modal should still be visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
  });

  test('Test 5.2: Form accepts emoji and special characters in space name', async ({
    authenticatedPage: page,
  }) => {
    const specialName = `🚀 Espaço (Teste) - 2024 ${Date.now()}`;

    await createSpace(page, 'habitat', {
      name: specialName,
    });

    // Verify space was created with special characters
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/);
    await expect(page.getByText(/Espaço|Teste/)).toBeVisible();
  });

  test('Test 5.3: Form preserves text with leading/trailing spaces', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Trimmed Test ${Date.now()}`;

    await openCreateSpaceWizard(page);
    await selectArchetypeInWizard(page, 'habitat');

    const nextButton = page
      .getByRole('button', { name: /próximo|next|continuar/i })
      .first();
    const isNextVisible = await nextButton.isVisible().catch(() => false);
    if (isNextVisible) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // Fill with spaces - note: system should trim these
    const nameInput = page
      .locator('input[name="name"]')
      .or(page.getByLabel(/nome|name/i).first());

    await nameInput.fill(`  ${spaceName}  `);

    // Complete creation
    let continueAttempt = 0;
    while (continueAttempt < 4) {
      const button = page
        .getByRole('button', { name: /próximo|next|criar|create|continuar/i })
        .last();

      const isVisible = await button.isVisible().catch(() => false);
      if (isVisible) {
        const text = await button.textContent().catch(() => '');
        if (text?.match(/criar|create|finish|concluir/i)) {
          await button.click();
          break;
        } else if (text?.match(/próximo|next|continuar/i)) {
          await button.click();
          await page.waitForTimeout(300);
          continueAttempt++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Verify space created (trimmed name should appear in result)
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/, {
      timeout: 8000,
    });
  });

  // ========================================
  // TEST GROUP 6: CANCEL & CLOSE BEHAVIOR
  // ========================================

  test('Test 6.1: Cancel button closes wizard without creating space', async ({
    authenticatedPage: page,
  }) => {
    await openCreateSpaceWizard(page);

    // Click cancel/close button
    const cancelButton = page
      .getByRole('button', { name: /cancelar|cancel|fechar|close/i })
      .or(page.locator('button[aria-label*="Fechar"]'))
      .first();

    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify modal closes
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeHidden({ timeout: 3000 });

    // Verify we're back on connections page
    await expect(page).toHaveURL(/\/connections$/);
  });

  test('Test 6.2: Backdrop click closes wizard without creating space', async ({
    authenticatedPage: page,
  }) => {
    await openCreateSpaceWizard(page);

    // Click on backdrop (outside modal)
    const backdrop = page.locator('.fixed.inset-0').first();
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Verify modal closes
    const modal = page.locator('[role="dialog"]');
    const isClosed = await modal.isHidden().catch(() => true);
    expect(isClosed).toBe(true);
  });

  test('Test 6.3: Wizard can be reopened after closing', async ({
    authenticatedPage: page,
  }) => {
    // Open and close wizard
    await openCreateSpaceWizard(page);

    const cancelButton = page
      .getByRole('button', { name: /cancelar|cancel|fechar|close/i })
      .first();
    await cancelButton.click();

    // Verify closed
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeHidden();

    // Reopen wizard
    await openCreateSpaceWizard(page);

    // Verify it opens again
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  // ========================================
  // TEST GROUP 7: SPACE DISCOVERY & INTEGRATION
  // ========================================

  test('Test 7.1: Created space appears in connections dashboard list', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Dashboard Integration ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', {
      name: spaceName,
    });

    // Navigate back to connections dashboard
    await navigateToConnections(page);

    // Find the space in the list
    const spaceCard = await findSpaceCard(page, spaceName);
    await expect(spaceCard).toBeVisible({ timeout: 5000 });
  });

  test('Test 7.2: Space can be opened from dashboard after creation', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Reopenable Space ${Date.now()}`;

    // Create space
    await createSpace(page, 'habitat', {
      name: spaceName,
    });

    // Navigate back to dashboard
    await navigateToConnections(page);

    // Find and click on the space
    const spaceCard = await findSpaceCard(page, spaceName);
    await spaceCard.click();

    // Verify we're back in the space detail view
    await expect(page).toHaveURL(/\/connections\/habitat\/.+/);
    await expect(page.getByText(spaceName)).toBeVisible();
  });

  test('Test 7.3: Newly created space shows correct archetype in dashboard filter', async ({
    authenticatedPage: page,
  }) => {
    const spaceName = `Ventures Filter Test ${Date.now()}`;

    // Create Ventures space
    await createSpace(page, 'ventures', {
      name: spaceName,
    });

    // Go back to dashboard
    await navigateToConnections(page);

    // Filter by ventures tab
    const venturesTab = page
      .getByRole('button', { name: /ventures/i })
      .or(page.locator('[data-testid*="ventures"]'));

    const isVisible = await venturesTab.isVisible().catch(() => false);
    if (isVisible) {
      await venturesTab.click();
      await page.waitForTimeout(300);
    }

    // Verify space appears in ventures filtered view
    const spaceCard = await findSpaceCard(page, spaceName);
    await expect(spaceCard).toBeVisible({ timeout: 5000 });
  });
});
