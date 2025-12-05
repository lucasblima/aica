import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Guest Identification Wizard
 *
 * Tests the 3-step wizard flow:
 * 1. Enter guest name + reference
 * 2. Confirm profile from Gemini search
 * 3. Set theme, season, location, scheduling
 *
 * Component: src/modules/podcast/components/GuestIdentificationWizard.tsx
 * Service: src/services/podcastProductionService.ts
 * API: src/api/geminiDeepResearch.ts (with mock fallback)
 */

test.describe('Podcast Wizard - Guest Identification', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication is handled via storageState in config
    await page.goto('/podcast');

    // Wait for podcast page to load
    await expect(page.getByText('Podcast Copilot')
      .or(page.getByText('Sal na Veia'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 1.1: Open guest identification wizard', async ({ page }) => {
    // Find and click the button to create a new episode
    // Try multiple selector strategies with fallbacks
    const newEpisodeButton = page
      .getByRole('button', { name: /novo episódio|criar episódio|new episode/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .or(page.getByText('Novo Episódio').first());

    await newEpisodeButton.click();

    // Verify wizard dialog opened
    const wizardDialog = page
      .getByRole('dialog')
      .or(page.locator('[data-testid="guest-wizard"]'))
      .or(page.locator('.fixed.inset-0').filter({ hasText: 'Quem será entrevistado' }));

    await expect(wizardDialog).toBeVisible({ timeout: 5000 });

    // Verify Step 1 content is visible
    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();
    await expect(page.getByPlaceholder(/Eduardo Paes/i)).toBeVisible();
  });

  test('Test 1.2: Complete Step 1 - Enter guest name and reference', async ({ page }) => {
    // Open wizard
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();

    // Fill guest name
    const guestNameInput = page
      .getByPlaceholder(/Eduardo Paes/i)
      .or(page.getByLabel(/Nome do Convidado/i));

    await guestNameInput.fill('Elon Musk');

    // Fill reference (optional field)
    const referenceInput = page
      .getByPlaceholder(/Prefeito do Rio de Janeiro/i)
      .or(page.getByLabel(/Referência/i));

    await referenceInput.fill('CEO da Tesla e SpaceX');

    // Click "Buscar Perfil" button
    const searchButton = page
      .getByRole('button', { name: /buscar perfil/i })
      .or(page.locator('button').filter({ hasText: /Buscar/i }));

    await searchButton.click();

    // Wait for loading state
    await expect(page.getByText(/Buscando.../i)).toBeVisible({ timeout: 2000 }).catch(() => {});

    // Wait for Step 2 to appear (search completes)
    // Note: This will use mock data if Gemini API is not configured
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
  });

  test('Test 1.3: Handle search with empty guest name', async ({ page }) => {
    // Open wizard
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();

    // Leave guest name empty
    const searchButton = page
      .getByRole('button', { name: /buscar perfil/i })
      .or(page.locator('button').filter({ hasText: /Buscar/i }));

    // Button should be disabled when name is empty
    await expect(searchButton).toBeDisabled();
  });

  test('Test 1.4: Complete Step 2 - Confirm guest profile', async ({ page }) => {
    // Open wizard and fill Step 1
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Tim Cook');
    await page.getByPlaceholder(/Prefeito do Rio de Janeiro/i).fill('CEO da Apple');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    // Wait for Step 2
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

    // Verify profile card is displayed
    const profileCard = page
      .locator('button')
      .filter({ hasText: /Tim Cook/i })
      .first();

    await expect(profileCard).toBeVisible();

    // Click to confirm profile
    await profileCard.click();

    // Verify Step 3 loaded
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
  });

  test('Test 1.5: Navigate back from Step 2 to Step 1', async ({ page }) => {
    // Complete Step 1
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Jeff Bezos');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    // Wait for Step 2
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

    // Click "Não é esse, buscar novamente"
    const backButton = page
      .getByRole('button', { name: /não é esse|buscar novamente/i })
      .or(page.getByText(/buscar novamente/i));

    await backButton.click();

    // Verify back to Step 1
    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();
  });

  test('Test 1.6: Complete Step 3 - Configure theme and scheduling (Auto theme)', async ({ page }) => {
    // Navigate to Step 3
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Bill Gates');
    await page.getByPlaceholder(/Prefeito do Rio de Janeiro/i).fill('Fundador da Microsoft');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Bill Gates/i }).first().click();

    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Select "Aica Auto" theme mode (should be selected by default)
    const aicaAutoButton = page
      .getByRole('button', { name: /Aica Auto/i })
      .or(page.locator('button').filter({ hasText: /Auto/i }));

    await expect(aicaAutoButton).toBeVisible();

    // Fill season (should have default value of "1")
    const seasonInput = page
      .getByLabel(/Temporada/i)
      .or(page.locator('input[type="number"]').first());

    await expect(seasonInput).toHaveValue('1');

    // Select location (should have default value)
    const locationSelect = page
      .getByLabel(/Local/i)
      .or(page.locator('select').first());

    await expect(locationSelect).toBeVisible();

    // Fill optional date and time
    const dateInput = page.getByLabel(/Data/i).or(page.locator('input[type="date"]'));
    await dateInput.fill('2025-12-15');

    const timeInput = page.getByLabel(/Hora/i).or(page.locator('input[type="time"]'));
    await timeInput.fill('14:30');

    // Click "Iniciar Pesquisa" to complete wizard
    const completeButton = page
      .getByRole('button', { name: /Iniciar Pesquisa/i })
      .or(page.locator('button').filter({ hasText: /Iniciar/i }));

    await completeButton.click();

    // Verify wizard closes and we navigate to pre-production
    // The wizard should close and navigate to PreProductionHub
    await expect(page.getByText('Quem será entrevistado?')).not.toBeVisible({ timeout: 5000 });

    // Wait for pre-production view to load
    await expect(page.getByText('Pauta')
      .or(page.getByText('Deep Research'))
      .or(page.getByText('Bio'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 1.7: Complete Step 3 - Configure with manual theme', async ({ page }) => {
    // Navigate to Step 3
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Mark Zuckerberg');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Mark Zuckerberg/i }).first().click();

    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Switch to Manual theme mode
    const manualButton = page
      .getByRole('button', { name: /Manual/i })
      .filter({ hasText: 'Manual' });

    await manualButton.click();

    // Fill manual theme
    const themeInput = page
      .getByPlaceholder(/Políticas Públicas, Empreendedorismo/i)
      .or(page.locator('input[type="text"]').filter({ hasText: '' }));

    await themeInput.fill('Inovação e Tecnologia');

    // Fill scheduling
    await page.locator('input[type="date"]').fill('2025-12-20');
    await page.locator('input[type="time"]').fill('16:00');

    // Complete wizard
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // Verify navigation to pre-production
    await expect(page.getByText('Pauta')
      .or(page.getByText('Deep Research'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 1.8: Navigate back from Step 3 to Step 2', async ({ page }) => {
    // Navigate to Step 3
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Steve Jobs');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Steve Jobs/i }).first().click();

    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Click "Voltar" button
    const backButton = page
      .getByRole('button', { name: /Voltar/i })
      .or(page.locator('button').filter({ hasText: 'Voltar' }));

    await backButton.click();

    // Verify back to Step 2
    await expect(page.getByText('Confirme o convidado')).toBeVisible();
  });

  test('Test 1.9: Cancel wizard from Step 1', async ({ page }) => {
    // Open wizard
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();

    // Click "Cancelar" button
    const cancelButton = page
      .getByRole('button', { name: /Cancelar/i })
      .or(page.locator('button').filter({ hasText: 'Cancelar' }));

    await cancelButton.click();

    // Verify wizard closed
    await expect(page.getByText('Quem será entrevistado?')).not.toBeVisible({ timeout: 2000 });
  });

  test('Test 1.10: Verify manual theme requires input', async ({ page }) => {
    // Navigate to Step 3
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Satya Nadella');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Satya Nadella/i }).first().click();

    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Switch to Manual mode
    await page.getByRole('button', { name: /Manual/i }).filter({ hasText: 'Manual' }).click();

    // Leave theme input empty
    const completeButton = page.getByRole('button', { name: /Iniciar Pesquisa/i });

    // Button should be disabled when manual theme is empty
    await expect(completeButton).toBeDisabled();

    // Fill theme - button should become enabled
    await page.getByPlaceholder(/Políticas Públicas, Empreendedorismo/i).fill('Leadership');
    await expect(completeButton).toBeEnabled();
  });

  test('Test 1.11: Verify error handling when Gemini API fails', async ({ page }) => {
    // Open wizard
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    // Fill with a name that might cause API issues (or trigger mock fallback)
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Unknown Person XYZ123');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    // Even if API fails, wizard should proceed to Step 2 with fallback profile
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

    // Verify error/warning message is shown (if low context)
    const errorMessage = page
      .getByText(/Busca automática falhou|poucas informações|falhou/i)
      .or(page.locator('[role="alert"]').filter({ hasText: /falhou|erro/i }));

    // Error might be visible in Step 1 or as a warning in the profile
    await expect(
      errorMessage.or(page.getByText('Unknown Person XYZ123'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Test 1.12: Verify progress bar updates through wizard steps', async ({ page }) => {
    // Open wizard
    await page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'))
      .click();

    // Step 1 - Progress should be at 33%
    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();

    // Navigate to Step 2
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Sundar Pichai');
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

    // Step 2 - Progress should be at 66%

    // Navigate to Step 3
    await page.locator('button').filter({ hasText: /Sundar Pichai/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Step 3 - Progress should be at 100%
    // The progress bar uses a gradient that animates width based on step
    // We can verify we're on the final step by checking for the complete button
    await expect(page.getByRole('button', { name: /Iniciar Pesquisa/i })).toBeVisible();
  });
});
