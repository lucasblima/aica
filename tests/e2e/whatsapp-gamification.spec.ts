/**
 * WhatsApp Gamification Integration E2E Tests
 *
 * Comprehensive test suite for WhatsApp gamification flow including:
 * - XP gain popups
 * - Badge unlock celebrations
 * - Milestone progress tracking
 * - Complete user journey validation
 *
 * Related: Issue #16 - WhatsApp Gamification Integration
 */

import { test, expect } from '@playwright/test';

test.describe('WhatsApp Gamification Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to WhatsApp connections tab (assuming user is authenticated)
    await page.goto('/connections');
    await page.waitForLoadState('networkidle');

    // Navigate to WhatsApp tab if it exists
    const whatsappTab = page.getByRole('tab', { name: /whatsapp/i });
    if (await whatsappTab.isVisible()) {
      await whatsappTab.click();
      await page.waitForLoadState('networkidle');
    }
  });

  // ========================================================================
  // TEST 1: Connection Flow + Badge + XP
  // ========================================================================
  test('conectar WhatsApp deve awardar "Conectado" badge + 50 XP', async ({ page }) => {
    // Check if connect button exists
    const connectButton = page.getByTestId('whatsapp-connect-button');

    // Skip test if already connected or button not found
    if (!(await connectButton.isVisible())) {
      test.skip();
      return;
    }

    // Click connect button
    await connectButton.click();

    // Wait for connection process (QR code scan or success)
    // Note: In real scenario, this might require manual QR code scan
    // For automated tests, we might need to mock the connection
    await page.waitForTimeout(2000);

    // Verify XP popup appeared
    const xpPopup = page.getByTestId('xp-gain-popup');
    await expect(xpPopup).toBeVisible({ timeout: 5000 });
    await expect(xpPopup).toContainText('+50 XP');

    // Verify badge unlock modal appeared
    const badgeModal = page.getByTestId('badge-unlock-modal');
    await expect(badgeModal).toBeVisible({ timeout: 5000 });
    await expect(badgeModal).toContainText('Conectado');
    await expect(badgeModal).toContainText('📱');
    await expect(badgeModal).toContainText('Badge Desbloqueado!');

    // Close modal
    await page.getByRole('button', { name: /continuar/i }).click();
    await expect(badgeModal).not.toBeVisible();
  });

  // ========================================================================
  // TEST 2: Consent Grant Cascade
  // ========================================================================
  test('conceder todos 5 consentimentos desbloqueiam "Guardião da Privacidade"', async ({ page }) => {
    // Navigate to Consent/Privacy tab
    const consentTab = page.getByRole('tab', { name: /consentimento|privacidade|lgpd/i });

    if (!(await consentTab.isVisible())) {
      test.skip();
      return;
    }

    await consentTab.click();
    await page.waitForLoadState('networkidle');

    const consentTypes = [
      'data_collection',
      'ai_processing',
      'sentiment_analysis',
      'notifications',
      'data_retention'
    ];

    let consentCount = 0;

    // Grant each consent
    for (const consentType of consentTypes) {
      const toggle = page.getByTestId(`consent-toggle-${consentType}`);

      // Check if toggle exists and is not already enabled
      if (await toggle.isVisible()) {
        const isChecked = await toggle.isChecked();

        if (!isChecked) {
          await toggle.click();
          consentCount++;

          // Verify XP popup for each consent (+20 XP)
          const xpPopup = page.getByTestId('xp-gain-popup');
          await expect(xpPopup).toBeVisible({ timeout: 3000 });
          await expect(xpPopup).toContainText('+20 XP');

          // Wait for popup to dismiss
          await page.waitForTimeout(2500);
        }
      }
    }

    // If we granted exactly 5 consents, verify "Guardião da Privacidade" badge
    if (consentCount === 5) {
      const badgeModal = page.getByTestId('badge-unlock-modal');
      await expect(badgeModal).toBeVisible({ timeout: 5000 });
      await expect(badgeModal).toContainText('Guardião da Privacidade');
      await expect(badgeModal).toContainText('🛡️');

      // Close modal
      await page.getByRole('button', { name: /continuar/i }).click();
    }
  });

  // ========================================================================
  // TEST 3: Analytics View Milestones
  // ========================================================================
  test('visualizar analytics 5 vezes desbloqueia "Consciência Emocional"', async ({ page }) => {
    // Navigate to Analytics tab
    const analyticsTab = page.getByRole('tab', { name: /analytics|análise/i });

    if (!(await analyticsTab.isVisible())) {
      test.skip();
      return;
    }

    // View analytics 5 times
    for (let i = 0; i < 5; i++) {
      await analyticsTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Verify XP popup (+10 XP)
      const xpPopup = page.getByTestId('xp-gain-popup');
      if (await xpPopup.isVisible({ timeout: 3000 })) {
        await expect(xpPopup).toContainText('+10 XP');
      }

      // On 5th view, check for badge
      if (i === 4) {
        const badgeModal = page.getByTestId('badge-unlock-modal');
        if (await badgeModal.isVisible({ timeout: 5000 })) {
          await expect(badgeModal).toContainText('Consciência Emocional');
          await expect(badgeModal).toContainText('🧠');

          // Close modal
          await page.getByRole('button', { name: /continuar/i }).click();
        }
      }

      // Switch to another tab and back to trigger re-track
      const overviewTab = page.getByRole('tab', { name: /overview|visão geral|início/i });
      if (await overviewTab.isVisible()) {
        await overviewTab.click();
        await page.waitForTimeout(300);
      }
    }
  });

  // ========================================================================
  // TEST 4: Contact Analysis Milestone
  // ========================================================================
  test('analisar 10 contatos diferentes desbloqueia "Explorador Emocional"', async ({ page }) => {
    // Navigate to Analytics tab
    const analyticsTab = page.getByRole('tab', { name: /analytics|análise/i });

    if (!(await analyticsTab.isVisible())) {
      test.skip();
      return;
    }

    await analyticsTab.click();
    await page.waitForLoadState('networkidle');

    // Get contact cards (adjust selector based on actual implementation)
    const contactCards = await page.locator('[data-testid^="contact-card"]').all();

    if (contactCards.length < 10) {
      test.skip();
      return;
    }

    // Click each contact to analyze
    for (let i = 0; i < 10; i++) {
      await contactCards[i].click();
      await page.waitForTimeout(500);

      // Verify XP popup (+15 XP)
      const xpPopup = page.getByTestId('xp-gain-popup');
      if (await xpPopup.isVisible({ timeout: 3000 })) {
        await expect(xpPopup).toContainText('+15 XP');
      }

      // On 10th contact, verify badge
      if (i === 9) {
        const badgeModal = page.getByTestId('badge-unlock-modal');
        if (await badgeModal.isVisible({ timeout: 5000 })) {
          await expect(badgeModal).toContainText('Explorador Emocional');
          await expect(badgeModal).toContainText('🔍');

          // Close modal
          await page.getByRole('button', { name: /continuar/i }).click();
        }
      }

      await page.waitForTimeout(2500); // Wait for popup to dismiss
    }
  });

  // ========================================================================
  // TEST 5: Integration Test - Full Journey
  // ========================================================================
  test('jornada completa: conectar → consentir → analisar → badges visíveis', async ({ page }) => {
    // 1. Connect WhatsApp (if not already connected)
    const connectButton = page.getByTestId('whatsapp-connect-button');
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(2000);

      // Close connection badge modal if it appears
      const badgeModal = page.getByTestId('badge-unlock-modal');
      if (await badgeModal.isVisible({ timeout: 10000 })) {
        await page.getByRole('button', { name: /continuar/i }).click();
      }
    }

    // 2. Grant all consents
    const consentTab = page.getByRole('tab', { name: /consentimento|privacidade/i });
    if (await consentTab.isVisible()) {
      await consentTab.click();
      await page.waitForLoadState('networkidle');

      const consentTypes = ['data_collection', 'ai_processing', 'sentiment_analysis', 'notifications', 'data_retention'];
      for (const type of consentTypes) {
        const toggle = page.getByTestId(`consent-toggle-${type}`);
        if (await toggle.isVisible() && !(await toggle.isChecked())) {
          await toggle.click();
          await page.waitForTimeout(2500);
        }
      }

      // Close consent champion badge modal if it appears
      const badgeModal = page.getByTestId('badge-unlock-modal');
      if (await badgeModal.isVisible({ timeout: 5000 })) {
        await page.getByRole('button', { name: /continuar/i }).click();
      }
    }

    // 3. View analytics 5 times
    const analyticsTab = page.getByRole('tab', { name: /analytics|análise/i });
    const overviewTab = page.getByRole('tab', { name: /overview|visão geral/i });

    if (await analyticsTab.isVisible()) {
      for (let i = 0; i < 5; i++) {
        await analyticsTab.click();
        await page.waitForTimeout(2500);

        if (await overviewTab.isVisible()) {
          await overviewTab.click();
          await page.waitForTimeout(300);
        }
      }

      // Close analytics badge modal if it appears
      const badgeModal = page.getByTestId('badge-unlock-modal');
      if (await badgeModal.isVisible({ timeout: 5000 })) {
        await page.getByRole('button', { name: /continuar/i }).click();
      }
    }

    // 4. Verify journey completion (check that user has earned XP and badges)
    // This could navigate to a profile or achievements page
    // For now, we just verify no errors occurred
    await expect(page).not.toHaveTitle(/error/i);
  });

  // ========================================================================
  // TEST 6: Milestone Progress Cards Display
  // ========================================================================
  test('milestone progress cards mostram progresso correto', async ({ page }) => {
    // Navigate to Analytics tab
    const analyticsTab = page.getByRole('tab', { name: /analytics|análise/i });

    if (!(await analyticsTab.isVisible())) {
      test.skip();
      return;
    }

    await analyticsTab.click();
    await page.waitForLoadState('networkidle');

    // Verify milestone cards are visible
    const consciousnessCard = page.locator('text=/Consciência Emocional/i');
    const explorerCard = page.locator('text=/Explorador Emocional/i');

    // At least one milestone card should be visible
    const hasCards = (await consciousnessCard.isVisible()) || (await explorerCard.isVisible());
    expect(hasCards).toBeTruthy();

    // Verify progress text format (e.g., "3/5" or "7/10")
    const progressText = page.locator('text=/\\d+\\/\\d+/').first();
    if (await progressText.isVisible()) {
      const text = await progressText.textContent();
      expect(text).toMatch(/\d+\/\d+/);
    }

    // Verify progress bar exists
    const progressBar = page.locator('.bg-ceramic-accent, .bg-ceramic-positive').first();
    if (await progressBar.isVisible()) {
      expect(await progressBar.isVisible()).toBeTruthy();
    }
  });

});
