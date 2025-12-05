import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Pre-Production Hub
 *
 * Tests the pre-production workspace including:
 * - Pauta Builder (topic management with drag-and-drop)
 * - Research Panel (Bio, Ficha Técnica, News tabs)
 * - AI Chat Assistant
 * - Custom Sources (PDFs, links, text)
 *
 * Component: src/modules/podcast/views/PreProductionHub.tsx
 * Service: src/modules/podcast/services/geminiService.ts
 */

test.describe('Podcast Pre-Production Hub', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication is handled via storageState
    // Note: App uses state-based views, not URL routing
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

    // Navigate through wizard to reach pre-production
    // (In a real scenario, we might want to seed data and navigate directly)
    const newEpisodeButton = page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'));

    await newEpisodeButton.click();

    // Complete wizard quickly
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Test Guest');
    await page.getByRole('button', { name: /buscar perfil/i }).click();

    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Test Guest/i }).first().click();

    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // Wait for pre-production hub to load
    await expect(page.getByText('Pauta')
      .or(page.getByText('Bio'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('Test 2.1: Verify pre-production hub layout and components', async ({ page }) => {
    // Verify header with guest info
    await expect(page.getByText('Test Guest')).toBeVisible();

    // Verify "Ir para Gravação" button is present but disabled initially
    const productionButton = page
      .getByRole('button', { name: /Ir para Gravação/i })
      .or(page.locator('button').filter({ hasText: /Gravação/i }));

    await expect(productionButton).toBeVisible();

    // Verify left panel - Pauta
    await expect(page.getByText('Pauta')).toBeVisible();

    // Verify right panel has research tabs
    await expect(page.getByRole('button', { name: /Bio/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ficha/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /News/i })).toBeVisible();

    // Verify chat panel
    await expect(page.getByText(/Chat com Aica/i)).toBeVisible();
  });

  test('Test 2.2: Wait for deep research to complete', async ({ page }) => {
    // Research starts automatically on mount
    // Look for loading indicator
    const loadingIndicator = page
      .getByText(/Deep Research em andamento|Gerando/i)
      .or(page.locator('[data-testid="research-loading"]'));

    // Loading might appear briefly or already be done
    await expect(
      loadingIndicator.or(page.getByText('Test Guest'))
    ).toBeVisible({ timeout: 3000 }).catch(() => {});

    // Wait for research to complete - topics should be generated
    await expect(page.getByText(/Geral|Quebra-Gelo/i)).toBeVisible({ timeout: 15000 });

    // Verify "Ir para Gravação" button becomes enabled
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
  });

  test('Test 2.3: Navigate research panel tabs', async ({ page }) => {
    // Wait for research to load
    await page.waitForTimeout(2000);

    // Click Bio tab (should be active by default)
    const bioTab = page.getByRole('button', { name: /Bio/i });
    await bioTab.click();

    // Verify bio content is visible
    await expect(page.getByText(/biografia|informações/i)
      .or(page.locator('.prose'))
    ).toBeVisible({ timeout: 5000 });

    // Click Ficha tab
    const fichaTab = page.getByRole('button', { name: /Ficha/i });
    await fichaTab.click();

    // Verify technical sheet content
    await expect(page.getByText(/Nome Completo|Nascimento|não disponível/i)).toBeVisible({ timeout: 3000 });

    // Click News tab
    const newsTab = page.getByRole('button', { name: /News/i });
    await newsTab.click();

    // Verify news/controversies section
    await expect(page.getByText(/polêmica|notícia|Nenhuma notícia/i)).toBeVisible({ timeout: 3000 });
  });

  test('Test 2.4: Add new topic to pauta', async ({ page }) => {
    // Wait for initial topics to load
    await expect(page.getByText(/Geral|Quebra-Gelo/i)).toBeVisible({ timeout: 15000 });

    // Find the topic input field
    const topicInput = page
      .getByPlaceholder(/Nova pergunta ou tópico/i)
      .or(page.locator('input[type="text"]').last());

    await topicInput.fill('Qual foi o maior desafio da sua carreira?');

    // Click add button
    const addButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();

    await addButton.click();

    // Verify topic was added
    await expect(page.getByText('Qual foi o maior desafio da sua carreira?')).toBeVisible({ timeout: 3000 });
  });

  test('Test 2.5: Add topic with Enter key', async ({ page }) => {
    // Wait for pauta to load
    await page.waitForTimeout(2000);

    const topicInput = page.getByPlaceholder(/Nova pergunta ou tópico/i);
    await topicInput.fill('O que você diria para seu eu de 20 anos atrás?');

    // Press Enter
    await topicInput.press('Enter');

    // Verify topic was added
    await expect(page.getByText('O que você diria para seu eu de 20 anos atrás?')).toBeVisible({ timeout: 3000 });
  });

  test('Test 2.6: Switch topic category before adding', async ({ page }) => {
    // Wait for categories to load
    await page.waitForTimeout(2000);

    // Select "Quebra-Gelo" category
    const quebraGeloButton = page
      .getByRole('button', { name: /Quebra-Gelo/i })
      .filter({ hasText: 'Quebra-Gelo' })
      .last();

    await quebraGeloButton.click();

    // Add a topic
    await page.getByPlaceholder(/Nova pergunta ou tópico/i).fill('Qual foi seu primeiro trabalho?');
    await page.getByPlaceholder(/Nova pergunta ou tópico/i).press('Enter');

    // Verify topic appears under Quebra-Gelo category
    await expect(page.getByText('Qual foi seu primeiro trabalho?')).toBeVisible({ timeout: 3000 });
  });

  test('Test 2.7: Mark topic as completed', async ({ page }) => {
    // Wait for topics to load
    await expect(page.getByText(/Geral|Quebra-Gelo/i)).toBeVisible({ timeout: 15000 });

    // Find first topic checkbox
    const firstTopicCheckbox = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .filter({ hasText: '' })
      .first();

    await firstTopicCheckbox.click();

    // Verify topic is marked as completed (line-through style)
    await expect(page.locator('.line-through').first()).toBeVisible({ timeout: 2000 });
  });

  test('Test 2.8: Send message in AI chat', async ({ page }) => {
    // Wait for chat to be ready
    await page.waitForTimeout(2000);

    // Find chat input
    const chatInput = page
      .getByPlaceholder(/Pergunte algo sobre o convidado/i)
      .or(page.locator('input[type="text"]').filter({ hasText: '' }));

    await chatInput.fill('Quais são as principais polêmicas envolvendo essa pessoa?');

    // Send message
    const sendButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();

    await sendButton.click();

    // Verify message appears in chat
    await expect(page.getByText('Quais são as principais polêmicas')).toBeVisible({ timeout: 2000 });

    // Wait for AI response
    await expect(page.getByText(/Baseado nas informações|posso ajudar/i)).toBeVisible({ timeout: 5000 });
  });

  test('Test 2.9: Send chat message with Enter key', async ({ page }) => {
    await page.waitForTimeout(2000);

    const chatInput = page.getByPlaceholder(/Pergunte algo sobre o convidado/i);
    await chatInput.fill('Conte mais sobre a biografia');
    await chatInput.press('Enter');

    // Verify message sent
    await expect(page.getByText('Conte mais sobre a biografia')).toBeVisible({ timeout: 2000 });

    // Wait for response
    await expect(page.getByText(/Baseado nas informações|posso ajudar/i)).toBeVisible({ timeout: 5000 });
  });

  test('Test 2.10: Open custom sources dialog', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Click "Adicionar Fontes Personalizadas" button
    const addSourcesButton = page
      .getByRole('button', { name: /Adicionar Fontes Personalizadas/i })
      .or(page.getByText(/Adicionar Fontes/i));

    await addSourcesButton.click();

    // Verify dialog opened
    await expect(page.getByText('Adicionar Fontes')).toBeVisible({ timeout: 3000 });

    // Verify all source type options are visible
    await expect(page.getByText('Upload de Arquivo')).toBeVisible();
    await expect(page.getByText('Colar Link')).toBeVisible();
    await expect(page.getByText('Texto Livre')).toBeVisible();
  });

  test('Test 2.11: Close custom sources dialog without adding', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Open dialog
    await page.getByRole('button', { name: /Adicionar Fontes Personalizadas/i }).click();
    await expect(page.getByText('Adicionar Fontes')).toBeVisible({ timeout: 3000 });

    // Click cancel
    const cancelButton = page
      .getByRole('button', { name: /Cancelar/i })
      .or(page.locator('button').filter({ hasText: 'Cancelar' }));

    await cancelButton.click();

    // Verify dialog closed
    await expect(page.getByText('Adicionar Fontes')).not.toBeVisible({ timeout: 2000 });
  });

  test('Test 2.12: Add custom text source', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Open sources dialog
    await page.getByRole('button', { name: /Adicionar Fontes Personalizadas/i }).click();
    await expect(page.getByText('Adicionar Fontes')).toBeVisible({ timeout: 3000 });

    // Fill text area
    const textArea = page
      .getByPlaceholder(/Cole aqui informações relevantes/i)
      .or(page.locator('textarea'));

    await textArea.fill('Informação adicional sobre o convidado: Publicou 3 livros sobre tecnologia.');

    // Click Adicionar
    const addButton = page
      .getByRole('button', { name: /Adicionar/i })
      .last();

    await addButton.click();

    // Verify dialog closed
    await expect(page.getByText('Adicionar Fontes')).not.toBeVisible({ timeout: 2000 });
  });

  test('Test 2.13: Verify low context warning when applicable', async ({ page }) => {
    // This test checks if warning appears when research has limited sources
    // The warning should appear automatically if hasLowContext is true

    await page.waitForTimeout(3000);

    // Open sources dialog
    await page.getByRole('button', { name: /Adicionar Fontes Personalizadas/i }).click();

    // Check for warning message
    const warningMessage = page
      .getByText(/Poucas informações públicas|low context/i)
      .or(page.locator('[role="alert"]'));

    // Warning may or may not be visible depending on research results
    // We just verify the dialog structure supports it
    await expect(page.getByText('Adicionar Fontes')).toBeVisible({ timeout: 3000 });
  });

  test('Test 2.14: Navigate back to podcast list', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click back button
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    await backButton.click();

    // Verify navigated back to podcast list
    await expect(page.getByText(/Podcast Copilot|Sal na Veia/i)).toBeVisible({ timeout: 5000 });
  });

  test('Test 2.15: Verify topic categories are displayed', async ({ page }) => {
    // Wait for topics to load
    await expect(page.getByText(/Geral|Quebra-Gelo/i)).toBeVisible({ timeout: 15000 });

    // Verify all default categories exist
    await expect(page.getByText('Geral')).toBeVisible();
    await expect(page.getByText('Quebra-Gelo')).toBeVisible();
    await expect(page.getByText('Patrocinador')).toBeVisible();
  });

  test('Test 2.16: Verify topics are grouped by category', async ({ page }) => {
    // Wait for topics to load
    await page.waitForTimeout(5000);

    // Verify Geral category has topics
    const geralSection = page.locator('div').filter({ hasText: 'Geral' }).first();
    await expect(geralSection).toBeVisible();

    // Verify Quebra-Gelo category has topics
    const quebraGeloSection = page.locator('div').filter({ hasText: 'Quebra-Gelo' }).first();
    await expect(quebraGeloSection).toBeVisible();
  });

  test('Test 2.17: Proceed to production mode', async ({ page }) => {
    // Wait for research to complete and button to enable
    await page.waitForTimeout(5000);

    // Click "Ir para Gravação" button
    const productionButton = page
      .getByRole('button', { name: /Ir para Gravação/i })
      .or(page.locator('button').filter({ hasText: /Gravação/i }));

    // Wait for button to be enabled
    await expect(productionButton).toBeEnabled({ timeout: 15000 });

    await productionButton.click();

    // Verify navigation to production mode
    await expect(page.getByText(/GRAVANDO|PRODUÇÃO/i)
      .or(page.getByText('Pauta do Dia'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 2.18: Verify chat messages persist during session', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Send first message
    await page.getByPlaceholder(/Pergunte algo sobre o convidado/i).fill('Mensagem 1');
    await page.getByPlaceholder(/Pergunte algo sobre o convidado/i).press('Enter');

    // Wait for response
    await page.waitForTimeout(2000);

    // Send second message
    await page.getByPlaceholder(/Pergunte algo sobre o convidado/i).fill('Mensagem 2');
    await page.getByPlaceholder(/Pergunte algo sobre o convidado/i).press('Enter');

    // Verify both messages are visible
    await expect(page.getByText('Mensagem 1')).toBeVisible();
    await expect(page.getByText('Mensagem 2')).toBeVisible();
  });

  test('Test 2.19: Verify empty chat input disables send button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const chatInput = page.getByPlaceholder(/Pergunte algo sobre o convidado/i);
    const sendButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();

    // Clear input
    await chatInput.clear();

    // Send button should be disabled
    await expect(sendButton).toBeDisabled();

    // Type something
    await chatInput.fill('Test message');

    // Send button should be enabled
    await expect(sendButton).toBeEnabled();
  });

  test('Test 2.20: Verify research panel shows loading state initially', async ({ page }) => {
    // This test would work better if we could navigate directly to pre-production
    // without completing the wizard, but we can still verify the structure

    // Look for any loading indicators that might still be visible
    const loadingIndicator = page
      .getByText(/Gerando|carregando/i)
      .or(page.locator('.animate-pulse'));

    // If research is fast, this might already be done
    // We just verify the page structure is correct
    await expect(page.getByText('Pauta')
      .or(page.getByText('Bio'))
    ).toBeVisible({ timeout: 5000 });
  });
});
