import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * File Processing Pipeline — E2E Metrics Tests (#113)
 *
 * Bloco 1: Processing time < 30s per PDF
 * Bloco 2: Classification accuracy >= 90%
 *
 * Fixtures: 5 synthetic PDFs in tests/fixtures/
 * Each PDF is uploaded via DocumentUploader on the Grants dashboard,
 * timed, and its classification label verified.
 *
 * Run with: npx playwright test file-pipeline-metrics
 */

// ─── Types & Constants ────────────────────────────────────────────────────────

interface PdfFixture {
  filename: string;
  expectedType: string;
  label: string;
  expectedFields: string[];
}

interface TestResult {
  fixture: string;
  processingTimeMs: number;
  detectedLabel: string | null;
  expectedLabel: string;
  passed: boolean;
}

const PDF_FIXTURES: PdfFixture[] = [
  {
    filename: 'test-rouanet.pdf',
    expectedType: 'projeto_rouanet',
    label: 'Projeto Rouanet',
    expectedFields: ['24-99001', '12.345.678/0001-99', '50.000'],
  },
  {
    filename: 'test-edital.pdf',
    expectedType: 'edital',
    label: 'Edital',
    expectedFields: ['15/06/2024', '100.000'],
  },
  {
    filename: 'test-estatuto.pdf',
    expectedType: 'estatuto_social',
    label: 'Estatuto Social',
    expectedFields: ['12.345.678/0001-99'],
  },
  {
    filename: 'test-apresentacao.pdf',
    expectedType: 'apresentacao_institucional',
    label: 'Apresentação Institucional',
    expectedFields: [],
  },
  {
    filename: 'test-relatorio.pdf',
    expectedType: 'relatorio_execucao',
    label: 'Relatório de Execução',
    expectedFields: ['45.000', '42.350'],
  },
];

// Shared results arrays — populated by individual tests, consumed by aggregated checks
const processingResults: TestResult[] = [];
const classificationResults: TestResult[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate from the home page to the Grants module.
 * Grants is NOT a URL route — it's a ViewState opened by clicking a card/button on `/`.
 */
async function navigateToGrants(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Grants module can be opened via multiple selectors
  const grantsButton = page
    .locator('[data-testid="grants-card"]')
    .or(page.locator('[data-testid="grants-open-button"]'))
    .or(page.getByRole('button', { name: /grants|captação|editais/i }));

  await grantsButton.first().click();
  await page.waitForLoadState('networkidle');

  // Wait for Grants dashboard content to appear
  await expect(
    page
      .getByRole('heading', { name: /captação|grants|editais/i })
      .or(page.getByText(/módulo.*captação/i))
      .or(page.getByText(/documentos/i))
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Upload a PDF via the DocumentUploader's hidden file input.
 * Returns the elapsed time in milliseconds.
 *
 * DocumentUploader flow:
 *   idle → (file selected) → uploading → processing → success | error
 * On success the UI shows: detected type label + "XX% confiança"
 */
async function uploadPdfAndWait(
  page: import('@playwright/test').Page,
  fixturePath: string,
): Promise<{ elapsedMs: number; detectedLabel: string | null }> {
  // Find the file input inside DocumentUploader (hidden <input type="file">)
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached({ timeout: 10000 });

  const start = Date.now();

  // setInputFiles triggers onChange → processFile → upload + AI classification
  await fileInput.setInputFiles(fixturePath);

  // Wait for success state: the classification label appears inside a rounded-full badge
  // Pattern from DocumentUploader.tsx line 412-413:
  //   <span className="... rounded-full">Projeto Rouanet</span>
  //   <span ...>XX% confiança</span>
  // OR error state shows "Erro ao processar"
  const successIndicator = page.locator('text=/% confiança/i');
  const errorIndicator = page.locator('text=/Erro ao processar/i');

  // Wait for either success or error (up to 60s for AI processing)
  await expect(successIndicator.or(errorIndicator)).toBeVisible({ timeout: 60000 });

  const elapsedMs = Date.now() - start;

  // Extract the detected type label if we landed on success
  let detectedLabel: string | null = null;
  const isSuccess = await successIndicator.isVisible().catch(() => false);

  if (isSuccess) {
    // The label is in a <span> with rounded-full class, right before the confidence span
    // It contains one of the DETECTED_TYPE_LABELS values
    const labelSpan = page.locator('span.rounded-full').filter({
      hasNotText: /confiança/i,
    });
    detectedLabel = await labelSpan.first().textContent().catch(() => null);
    if (detectedLabel) {
      detectedLabel = detectedLabel.trim();
    }
  }

  return { elapsedMs, detectedLabel };
}

/**
 * Reset the DocumentUploader for the next upload by clicking "Enviar outro documento".
 */
async function resetUploader(page: import('@playwright/test').Page): Promise<void> {
  const resetButton = page
    .getByRole('button', { name: /enviar outro documento/i })
    .or(page.getByText(/enviar outro documento/i))
    .or(page.locator('button:has-text("Tentar novamente")'));

  if (await resetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await resetButton.click();
    // Wait for idle state (dropzone visible again)
    await expect(
      page.locator('text=/arraste|solte|clique para selecionar/i')
    ).toBeVisible({ timeout: 5000 });
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('@slow File Pipeline — Processing & Classification', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState (setup project)
    // Verify we are authenticated before proceeding
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const isOnLandingPage = await page
      .locator('text=/Conheça a si mesmo|Começar a usar|Entrar com Google/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isOnLandingPage) {
      test.skip(true, 'Auth setup did not inject session — skipping pipeline tests');
      return;
    }
  });

  // ── Bloco 1 + 2: Per-PDF upload, timing, and classification ───────────────

  for (const fixture of PDF_FIXTURES) {
    test(`Upload ${fixture.filename}: processing < 30s and classified as "${fixture.label}"`, async ({ page }) => {
      // Navigate to Grants module
      await navigateToGrants(page);

      // Locate the Documentos section (DocumentUploader lives here)
      const documentsSection = page
        .locator('text=/documentos/i')
        .or(page.locator('[data-testid="documents-section"]'));

      // Scroll to documents section if needed
      if (await documentsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await documentsSection.scrollIntoViewIfNeeded();
      }

      // Build full path to fixture PDF
      const fixturePath = path.resolve(__dirname, '..', 'fixtures', fixture.filename);

      // Upload and measure
      const { elapsedMs, detectedLabel } = await uploadPdfAndWait(page, fixturePath);

      console.log(
        `[${fixture.filename}] Processing time: ${(elapsedMs / 1000).toFixed(1)}s | ` +
        `Detected: "${detectedLabel}" | Expected: "${fixture.label}"`
      );

      // ── Bloco 1: Processing time assertion ──
      const processingResult: TestResult = {
        fixture: fixture.filename,
        processingTimeMs: elapsedMs,
        detectedLabel,
        expectedLabel: fixture.label,
        passed: elapsedMs < 30000,
      };
      processingResults.push(processingResult);

      expect(
        elapsedMs,
        `${fixture.filename} took ${(elapsedMs / 1000).toFixed(1)}s (limit: 30s)`
      ).toBeLessThan(30000);

      // ── Bloco 2: Classification assertion ──
      const classificationPassed = detectedLabel === fixture.label;
      const classResult: TestResult = {
        fixture: fixture.filename,
        processingTimeMs: elapsedMs,
        detectedLabel,
        expectedLabel: fixture.label,
        passed: classificationPassed,
      };
      classificationResults.push(classResult);

      expect(
        detectedLabel,
        `${fixture.filename}: expected "${fixture.label}" but got "${detectedLabel}"`
      ).toBe(fixture.label);

      // Reset uploader for potential next test (cleanup)
      await resetUploader(page);
    });
  }

  // ── Aggregated Checks ─────────────────────────────────────────────────────

  test('Bloco 1 Aggregate: average processing time < 30s across all PDFs', async () => {
    // This test runs after all individual uploads (sequential execution, 1 worker)
    if (processingResults.length === 0) {
      test.skip(true, 'No processing results collected — individual tests may have been skipped');
      return;
    }

    const totalMs = processingResults.reduce((sum, r) => sum + r.processingTimeMs, 0);
    const avgMs = totalMs / processingResults.length;
    const maxMs = Math.max(...processingResults.map((r) => r.processingTimeMs));
    const allUnder30 = processingResults.every((r) => r.processingTimeMs < 30000);

    console.log('=== Bloco 1: Processing Time Summary ===');
    console.log(`  Total PDFs tested: ${processingResults.length}`);
    console.log(`  Average time: ${(avgMs / 1000).toFixed(1)}s`);
    console.log(`  Max time: ${(maxMs / 1000).toFixed(1)}s`);
    console.log(`  All under 30s: ${allUnder30}`);
    for (const r of processingResults) {
      const status = r.passed ? 'PASS' : 'FAIL';
      console.log(`    [${status}] ${r.fixture}: ${(r.processingTimeMs / 1000).toFixed(1)}s`);
    }

    expect(avgMs, `Average processing time ${(avgMs / 1000).toFixed(1)}s exceeds 30s`).toBeLessThan(30000);
    expect(allUnder30, 'Not all PDFs processed within 30s').toBeTruthy();
  });

  test('Bloco 2 Aggregate: classification accuracy >= 90% across all PDFs', async () => {
    if (classificationResults.length === 0) {
      test.skip(true, 'No classification results collected — individual tests may have been skipped');
      return;
    }

    const correct = classificationResults.filter((r) => r.passed).length;
    const total = classificationResults.length;
    const accuracy = (correct / total) * 100;

    console.log('=== Bloco 2: Classification Accuracy Summary ===');
    console.log(`  Total PDFs tested: ${total}`);
    console.log(`  Correct: ${correct}/${total} (${accuracy.toFixed(0)}%)`);
    for (const r of classificationResults) {
      const status = r.passed ? 'PASS' : 'FAIL';
      console.log(
        `    [${status}] ${r.fixture}: expected "${r.expectedLabel}", got "${r.detectedLabel}"`
      );
    }

    // At least 90% accuracy (4 out of 5 correct minimum)
    expect(
      accuracy,
      `Classification accuracy ${accuracy.toFixed(0)}% is below 90% threshold (${correct}/${total})`
    ).toBeGreaterThanOrEqual(90);
  });
});
