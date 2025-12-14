import { test as base, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Custom test fixture for Connection Archetypes E2E tests
 * Provides authenticated pages, database helpers, and cleanup utilities
 */

interface ConnectionTestFixture {
  authenticatedPage: Page;
  supabaseUrl: string;
  supabaseKey: string;
  testUserId: string;
  testUserEmail: string;
}

/**
 * Extended test function with custom fixtures
 */
export const test = base.extend<ConnectionTestFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Page is already authenticated via storageState in playwright.config.ts
    // This fixture just ensures we have a ready-to-use page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  supabaseUrl: async ({}, use) => {
    const url = process.env.VITE_SUPABASE_URL || '';
    await use(url);
  },

  supabaseKey: async ({}, use) => {
    const key = process.env.VITE_SUPABASE_ANON_KEY || '';
    await use(key);
  },

  testUserId: async ({}, use) => {
    const userId = process.env.TEST_USER_ID || '';
    await use(userId);
  },

  testUserEmail: async ({}, use) => {
    const email = process.env.TEST_USER_EMAIL || '';
    await use(email);
  },
});

/**
 * Helper to navigate to connections dashboard
 */
export async function navigateToConnections(page: Page) {
  await page.goto('/connections');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=/Conexões|Connections/i')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Helper to find archetype section by name
 */
export function getArchetypeSection(page: Page, archetype: string) {
  return page
    .getByRole('heading', { name: new RegExp(archetype, 'i') })
    .or(page.locator(`[data-testid="archetype-${archetype}"]`))
    .or(page.getByText(new RegExp(archetype, 'i')));
}

/**
 * Helper to click the create space button
 */
export async function openCreateSpaceWizard(page: Page) {
  const createButton = page
    .getByRole('button', { name: /criar espaço|create space|novo espaço/i })
    .or(page.locator('[data-testid="create-space-button"]'))
    .or(page.locator('[data-testid="create-connection-button"]'));

  await createButton.click();

  // Wait for wizard modal/dialog to appear
  await page
    .locator('[role="dialog"]')
    .or(page.locator('[data-testid="space-wizard"]'))
    .waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Helper to select an archetype in the wizard
 */
export async function selectArchetypeInWizard(page: Page, archetype: string) {
  const archetypeButton = page
    .getByRole('button', { name: new RegExp(archetype, 'i') })
    .or(page.locator(`[data-testid="archetype-${archetype}"]`))
    .or(page.getByText(new RegExp(`^${archetype}`, 'i')).first());

  await archetypeButton.click();
}

/**
 * Helper to fill space creation form
 */
export async function fillSpaceCreationForm(
  page: Page,
  data: {
    name: string;
    subtitle?: string;
    description?: string;
    icon?: string;
  }
) {
  // Fill name field
  const nameField = page
    .locator('input[name="name"]')
    .or(page.getByLabel(/nome|name/i).first())
    .or(page.locator('[data-testid="space-name-input"]'));

  await nameField.fill(data.name);

  // Fill subtitle if provided
  if (data.subtitle) {
    const subtitleField = page
      .locator('input[name="subtitle"]')
      .or(page.getByLabel(/subtítulo|subtitle|description/i))
      .or(page.locator('[data-testid="space-subtitle-input"]'));

    await subtitleField.fill(data.subtitle);
  }

  // Fill description if provided
  if (data.description) {
    const descField = page
      .locator('textarea[name="description"]')
      .or(page.getByLabel(/descrição|description/i))
      .or(page.locator('[data-testid="space-description-input"]'));

    await descField.fill(data.description);
  }

  // Select icon if provided
  if (data.icon) {
    const iconButton = page
      .locator(`button:has-text("${data.icon}")`)
      .first()
      .or(page.locator(`[data-testid="icon-${data.icon}"]`));

    await iconButton.click().catch(() => {
      // Icon selection might be optional
    });
  }
}

/**
 * Helper to submit the space creation wizard
 */
export async function submitSpaceWizard(page: Page) {
  const submitButton = page
    .getByRole('button', { name: /criar|create|concluir|finish/i })
    .last();

  await submitButton.click();

  // Wait for success message or navigation
  await page.waitForURL(/\/connections\/(habitat|ventures|academia|tribo)\/.*/, {
    timeout: 10000,
  });
}

/**
 * Helper to create a space in one go
 */
export async function createSpace(
  page: Page,
  archetype: string,
  spaceData: {
    name: string;
    subtitle?: string;
    description?: string;
    icon?: string;
  }
) {
  await openCreateSpaceWizard(page);
  await selectArchetypeInWizard(page, archetype);

  // Click next if there's a step-based wizard
  const nextButton = page
    .getByRole('button', { name: /próximo|next|continuar|continue/i })
    .first();

  const isNextVisible = await nextButton.isVisible().catch(() => false);
  if (isNextVisible) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  await fillSpaceCreationForm(page, spaceData);

  // Click next again if needed
  const nextButton2 = page
    .getByRole('button', { name: /próximo|next|continuar|continue/i })
    .first();

  const isNextVisible2 = await nextButton2.isVisible().catch(() => false);
  if (isNextVisible2) {
    await nextButton2.click();
    await page.waitForTimeout(500);
  }

  await submitSpaceWizard(page);
}

/**
 * Helper to extract space ID from current URL
 */
export async function getCurrentSpaceId(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/\/connections\/[\w-]+\/([\w-]+)/);
  return match ? match[1] : '';
}

/**
 * Helper to find a space card by name
 */
export async function findSpaceCard(page: Page, spaceName: string) {
  return page
    .locator(`[role="article"]:has-text("${spaceName}")`)
    .or(page.locator(`[data-testid="space-card"]:has-text("${spaceName}")`))
    .or(page.getByText(spaceName).first().locator('..')
      .or(page.getByText(spaceName).first().locator('..').locator('..')));
}

/**
 * Helper to click on a space to open it
 */
export async function openSpace(page: Page, spaceName: string) {
  const card = await findSpaceCard(page, spaceName);
  await card.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to delete a test space (if implemented in UI)
 */
export async function deleteSpace(page: Page) {
  const deleteButton = page
    .getByRole('button', { name: /deletar|delete|remover|remove/i })
    .or(page.locator('[data-testid="delete-space-button"]'))
    .or(page.getByRole('button', { name: /⋮|…/ }));

  const isVisible = await deleteButton.isVisible().catch(() => false);
  if (isVisible) {
    await deleteButton.click();

    // Confirm deletion if modal appears
    const confirmButton = page
      .getByRole('button', { name: /confirmar|confirm|sim|yes|deletar|delete/i })
      .last();

    const isConfirmVisible = await confirmButton.isVisible().catch(() => false);
    if (isConfirmVisible) {
      await confirmButton.click();
      await page.waitForURL('/connections', { timeout: 5000 });
    }
  }
}

/**
 * Helper to add a member to a space
 */
export async function addMemberToSpace(
  page: Page,
  memberData: {
    name: string;
    email: string;
    role?: 'admin' | 'member' | 'viewer';
  }
) {
  // Open add member dialog
  const addMemberButton = page
    .getByRole('button', { name: /adicionar|add|novo membro|invite/i })
    .or(page.locator('[data-testid="add-member-button"]'))
    .or(page.locator('[data-testid="invite-member"]'));

  await addMemberButton.click();

  // Fill member info
  const nameField = page
    .locator('input[name="name"]')
    .or(page.locator('input[name="external_name"]'))
    .or(page.getByLabel(/nome|name/i).first());

  const emailField = page
    .locator('input[name="email"]')
    .or(page.locator('input[name="external_email"]'))
    .or(page.getByLabel(/email/i).first());

  await nameField.fill(memberData.name);
  await emailField.fill(memberData.email);

  // Select role if provided
  if (memberData.role) {
    const roleSelect = page
      .locator('select[name="role"]')
      .or(page.getByLabel(/function|função|role|papel/i));

    await roleSelect.selectOption(memberData.role).catch(() => {
      // Role might be a button group or radio buttons
    });
  }

  // Submit
  const submitButton = page
    .getByRole('button', { name: /salvar|save|adicionar|add|convidar|invite/i })
    .last();

  await submitButton.click();

  // Wait for success
  await page.waitForTimeout(500);
}

/**
 * Helper to verify success message appears
 */
export async function expectSuccessMessage(
  page: Page,
  options?: { timeout?: number }
) {
  const successMsg = page
    .locator('text=/sucesso|success|criado|created|adicionado|added/i')
    .first();

  await expect(successMsg).toBeVisible({
    timeout: options?.timeout || 5000,
  });
}

/**
 * Helper to click a navigation breadcrumb
 */
export async function clickBreadcrumb(page: Page, label: string) {
  const breadcrumb = page
    .getByRole('link', { name: new RegExp(label, 'i') })
    .or(page.getByText(new RegExp(label, 'i')).locator('a'))
    .or(page.getByText(label));

  await breadcrumb.click();
  await page.waitForLoadState('networkidle');
}

export { expect };
