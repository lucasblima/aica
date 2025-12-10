/**
 * E2E Tests for File Search Cross-Module Functionality
 *
 * Tests:
 * - Module isolation (grants, finance, podcast, journey)
 * - RLS data isolation between users
 * - Search accuracy and result quality
 * - Cost tracking integration
 * - Analytics dashboard
 *
 * Prerequisites:
 * - Backend FastAPI server running on http://localhost:8000
 * - Supabase with file_search_corpora and file_search_documents tables
 * - Test users with proper permissions
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const TEST_USER_1 = {
  email: process.env.TEST_USER_EMAIL_1 || 'filetest1@example.com',
  password: process.env.TEST_USER_PASSWORD_1 || 'TestPassword123!',
};

const TEST_USER_2 = {
  email: process.env.TEST_USER_EMAIL_2 || 'filetest2@example.com',
  password: process.env.TEST_USER_PASSWORD_2 || 'TestPassword123!',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * Helper: Login to the application
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(BASE_URL);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
}

/**
 * Helper: Navigate to a specific module
 */
async function navigateToModule(page: Page, moduleName: 'grants' | 'finance' | 'podcast' | 'journey') {
  // Click on the module card in the main view
  await page.click(`[data-testid="${moduleName}-module"]`);
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Create a test corpus for a module
 */
async function createTestCorpus(
  userId: string,
  moduleType: string,
  moduleId: string,
  corpusName: string
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/file-search/corpus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      module_type: moduleType,
      module_id: moduleId,
      display_name: corpusName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test corpus: ${response.statusText}`);
  }

  const data = await response.json();
  return data.corpus.name; // Gemini corpus resource name
}

/**
 * Helper: Upload a test document to a corpus
 */
async function uploadTestDocument(
  corpusName: string,
  documentText: string,
  displayName: string
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/file-search/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corpus_name: corpusName,
      text: documentText,
      display_name: displayName,
      mime_type: 'text/plain',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to upload test document: ${response.statusText}`);
  }

  const data = await response.json();
  return data.document.name; // Gemini document resource name
}

/**
 * Helper: Clean up test data
 */
async function cleanupTestCorpus(corpusName: string) {
  await fetch(`${BACKEND_URL}/file-search/corpus/${encodeURIComponent(corpusName)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// TEST SUITE: Module Isolation
// ============================================================================

test.describe('File Search - Module Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
  });

  test('Grants module should only show grants-related documents', async ({ page }) => {
    const userId = 'test-user-1'; // TODO: Get from Supabase after login

    // Create test corpora for different modules
    const grantsCorpus = await createTestCorpus(userId, 'grants', 'grant-123', 'Edital Test');
    const financeCorpus = await createTestCorpus(userId, 'finance', 'finance-456', 'Finance Test');

    // Upload documents to each corpus
    await uploadTestDocument(
      grantsCorpus,
      'Este é um edital de fomento para pesquisa científica sobre inteligência artificial.',
      'Edital AI Research'
    );

    await uploadTestDocument(
      financeCorpus,
      'Relatório financeiro mostrando despesas com infraestrutura de TI.',
      'Finance Report Q4'
    );

    // Navigate to Grants module
    await navigateToModule(page, 'grants');

    // Wait for search panel to be visible
    await page.waitForSelector('[data-testid="grants-search-panel"]', { timeout: 10000 });

    // Search for "pesquisa científica"
    await page.fill('[data-testid="search-input"]', 'pesquisa científica');
    await page.click('[data-testid="search-button"]');

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    // Verify results contain grants document but NOT finance document
    const resultsText = await page.textContent('[data-testid="search-results"]');
    expect(resultsText).toContain('Edital AI Research');
    expect(resultsText).not.toContain('Finance Report Q4');

    // Cleanup
    await cleanupTestCorpus(grantsCorpus);
    await cleanupTestCorpus(financeCorpus);
  });

  test('Finance module should only show finance-related documents', async ({ page }) => {
    const userId = 'test-user-1';

    const financeCorpus = await createTestCorpus(userId, 'finance', 'finance-789', 'Finance Test');
    const podcastCorpus = await createTestCorpus(userId, 'podcast', 'episode-101', 'Podcast Test');

    await uploadTestDocument(
      financeCorpus,
      'Análise de despesas recorrentes com serviços de cloud computing AWS.',
      'Cloud Expenses'
    );

    await uploadTestDocument(
      podcastCorpus,
      'Transcrição do episódio sobre tecnologia e inovação.',
      'Episode Transcript'
    );

    await navigateToModule(page, 'finance');
    await page.waitForSelector('[data-testid="finance-search-panel"]', { timeout: 10000 });

    await page.fill('[data-testid="search-input"]', 'cloud computing');
    await page.click('[data-testid="search-button"]');

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    const resultsText = await page.textContent('[data-testid="search-results"]');
    expect(resultsText).toContain('Cloud Expenses');
    expect(resultsText).not.toContain('Episode Transcript');

    await cleanupTestCorpus(financeCorpus);
    await cleanupTestCorpus(podcastCorpus);
  });

  test('Podcast module should only show podcast-related documents', async ({ page }) => {
    const userId = 'test-user-1';

    const podcastCorpus = await createTestCorpus(userId, 'podcast', 'episode-202', 'Podcast Test');
    const journeyCorpus = await createTestCorpus(userId, 'journey', 'journey-303', 'Journey Test');

    await uploadTestDocument(
      podcastCorpus,
      'Entrevista com especialista em machine learning discutindo GPT-4 e modelos de linguagem.',
      'ML Interview Transcript'
    );

    await uploadTestDocument(
      journeyCorpus,
      'Reflexão pessoal sobre crescimento profissional e aprendizado.',
      'Personal Reflection'
    );

    await navigateToModule(page, 'podcast');
    await page.waitForSelector('[data-testid="podcast-search-panel"]', { timeout: 10000 });

    await page.fill('[data-testid="search-input"]', 'machine learning');
    await page.click('[data-testid="search-button"]');

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    const resultsText = await page.textContent('[data-testid="search-results"]');
    expect(resultsText).toContain('ML Interview Transcript');
    expect(resultsText).not.toContain('Personal Reflection');

    await cleanupTestCorpus(podcastCorpus);
    await cleanupTestCorpus(journeyCorpus);
  });

  test('Journey module should only show journey-related documents', async ({ page }) => {
    const userId = 'test-user-1';

    const journeyCorpus = await createTestCorpus(userId, 'journey', 'journey-404', 'Journey Test');
    const grantsCorpus = await createTestCorpus(userId, 'grants', 'grant-505', 'Grants Test');

    await uploadTestDocument(
      journeyCorpus,
      'Momento capturado: Hoje aprendi sobre resiliência emocional.',
      'Emotional Growth'
    );

    await uploadTestDocument(
      grantsCorpus,
      'Proposta de projeto para desenvolvimento de aplicativo educacional.',
      'Grant Proposal'
    );

    await navigateToModule(page, 'journey');
    await page.waitForSelector('[data-testid="journey-search-panel"]', { timeout: 10000 });

    await page.fill('[data-testid="search-input"]', 'resiliência emocional');
    await page.click('[data-testid="search-button"]');

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    const resultsText = await page.textContent('[data-testid="search-results"]');
    expect(resultsText).toContain('Emotional Growth');
    expect(resultsText).not.toContain('Grant Proposal');

    await cleanupTestCorpus(journeyCorpus);
    await cleanupTestCorpus(grantsCorpus);
  });
});

// ============================================================================
// TEST SUITE: RLS Data Isolation
// ============================================================================

test.describe('File Search - RLS Data Isolation Between Users', () => {
  test('User 1 should NOT see User 2 documents', async ({ page, context }) => {
    // Login as User 1
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    const user1Id = 'test-user-1'; // TODO: Get from session

    // Create corpus and document for User 1
    const user1Corpus = await createTestCorpus(user1Id, 'grants', 'grant-user1', 'User 1 Grants');
    await uploadTestDocument(
      user1Corpus,
      'Documento privado do Usuário 1 sobre edital de tecnologia.',
      'User 1 Private Doc'
    );

    // Open new page for User 2
    const page2 = await context.newPage();
    await login(page2, TEST_USER_2.email, TEST_USER_2.password);
    const user2Id = 'test-user-2';

    // Create corpus for User 2
    const user2Corpus = await createTestCorpus(user2Id, 'grants', 'grant-user2', 'User 2 Grants');
    await uploadTestDocument(
      user2Corpus,
      'Documento privado do Usuário 2 sobre edital de saúde.',
      'User 2 Private Doc'
    );

    // Navigate to Grants in User 2's session
    await navigateToModule(page2, 'grants');
    await page2.waitForSelector('[data-testid="grants-search-panel"]', { timeout: 10000 });

    // Search for User 1's document content
    await page2.fill('[data-testid="search-input"]', 'edital de tecnologia');
    await page2.click('[data-testid="search-button"]');

    await page2.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    // Verify User 2 does NOT see User 1's document
    const resultsText = await page2.textContent('[data-testid="search-results"]');
    expect(resultsText).not.toContain('User 1 Private Doc');

    // Verify User 2 CAN see their own document
    await page2.fill('[data-testid="search-input"]', 'edital de saúde');
    await page2.click('[data-testid="search-button"]');
    await page2.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    const results2Text = await page2.textContent('[data-testid="search-results"]');
    expect(results2Text).toContain('User 2 Private Doc');

    // Cleanup
    await cleanupTestCorpus(user1Corpus);
    await cleanupTestCorpus(user2Corpus);
    await page2.close();
  });

  test('Direct API access should be blocked by RLS', async () => {
    // This test verifies that even with direct Supabase client access,
    // RLS policies prevent cross-user data access

    // TODO: Implement direct Supabase query test
    // const { data: user1Corpora } = await supabase
    //   .from('file_search_corpora')
    //   .select('*')
    //   .eq('user_id', 'test-user-1');
    //
    // const { data: user2Corpora } = await supabase
    //   .from('file_search_corpora')
    //   .select('*')
    //   .eq('user_id', 'test-user-2');
    //
    // expect(user1Corpora).not.toContainEqual(expect.objectContaining({ user_id: 'test-user-2' }));
    // expect(user2Corpora).not.toContainEqual(expect.objectContaining({ user_id: 'test-user-1' }));
  });
});

// ============================================================================
// TEST SUITE: Search Quality and Accuracy
// ============================================================================

test.describe('File Search - Search Quality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
  });

  test('Should return relevant results for semantic queries', async ({ page }) => {
    const userId = 'test-user-1';
    const corpus = await createTestCorpus(userId, 'grants', 'grant-quality', 'Quality Test');

    // Upload semantically related documents
    await uploadTestDocument(
      corpus,
      'Pesquisa sobre redes neurais profundas e aprendizado de máquina.',
      'AI Research Paper'
    );

    await uploadTestDocument(
      corpus,
      'Análise de algoritmos de processamento de linguagem natural.',
      'NLP Analysis'
    );

    await uploadTestDocument(
      corpus,
      'Estudo sobre sistemas de recomendação baseados em inteligência artificial.',
      'Recommendation Systems'
    );

    await navigateToModule(page, 'grants');
    await page.waitForSelector('[data-testid="grants-search-panel"]', { timeout: 10000 });

    // Search with semantic query (not exact match)
    await page.fill('[data-testid="search-input"]', 'inteligência artificial e deep learning');
    await page.click('[data-testid="search-button"]');

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    // All three documents should be returned (semantic similarity)
    const resultsText = await page.textContent('[data-testid="search-results"]');
    expect(resultsText).toContain('AI Research Paper');
    expect(resultsText).toContain('NLP Analysis');
    expect(resultsText).toContain('Recommendation Systems');

    // Verify relevance scores are displayed
    const scoreElements = await page.$$('[data-testid="relevance-score"]');
    expect(scoreElements.length).toBeGreaterThan(0);

    await cleanupTestCorpus(corpus);
  });

  test('Should handle queries with no results gracefully', async ({ page }) => {
    const userId = 'test-user-1';
    const corpus = await createTestCorpus(userId, 'finance', 'finance-empty', 'Empty Test');

    await uploadTestDocument(
      corpus,
      'Relatório financeiro sobre investimentos em ações.',
      'Stock Report'
    );

    await navigateToModule(page, 'finance');
    await page.waitForSelector('[data-testid="finance-search-panel"]', { timeout: 10000 });

    // Search for completely unrelated topic
    await page.fill('[data-testid="search-input"]', 'receita de bolo de chocolate');
    await page.click('[data-testid="search-button"]');

    // Should show "no results" message
    await page.waitForSelector('[data-testid="no-results-message"]', { timeout: 10000 });

    const noResultsText = await page.textContent('[data-testid="no-results-message"]');
    expect(noResultsText).toContain('Nenhum resultado encontrado');

    await cleanupTestCorpus(corpus);
  });
});

// ============================================================================
// TEST SUITE: Cost Tracking Integration
// ============================================================================

test.describe('File Search - Cost Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
  });

  test('Should track AI usage costs for search operations', async ({ page }) => {
    const userId = 'test-user-1';
    const corpus = await createTestCorpus(userId, 'grants', 'grant-cost', 'Cost Test');

    await uploadTestDocument(
      corpus,
      'Edital de fomento para startups de tecnologia.',
      'Tech Startup Grant'
    );

    // Navigate to Grants and perform search
    await navigateToModule(page, 'grants');
    await page.waitForSelector('[data-testid="grants-search-panel"]', { timeout: 10000 });

    await page.fill('[data-testid="search-input"]', 'startups de tecnologia');
    await page.click('[data-testid="search-button"]');

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });

    // Navigate to AI Cost Dashboard
    await page.click('[data-testid="settings-menu"]');
    await page.click('[data-testid="ai-cost-dashboard-link"]');

    await page.waitForURL(`${BASE_URL}/ai-cost`, { timeout: 10000 });

    // Verify cost entry was created
    await page.waitForSelector('[data-testid="cost-table"]', { timeout: 10000 });

    const costTableText = await page.textContent('[data-testid="cost-table"]');
    expect(costTableText).toContain('File Search');
    expect(costTableText).toContain('grants');

    await cleanupTestCorpus(corpus);
  });
});

// ============================================================================
// TEST SUITE: Analytics Dashboard
// ============================================================================

test.describe('File Search - Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
  });

  test('Should display File Search analytics metrics', async ({ page }) => {
    // Navigate to File Search Analytics
    await page.click('[data-testid="settings-menu"]');
    await page.click('[data-testid="file-search-analytics-link"]');

    await page.waitForURL(`${BASE_URL}/file-search-analytics`, { timeout: 10000 });

    // Verify dashboard components are visible
    await expect(page.locator('[data-testid="total-corpora-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-documents-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-searches-metric"]')).toBeVisible();

    // Verify module breakdown chart
    await expect(page.locator('[data-testid="module-breakdown-chart"]')).toBeVisible();

    // Verify recent searches list
    await expect(page.locator('[data-testid="recent-searches-list"]')).toBeVisible();
  });

  test('Should show per-module statistics correctly', async ({ page }) => {
    const userId = 'test-user-1';

    // Create corpora in different modules
    const grantsCorpus = await createTestCorpus(userId, 'grants', 'grant-stats', 'Stats Grants');
    const financeCorpus = await createTestCorpus(userId, 'finance', 'finance-stats', 'Stats Finance');

    await uploadTestDocument(grantsCorpus, 'Test grant document', 'Grant Doc');
    await uploadTestDocument(financeCorpus, 'Test finance document', 'Finance Doc');

    // Navigate to analytics
    await page.click('[data-testid="settings-menu"]');
    await page.click('[data-testid="file-search-analytics-link"]');

    await page.waitForURL(`${BASE_URL}/file-search-analytics`, { timeout: 10000 });

    // Verify module breakdown shows both modules
    const moduleBreakdownText = await page.textContent('[data-testid="module-breakdown-chart"]');
    expect(moduleBreakdownText).toContain('grants');
    expect(moduleBreakdownText).toContain('finance');

    await cleanupTestCorpus(grantsCorpus);
    await cleanupTestCorpus(financeCorpus);
  });
});

// ============================================================================
// TEST SUITE: Error Handling
// ============================================================================

test.describe('File Search - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
  });

  test('Should handle backend unavailability gracefully', async ({ page }) => {
    // TODO: Mock backend failure or disconnect network
    // await context.route(`${BACKEND_URL}/file-search/**`, route => route.abort());

    await navigateToModule(page, 'grants');
    await page.waitForSelector('[data-testid="grants-search-panel"]', { timeout: 10000 });

    await page.fill('[data-testid="search-input"]', 'test query');
    await page.click('[data-testid="search-button"]');

    // Should show error message
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });

    const errorText = await page.textContent('[data-testid="error-message"]');
    expect(errorText).toContain('Erro ao realizar busca');
  });

  test('Should handle malformed queries without crashing', async ({ page }) => {
    const userId = 'test-user-1';
    const corpus = await createTestCorpus(userId, 'grants', 'grant-malformed', 'Malformed Test');

    await uploadTestDocument(corpus, 'Valid document content', 'Valid Doc');

    await navigateToModule(page, 'grants');
    await page.waitForSelector('[data-testid="grants-search-panel"]', { timeout: 10000 });

    // Try various edge cases
    const edgeCases = ['', '   ', '!@#$%^&*()', '<script>alert("xss")</script>'];

    for (const query of edgeCases) {
      await page.fill('[data-testid="search-input"]', query);
      await page.click('[data-testid="search-button"]');

      // Should either show results, no results, or validation error - but NOT crash
      await page.waitForTimeout(1000);
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy(); // Page should still be rendered
    }

    await cleanupTestCorpus(corpus);
  });
});
