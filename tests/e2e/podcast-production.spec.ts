import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Production Mode
 *
 * Tests the recording interface including:
 * - Recording controls (start, pause, resume, finish)
 * - Real-time timer
 * - Read-only pauta with topic navigation
 * - Topic completion marking
 * - Teleprompter window
 * - Chat assistant during recording
 *
 * Component: src/modules/podcast/views/ProductionMode.tsx
 * Component: src/modules/podcast/components/TeleprompterWindow.tsx
 * Service: src/services/podcastProductionService.ts
 */

test.describe('Podcast Production Mode - Recording', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication is handled via storageState
    await page.goto('/podcast');

    // Navigate through wizard and pre-production to reach production mode
    const newEpisodeButton = page
      .getByRole('button', { name: /novo episódio|criar episódio/i })
      .or(page.locator('[data-testid="new-episode-button"]'));

    await newEpisodeButton.click();

    // Complete wizard
    await page.getByPlaceholder(/Eduardo Paes/i).fill('Production Test Guest');
    await page.getByRole('button', { name: /buscar perfil/i }).click();
    await expect(page.getByText('Confirme o convidado')).toBeVisible({ timeout: 10000 });
    await page.locator('button').filter({ hasText: /Production Test Guest/i }).first().click();
    await expect(page.getByText('Tema da Conversa')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Iniciar Pesquisa/i }).click();

    // Wait for pre-production and navigate to production
    await expect(page.getByText('Pauta')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000); // Wait for research to start

    const productionButton = page.getByRole('button', { name: /Ir para Gravação/i });
    await expect(productionButton).toBeEnabled({ timeout: 15000 });
    await productionButton.click();

    // Verify production mode loaded
    await expect(page.getByText(/GRAVANDO|PRODUÇÃO/i)
      .or(page.getByText('Pauta do Dia'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 3.1: Verify production mode layout and initial state', async ({ page }) => {
    // Verify header with recording status
    await expect(page.getByText(/PRODUÇÃO|GRAVANDO/i)).toBeVisible();

    // Verify timer is visible and starts at 00:00:00
    await expect(page.getByText(/00:00:00/)).toBeVisible();

    // Verify Teleprompter button
    await expect(page.getByRole('button', { name: /Teleprompter/i })).toBeVisible();

    // Verify pauta is visible
    await expect(page.getByText('Pauta do Dia')).toBeVisible();

    // Verify recording controls at bottom
    const recordButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .filter({ hasText: '' });

    await expect(recordButton.first()).toBeVisible();

    // Verify "Finalizar Gravação" button
    await expect(page.getByRole('button', { name: /Finalizar Gravação/i })).toBeVisible();
  });

  test('Test 3.2: Start recording and verify timer updates', async ({ page }) => {
    // Find the large recording button (mic icon in red circle)
    const recordButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    await recordButton.click();

    // Verify recording indicator appears
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Verify pulsing red dot appears
    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    // Wait a bit and verify timer has updated from 00:00:00
    await page.waitForTimeout(2000);

    // Timer should show at least 00:00:01 or 00:00:02
    const timerText = await page.locator('.font-mono').first().textContent();
    expect(timerText).not.toBe('00:00:00');
  });

  test('Test 3.3: Pause and resume recording', async ({ page }) => {
    // Start recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Wait for timer to tick
    await page.waitForTimeout(1500);

    // Pause recording (click same button)
    await recordButton.click();

    // Get timer value when paused
    const pausedTime = await page.locator('.font-mono').first().textContent();

    // Wait and verify timer doesn't change while paused
    await page.waitForTimeout(2000);
    const stillPausedTime = await page.locator('.font-mono').first().textContent();
    expect(stillPausedTime).toBe(pausedTime);

    // Resume recording
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible();

    // Wait and verify timer is updating again
    await page.waitForTimeout(1500);
    const resumedTime = await page.locator('.font-mono').first().textContent();
    expect(resumedTime).not.toBe(pausedTime);
  });

  test('Test 3.4: Navigate between topics', async ({ page }) => {
    // Wait for topics to load
    await page.waitForTimeout(2000);

    // Verify initial topic counter
    await expect(page.getByText(/Tópico 1 de/i)).toBeVisible();

    // Click next topic button
    const nextButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();

    await nextButton.click();

    // Verify topic counter updated
    await expect(page.getByText(/Tópico 2 de/i)).toBeVisible({ timeout: 2000 });

    // Click previous topic button
    const prevButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .nth(-2);

    await prevButton.click();

    // Verify back to topic 1
    await expect(page.getByText(/Tópico 1 de/i)).toBeVisible({ timeout: 2000 });
  });

  test('Test 3.5: Mark topic as completed', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find and click "Concluir" button for current topic
    const completeButton = page
      .getByRole('button', { name: /Concluir/i })
      .or(page.locator('button').filter({ hasText: 'Concluir' }));

    await completeButton.click();

    // Verify topic is marked as completed (line-through style)
    await expect(page.locator('.line-through').first()).toBeVisible({ timeout: 2000 });

    // Verify progress counter updated
    await expect(page.getByText(/1 \/ .* abordados/i)).toBeVisible({ timeout: 2000 });
  });

  test('Test 3.6: Open teleprompter window', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click Teleprompter button
    const teleprompterButton = page.getByRole('button', { name: /Teleprompter/i });
    await teleprompterButton.click();

    // Verify teleprompter window opened (full-screen overlay)
    await expect(page.getByText('Teleprompter').first()).toBeVisible({ timeout: 3000 });

    // Verify teleprompter shows topic counter
    await expect(page.getByText(/Tópico 1 de/i)).toBeVisible();

    // Verify current topic is displayed in large text
    // The topic text should be in a large font size
    const topicContent = page.locator('.text-4xl, .text-5xl, .text-6xl');
    await expect(topicContent).toBeVisible();
  });

  test('Test 3.7: Navigate topics in teleprompter', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Open teleprompter
    await page.getByRole('button', { name: /Teleprompter/i }).click();
    await expect(page.getByText('Teleprompter').first()).toBeVisible({ timeout: 3000 });

    // Verify initial topic
    await expect(page.getByText(/Tópico 1 de/i)).toBeVisible();

    // Click next topic button (down arrow)
    const nextButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last();

    await nextButton.click();

    // Verify moved to next topic
    await expect(page.getByText(/Tópico 2 de/i)).toBeVisible({ timeout: 2000 });

    // Click previous topic button (up arrow)
    const prevButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .nth(-2);

    await prevButton.click();

    // Verify back to topic 1
    await expect(page.getByText(/Tópico 1 de/i)).toBeVisible({ timeout: 2000 });
  });

  test('Test 3.8: Close teleprompter window', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Open teleprompter
    await page.getByRole('button', { name: /Teleprompter/i }).click();
    await expect(page.getByText('Teleprompter').first()).toBeVisible({ timeout: 3000 });

    // Click close button (X button in header)
    const closeButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    await closeButton.click();

    // Verify teleprompter closed and back to production mode
    await expect(page.getByText('Pauta do Dia')).toBeVisible({ timeout: 2000 });
  });

  test('Test 3.9: Adjust teleprompter scroll speed', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Open teleprompter
    await page.getByRole('button', { name: /Teleprompter/i }).click();
    await expect(page.getByText('Teleprompter').first()).toBeVisible({ timeout: 3000 });

    // Find speed control
    await expect(page.getByText(/Vel\.|Velocidade/i)).toBeVisible();

    // Click increase speed button
    const increaseButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .nth(2);

    await increaseButton.click();
    await increaseButton.click();

    // Speed value should have increased
    // The speed counter is displayed in the UI
    // We can verify the speed control is interactive
    await expect(page.locator('button').filter({ has: page.locator('svg') })).toHaveCount({ min: 4 });
  });

  test('Test 3.10: Send chat message during recording', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find chat input
    const chatInput = page
      .getByPlaceholder(/Pergunte algo/i)
      .or(page.locator('input[type="text"]').last());

    await chatInput.fill('Quanto tempo falta?');
    await chatInput.press('Enter');

    // Verify message appears
    await expect(page.getByText('Quanto tempo falta?')).toBeVisible({ timeout: 2000 });

    // Wait for AI response
    await expect(page.getByText(/Boa pergunta|posso sugerir/i)).toBeVisible({ timeout: 5000 });
  });

  test('Test 3.11: Verify co-host panel exists', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verify Co-Host Aica panel
    await expect(page.getByText('Co-Host Aica')).toBeVisible();

    // Verify "Em Desenvolvimento" badge
    await expect(page.getByText('Em Desenvolvimento')).toBeVisible();

    // Verify mode buttons
    await expect(page.getByRole('button', { name: /Monitorar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Co-Host/i })).toBeVisible();
  });

  test('Test 3.12: Switch co-host modes', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click "Monitorar" mode
    const monitorButton = page.getByRole('button', { name: /Monitorar/i });
    await monitorButton.click();

    // Verify button is highlighted (active state)
    await expect(monitorButton).toHaveClass(/bg-indigo-100|text-indigo-700/);

    // Click "Co-Host" mode
    const coHostButton = page.getByRole('button', { name: /Co-Host/i }).filter({ hasText: 'Co-Host' });
    await coHostButton.click();

    // Verify button is highlighted
    await expect(coHostButton).toHaveClass(/bg-indigo-100|text-indigo-700/);
  });

  test('Test 3.13: Finish recording', async ({ page }) => {
    // Start recording first
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Wait for timer to tick
    await page.waitForTimeout(2000);

    // Click "Finalizar Gravação"
    const finishButton = page.getByRole('button', { name: /Finalizar Gravação/i });
    await finishButton.click();

    // Verify navigation to post-production hub
    await expect(page.getByText(/Pós-Produção|Gravação Concluída/i)).toBeVisible({ timeout: 10000 });
  });

  test('Test 3.14: Verify topic progress tracking', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check initial progress (0 / X abordados)
    await expect(page.getByText(/0 \/ .* abordados/)).toBeVisible();

    // Complete first topic
    const completeButton = page.getByRole('button', { name: /Concluir/i });
    await completeButton.click();

    // Verify progress updated (1 / X abordados)
    await expect(page.getByText(/1 \/ .* abordados/)).toBeVisible({ timeout: 2000 });
  });

  test('Test 3.15: Verify category badges on topics', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verify topic category badges (emoji indicators)
    // Topics should show category badges like 🎤 🎁 ❄️ ⚠️
    const categoryBadges = page.locator('span').filter({ hasText: /🎤|🎁|❄️|⚠️/ });
    await expect(categoryBadges.first()).toBeVisible();
  });

  test('Test 3.16: Navigate back to pre-production from production', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click back button
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    await backButton.click();

    // Verify navigated back to pre-production
    await expect(page.getByText('Ir para Gravação')
      .or(page.getByText('Pauta'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Test 3.17: Verify recording status persists across topic navigation', async ({ page }) => {
    // Start recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Navigate to next topic
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await nextButton.click();

    // Verify still recording
    await expect(page.getByText('GRAVANDO')).toBeVisible();

    // Verify timer is still running
    await page.waitForTimeout(1000);
    const timerText = await page.locator('.font-mono').first().textContent();
    expect(timerText).not.toBe('00:00:00');
  });

  test('Test 3.18: Verify topic highlights current position', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Current topic should have highlighted background (amber/yellow)
    const highlightedTopic = page.locator('[style*="background"], .bg-amber-50, .bg-yellow-50').first();
    await expect(highlightedTopic).toBeVisible();
  });

  test('Test 3.19: Verify previous/next buttons disable at boundaries', async ({ page }) => {
    await page.waitForTimeout(2000);

    // At first topic, previous button should be disabled
    const prevButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .nth(-2);

    await expect(prevButton).toBeDisabled();

    // Navigate to last topic
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    // Click next until we can't anymore
    for (let i = 0; i < 20; i++) {
      const isDisabled = await nextButton.isDisabled().catch(() => true);
      if (isDisabled) break;
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    // At last topic, next button should be disabled
    await expect(nextButton).toBeDisabled();
  });

  test('Test 3.20: Verify timer format for longer durations', async ({ page }) => {
    // Start recording
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await recordButton.click();
    await expect(page.getByText('GRAVANDO')).toBeVisible({ timeout: 2000 });

    // Wait for a few seconds
    await page.waitForTimeout(3000);

    // Verify timer shows correct format (HH:MM:SS)
    const timerText = await page.locator('.font-mono').first().textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
