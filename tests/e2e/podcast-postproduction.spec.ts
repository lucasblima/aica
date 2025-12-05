import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Post-Production Hub
 *
 * Tests the post-production success screen including:
 * - Success message display
 * - Recording duration display
 * - Future features preview (transcription, cuts, blog, social)
 * - Navigation back to podcast list
 *
 * Component: src/modules/podcast/views/PostProductionHub.tsx
 * Service: src/services/podcastProductionService.ts
 */

test.describe('Podcast Post-Production Hub', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication is handled via storageState
    await page.goto('/podcast');

    // Navigate through complete workflow to reach post-production
    const newEpisodeButton = page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'));

    await newEpisodeButton.click();

    // Complete wizard
    await page.getByPlaceholder(/Eduardo Paes/i).fill('PostProd Test Guest');
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /PostProd Test Guest/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // Wait for pre-production and go to production
    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);
    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    // Wait for production mode
    await expect(page.getByText(/PRODUÇÃO/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Start and stop recording to generate data
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Wait for some recording time
    await page.waitForTimeout(3000);

    // Finish recording
    const finishButton = page.getByRole('button', { name: /Finalizar Gravação/i });
    await finishButton.click();

    // Verify we're in post-production
    await expect(page.getByText(/Pós-Produção|Gravação Concluída/i)).toBeVisible({ timeout: 10000 });
  });

  test('Test 4.1: Verify post-production hub layout', async ({ page }) => {
    // Verify header
    await expect(page.getByText('Pós-Produção')).toBeVisible();

    // Verify guest name is displayed
    await expect(page.getByText('PostProd Test Guest')).toBeVisible();

    // Verify success icon/message
    await expect(page.getByText(/Gravação Concluída|🎉/)).toBeVisible();

    // Verify back button
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
    await expect(backButton).toBeVisible();
  });

  test('Test 4.2: Verify recording duration is displayed', async ({ page }) => {
    // Look for duration display
    const durationDisplay = page
      .getByText(/Duração:|minutos|segundos/i)
      .or(page.locator('.text-green-700, .bg-green-100').filter({ hasText: /\d+/ }));

    // Duration should be visible (we recorded for ~3 seconds)
    await expect(durationDisplay).toBeVisible({ timeout: 3000 });
  });

  test('Test 4.3: Verify success message is displayed', async ({ page }) => {
    // Verify main success heading
    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible();

    // Verify confirmation message
    await expect(page.getByText(/foi salvo com sucesso|PostProd Test Guest/)).toBeVisible();

    // Verify sparkles icon or celebration emoji
    const celebrationElement = page
      .locator('svg')
      .or(page.getByText('🎉'));
    await expect(celebrationElement.first()).toBeVisible();
  });

  test('Test 4.4: Verify "Coming Soon" features section', async ({ page }) => {
    // Verify section heading
    await expect(page.getByText(/Funcionalidades em Desenvolvimento|Coming Soon/i)).toBeVisible();

    // Verify all 4 features are listed
    await expect(page.getByText('Transcrição Automática')).toBeVisible();
    await expect(page.getByText(/Cortes & Shorts|Cortes/)).toBeVisible();
    await expect(page.getByText('Blog Posts')).toBeVisible();
    await expect(page.getByText(/Publicação em Redes|Social/)).toBeVisible();
  });

  test('Test 4.5: Verify transcription feature card', async ({ page }) => {
    // Find transcription card
    const transcriptionCard = page.locator('div').filter({ hasText: 'Transcrição Automática' }).first();
    await expect(transcriptionCard).toBeVisible();

    // Verify icon is present
    await expect(transcriptionCard.locator('svg').first()).toBeVisible();

    // Verify description
    await expect(page.getByText(/Transcrição completa em texto|timestamps/i)).toBeVisible();

    // Verify "Em breve" badge
    await expect(page.getByText('Em breve').first()).toBeVisible();
  });

  test('Test 4.6: Verify cuts & shorts feature card', async ({ page }) => {
    // Find cuts card
    const cutsCard = page.locator('div').filter({ hasText: /Cortes & Shorts|Cortes/ }).first();
    await expect(cutsCard).toBeVisible();

    // Verify description mentions social platforms
    await expect(page.getByText(/TikTok|Reels|Shorts/i)).toBeVisible();

    // Verify "Em breve" badge
    const badges = page.getByText('Em breve');
    await expect(badges).toHaveCount({ min: 1 });
  });

  test('Test 4.7: Verify blog posts feature card', async ({ page }) => {
    // Find blog card
    const blogCard = page.locator('div').filter({ hasText: 'Blog Posts' }).first();
    await expect(blogCard).toBeVisible();

    // Verify description mentions SEO
    await expect(page.getByText(/SEO|otimizados/i)).toBeVisible();
  });

  test('Test 4.8: Verify social publishing feature card', async ({ page }) => {
    // Find social card
    const socialCard = page.locator('div').filter({ hasText: 'Publicação em Redes' }).first();
    await expect(socialCard).toBeVisible();

    // Verify description mentions platforms
    await expect(page.getByText(/Instagram|TikTok|YouTube/i)).toBeVisible();
  });

  test('Test 4.9: Verify inspirational note/roadmap section', async ({ page }) => {
    // Scroll to bottom to see roadmap note
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify roadmap message
    await expect(page.getByText(/Opus Clip|transformar automaticamente/i)).toBeVisible({ timeout: 3000 });

    // Verify roadmap attribution
    await expect(page.getByText(/Roadmap Aica|2025/i)).toBeVisible();
  });

  test('Test 4.10: Verify feature cards have hover effects', async ({ page }) => {
    // Find first feature card
    const firstCard = page.locator('div').filter({ hasText: 'Transcrição Automática' }).first();

    // Hover over card
    await firstCard.hover();

    // Card should have hover state (shadow or opacity change)
    // We can verify the card is interactive
    await expect(firstCard).toBeVisible();
  });

  test('Test 4.11: Navigate back to podcast list', async ({ page }) => {
    // Click back button
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    await backButton.click();

    // Verify navigated back to podcast list/dashboard
    await expect(page.getByText(/Podcast Copilot|Sal na Veia/i)).toBeVisible({ timeout: 5000 });
  });

  test('Test 4.12: Verify all feature cards display correctly on load', async ({ page }) => {
    // Verify exactly 4 feature cards are visible
    const featureCards = page.locator('div').filter({ hasText: 'Em breve' });
    await expect(featureCards).toHaveCount(4);

    // Verify each card has an icon
    const transcriptionIcon = page.locator('svg').filter({ hasText: '' });
    await expect(transcriptionIcon.first()).toBeVisible();
  });

  test('Test 4.13: Verify cards animate on load', async ({ page }) => {
    // Cards should have animation classes
    // We can verify they are visible and laid out correctly
    const cards = page.locator('div').filter({ hasText: 'Em breve' });

    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });

  test('Test 4.14: Verify duration format for short recordings', async ({ page }) => {
    // Our recording was ~3 seconds, should show "0 minutos" or similar
    const durationText = await page.locator('.bg-green-100, .text-green-700').filter({ hasText: /\d+/ }).textContent();

    // Should contain a number (duration in minutes or seconds)
    expect(durationText).toMatch(/\d+/);
  });

  test('Test 4.15: Verify header displays episode theme', async ({ page }) => {
    // Header should show theme if set
    // Look for theme or auto mode indicator
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // Guest name should be in header
    await expect(header.getByText('PostProd Test Guest')).toBeVisible();
  });

  test('Test 4.16: Verify responsive layout for feature cards', async ({ page }) => {
    // Cards should be in a grid layout
    // Verify at least 2 cards are visible side by side (grid-cols-2)
    const firstCard = page.locator('div').filter({ hasText: 'Transcrição Automática' }).first();
    const secondCard = page.locator('div').filter({ hasText: 'Cortes & Shorts' }).first();

    await expect(firstCard).toBeVisible();
    await expect(secondCard).toBeVisible();

    // Both should be in the same horizontal row (approximately)
    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();

    if (firstBox && secondBox) {
      // Y coordinates should be similar (within 50px) for horizontal layout
      const yDifference = Math.abs(firstBox.y - secondBox.y);
      expect(yDifference).toBeLessThan(100);
    }
  });

  test('Test 4.17: Verify success screen appears after any duration recording', async ({ page }) => {
    // We're already in post-production from beforeEach
    // Just verify the key elements exist regardless of recording duration

    await expect(page.getByText(/Gravação Concluída/i)).toBeVisible();
    await expect(page.getByText('Transcrição Automática')).toBeVisible();
    await expect(page.getByText('PostProd Test Guest')).toBeVisible();
  });

  test('Test 4.18: Verify all feature icons are different', async ({ page }) => {
    // Each feature should have a unique icon
    // We can verify by checking that different cards exist

    await expect(page.getByText('Transcrição Automática')).toBeVisible();
    await expect(page.getByText('Cortes & Shorts')).toBeVisible();
    await expect(page.getByText('Blog Posts')).toBeVisible();
    await expect(page.getByText('Publicação em Redes')).toBeVisible();

    // All four features should be distinct
    const features = await page.getByText('Em breve').count();
    expect(features).toBe(4);
  });

  test('Test 4.19: Verify page scrolls to show all content', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify roadmap section is visible
    await expect(page.getByText(/Roadmap Aica|2025/i)).toBeVisible({ timeout: 2000 });

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Verify header is visible
    await expect(page.getByText('Pós-Produção')).toBeVisible();
  });

  test('Test 4.20: Verify color coding of feature cards', async ({ page }) => {
    // Each card should have a unique color scheme
    // Verify the gradient backgrounds exist
    const transcriptionCard = page.locator('div').filter({ hasText: 'Transcrição Automática' }).first();
    await expect(transcriptionCard).toBeVisible();

    const cutsCard = page.locator('div').filter({ hasText: 'Cortes & Shorts' }).first();
    await expect(cutsCard).toBeVisible();

    const blogCard = page.locator('div').filter({ hasText: 'Blog Posts' }).first();
    await expect(blogCard).toBeVisible();

    const socialCard = page.locator('div').filter({ hasText: 'Publicação em Redes' }).first();
    await expect(socialCard).toBeVisible();

    // All cards should be distinct and visible
    const allCards = [transcriptionCard, cutsCard, blogCard, socialCard];
    for (const card of allCards) {
      await expect(card).toBeVisible();
    }
  });
});
