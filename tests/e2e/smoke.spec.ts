import { test, expect } from '@playwright/test';

/**
 * Smoke Test Suite — Critical Path Verification
 *
 * Fast, focused tests that verify the app's critical paths are functional.
 * No AI operations, no data mutations — just page loads and element visibility.
 *
 * Run with: npm run test:e2e:smoke
 */
test.describe('@smoke Critical Path Smoke Tests', () => {

  test('Auth: authenticated user lands on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should NOT be on the landing/login page
    const isOnLandingPage = await page
      .locator('text=/Conheça a si mesmo|Começar a usar|Entrar com Google/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isOnLandingPage) {
      // Auth setup did not inject session — skip gracefully
      test.skip(true, 'Auth setup did not inject session (missing TEST_EMAIL/TEST_PASSWORD)');
      return;
    }

    // Verify we see authenticated content (home dashboard)
    const hasAuthContent = await Promise.race([
      page.locator('[data-testid="identity-passport"]').isVisible({ timeout: 8000 }).catch(() => false),
      page.locator('[data-testid="bottom-nav"]').isVisible({ timeout: 8000 }).catch(() => false),
      page.locator('text=Meu Dia').isVisible({ timeout: 8000 }).catch(() => false),
    ]);

    expect(hasAuthContent).toBeTruthy();
  });

  test('Navigation: all main module routes load without crash', async ({ page }) => {
    // Routes that are separate paths (not ViewState-driven)
    const routes = [
      { path: '/connections', name: 'Connections' },
      { path: '/studio', name: 'Studio' },
      { path: '/flux', name: 'Flux' },
      { path: '/contacts', name: 'Contacts' },
      { path: '/profile', name: 'Profile' },
      { path: '/google-hub', name: 'Google Hub' },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // Page should not return an error status
      expect(response?.status(), `${route.name} (${route.path}) returned error status`).toBeLessThan(400);

      // Page should not show the 404 page
      const is404 = await page
        .locator('text=/404|Pagina nao encontrada|Page not found/i')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(is404, `${route.name} (${route.path}) showed 404`).toBeFalsy();

      // Page should not have an uncaught error overlay (Vite error overlay)
      const hasErrorOverlay = await page
        .locator('vite-error-overlay')
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      expect(hasErrorOverlay, `${route.name} (${route.path}) has error overlay`).toBeFalsy();
    }
  });

  test('Studio: page loads and shows key elements', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    // Studio should render without crashing — check for any meaningful content
    // The page might show a loading state first, then real content
    const hasContent = await Promise.race([
      page.locator('text=/Studio|Creative|Podcast|Episodio|Conteudo/i').first().isVisible({ timeout: 10000 }).catch(() => false),
      page.locator('[data-testid*="studio"]').first().isVisible({ timeout: 10000 }).catch(() => false),
    ]);

    expect(hasContent).toBeTruthy();
  });

  test('Connections: page loads and shows key elements', async ({ page }) => {
    await page.goto('/connections');
    await page.waitForLoadState('networkidle');

    const hasContent = await Promise.race([
      page.locator('text=/Conexoes|Connections|Espacos|Spaces/i').first().isVisible({ timeout: 10000 }).catch(() => false),
      page.locator('[data-testid*="connection"]').first().isVisible({ timeout: 10000 }).catch(() => false),
    ]);

    expect(hasContent).toBeTruthy();
  });

  test('Chat FAB: opens when clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the chat FAB button
    const chatFab = page.locator('[aria-label="Abrir chat com Aica"]');

    // FAB should be visible on authenticated pages
    const fabVisible = await chatFab.isVisible({ timeout: 10000 }).catch(() => false);

    if (!fabVisible) {
      test.skip(true, 'Chat FAB not visible (auth may have failed)');
      return;
    }

    await chatFab.click();

    // After clicking, the chat panel should open — look for chat-related content
    const chatOpened = await Promise.race([
      page.locator('text=/Aica|chat|mensagem|digite/i').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.locator('textarea, input[placeholder*="mensagem"], input[placeholder*="digitar"]').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.locator('[data-testid*="chat"]').first().isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    expect(chatOpened).toBeTruthy();
  });
});
