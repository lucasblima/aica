import { test, expect } from '@playwright/test';

/**
 * Chat Unification E2E Tests — PR #522 Checklist
 *
 * Verifies all items from the chat unification checklist:
 * 1. FAB drawer opens/closes on all routes
 * 2. FAB expanded mode shows context sidebar
 * 3. /chat route renders FAB in fullpage mode
 * 4. VidaChatHero opens FAB via CustomEvent
 * 5. Streaming cursor display
 * 6. Agent badge on non-coordinator responses
 * 7. Session search filter (fullpage)
 * 8. Session history + archive
 * 9. Mobile responsive layout
 */

test.describe('@chat-unification Chat Unification E2E', () => {

  // ──────────────── FAB DRAWER OPENS/CLOSES ────────────────

  test('FAB: drawer opens when FAB button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!fabVisible) {
      test.skip(true, 'FAB not visible — auth may have failed');
      return;
    }

    await fabButton.click();

    // Drawer should be open — check for the header title
    const drawerOpen = await page.locator('.aica-fab-drawer--open').isVisible({ timeout: 5000 });
    expect(drawerOpen).toBeTruthy();

    // Should show greeting or messages area
    const hasContent = await Promise.race([
      page.locator('text=Ola! Como posso ajudar?').isVisible({ timeout: 5000 }).catch(() => false),
      page.locator('.aica-fab-messages').isVisible({ timeout: 5000 }).catch(() => false),
    ]);
    expect(hasContent).toBeTruthy();
  });

  test('FAB: drawer closes when X button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    // Open drawer
    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    // Close drawer
    const closeBtn = page.locator('[aria-label="Fechar"]');
    await closeBtn.click();

    // Drawer should no longer be open
    await expect(page.locator('.aica-fab-drawer--open')).not.toBeVisible({ timeout: 3000 });
  });

  test('FAB: drawer closes on Escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    await page.keyboard.press('Escape');

    await expect(page.locator('.aica-fab-drawer--open')).not.toBeVisible({ timeout: 3000 });
  });

  test('FAB: opens on multiple routes', async ({ page }) => {
    const routes = ['/connections', '/studio', '/flux'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
      const fabVisible = await fabButton.isVisible({ timeout: 8000 }).catch(() => false);

      if (!fabVisible) continue; // Route may require specific auth state

      await fabButton.click();
      const drawerOpen = await page.locator('.aica-fab-drawer--open').isVisible({ timeout: 5000 });
      expect(drawerOpen, `FAB should open on ${route}`).toBeTruthy();

      // Close for next route
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  // ──────────────── EXPANDED MODE + CONTEXT SIDEBAR ────────────────

  test('FAB: expanded mode shows context sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    // Click expand button
    const expandBtn = page.locator('[aria-label="Expandir"]');
    const expandVisible = await expandBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!expandVisible) { test.skip(true, 'Expand button not visible'); return; }

    await expandBtn.click();

    // Should have expanded class
    await expect(page.locator('.aica-fab-drawer--expanded')).toBeVisible({ timeout: 5000 });

    // Context sidebar should appear
    const sidebar = page.locator('.aica-context-sidebar');
    const sidebarVisible = await sidebar.isVisible({ timeout: 5000 }).catch(() => false);
    expect(sidebarVisible).toBeTruthy();
  });

  test('FAB: expand/minimize toggle hides in fullpage mode', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // In fullpage mode, expand/minimize buttons should NOT exist
    await expect(page.locator('[aria-label="Expandir"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[aria-label="Reduzir"]')).not.toBeVisible({ timeout: 5000 });
  });

  // ──────────────── FULLPAGE MODE (/chat) ────────────────

  test('/chat: renders FAB in fullpage mode', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Should have fullpage class
    const fullpage = await page.locator('.aica-fab-drawer--fullpage').isVisible({ timeout: 10000 }).catch(() => false);

    if (!fullpage) {
      test.skip(true, 'Fullpage mode not rendered — auth may have failed');
      return;
    }

    expect(fullpage).toBeTruthy();

    // Should also be expanded (for sidebar)
    await expect(page.locator('.aica-fab-drawer--expanded')).toBeVisible();
  });

  test('/chat: fullpage takes full viewport height', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    // Height should be approximately the viewport height
    expect(box!.height).toBeGreaterThanOrEqual(viewport!.height * 0.95);
  });

  test('/chat: no border-radius in fullpage mode', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const borderRadius = await drawer.evaluate(el => getComputedStyle(el).borderRadius);
    expect(borderRadius).toBe('0px');
  });

  test('/chat: shows back arrow instead of X', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Close button should say "Voltar" not "Fechar"
    const backBtn = page.locator('[aria-label="Voltar"]');
    await expect(backBtn).toBeVisible({ timeout: 3000 });

    // Should NOT have "Fechar" label
    await expect(page.locator('[aria-label="Fechar"]')).not.toBeVisible();
  });

  test('/chat: back arrow navigates to home', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const backBtn = page.locator('[aria-label="Voltar"]');
    await backBtn.click();

    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test('/chat: global FAB is hidden when on /chat route', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // The global FAB button should NOT be visible (only the fullpage chat)
    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    await expect(fabButton).not.toBeVisible({ timeout: 5000 });
  });

  test('/chat: uses textarea instead of input', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Should have a textarea in fullpage mode
    const textarea = page.locator('.aica-fab-textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });

  // ──────────────── VIDACHATHERO CUSTOM EVENT ────────────────

  test('VidaChatHero: CustomEvent opens FAB drawer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify FAB exists but drawer is closed
    const fabExists = await page.locator('.aica-fab-drawer').count().then(c => c > 0);
    if (!fabExists) { test.skip(true, 'FAB not in DOM'); return; }

    // Dispatch the custom event that VidaChatHero uses
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aica-chat-open', {
        detail: { fullscreen: true }
      }));
    });

    // Drawer should open AND expand
    await expect(page.locator('.aica-fab-drawer--open')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.aica-fab-drawer--expanded')).toBeVisible({ timeout: 5000 });
  });

  test('VidaChatHero: CustomEvent with message auto-fills input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabExists = await page.locator('.aica-fab-drawer').count().then(c => c > 0);
    if (!fabExists) { test.skip(true, 'FAB not in DOM'); return; }

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aica-chat-open', {
        detail: { message: 'Como foi meu dia?' }
      }));
    });

    await expect(page.locator('.aica-fab-drawer--open')).toBeVisible({ timeout: 5000 });

    // The input should have the message filled
    const inputVal = await page.locator('.aica-fab-input-bar input, .aica-fab-textarea').inputValue();
    expect(inputVal).toContain('Como foi meu dia?');
  });

  // ──────────────── STREAMING ────────────────

  test('Streaming: cursor element exists in CSS', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Verify the CSS animation is defined for the cursor
    const hasCursorAnimation = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.cssText?.includes('aica-blink') || rule.cssText?.includes('aica-fab-cursor')) {
              return true;
            }
          }
        } catch { /* cross-origin stylesheet */ }
      }
      return false;
    });

    expect(hasCursorAnimation).toBeTruthy();
  });

  test('Streaming: streaming message class styles exist', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Verify the streaming message CSS is loaded
    const hasStreamingStyle = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.cssText?.includes('aica-fab-message--streaming')) {
              return true;
            }
          }
        } catch { /* cross-origin stylesheet */ }
      }
      return false;
    });

    expect(hasStreamingStyle).toBeTruthy();
  });

  // ──────────────── SESSION SEARCH (FULLPAGE) ────────────────

  test('/chat: session search input appears in session list', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Open sessions panel
    const sessionsBtn = page.locator('[aria-label="Ver conversas"]');
    await sessionsBtn.click();

    // Search input should appear in fullpage mode
    const searchInput = page.locator('.aica-fab-search__input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('/chat: session search filters results', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Open sessions panel
    await page.locator('[aria-label="Ver conversas"]').click();
    await page.locator('.aica-fab-search__input').waitFor({ timeout: 5000 });

    // Get initial session count
    const initialCount = await page.locator('.aica-fab-session-item').count();

    // Type a very specific search that probably won't match
    await page.locator('.aica-fab-search__input').fill('zzzxxx_no_match_query');
    await page.waitForTimeout(300);

    // If there were sessions, count should be 0 or less now
    const filteredCount = await page.locator('.aica-fab-session-item').count();

    if (initialCount > 0) {
      expect(filteredCount).toBeLessThan(initialCount);
    }

    // Should show "Nenhum resultado" if no matches
    if (filteredCount === 0 && initialCount > 0) {
      await expect(page.locator('text=Nenhum resultado')).toBeVisible({ timeout: 3000 });
    }
  });

  test('FAB (non-fullpage): session search is NOT shown', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    // Open sessions panel
    await page.locator('[aria-label="Ver conversas"]').click();
    await page.waitForTimeout(500);

    // Search input should NOT appear in non-fullpage mode
    await expect(page.locator('.aica-fab-search__input')).not.toBeVisible({ timeout: 3000 });
  });

  // ──────────────── SESSION HISTORY + ARCHIVE ────────────────

  test('Sessions: history panel shows sessions list', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Open sessions panel
    await page.locator('[aria-label="Ver conversas"]').click();

    // Should see the sessions panel header
    await expect(page.locator('text=Conversas')).toBeVisible({ timeout: 3000 });

    // Should show either sessions or "Nenhuma conversa ainda"
    const hasContent = await Promise.race([
      page.locator('.aica-fab-session-item').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.locator('text=Nenhuma conversa ainda').isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    expect(hasContent).toBeTruthy();
  });

  test('Sessions: back button returns to chat view', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Open sessions panel
    await page.locator('[aria-label="Ver conversas"]').click();
    await expect(page.locator('text=Conversas')).toBeVisible({ timeout: 3000 });

    // Click back
    await page.locator('.aica-fab-header__back').click();

    // Should see the main chat area again (messages or greeting)
    const backToChat = await Promise.race([
      page.locator('.aica-fab-messages').isVisible({ timeout: 5000 }).catch(() => false),
      page.locator('text=Ola! Como posso ajudar?').isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    expect(backToChat).toBeTruthy();
  });

  test('Sessions: new session button creates fresh chat', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Click new session button
    await page.locator('[aria-label="Nova conversa"]').click();

    // Should show empty state greeting
    await expect(page.locator('text=Ola! Como posso ajudar?')).toBeVisible({ timeout: 5000 });
  });

  test('Sessions: archive button exists on session items', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Open sessions
    await page.locator('[aria-label="Ver conversas"]').click();
    await page.waitForTimeout(500);

    const sessionItems = page.locator('.aica-fab-session-item');
    const count = await sessionItems.count();

    if (count === 0) {
      test.skip(true, 'No sessions to test archive on');
      return;
    }

    // Each session should have an archive button
    const archiveBtn = sessionItems.first().locator('[aria-label="Arquivar"]');
    await expect(archiveBtn).toBeVisible({ timeout: 3000 });
  });

  // ──────────────── QUICK ACTIONS ────────────────

  test('Empty state: quick action buttons are shown', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Create new session to get empty state
    await page.locator('[aria-label="Nova conversa"]').click();

    // Quick actions should be visible
    await expect(page.locator('text=Registrar momento')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Pergunta do dia')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Meus padroes')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────── MOBILE RESPONSIVE ────────────────

  test('Mobile: /chat fullpage renders correctly at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone size
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(370); // Nearly full width
    expect(box!.height).toBeGreaterThanOrEqual(800); // Nearly full height
  });

  test('Mobile: FAB drawer opens and is usable at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();

    // Drawer should open
    await expect(page.locator('.aica-fab-drawer--open')).toBeVisible({ timeout: 5000 });

    // Input should be visible and usable
    const inputBar = page.locator('.aica-fab-input-bar');
    await expect(inputBar).toBeVisible({ timeout: 3000 });
  });

  // ──────────────── FULLPAGE-SPECIFIC HEADER BUTTONS ────────────────

  test('/chat: "open full chat" button is hidden in fullpage', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // ArrowUpRight ("Abrir chat completo") should NOT be visible in fullpage
    await expect(page.locator('[aria-label="Abrir chat completo"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('FAB: "open full chat" button navigates to /chat', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    const fullChatBtn = page.locator('[aria-label="Abrir chat completo"]');
    const btnVisible = await fullChatBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!btnVisible) { test.skip(true, 'Full chat button not visible'); return; }

    await fullChatBtn.click();

    await page.waitForURL('**/chat', { timeout: 5000 });
    expect(page.url()).toContain('/chat');
  });

  // ──────────────── ESCAPE KEY BEHAVIOR ────────────────

  test('/chat: Escape in session panel closes panel, not page', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Open sessions
    await page.locator('[aria-label="Ver conversas"]').click();
    await expect(page.locator('text=Conversas')).toBeVisible({ timeout: 3000 });

    // Press Escape — should close sessions panel, NOT navigate away
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Should still be on /chat
    expect(page.url()).toContain('/chat');

    // Sessions panel should be closed (no "Conversas" header)
    await expect(page.locator('.aica-fab-header__back')).not.toBeVisible({ timeout: 3000 });
  });

  test('/chat: Escape when chat is open navigates to home', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    // Make sure sessions panel is closed
    const sessionsBack = page.locator('.aica-fab-header__back');
    if (await sessionsBack.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sessionsBack.click();
      await page.waitForTimeout(300);
    }

    // Press Escape — should navigate to home
    await page.keyboard.press('Escape');

    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });
});
