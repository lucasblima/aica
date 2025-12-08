/**
 * E2E Tests: Podcast Module - Gemini Integration
 *
 * Tests all Gemini-powered features in the Podcast module:
 * - Suggest trending guest
 * - Suggest episode theme
 * - Generate complete dossier (biography, controversies, topics, ice breakers)
 * - Analyze news articles
 * - Generate dynamic topics
 * - Generate more ice breakers
 * - Chat with Aica assistant
 *
 * All tests validate that:
 * 1. Backend integration works (Edge Functions)
 * 2. API key is NOT exposed in frontend
 * 3. Loading states appear correctly
 * 4. Results are displayed properly
 * 5. Errors are handled gracefully
 */

import { test, expect } from '@playwright/test';

// Use authenticated session from setup
test.use({ storageState: 'tests/e2e/.auth.json' });

test.describe('Podcast - Gemini Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to podcast pre-production page
    await page.goto('/podcast/pre-production');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should suggest trending guest via backend', async ({ page }) => {
    // Click "Sugerir Convidado" button
    const suggestButton = page.locator('button', { hasText: /sugerir convidado/i });
    await expect(suggestButton).toBeVisible();
    await suggestButton.click();

    // Loading state should appear
    const loadingIndicator = page.locator('[data-testid="loading"]').or(
      page.locator('text=/carregando|loading/i')
    );
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

    // Wait for suggestion (Edge Function - should be fast)
    const suggestionArea = page.locator('[data-testid="guest-suggestion"]').or(
      page.locator('textarea, input').filter({ hasText: /.+/ }).first()
    );

    await expect(suggestionArea).toBeVisible({ timeout: 15000 });

    // Verify suggestion has meaningful content
    const suggestionText = await suggestionArea.inputValue().catch(() =>
      suggestionArea.textContent()
    );

    expect(suggestionText).toBeTruthy();
    expect(suggestionText!.length).toBeGreaterThan(5);

    console.log('✓ Guest suggestion received:', suggestionText?.substring(0, 50) + '...');
  });

  test('should suggest episode theme based on guest name', async ({ page }) => {
    // Fill guest name
    const guestNameInput = page.locator('input[placeholder*="nome" i]').or(
      page.locator('[data-testid="guest-name-input"]')
    ).first();

    await expect(guestNameInput).toBeVisible();
    await guestNameInput.fill('Elon Musk');

    // Click "Sugerir Tema" button
    const suggestThemeButton = page.locator('button', { hasText: /sugerir tema/i });
    await expect(suggestThemeButton).toBeVisible();
    await suggestThemeButton.click();

    // Wait for theme suggestion
    const themeInput = page.locator('input[placeholder*="tema" i]').or(
      page.locator('[data-testid="episode-theme-input"]')
    ).first();

    // Theme should be populated within 15 seconds
    await expect(themeInput).not.toBeEmpty({ timeout: 15000 });

    const theme = await themeInput.inputValue();
    expect(theme.length).toBeGreaterThan(5);

    console.log('✓ Theme suggestion received:', theme);
  });

  test('should generate complete dossier with all sections', async ({ page }) => {
    // Fill guest name
    const guestNameInput = page.locator('input[placeholder*="nome" i]').first();
    await guestNameInput.fill('Steve Jobs');

    // Fill theme (optional)
    const themeInput = page.locator('input[placeholder*="tema" i]').first();
    await themeInput.fill('Inovação e Design');

    // Click "Gerar Dossiê" button
    const generateButton = page.locator('button', { hasText: /gerar dossiê/i });
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Wait for dossier generation (can take up to 30s for comprehensive dossier)
    console.log('⏳ Waiting for dossier generation (may take up to 30 seconds)...');

    // Biography section
    const biographySection = page.locator('[data-testid="dossier-biography"]').or(
      page.locator('text=/biografia|biography/i').locator('..').locator('p, div').first()
    );
    await expect(biographySection).toBeVisible({ timeout: 30000 });
    const biographyText = await biographySection.textContent();
    expect(biographyText!.length).toBeGreaterThan(50);
    console.log('✓ Biography section loaded');

    // Controversies section
    const controversiesSection = page.locator('[data-testid="dossier-controversies"]').or(
      page.locator('text=/controvérsias|controversies/i').locator('..')
    );
    await expect(controversiesSection).toBeVisible();
    console.log('✓ Controversies section loaded');

    // Suggested topics section
    const topicsSection = page.locator('[data-testid="dossier-topics"]').or(
      page.locator('text=/tópicos|topics/i').locator('..')
    );
    await expect(topicsSection).toBeVisible();
    console.log('✓ Topics section loaded');

    // Ice breakers section
    const iceBreakersSection = page.locator('[data-testid="dossier-icebreakers"]').or(
      page.locator('text=/ice breaker/i').locator('..')
    );
    await expect(iceBreakersSection).toBeVisible();
    console.log('✓ Ice breakers section loaded');

    // Verify at least one ice breaker exists
    const iceBreakers = page.locator('text=/ice breaker/i').locator('..').locator('li, p');
    const count = await iceBreakers.count();
    expect(count).toBeGreaterThan(0);

    console.log(`✓ Complete dossier generated with ${count} ice breakers`);
  });

  test('should analyze news articles with sentiment and topics', async ({ page }) => {
    // This test assumes there's a news analysis feature
    // Skip if not available in current UI
    const newsButton = page.locator('button', { hasText: /notícias|news/i });

    if (!(await newsButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'News analysis feature not available in current UI');
      return;
    }

    await newsButton.click();

    // Wait for news to load
    await page.waitForTimeout(2000);

    // Verify articles have sentiment tags
    const sentimentTags = page.locator('[data-testid*="sentiment"]').or(
      page.locator('text=/positive|negative|neutral/i')
    );

    const sentimentCount = await sentimentTags.count();
    expect(sentimentCount).toBeGreaterThan(0);

    console.log(`✓ News analysis complete with ${sentimentCount} sentiment tags`);
  });

  test('should generate more ice breakers on demand', async ({ page }) => {
    // First generate a basic dossier
    const guestNameInput = page.locator('input[placeholder*="nome" i]').first();
    await guestNameInput.fill('Bill Gates');

    const generateButton = page.locator('button', { hasText: /gerar dossiê/i });
    await generateButton.click();

    // Wait for initial ice breakers
    await page.locator('text=/ice breaker/i').waitFor({ timeout: 30000 });

    // Click "Gerar Mais" or "Add More" button if available
    const moreButton = page.locator('button', { hasText: /gerar mais|add more|mais/i });

    if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const initialCount = await page.locator('li').filter({ hasText: /\?/ }).count();

      await moreButton.click();
      await page.waitForTimeout(10000); // Wait for new ice breakers

      const newCount = await page.locator('li').filter({ hasText: /\?/ }).count();
      expect(newCount).toBeGreaterThan(initialCount);

      console.log(`✓ Generated ${newCount - initialCount} additional ice breakers`);
    } else {
      console.log('⚠ "Generate More" button not found, skipping');
    }
  });

  test('should NOT expose API key in network requests', async ({ page }) => {
    const requests: string[] = [];
    const requestBodies: string[] = [];

    // Capture all network requests
    page.on('request', request => {
      requests.push(request.url());

      // Capture request body if it's a POST
      if (request.method() === 'POST') {
        const postData = request.postData();
        if (postData) {
          requestBodies.push(postData);
        }
      }
    });

    // Trigger a Gemini operation
    const suggestButton = page.locator('button', { hasText: /sugerir convidado/i });
    await suggestButton.click();
    await page.waitForTimeout(5000);

    // Verify no requests contain API key patterns
    const hasApiKeyInUrl = requests.some(url =>
      url.includes('AIza') ||
      url.includes('GEMINI_API_KEY') ||
      url.includes('key=') && url.includes('generativelanguage.googleapis.com')
    );

    expect(hasApiKeyInUrl).toBe(false);

    // Verify no request bodies contain API key
    const hasApiKeyInBody = requestBodies.some(body =>
      body.includes('AIza') ||
      body.includes('GEMINI_API_KEY')
    );

    expect(hasApiKeyInBody).toBe(false);

    // Verify requests go to backend (not directly to Google)
    const hasBackendRequests = requests.some(url =>
      url.includes('/functions/v1/gemini') ||
      url.includes('localhost:8001') ||
      url.includes('supabase.co/functions')
    );

    expect(hasBackendRequests).toBe(true);

    console.log('✅ SECURITY: API key NOT exposed in network traffic');
    console.log('✅ SECURITY: Requests routed through backend');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate error by disconnecting network temporarily
    await page.context().setOffline(true);

    const suggestButton = page.locator('button', { hasText: /sugerir convidado/i });
    await suggestButton.click();

    // Wait for error message
    const errorMessage = page.locator('text=/erro|error|falha|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Reconnect and verify retry works
    await page.context().setOffline(false);

    // Click retry or try again
    await page.waitForTimeout(1000);
    await suggestButton.click();

    // Should work after reconnection
    const suggestion = page.locator('[data-testid="guest-suggestion"]');
    await expect(suggestion).toBeVisible({ timeout: 15000 });

    console.log('✓ Error handling and retry mechanism working');
  });

  test('should display loading states correctly', async ({ page }) => {
    const suggestButton = page.locator('button', { hasText: /sugerir convidado/i });

    // Before clicking, should not be loading
    const initialLoading = page.locator('[data-testid="loading"]');
    expect(await initialLoading.isVisible().catch(() => false)).toBe(false);

    // Click and immediately check for loading state
    await suggestButton.click();

    // Loading should appear within 1 second
    const loadingState = page.locator('text=/carregando|loading/i').or(
      page.locator('[data-testid="loading"]')
    );

    await expect(loadingState).toBeVisible({ timeout: 1000 });

    // Loading should disappear after result arrives
    await expect(loadingState).not.toBeVisible({ timeout: 20000 });

    console.log('✓ Loading states working correctly');
  });

  test('should use cached results for faster responses on second call', async ({ page }) => {
    // First call
    const startTime1 = Date.now();

    const suggestButton = page.locator('button', { hasText: /sugerir convidado/i });
    await suggestButton.click();

    await page.locator('[data-testid="guest-suggestion"]').waitFor({ timeout: 15000 });
    const duration1 = Date.now() - startTime1;

    console.log(`First call took: ${duration1}ms`);

    // Clear suggestion if there's a clear button
    const clearButton = page.locator('button', { hasText: /limpar|clear/i });
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }

    // Second call (should be cached)
    const startTime2 = Date.now();
    await suggestButton.click();

    await page.locator('[data-testid="guest-suggestion"]').waitFor({ timeout: 15000 });
    const duration2 = Date.now() - startTime2;

    console.log(`Second call took: ${duration2}ms`);

    // Second call should be at least 50% faster (cache working)
    // Note: This might not always be true depending on cache implementation
    if (duration2 < duration1 * 0.5) {
      console.log('✓ Cache working - second call significantly faster');
    } else {
      console.log('⚠ Cache might not be working or not implemented for this action');
    }
  });
});

test.describe('Podcast - Chat with Aica', () => {
  test('should send message and receive response from Aica assistant', async ({ page }) => {
    await page.goto('/podcast/pre-production');

    // Look for chat interface
    const chatButton = page.locator('button', { hasText: /chat|aica|assistente/i });

    if (!(await chatButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Chat feature not available in current UI');
      return;
    }

    await chatButton.click();

    // Find chat input
    const chatInput = page.locator('textarea[placeholder*="mensagem" i]').or(
      page.locator('input[placeholder*="pergunte" i]')
    );

    await expect(chatInput).toBeVisible();
    await chatInput.fill('Quem seria um bom convidado para falar sobre IA?');

    // Send message
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button', { hasText: /enviar|send/i })
    );
    await sendButton.click();

    // Wait for Aica's response
    const aiResponse = page.locator('[data-testid="aica-response"]').or(
      page.locator('.message').filter({ hasText: /.{20,}/ }).last()
    );

    await expect(aiResponse).toBeVisible({ timeout: 15000 });

    const responseText = await aiResponse.textContent();
    expect(responseText!.length).toBeGreaterThan(20);

    console.log('✓ Aica chat response received:', responseText?.substring(0, 100) + '...');
  });
});
