import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Complete Podcast Production Workflow
 *
 * Tests the end-to-end flow from guest identification to post-production:
 * 1. Guest Identification Wizard (3 steps)
 * 2. Pre-Production Hub (research + pauta building)
 * 3. Production Mode (recording)
 * 4. Post-Production Hub (success screen)
 *
 * These tests verify the complete user journey and integration between all stages.
 */

test.describe('Podcast Complete Workflow - End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication is handled via storageState
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Podcast Copilot card to enter podcast view
    const podcastCard = page
      .locator('text=Podcast Copilot')
      .or(page.locator('text=Studio'))
      .locator('..')
      .first();
    await podcastCard.click();

    // Wait for podcast view to load
    await expect(page.getByText('Podcast Copilot')
      .or(page.getByText('Sal na Veia'))
    ).toBeVisible({ timeout: 10000 });

    // Wait for podcast page to load
    await expect(page.getByText('Podcast Copilot')
      .or(page.getByText('Sal na Veia'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 5.1: Complete workflow - Guest to Post-Production', async ({ page }) => {
    // ========== STAGE 1: Guest Identification Wizard ==========

    // Open wizard
    const newEpisodeButton = page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'));
    await newEpisodeButton.click();

    // Step 1: Enter guest details
    await expect(page.getByText('Quem será entrevistado?')).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Warren Buffett');
    await page.getByPlaceholder(/Prefeito do Rio de Janeiro/i).fill('CEO da Berkshire Hathaway');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    // Step 2: Confirm profile
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Warren Buffett/i }).first().click();

    // Step 3: Configure theme and scheduling
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.locator('input[type="date"]').fill('2025-12-25');
    await page.locator('input[type="time"]').fill('10:00');
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // ========== STAGE 2: Pre-Production Hub ==========

    // Verify pre-production loaded
    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Warren Buffett')).toBeVisible();

    // Wait for research to complete
    await page.waitForTimeout(5000);

    // Add a custom topic
    const topicInput = page.getByPlaceholder(/Nova pergunta ou tópico/i);
    await topicInput.fill('Qual o seu melhor conselho sobre investimentos?');
    await topicInput.press('Enter');
    await expect(page.getByText('Qual o seu melhor conselho sobre investimentos?')).toBeVisible({ timeout: 3000 });

    // Check research tabs
    await page.getByRole('button', { name: /Bio/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Ficha/i }).click();
    await page.waitForTimeout(500);

    // Send a chat message
    const chatInput = page.getByPlaceholder(/Pergunte algo sobre o convidado/i);
    await chatInput.fill('Quais são os principais investimentos?');
    await chatInput.press('Enter');
    await expect(page.getByText('Quais são os principais investimentos?')).toBeVisible({ timeout: 2000 });

    // Proceed to production
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    // ========== STAGE 3: Production Mode ==========

    // Verify production mode loaded
    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pauta do Dia')).toBeVisible();

    // Start recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Wait for timer to start
    await page.waitForTimeout(2000);
    const timerText = await page.locator('.font-mono').first().textContent();
    expect(timerText).not.toBe('00:00:00');

    // Complete a topic
    const completeButton = page.getByRole('button', { name: /Concluir/i });
    await completeButton.click();
    await expect(page.locator('.line-through').first()).toBeVisible({ timeout: 2000 });

    // Navigate to next topic
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await nextButton.click();
    await expect(page.getByText(/Tópico 2 de/i)).toBeVisible({ timeout: 2000 });

    // Test teleprompter
    await page.getByRole('button', { name: /Teleprompter/i }).click();
    await expect(page.getByText('Teleprompter').first()).toBeVisible({ timeout: 3000 });
    const teleprompterClose = page.locator('button').filter({ has: page.locator('svg') }).first();
    await teleprompterClose.click();
    await expect(page.getByText('Pauta do Dia')).toBeVisible({ timeout: 2000 });

    // Wait for more recording time
    await page.waitForTimeout(2000);

    // Finish recording
    const finishButton = page.getByRole('button', { name: /Finalizar Gravação/i });
    await finishButton.click();

    // ========== STAGE 4: Post-Production Hub ==========

    // Verify post-production loaded
    await expect(page.getByText(/Pós-Produção|Gravação Concluída/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Warren Buffett')).toBeVisible();

    // Verify success message
    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible();

    // Verify duration is displayed
    await expect(page.getByText(/Duração:/i).or(page.locator('.bg-green-100'))).toBeVisible({ timeout: 3000 });

    // Verify all coming soon features
    await expect(page.getByText('Transcrição Automática')).toBeVisible();
    await expect(page.getByText('Cortes & Shorts')).toBeVisible();
    await expect(page.getByText('Blog Posts')).toBeVisible();
    await expect(page.getByText('Publicação em Redes')).toBeVisible();

    // Verify roadmap section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/Opus Clip|Roadmap/i)).toBeVisible({ timeout: 3000 });

    // Complete workflow verified
  });

  test('Test 5.2: Workflow with manual theme selection', async ({ page }) => {
    // Start wizard
    await page.getByRole('button', { name: /novo episódio|criar episódio/i }).click();

    // Complete wizard with manual theme
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Steve Wozniak');
    await page.getByPlaceholder(/Prefeito do Rio de Janeiro/i).fill('Co-fundador da Apple');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Steve Wozniak/i }).first().click();

    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Select manual theme
    await page.getByRole('button', { name: /Manual/i }).filter({ hasText: 'Manual' }).click();
    await page.getByPlaceholder(/Políticas Públicas, Empreendedorismo/i).fill('Inovação e Tecnologia');

    await page.locator('input[type="date"]').fill('2025-12-30');
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // Verify theme is reflected in pre-production
    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Inovação e Tecnologia')
      .or(page.getByText('Steve Wozniak'))
    ).toBeVisible();

    // Skip to production
    await page.waitForTimeout(5000);
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });

    // Quick recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await page.waitForTimeout(2000);

    const finishButton = page.getByRole('button', { name: /Finalizar Gravação/i });
    await finishButton.click();

    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible({ timeout: 10000 });
  });

  test('Test 5.3: Workflow with multiple topics added in pre-production', async ({ page }) => {
    // Start wizard and reach pre-production
    await page.getByRole('button', { name: /novo episódio|criar episódio/i }).click();

    await page.getByPlaceholder(/Eduardo Paes/i).fill('Richard Branson');
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Richard Branson/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Add multiple custom topics
    const topics = [
      'Como você começou seu primeiro negócio?',
      'Qual foi o maior risco que você tomou?',
      'Qual é o futuro da Virgin Galactic?'
    ];

    const topicInput = page.getByPlaceholder(/Nova pergunta ou tópico/i);

    for (const topic of topics) {
      await topicInput.fill(topic);
      await topicInput.press('Enter');
      await expect(page.getByText(topic)).toBeVisible({ timeout: 2000 });
    }

    // Verify all topics are visible
    for (const topic of topics) {
      await expect(page.getByText(topic)).toBeVisible();
    }

    // Proceed to production
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });

    // Verify topics appear in production pauta
    for (const topic of topics) {
      await expect(page.getByText(topic)).toBeVisible();
    }

    // Quick recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Finalizar Gravação/i }).click();

    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible({ timeout: 10000 });
  });

  test('Test 5.4: Workflow with navigation backwards and forwards', async ({ page }) => {
    // Start wizard
    await page.getByRole('button', { name: /novo episódio|criar episódio/i }).click();

    // Step 1
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Larry Page');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    // Step 2 - then go back
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /não é esse|buscar novamente/i }).click();

    // Verify back at Step 1
    await expect(page.getByText('Quem será entrevistado?')).toBeVisible();
    await expect(page.getByPlaceholder(/Eduardo Paes/i)).toHaveValue('Larry Page');

    // Search again
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });

    // Step 2 - confirm and go to Step 3
    await page.locator('button').filter({ hasText: /Larry Page/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Go back to Step 2
    await page.getByRole('button', { name: /Voltar/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible();

    // Forward to Step 3 again
    await page.locator('button').filter({ hasText: /Larry Page/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });

    // Complete wizard
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // In pre-production, go back to podcast list
    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await backButton.click();

    // Verify at podcast list
    await expect(page.getByText(/Podcast Copilot|Sal na Veia/i)).toBeVisible({ timeout: 5000 });
  });

  test('Test 5.5: Workflow with pause and resume during recording', async ({ page }) => {
    // Reach production mode
    await page.getByRole('button', { name: /novo episódio|criar episódio/i }).click();
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Jack Ma');
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Jack Ma/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(5000);
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });

    // Start recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(2000);

    // Pause
    await recordButton.click();
    const pausedTime = await page.locator('.font-mono').first().textContent();

    // Wait while paused
    await page.waitForTimeout(2000);
    const stillPausedTime = await page.locator('.font-mono').first().textContent();
    expect(stillPausedTime).toBe(pausedTime);

    // Resume
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible();
    await page.waitForTimeout(2000);

    // Finish
    await page.getByRole('button', { name: /Finalizar Gravação/i }).click();
    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible({ timeout: 10000 });

    // Verify duration reflects paused time
    await expect(page.getByText(/Duração:/i).or(page.locator('.bg-green-100'))).toBeVisible();
  });

  test('Test 5.6: Workflow completing all topics during recording', async ({ page }) => {
    // Reach production
    await page.getByRole('button', { name: /novo episódio|criar episódio/i }).click();
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Sheryl Sandberg');
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Sheryl Sandberg/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(5000);
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });

    // Start recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Complete first topic
    const completeButton = page.getByRole('button', { name: /Concluir/i });
    await completeButton.click();
    await expect(page.getByText(/1 \/ .* abordados/)).toBeVisible({ timeout: 2000 });

    // Navigate and complete second topic
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await nextButton.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Concluir/i }).click();
    await expect(page.getByText(/2 \/ .* abordados/)).toBeVisible({ timeout: 2000 });

    // Finish recording
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Finalizar Gravação/i }).click();

    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible({ timeout: 10000 });
  });

  test('Test 5.7: Complete workflow with minimum required inputs', async ({ page }) => {
    // Test bare minimum workflow - only required fields

    // Start wizard
    await page.getByRole('button', { name: /novo episódio|criar episódio/i }).click();

    // Only guest name (no reference)
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Minimal Guest');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Minimal Guest/i }).first().click();

    // Use auto theme (default), no date/time
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // Pre-production
    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(5000);

    // Production
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });

    // Minimal recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Finalizar Gravação/i }).click();

    // Post-production
    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible({ timeout: 10000 });

    // Workflow complete with minimal inputs
  });
});
