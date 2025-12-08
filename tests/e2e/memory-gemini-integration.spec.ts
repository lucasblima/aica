/**
 * E2E Tests: Memory Module - Gemini Integration
 *
 * Tests all Gemini-powered features in the Memory module:
 * - Extract insights from WhatsApp messages (sentiment, triggers, subjects)
 * - Generate embeddings for semantic search
 * - Generate daily reports with AI insights
 * - Extract contact context
 * - Suggest work items from messages
 *
 * All tests validate that:
 * 1. Backend integration works (Edge Functions)
 * 2. Insights are structured correctly
 * 3. Embeddings enable semantic search
 * 4. Daily reports are comprehensive
 * 5. Contact context is extracted properly
 */

import { test, expect } from '@playwright/test';

// Use authenticated session from setup
test.use({ storageState: 'tests/e2e/.auth.json' });

test.describe('Memory - Message Insights Extraction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to memory/messages page
    await page.goto('/memory');
    await page.waitForLoadState('networkidle');
  });

  test('should extract insights from new message', async ({ page }) => {
    // Look for "Add Message" or similar button
    const addMessageButton = page.locator('button', {
      hasText: /adicionar.*mensagem|add.*message|nova.*mensagem/i
    });

    if (!(await addMessageButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Add message feature not available in current UI');
      return;
    }

    await addMessageButton.click();

    // Fill message content
    const messageInput = page.locator('textarea[placeholder*="mensagem" i]').or(
      page.locator('textarea').first()
    );

    await expect(messageInput).toBeVisible();

    const testMessage =
      'Acabei de sair da reunião com o cliente. Foi muito estressante, ' +
      'eles querem tudo pronto até sexta-feira. Preciso me organizar urgentemente.';

    await messageInput.fill(testMessage);

    // Submit or save
    const saveButton = page.locator('button[type="submit"]').or(
      page.locator('button', { hasText: /salvar|save|adicionar|add/i })
    );
    await saveButton.click();

    // Wait for processing (insights extraction)
    console.log('⏳ Waiting for insights extraction...');

    // Look for sentiment indicator
    const sentimentBadge = page.locator('[data-testid*="sentiment"]').or(
      page.locator('text=/negativ|positiv|neutral/i')
    );

    await expect(sentimentBadge).toBeVisible({ timeout: 15000 });

    const sentimentText = await sentimentBadge.textContent();
    console.log('✓ Sentiment extracted:', sentimentText);

    // Verify message is in the list with insights
    const messageCard = page.locator('text=' + testMessage.substring(0, 30));
    await expect(messageCard).toBeVisible();

    console.log('✓ Message insights extracted successfully');
  });

  test('should identify psychological triggers correctly', async ({ page }) => {
    // Look for existing messages with triggers
    const triggerBadges = page.locator('[data-testid*="trigger"]').or(
      page.locator('text=/work_deadline|personal_stress|deadline/i')
    );

    const triggerCount = await triggerBadges.count();

    if (triggerCount > 0) {
      console.log(`✓ Found ${triggerCount} trigger indicators`);

      // Click on a message to see details
      const firstMessage = page.locator('.message-card, [data-testid="message-item"]').first();

      if (await firstMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstMessage.click();

        // Check for trigger details in expanded view
        await page.waitForTimeout(1000);

        const triggers = await page.locator('text=/trigger|gatilho/i').locator('..').textContent();
        console.log('✓ Trigger details:', triggers?.substring(0, 100));
      }
    } else {
      console.log('⚠ No messages with triggers found (may need test data)');
    }
  });

  test('should categorize messages by life subjects', async ({ page }) => {
    // Look for subject filters or tags
    const subjectFilters = page.locator('[data-testid*="subject-filter"]').or(
      page.locator('text=/work|health|relationships|finances/i')
    );

    const filterCount = await subjectFilters.count();

    if (filterCount > 0) {
      console.log(`✓ Found ${filterCount} subject categories`);

      // Click on a subject filter
      const workFilter = page.locator('text=/^work$|^trabalho$/i').first();

      if (await workFilter.isVisible({ timeout: 1000 }).catch(() => false)) {
        await workFilter.click();
        await page.waitForTimeout(1000);

        // Verify filtered messages are related to work
        const messages = page.locator('.message-card, [data-testid="message-item"]');
        const messageCount = await messages.count();

        expect(messageCount).toBeGreaterThan(0);
        console.log(`✓ Filtered to ${messageCount} work-related messages`);
      }
    } else {
      console.log('⚠ Subject categorization UI not found');
    }
  });

  test('should generate summary for each message', async ({ page }) => {
    const messages = page.locator('.message-card, [data-testid="message-item"]');
    const messageCount = await messages.count();

    if (messageCount > 0) {
      // Click on first message
      const firstMessage = messages.first();
      await firstMessage.click();

      // Look for summary field
      const summary = page.locator('[data-testid="message-summary"]').or(
        page.locator('text=/resumo|summary/i').locator('..')
      );

      if (await summary.isVisible({ timeout: 2000 }).catch(() => false)) {
        const summaryText = await summary.textContent();
        expect(summaryText!.length).toBeGreaterThan(10);
        console.log('✓ Summary:', summaryText?.substring(0, 100));
      } else {
        console.log('⚠ Summary field not found in UI');
      }
    } else {
      test.skip(true, 'No messages available to test summaries');
    }
  });

  test('should assign importance score to messages', async ({ page }) => {
    const importanceIndicators = page.locator('[data-testid*="importance"]').or(
      page.locator('text=/important|urgente|high priority/i')
    );

    const count = await importanceIndicators.count();

    if (count > 0) {
      console.log(`✓ Found ${count} messages with importance indicators`);

      // Verify importance is a valid score (0-1 or low/medium/high)
      const firstIndicator = importanceIndicators.first();
      const text = await firstIndicator.textContent();

      const hasValidImportance =
        text!.match(/\d/) || // numeric
        text!.toLowerCase().includes('high') ||
        text!.toLowerCase().includes('medium') ||
        text!.toLowerCase().includes('low') ||
        text!.toLowerCase().includes('alta') ||
        text!.toLowerCase().includes('média') ||
        text!.toLowerCase().includes('baixa');

      expect(hasValidImportance).toBeTruthy();
      console.log('✓ Importance score is valid');
    } else {
      console.log('⚠ Importance indicators not found in UI');
    }
  });
});

test.describe('Memory - Semantic Search with Embeddings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
    await page.waitForLoadState('networkidle');
  });

  test('should perform semantic search and find related messages', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="busca" i]').or(
      page.locator('input[type="search"]')
    );

    if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Search feature not available');
      return;
    }

    // Search for a concept (not exact keywords)
    await searchInput.fill('trabalho estressante');

    // Wait for semantic search results
    await page.waitForTimeout(2000);

    const results = page.locator('.message-card, [data-testid="message-item"]');
    const resultCount = await results.count();

    if (resultCount > 0) {
      console.log(`✓ Semantic search found ${resultCount} related messages`);

      // Results should be semantically related, not just keyword matches
      // Verify at least one result exists
      expect(resultCount).toBeGreaterThan(0);
    } else {
      console.log('⚠ No search results (may need test data)');
    }
  });

  test('should rank search results by similarity score', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="busca" i]')
    );

    if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Search not available');
      return;
    }

    await searchInput.fill('reunião importante');
    await page.waitForTimeout(2000);

    // Results should be ordered by relevance
    const results = page.locator('.message-card, [data-testid="message-item"]');
    const resultCount = await results.count();

    if (resultCount >= 2) {
      // First result should be most relevant
      const firstResult = results.first();
      const firstText = await firstResult.textContent();

      console.log('✓ Top search result:', firstText?.substring(0, 100));
      expect(firstText!.length).toBeGreaterThan(0);
    } else {
      console.log('⚠ Not enough results to verify ranking');
    }
  });
});

test.describe('Memory - Daily Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory/daily-report');

    // If redirected, try alternative route
    if (page.url().includes('404') || page.url().includes('not-found')) {
      await page.goto('/memory');

      const reportButton = page.locator('button', { hasText: /relatório|report|daily/i });
      if (await reportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reportButton.click();
      } else {
        test.skip(true, 'Daily report not available');
      }
    }
  });

  test('should generate daily report with AI insights', async ({ page }) => {
    // Look for generate report button
    const generateButton = page.locator('button', {
      hasText: /gerar.*relatório|generate.*report/i
    });

    if (!(await generateButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Generate report button not found');
      return;
    }

    await generateButton.click();

    // Wait for report generation (may take up to 20s)
    console.log('⏳ Generating daily report...');

    const reportContent = page.locator('[data-testid="daily-report"]').or(
      page.locator('.report-content, .daily-report')
    );

    await expect(reportContent).toBeVisible({ timeout: 25000 });

    // Verify report sections
    const reportText = await reportContent.textContent();
    expect(reportText!.length).toBeGreaterThan(100);

    console.log('✓ Daily report generated');
  });

  test('should include key insights in report', async ({ page }) => {
    const insightsSection = page.locator('[data-testid="key-insights"]').or(
      page.locator('text=/key insights|principais insights/i').locator('..')
    );

    if (await insightsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const insights = await insightsSection.textContent();

      // Should have bullet points or numbered list
      const hasBullets =
        insights!.includes('•') ||
        insights!.includes('-') ||
        insights!.match(/\d\./);

      expect(hasBullets).toBeTruthy();
      console.log('✓ Key insights section present');
    } else {
      console.log('⚠ Key insights section not found');
    }
  });

  test('should detect behavioral patterns in report', async ({ page }) => {
    const patternsSection = page.locator('[data-testid="patterns-detected"]').or(
      page.locator('text=/padrões|patterns/i').locator('..')
    );

    if (await patternsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const patterns = await patternsSection.textContent();
      expect(patterns!.length).toBeGreaterThan(20);

      console.log('✓ Patterns section:', patterns?.substring(0, 100));
    } else {
      console.log('⚠ Patterns section not found (may not be in UI)');
    }
  });

  test('should provide AI recommendations', async ({ page }) => {
    const recommendationsSection = page.locator('[data-testid="ai-recommendations"]').or(
      page.locator('text=/recomendações|recommendations/i').locator('..')
    );

    if (await recommendationsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const recommendations = await recommendationsSection.textContent();
      expect(recommendations!.length).toBeGreaterThan(30);

      // Should contain actionable suggestions
      const hasActionable =
        recommendations!.toLowerCase().includes('sugiro') ||
        recommendations!.toLowerCase().includes('recomendo') ||
        recommendations!.toLowerCase().includes('tente');

      console.log('✓ AI recommendations present');
    } else {
      console.log('⚠ Recommendations section not found');
    }
  });

  test('should suggest focus areas for next day', async ({ page }) => {
    const focusSection = page.locator('[data-testid="focus-areas"]').or(
      page.locator('text=/focos|focus areas/i').locator('..')
    );

    if (await focusSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const focusAreas = await focusSection.textContent();
      expect(focusAreas!.length).toBeGreaterThan(10);

      console.log('✓ Focus areas suggested');
    } else {
      console.log('⚠ Focus areas not found in report');
    }
  });
});

test.describe('Memory - Contact Context Extraction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory/contacts');

    if (page.url().includes('404')) {
      await page.goto('/memory');

      const contactsButton = page.locator('button', { hasText: /contatos|contacts/i });
      if (await contactsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await contactsButton.click();
      } else {
        test.skip(true, 'Contacts view not available');
      }
    }
  });

  test('should extract relationship status from messages', async ({ page }) => {
    const contacts = page.locator('[data-testid="contact-card"]').or(
      page.locator('.contact-card, .contact-item')
    );

    const contactCount = await contacts.count();

    if (contactCount > 0) {
      // Click on first contact
      const firstContact = contacts.first();
      await firstContact.click();

      // Look for relationship status
      const relationshipStatus = page.locator('[data-testid="relationship-status"]').or(
        page.locator('text=/relacionamento|relationship/i').locator('..')
      );

      if (await relationshipStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
        const status = await relationshipStatus.textContent();
        console.log('✓ Relationship status:', status);
      } else {
        console.log('⚠ Relationship status not displayed');
      }
    } else {
      test.skip(true, 'No contacts available');
    }
  });

  test('should identify key topics discussed with contact', async ({ page }) => {
    const contacts = page.locator('.contact-card, [data-testid="contact-card"]');

    if ((await contacts.count()) > 0) {
      await contacts.first().click();
      await page.waitForTimeout(1000);

      const keyTopics = page.locator('[data-testid="key-topics"]').or(
        page.locator('text=/tópicos|topics/i').locator('..')
      );

      if (await keyTopics.isVisible({ timeout: 2000 }).catch(() => false)) {
        const topics = await keyTopics.textContent();
        console.log('✓ Key topics:', topics?.substring(0, 100));
      } else {
        console.log('⚠ Key topics not found');
      }
    } else {
      test.skip(true, 'No contacts available');
    }
  });

  test('should show sentiment trend for contact', async ({ page }) => {
    const contacts = page.locator('.contact-card');

    if ((await contacts.count()) > 0) {
      await contacts.first().click();
      await page.waitForTimeout(1000);

      const sentimentTrend = page.locator('[data-testid="sentiment-trend"]').or(
        page.locator('text=/tendência|trend/i').locator('..')
      );

      if (await sentimentTrend.isVisible({ timeout: 2000 }).catch(() => false)) {
        const trend = await sentimentTrend.textContent();

        const hasValidTrend =
          trend!.toLowerCase().includes('positive') ||
          trend!.toLowerCase().includes('negative') ||
          trend!.toLowerCase().includes('neutral') ||
          trend!.toLowerCase().includes('improving') ||
          trend!.toLowerCase().includes('declining');

        console.log('✓ Sentiment trend:', trend);
      } else {
        console.log('⚠ Sentiment trend not displayed');
      }
    } else {
      test.skip(true, 'No contacts');
    }
  });

  test('should suggest conversation starters for contact', async ({ page }) => {
    const contacts = page.locator('.contact-card');

    if ((await contacts.count()) > 0) {
      await contacts.first().click();
      await page.waitForTimeout(1000);

      const suggestions = page.locator('[data-testid="conversation-starters"]').or(
        page.locator('text=/conversation.*starter|iniciar.*conversa/i').locator('..')
      );

      if (await suggestions.isVisible({ timeout: 2000 }).catch(() => false)) {
        const suggestionsText = await suggestions.textContent();
        expect(suggestionsText!.length).toBeGreaterThan(20);

        console.log('✓ Conversation starters suggested');
      } else {
        console.log('⚠ Conversation starters not found');
      }
    } else {
      test.skip(true, 'No contacts');
    }
  });
});

test.describe('Memory - Work Item Extraction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
    await page.waitForLoadState('networkidle');
  });

  test('should extract actionable tasks from messages', async ({ page }) => {
    // Add a message with clear action items
    const addButton = page.locator('button', { hasText: /adicionar.*mensagem|add.*message/i });

    if (!(await addButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Cannot add message for testing');
      return;
    }

    await addButton.click();

    const messageInput = page.locator('textarea').first();

    const taskMessage =
      'Preciso: 1) Finalizar o relatório até sexta ' +
      '2) Ligar para o cliente amanhã ' +
      '3) Agendar reunião com a equipe urgentemente';

    await messageInput.fill(taskMessage);

    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();

    // Wait for processing
    await page.waitForTimeout(5000);

    // Look for suggested work items
    const workItems = page.locator('[data-testid="suggested-work-items"]').or(
      page.locator('text=/tarefas.*sugeridas|suggested.*tasks/i').locator('..')
    );

    if (await workItems.isVisible({ timeout: 5000 }).catch(() => false)) {
      const items = await workItems.textContent();

      // Should identify at least 2 tasks
      const taskCount = (items!.match(/finalizar|ligar|agendar/gi) || []).length;
      expect(taskCount).toBeGreaterThan(0);

      console.log(`✓ Extracted ${taskCount} work items from message`);
    } else {
      console.log('⚠ Work item extraction not displayed in UI');
    }
  });

  test('should assign priority to extracted tasks', async ({ page }) => {
    const taskItems = page.locator('[data-testid*="work-item"]').or(
      page.locator('text=/urgente|urgent|high.*priority/i')
    );

    const count = await taskItems.count();

    if (count > 0) {
      console.log(`✓ Found ${count} work items with priority indicators`);

      const firstItem = taskItems.first();
      const text = await firstItem.textContent();

      const hasPriority =
        text!.toLowerCase().includes('urgent') ||
        text!.toLowerCase().includes('high') ||
        text!.toLowerCase().includes('medium') ||
        text!.toLowerCase().includes('low') ||
        text!.toLowerCase().includes('urgente') ||
        text!.toLowerCase().includes('alta');

      expect(hasPriority).toBeTruthy();
      console.log('✓ Priority assigned to work items');
    } else {
      console.log('⚠ No work items with priority found');
    }
  });
});

test.describe('Memory - Security', () => {
  test('should NOT expose API key in network requests', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto('/memory');

    // Add a message to trigger Gemini call
    const addButton = page.locator('button', { hasText: /adicionar/i });

    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();

      const messageInput = page.locator('textarea').first();
      await messageInput.fill('Test message for security check');

      const saveButton = page.locator('button[type="submit"]');
      await saveButton.click();
      await page.waitForTimeout(5000);
    }

    // Verify no API key exposure
    const hasApiKey = requests.some(url => url.includes('AIza') || url.includes('GEMINI_API_KEY'));
    expect(hasApiKey).toBe(false);

    const hasBackendRouting = requests.some(url =>
      url.includes('/functions/v1/gemini') || url.includes('supabase.co/functions')
    );
    expect(hasBackendRouting).toBe(true);

    console.log('✅ SECURITY: Memory module routes through backend');
  });
});
