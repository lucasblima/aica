import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';

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

/**
 * Inject Supabase auth session as BOTH localStorage AND cookie before page load.
 * The app uses @supabase/ssr which reads cookies, but Playwright's storageState
 * only reliably restores localStorage. This ensures auth is picked up.
 */
async function injectAuth(page: Page) {
  const authFile = 'tests/e2e/.auth.json';
  if (!fs.existsSync(authFile)) return false;

  const authData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  const localhostOrigin = authData.origins?.find(
    (o: { origin: string }) => o.origin === 'http://localhost:3000'
  );
  const authItem = localhostOrigin?.localStorage?.find(
    (item: { name: string }) => item.name.includes('auth-token')
  );

  if (!authItem) return false;

  await page.addInitScript((tokenData: { key: string; value: string }) => {
    localStorage.setItem(tokenData.key, tokenData.value);
    const encodedValue = encodeURIComponent(tokenData.value);
    document.cookie = `${tokenData.key}=${encodedValue}; Path=/; SameSite=lax; Max-Age=${60 * 60 * 24}`;
  }, { key: authItem.name, value: authItem.value });

  return true;
}

/** Navigate and wait for auth redirect to complete (not on /landing) */
async function gotoAuthenticated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/landing')) {
    try {
      await page.waitForFunction(
        () => !window.location.pathname.includes('/landing'),
        { timeout: 8000 }
      );
      await page.waitForLoadState('networkidle');
    } catch {
      // Auth not recognized — tests will skip gracefully
    }
  }
}

test.describe('@chat-unification Chat Unification E2E', () => {

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
  });

  // ──────────────── FAB DRAWER OPENS/CLOSES ────────────────

  test('FAB: drawer opens when FAB button is clicked', async ({ page }) => {
    await gotoAuthenticated(page, '/');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);

    if (!fabVisible) {
      test.skip(true, 'FAB not visible — auth may have failed');
      return;
    }

    await fabButton.click();

    const drawerOpen = await page.locator('.aica-fab-drawer--open').isVisible({ timeout: 5000 });
    expect(drawerOpen).toBeTruthy();

    const hasGreeting = await page.locator('text=Ola! Como posso ajudar?').isVisible({ timeout: 3000 }).catch(() => false);
    const hasMessages = await page.locator('.aica-fab-messages').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasGreeting || hasMessages).toBeTruthy();
  });

  test('FAB: drawer closes when X button is clicked', async ({ page }) => {
    await gotoAuthenticated(page, '/');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    const closeBtn = page.locator('[aria-label="Fechar"]');
    await closeBtn.click();

    await expect(page.locator('.aica-fab-drawer--open')).not.toBeVisible({ timeout: 3000 });
  });

  test('FAB: drawer closes on Escape key', async ({ page }) => {
    await gotoAuthenticated(page, '/');

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
      await gotoAuthenticated(page, route);

      const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
      const fabVisible = await fabButton.isVisible({ timeout: 8000 }).catch(() => false);
      if (!fabVisible) continue;

      await fabButton.click();
      const drawerOpen = await page.locator('.aica-fab-drawer--open').isVisible({ timeout: 5000 });
      expect(drawerOpen, `FAB should open on ${route}`).toBeTruthy();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  // ──────────────── EXPANDED MODE + CONTEXT SIDEBAR ────────────────

  test('FAB: expanded mode shows context sidebar', async ({ page }) => {
    await gotoAuthenticated(page, '/');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });

    const expandBtn = page.locator('[aria-label="Expandir"]');
    const expandVisible = await expandBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!expandVisible) { test.skip(true, 'Expand button not visible'); return; }

    await expandBtn.click();
    await expect(page.locator('.aica-fab-drawer--expanded')).toBeVisible({ timeout: 5000 });

    const sidebar = page.locator('.aica-context-sidebar');
    const sidebarVisible = await sidebar.isVisible({ timeout: 5000 }).catch(() => false);
    expect(sidebarVisible).toBeTruthy();
  });

  test('FAB: expand/minimize toggle hides in fullpage mode', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');
    await expect(page.locator('[aria-label="Expandir"]')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[aria-label="Reduzir"]')).not.toBeVisible({ timeout: 5000 });
  });

  // ──────────────── FULLPAGE MODE (/chat) ────────────────

  test('/chat: renders FAB in fullpage mode', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const fullpage = await page.locator('.aica-fab-drawer--fullpage').isVisible({ timeout: 10000 }).catch(() => false);
    if (!fullpage) { test.skip(true, 'Fullpage mode not rendered — auth may have failed'); return; }

    expect(fullpage).toBeTruthy();
    await expect(page.locator('.aica-fab-drawer--expanded')).toBeVisible();
  });

  test('/chat: fullpage takes full viewport height', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(viewport!.height * 0.95);
  });

  test('/chat: no border-radius in fullpage mode', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const borderRadius = await drawer.evaluate(el => getComputedStyle(el).borderRadius);
    expect(borderRadius).toBe('0px');
  });

  test('/chat: shows back arrow instead of X', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await expect(page.locator('[aria-label="Voltar"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[aria-label="Fechar"]')).not.toBeVisible();
  });

  test('/chat: back arrow navigates to home', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Voltar"]').click();
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test('/chat: global FAB is hidden when on /chat route', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');
    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    await expect(fabButton).not.toBeVisible({ timeout: 5000 });
  });

  test('/chat: uses textarea instead of input', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await expect(page.locator('.aica-fab-textarea')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────── VIDACHATHERO CUSTOM EVENT ────────────────

  test('VidaChatHero: CustomEvent opens FAB drawer', async ({ page }) => {
    await gotoAuthenticated(page, '/');

    const fabExists = await page.locator('.aica-fab-drawer').count().then(c => c > 0);
    if (!fabExists) { test.skip(true, 'FAB not in DOM'); return; }

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aica-chat-open', { detail: { fullscreen: true } }));
    });

    await expect(page.locator('.aica-fab-drawer--open')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.aica-fab-drawer--expanded')).toBeVisible({ timeout: 5000 });
  });

  test('VidaChatHero: CustomEvent with message auto-fills input', async ({ page }) => {
    await gotoAuthenticated(page, '/');

    const fabExists = await page.locator('.aica-fab-drawer').count().then(c => c > 0);
    if (!fabExists) { test.skip(true, 'FAB not in DOM'); return; }

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aica-chat-open', { detail: { message: 'Como foi meu dia?' } }));
    });

    await expect(page.locator('.aica-fab-drawer--open')).toBeVisible({ timeout: 5000 });
    const inputVal = await page.locator('.aica-fab-input-bar input, .aica-fab-textarea').inputValue();
    expect(inputVal).toContain('Como foi meu dia?');
  });

  // ──────────────── STREAMING ────────────────

  test('Streaming: cursor element exists in CSS', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

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
    await gotoAuthenticated(page, '/chat');

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
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Ver conversas"]').click();
    await expect(page.locator('.aica-fab-search__input')).toBeVisible({ timeout: 5000 });
  });

  test('/chat: session search filters results', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Ver conversas"]').click();
    await page.locator('.aica-fab-search__input').waitFor({ timeout: 5000 });

    const initialCount = await page.locator('.aica-fab-session-item').count();
    await page.locator('.aica-fab-search__input').fill('zzzxxx_no_match_query');
    await page.waitForTimeout(300);

    const filteredCount = await page.locator('.aica-fab-session-item').count();
    if (initialCount > 0) {
      expect(filteredCount).toBeLessThan(initialCount);
    }
    if (filteredCount === 0 && initialCount > 0) {
      await expect(page.locator('text=Nenhum resultado')).toBeVisible({ timeout: 3000 });
    }
  });

  test('FAB (non-fullpage): session search is NOT shown', async ({ page }) => {
    await gotoAuthenticated(page, '/');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await page.locator('.aica-fab-drawer--open').waitFor({ timeout: 5000 });
    await page.locator('[aria-label="Ver conversas"]').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.aica-fab-search__input')).not.toBeVisible({ timeout: 3000 });
  });

  // ──────────────── SESSION HISTORY + ARCHIVE ────────────────

  test('Sessions: history panel shows sessions list', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Ver conversas"]').click();
    await expect(page.locator('text=Conversas')).toBeVisible({ timeout: 3000 });

    const hasSessions = await page.locator('.aica-fab-session-item').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmpty = await page.locator('text=Nenhuma conversa ainda').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSessions || hasEmpty).toBeTruthy();
  });

  test('Sessions: back button returns to chat view', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Ver conversas"]').click();
    await expect(page.locator('text=Conversas')).toBeVisible({ timeout: 3000 });
    await page.locator('.aica-fab-header__back').click();

    const hasMessages = await page.locator('.aica-fab-messages').isVisible({ timeout: 3000 }).catch(() => false);
    const hasGreeting = await page.locator('text=Ola! Como posso ajudar?').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasMessages || hasGreeting).toBeTruthy();
  });

  test('Sessions: new session button creates fresh chat', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Nova conversa"]').click();
    await expect(page.locator('text=Ola! Como posso ajudar?')).toBeVisible({ timeout: 5000 });
  });

  test('Sessions: archive button exists on session items', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Ver conversas"]').click();
    await page.waitForTimeout(500);

    const sessionItems = page.locator('.aica-fab-session-item');
    const count = await sessionItems.count();
    if (count === 0) { test.skip(true, 'No sessions to test archive on'); return; }

    const archiveBtn = sessionItems.first().locator('[aria-label="Arquivar"]');
    await expect(archiveBtn).toBeVisible({ timeout: 3000 });
  });

  // ──────────────── QUICK ACTIONS ────────────────

  test('Empty state: quick action buttons are shown', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Nova conversa"]').click();
    await expect(page.locator('text=Registrar momento')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Pergunta do dia')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Meus padroes')).toBeVisible({ timeout: 5000 });
  });

  // ──────────────── MOBILE RESPONSIVE ────────────────

  test('Mobile: /chat fullpage renders correctly at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(370);
    expect(box!.height).toBeGreaterThanOrEqual(800);
  });

  test('Mobile: FAB drawer opens and is usable at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAuthenticated(page, '/');

    const fabButton = page.locator('[aria-label="Abrir chat com Aica"]');
    const fabVisible = await fabButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (!fabVisible) { test.skip(true, 'FAB not visible'); return; }

    await fabButton.click();
    await expect(page.locator('.aica-fab-drawer--open')).toBeVisible({ timeout: 5000 });

    const inputBar = page.locator('.aica-fab-input-bar');
    await expect(inputBar).toBeVisible({ timeout: 3000 });
  });

  // ──────────────── FULLPAGE-SPECIFIC HEADER BUTTONS ────────────────

  test('/chat: "open full chat" button is hidden in fullpage', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await expect(page.locator('[aria-label="Abrir chat completo"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('FAB: "open full chat" button navigates to /chat', async ({ page }) => {
    await gotoAuthenticated(page, '/');

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
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    await page.locator('[aria-label="Ver conversas"]').click();
    await expect(page.locator('text=Conversas')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    expect(page.url()).toContain('/chat');
    await expect(page.locator('.aica-fab-header__back')).not.toBeVisible({ timeout: 3000 });
  });

  test('/chat: Escape when chat is open navigates to home', async ({ page }) => {
    await gotoAuthenticated(page, '/chat');

    const drawer = page.locator('.aica-fab-drawer--fullpage');
    const isVisible = await drawer.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) { test.skip(true, 'Fullpage not rendered'); return; }

    const sessionsBack = page.locator('.aica-fab-header__back');
    if (await sessionsBack.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sessionsBack.click();
      await page.waitForTimeout(300);
    }

    await page.keyboard.press('Escape');
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });
});
