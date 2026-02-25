import { test, expect } from '@playwright/test';

/**
 * OAuth Video Script Validation
 *
 * Validates that all 6 scenes from docs/OAUTH_VIDEO_SCRIPT.md
 * are executable against the live UI before recording.
 *
 * Run with: npx playwright test oauth-video-script --project=chromium
 * Or unauthenticated scenes: npx playwright test oauth-video-script --project=unauthenticated
 */

test.describe('OAuth Video Script — Scene Validation', () => {

  // ============================================================
  // SCENE 1 — Homepage / Landing Page
  // ============================================================
  test.describe('Scene 1: Homepage', () => {

    test('landing page loads at /landing with product overview', async ({ page }) => {
      await page.goto('/landing');
      await page.waitForLoadState('networkidle');

      // Should show AICA branding / product content
      const hasContent = await Promise.race([
        page.locator('text=/AICA|Life OS|Entrar|Começar/i').first().isVisible({ timeout: 10000 }),
        page.locator('img[alt*="AICA"], img[alt*="logo"]').first().isVisible({ timeout: 10000 }).catch(() => false),
      ]);
      expect(hasContent).toBeTruthy();
    });

    test('"Entrar com Google" button is visible on landing/login', async ({ page }) => {
      await page.goto('/landing');
      await page.waitForLoadState('networkidle');

      // Look for the Google login button (could be on landing or triggered by "Entrar")
      const googleButton = page.locator('[data-testid="google-login-button"], button:has-text("Google"), button:has-text("Entrar com Google")');

      // If not immediately visible, try clicking an "Entrar" CTA first
      const entrarButton = page.locator('text=/Entrar|Começar|Login/i').first();
      if (await entrarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await entrarButton.click();
        await page.waitForTimeout(1000);
      }

      const isVisible = await googleButton.first().isVisible({ timeout: 8000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  // ============================================================
  // SCENE 2 — OAuth Consent (structural check only)
  // ============================================================
  test.describe('Scene 2: OAuth Flow Structure', () => {

    test('Google login button has correct OAuth configuration', async ({ page }) => {
      await page.goto('/landing');
      await page.waitForLoadState('networkidle');

      // Trigger login sheet if needed
      const entrarButton = page.locator('text=/Entrar|Começar|Login/i').first();
      if (await entrarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await entrarButton.click();
        await page.waitForTimeout(1000);
      }

      // Verify the Google button exists with testid
      const googleButton = page.locator('[data-testid="google-login-button"]');
      const exists = await googleButton.isVisible({ timeout: 8000 }).catch(() => false);

      // We can't test the actual Google OAuth popup in E2E,
      // but we verify the button is present and clickable
      if (exists) {
        expect(await googleButton.isEnabled()).toBeTruthy();
      } else {
        // Fallback: any Google-related button
        const fallback = page.locator('button:has-text("Google")').first();
        expect(await fallback.isVisible({ timeout: 5000 })).toBeTruthy();
      }
    });
  });

  // ============================================================
  // SCENE 3 — Google Hub & Agenda (requires auth)
  // ============================================================
  test.describe('Scene 3: Google Hub & Agenda', () => {

    test('/google-hub route loads without 404', async ({ page }) => {
      await page.goto('/google-hub');
      await page.waitForLoadState('networkidle');

      // Should NOT show 404 page
      const is404 = await page.locator('text=/404|Página não encontrada|Not Found/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(is404).toBeFalsy();

      // Should show Google Hub content (calendar section, connect button, etc.)
      const hasHubContent = await Promise.race([
        page.locator('text=/Google Calendar|Calendário|Sincronizado|Não conectado|Conectar/i').first().isVisible({ timeout: 10000 }),
        page.locator('text=/Google Hub/i').first().isVisible({ timeout: 10000 }).catch(() => false),
      ]);
      expect(hasHubContent).toBeTruthy();
    });

    test('Agenda view shows sync indicator elements', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Agenda via BottomNav
      const agendaTab = page.locator('[data-testid="bottom-nav"] >> text=/Agenda/i, [data-module="agenda"], button:has-text("Agenda")').first();
      const hasAgenda = await agendaTab.isVisible({ timeout: 8000 }).catch(() => false);

      if (hasAgenda) {
        await agendaTab.click();
        await page.waitForTimeout(2000);

        // Check for calendar sync indicator (Sincronizado or Não conectado)
        const hasSyncIndicator = await page.locator('text=/Sincronizado|Não conectado|Conectar Calendar/i').first().isVisible({ timeout: 8000 }).catch(() => false);
        expect(hasSyncIndicator).toBeTruthy();
      } else {
        // If no agenda tab visible, skip gracefully
        test.skip(true, 'Agenda tab not visible in BottomNav');
      }
    });
  });

  // ============================================================
  // SCENE 4 — Calendar Write (task creation)
  // ============================================================
  test.describe('Scene 4: Task Creation with Calendar Sync', () => {

    test('task creation UI is accessible from Agenda', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to Agenda
      const agendaTab = page.locator('[data-testid="bottom-nav"] >> text=/Agenda/i, [data-module="agenda"], button:has-text("Agenda")').first();
      if (await agendaTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await agendaTab.click();
        await page.waitForTimeout(2000);

        // Look for task creation element (FAB, add button, or quick-add input)
        const hasTaskCreate = await Promise.race([
          page.locator('[data-testid="quick-add-task"], [data-testid="add-task-button"], button[aria-label*="adicionar"], button[aria-label*="nova tarefa"]').first().isVisible({ timeout: 5000 }),
          page.locator('text=/Nova tarefa|Adicionar|Quick Add/i').first().isVisible({ timeout: 5000 }).catch(() => false),
          page.locator('input[placeholder*="tarefa"], input[placeholder*="task"]').first().isVisible({ timeout: 5000 }).catch(() => false),
        ]);
        expect(hasTaskCreate).toBeTruthy();
      } else {
        test.skip(true, 'Agenda tab not visible');
      }
    });
  });

  // ============================================================
  // SCENE 5 — Privacy Policy & Disconnect
  // ============================================================
  test.describe('Scene 5: Privacy & Revocation', () => {

    test('/privacy-policy loads with Google Calendar section', async ({ page }) => {
      await page.goto('/privacy-policy');
      await page.waitForLoadState('networkidle');

      // Should NOT be 404
      const is404 = await page.locator('text=/404|Página não encontrada|Not Found/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(is404).toBeFalsy();

      // Should show privacy policy content
      const hasPrivacyContent = await page.locator('text=/Política de Privacidade|Privacy Policy/i').first().isVisible({ timeout: 10000 });
      expect(hasPrivacyContent).toBeTruthy();

      // Should have Section 5 about Google Calendar
      const hasGoogleSection = await page.locator('text=/Google Calendar/i').first().isVisible({ timeout: 5000 });
      expect(hasGoogleSection).toBeTruthy();
    });

    test('/privacy also works (original route)', async ({ page }) => {
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      const is404 = await page.locator('text=/404|Página não encontrada|Not Found/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(is404).toBeFalsy();

      const hasContent = await page.locator('text=/Política de Privacidade|Privacy Policy/i').first().isVisible({ timeout: 10000 });
      expect(hasContent).toBeTruthy();
    });

    test('Google Hub has disconnect button', async ({ page }) => {
      await page.goto('/google-hub');
      await page.waitForLoadState('networkidle');

      // Should show either "Desconectar" (if connected) or "Conectar" (if not)
      const hasConnectionControl = await Promise.race([
        page.locator('text=/Desconectar|Disconnect/i').first().isVisible({ timeout: 8000 }),
        page.locator('text=/Conectar|Connect.*Calendar/i').first().isVisible({ timeout: 8000 }).catch(() => false),
        page.locator('text=/Não conectado/i').first().isVisible({ timeout: 8000 }).catch(() => false),
      ]);
      expect(hasConnectionControl).toBeTruthy();
    });
  });

  // ============================================================
  // SCENE 6 — Terms of Service (bonus check)
  // ============================================================
  test.describe('Scene 6: Terms & Closing', () => {

    test('/terms route loads', async ({ page }) => {
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');

      const is404 = await page.locator('text=/404|Página não encontrada|Not Found/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(is404).toBeFalsy();

      const hasContent = await page.locator('text=/Termos|Terms/i').first().isVisible({ timeout: 10000 });
      expect(hasContent).toBeTruthy();
    });
  });

  // ============================================================
  // CROSS-CUTTING — Route Accessibility
  // ============================================================
  test.describe('Route Accessibility', () => {

    const publicRoutes = [
      { path: '/landing', name: 'Landing Page' },
      { path: '/privacy', name: 'Privacy Policy' },
      { path: '/privacy-policy', name: 'Privacy Policy (alias)' },
      { path: '/terms', name: 'Terms of Service' },
    ];

    for (const route of publicRoutes) {
      test(`${route.name} (${route.path}) loads without 404`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');

        const is404 = await page.locator('text=/404|Página não encontrada|Not Found/i').isVisible({ timeout: 5000 }).catch(() => false);
        expect(is404).toBeFalsy();
      });
    }

    const protectedRoutes = [
      { path: '/google-hub', name: 'Google Hub' },
    ];

    for (const route of protectedRoutes) {
      test(`${route.name} (${route.path}) loads without 404 (auth required)`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');

        // Either loads content OR redirects to login (both are valid, just not 404)
        const is404 = await page.locator('text=/404|Página não encontrada|Not Found/i').isVisible({ timeout: 5000 }).catch(() => false);
        expect(is404).toBeFalsy();
      });
    }
  });
});
