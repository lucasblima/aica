# Finance Incremental Import — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to re-import bank statements (PDF/CSV) for overlapping periods without blocking — new transactions are added via SHA-256 hash dedup, existing ones are silently skipped. Extend email import to accept finance files.

**Architecture:** Remove period overlap blocking in `statementService.ts` (both `saveParsedData` and `processCSVStatement`). Change `processCSVStatement` `.insert()` to `.upsert()`. Relax file hash duplicate check. Update `StatementUpload.tsx` to show info messages instead of errors. Extend `receive-email-import` Edge Function to route `.pdf`/`.csv` to the Finance pipeline.

**Tech Stack:** React 18 + TypeScript, Supabase (PostgreSQL + Edge Functions + Storage), Vitest, Resend (email)

**Spec:** `docs/plans/2026-03-12-feat-finance-incremental-import-design.md`

---

## Chunk 1: Incremental Import — Service Layer

### Task 1: Relax `saveParsedData` overlap blocking

**Files:**
- Modify: `src/modules/finance/services/statementService.ts:245-264`
- Test: `src/modules/finance/services/__tests__/statementService.incremental.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/modules/finance/services/__tests__/statementService.incremental.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

// Mock accountService
vi.mock('../accountService', () => ({
  ensureAccountExists: vi.fn().mockResolvedValue('account-123'),
}));

import { supabase } from '../../../../services/supabaseClient';
import { statementService } from '../statementService';

describe('saveParsedData — incremental import', () => {
  const mockParsed = {
    bankName: 'Nubank',
    accountType: 'checking' as const,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-15',
    openingBalance: 1000,
    closingBalance: 2000,
    currency: 'BRL',
    transactions: [
      { date: '2026-03-11', description: 'PIX Recebido', amount: 500, type: 'income' as const },
      { date: '2026-03-12', description: 'Mercado', amount: -120, type: 'expense' as const },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should continue processing when period overlaps exist (not throw)', async () => {
    // Mock checkPeriodOverlap returning existing overlap
    const fromMock = vi.fn();
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: [{
                  id: 'existing-stmt-1',
                  file_name: 'extrato_mar.pdf',
                  bank_name: 'Nubank',
                  statement_period_start: '2026-03-01',
                  statement_period_end: '2026-03-10',
                }],
                error: null,
              }),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null }),
      }),
    });

    // Should NOT throw — incremental import allows overlap
    await expect(
      statementService.saveParsedData('new-stmt-id', 'user-123', mockParsed, '# markdown')
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/finance/services/__tests__/statementService.incremental.test.ts`
Expected: FAIL — currently `saveParsedData` throws on overlap

- [ ] **Step 3: Implement — relax overlap in `saveParsedData`**

In `src/modules/finance/services/statementService.ts`, lines 245-264, change:

```typescript
// BEFORE (lines 251-263):
if (otherOverlaps.length > 0) {
  const names = otherOverlaps.map(s => `${s.bank_name} (${s.file_name})`).join(', ');
  await this.updateStatement(statementId, {
    processing_status: 'failed',
    processing_error: `Período sobreposto com: ${names}`,
    processing_completed_at: new Date().toISOString(),
  });
  throw new Error(
    `Já existe extrato para este período: ${names}. ` +
    `Delete o extrato existente antes de importar novamente.`
  );
}

// AFTER:
if (otherOverlaps.length > 0) {
  const names = otherOverlaps.map(s => `${s.bank_name} (${s.file_name})`).join(', ');
  log.info(`[saveParsedData] Período sobreposto com ${otherOverlaps.length} extrato(s): ${names} — continuando com dedup por hash`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/finance/services/__tests__/statementService.incremental.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/finance/services/statementService.ts src/modules/finance/services/__tests__/statementService.incremental.test.ts
git commit -m "feat(finance): relax saveParsedData overlap blocking for incremental import"
```

---

### Task 2: Relax `processCSVStatement` overlap and duplicate blocking + fix `.insert()` → `.upsert()`

**Files:**
- Modify: `src/modules/finance/services/statementService.ts:526-550,637-639`
- Test: `src/modules/finance/services/__tests__/statementService.incremental.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
// Append to statementService.incremental.test.ts
import { csvParserService } from '../csvParserService';

vi.mock('../csvParserService', () => ({
  csvParserService: {
    parseCSV: vi.fn(),
  },
}));

describe('processCSVStatement — incremental import', () => {
  const mockCSVResult = {
    bankName: 'Nubank',
    accountType: 'checking',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    openingBalance: 0,
    closingBalance: 0,
    currency: 'BRL',
    sourceFormat: 'nubank',
    rawDataSnapshot: null,
    transactions: [
      { date: '2026-03-15', description: 'PIX Enviado', amount: -50, type: 'expense' as const, category: 'other' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (csvParserService.parseCSV as ReturnType<typeof vi.fn>).mockResolvedValue(mockCSVResult);
  });

  it('should NOT throw when period overlap exists', async () => {
    const mockFile = new File(['date,amount,desc\n2026-03-15,-50,PIX'], 'test.csv', { type: 'text/csv' });

    // Setup supabase mock chain:
    // 1. checkPeriodOverlap returns overlap
    // 2. calculateFileHash works (crypto.subtle)
    // 3. file hash check returns existing
    // 4. createStatement succeeds
    // 5. upsert succeeds
    // 6. update succeeds

    const mockFrom = vi.fn();
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({
        data: [{ id: 'old-stmt', file_name: 'old.csv', bank_name: 'Nubank',
                 statement_period_start: '2026-03-01', statement_period_end: '2026-03-10' }],
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-stmt-id' }, error: null }),
    };
    const upsertChain = {
      select: vi.fn().mockResolvedValue({ data: [{ id: 'tx-1' }], error: null }),
    };
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-stmt-id' }, error: null }),
        }),
      }),
    };

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(selectChain) }),
      upsert: vi.fn().mockReturnValue(upsertChain),
      update: vi.fn().mockReturnValue(updateChain),
    }));

    (supabase.functions as any) = {
      invoke: vi.fn().mockResolvedValue({ data: { categories: ['transfer'] }, error: null }),
    };

    // Should NOT throw — overlap is now informational
    await expect(
      statementService.processCSVStatement('user-123', mockFile)
    ).resolves.toBeDefined();
  });

  it('should use upsert with ignoreDuplicates instead of plain insert', async () => {
    const mockFile = new File(['date,amount,desc\n2026-03-15,-50,PIX'], 'test.csv', { type: 'text/csv' });
    const upsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'tx-1' }], error: null }),
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'finance_transactions') {
        return { upsert: upsertSpy, insert: vi.fn() };
      }
      // Default mock for other tables
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'stmt-id' }, error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'stmt-id' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'stmt-id' }, error: null }),
            }),
          }),
        }),
      };
    });

    (supabase.functions as any) = {
      invoke: vi.fn().mockResolvedValue({ data: { categories: ['other'] }, error: null }),
    };

    await statementService.processCSVStatement('user-123', mockFile);

    // Verify upsert was called with ignoreDuplicates
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ onConflict: 'hash_id', ignoreDuplicates: true })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/finance/services/__tests__/statementService.incremental.test.ts`
Expected: FAIL — `processCSVStatement` throws on overlap and uses `.insert()`

- [ ] **Step 3: Implement three changes in `processCSVStatement`**

**Change 1** — Relax overlap (lines 529-535):
```typescript
// BEFORE:
if (hasOverlap) {
  const names = overlapping.map(s => `${s.bank_name} (${s.file_name})`).join(', ');
  throw new Error(
    `Já existe extrato para este período: ${names}. ` +
    `Delete o extrato existente antes de importar novamente.`
  );
}

// AFTER:
if (hasOverlap) {
  const names = overlapping.map(s => `${s.bank_name} (${s.file_name})`).join(', ');
  log.info(`[CSV] Período sobreposto com: ${names} — continuando com dedup por hash`);
}
```

**Change 2** — Relax file hash duplicate (lines 548-550):
```typescript
// BEFORE:
if (existing) {
  throw new Error('Este extrato já foi importado anteriormente.');
}

// AFTER:
if (existing) {
  log.info('[CSV] Arquivo já importado anteriormente — continuando, hash dedup previne duplicatas');
}
```

**Change 3** — Fix `.insert()` → `.upsert()` (lines 637-639):
```typescript
// BEFORE:
const { error: txError } = await supabase
  .from('finance_transactions')
  .insert(transactionsToInsert);

// AFTER:
const { data: upsertResult, error: txError } = await supabase
  .from('finance_transactions')
  .upsert(transactionsToInsert, {
    onConflict: 'hash_id',
    ignoreDuplicates: true,
  })
  .select('id');
```

Also update the log line after (line 651) to report inserted vs skipped:
```typescript
// BEFORE:
log.debug('[CSV] Transactions inserted:', transactionsToInsert.length);

// AFTER:
const insertedCount = upsertResult?.length || 0;
const skippedCount = transactionsToInsert.length - insertedCount;
log.info(`[CSV] Transactions: ${insertedCount} inserted, ${skippedCount} duplicates skipped`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/finance/services/__tests__/statementService.incremental.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/finance/services/statementService.ts src/modules/finance/services/__tests__/statementService.incremental.test.ts
git commit -m "feat(finance): relax processCSVStatement overlap/duplicate + fix insert→upsert"
```

---

### Task 3: Relax `checkDuplicate` file hash blocking

**Files:**
- Modify: `src/modules/finance/services/statementService.ts:406-421`
- Test: `src/modules/finance/services/__tests__/statementService.incremental.test.ts` (append)

- [ ] **Step 1: Write the failing test**

```typescript
describe('checkDuplicate — relaxed for incremental import', () => {
  it('should always return false (never block)', async () => {
    // checkDuplicate should no longer block re-imports
    const result = await statementService.checkDuplicate('user-123', 'existing-hash');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/finance/services/__tests__/statementService.incremental.test.ts`
Expected: FAIL — currently returns `true` when hash matches

- [ ] **Step 3: Implement — always return false**

```typescript
// BEFORE (lines 406-421):
async checkDuplicate(userId: string, fileHash: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('finance_statements')
    .select('id, processing_status')
    .eq('user_id', userId)
    .eq('file_hash', fileHash)
    .eq('processing_status', 'completed')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    log.warn('[statementService] checkDuplicate error:', error);
  }

  return !!data;
}

// AFTER:
async checkDuplicate(_userId: string, _fileHash: string): Promise<boolean> {
  // Relaxed for incremental import: file hash no longer blocks re-imports.
  // Transaction-level SHA-256 hash dedup prevents actual duplicate transactions.
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/finance/services/__tests__/statementService.incremental.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/finance/services/statementService.ts src/modules/finance/services/__tests__/statementService.incremental.test.ts
git commit -m "feat(finance): relax checkDuplicate — file hash no longer blocks re-import"
```

---

## Chunk 2: Incremental Import — UI Layer

### Task 4: Update `StatementUpload.tsx` — overlap shows info instead of error

**Depends on:** Task 3 (checkDuplicate returns false) must be complete before this task.

**Files:**
- Modify: `src/modules/finance/components/StatementUpload.tsx:334-354`

- [ ] **Step 1: Identify both code paths that block on overlap/duplicate**

**Path A — File hash duplicate** (lines 334-338):
```typescript
const isDuplicate = await statementService.checkDuplicate(userId, fileHash);
if (isDuplicate) {
  updateFileProgress(i, { stage: 'error', progress: 0, message: 'Já enviado' });
  continue;
}
```

**Path B — CSV cached period overlap** (lines 350-355):
```typescript
const { hasOverlap, overlapping } = await statementService.checkPeriodOverlap(userId, periodStart, periodEnd);
if (hasOverlap) {
  const names = overlapping.map(s => s.file_name).join(', ');
  updateFileProgress(i, { stage: 'error', progress: 0, message: `Período já importado: ${names}` });
  continue;
}
```

- [ ] **Step 2: Fix Path A — file hash duplicate now shows info, continues processing**

Since `checkDuplicate` now always returns `false` (Task 3), this block never triggers.
But as defense-in-depth, change the behavior from error → info:

```typescript
// BEFORE (lines 334-338):
const isDuplicate = await statementService.checkDuplicate(userId, fileHash);
if (isDuplicate) {
  updateFileProgress(i, { stage: 'error', progress: 0, message: 'Já enviado' });
  continue;
}

// AFTER:
// checkDuplicate always returns false now (incremental import).
// File hash no longer blocks — transaction hash dedup handles duplicates.
```

Simply remove lines 334-338 (the `checkDuplicate` call and its `if` block).

- [ ] **Step 3: Fix Path B — CSV overlap now shows info, continues processing**

```typescript
// BEFORE (lines 349-355):
// Check period overlap
const { hasOverlap, overlapping } = await statementService.checkPeriodOverlap(userId, periodStart, periodEnd);
if (hasOverlap) {
  const names = overlapping.map(s => s.file_name).join(', ');
  updateFileProgress(i, { stage: 'error', progress: 0, message: `Período já importado: ${names}` });
  continue;
}

// AFTER:
// Check period overlap — informational only (incremental import)
const { hasOverlap, overlapping } = await statementService.checkPeriodOverlap(userId, periodStart, periodEnd);
if (hasOverlap) {
  const names = overlapping.map(s => s.file_name).join(', ');
  log.info(`[Upload] Período sobreposto com: ${names} — continuando com dedup`);
  updateFileProgress(i, { stage: 'uploading', progress: 15, message: `Adicionando transações novas (${names} já existe)` }, 'uploading');
}
```

Remove the `continue;` so processing continues.

- [ ] **Step 4: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, no type errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/finance/components/StatementUpload.tsx
git commit -m "feat(finance): StatementUpload shows info instead of error on overlap/duplicate"
```

---

### Task 5: Update success banner to show inserted vs skipped count

**Files:**
- Modify: `src/modules/finance/components/StatementUpload.tsx`

This is a visual-only change (CSS/text). Verify with build, no unit test needed.

- [ ] **Step 1: Add tracking for inserted/skipped counts in `processAllFiles`**

After `saveParsedData` succeeds (line 380 for CSV, line 444 for PDF), the `saveTransactions` function inside the service already logs the count. To surface this to the UI, we need to track it.

Add to `FileWithMetadata` interface:
```typescript
insertedCount?: number;
skippedCount?: number;
```

- [ ] **Step 2: After `saveParsedData`, query transaction count for the statement**

After line 380 (CSV) and line 444 (PDF), add:
```typescript
// Fetch actual transaction count for this statement to show inserted vs total
const stmtTransactions = await statementService.getStatementTransactions(statement.id);
const insertedCount = stmtTransactions.length;
const totalParsed = enhancedParsed.transactions.length;
const skippedCount = totalParsed - insertedCount;
```

Update the complete message:
```typescript
// BEFORE:
updateFileProgress(i, { stage: 'complete', progress: 100, message: 'Concluído!' });

// AFTER:
const completeMsg = skippedCount > 0
  ? `${insertedCount} novas transações (${skippedCount} já existiam)`
  : `${insertedCount} transações importadas`;
updateFileProgress(i, { stage: 'complete', progress: 100, message: completeMsg });
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Exit 0

- [ ] **Step 4: Commit**

```bash
git add src/modules/finance/components/StatementUpload.tsx
git commit -m "feat(finance): show inserted vs skipped transaction count in upload UI"
```

---

## Chunk 3: Email Import Extension

### Task 6: Database migration — add `import_type` to `email_import_log`

**Files:**
- Create: `supabase/migrations/20260312100001_email_import_type.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add import_type discriminator to email_import_log
-- Allows distinguishing WhatsApp vs Finance email imports

ALTER TABLE email_import_log
  ADD COLUMN IF NOT EXISTS import_type TEXT NOT NULL DEFAULT 'whatsapp';

COMMENT ON COLUMN email_import_log.import_type IS 'Type of import: whatsapp or finance';
```

- [ ] **Step 2: Verify migration syntax**

Run: `npx supabase db diff` to check it doesn't conflict with existing state.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312100001_email_import_type.sql
git commit -m "feat(database): add import_type column to email_import_log"
```

---

### Task 7: Create Deno-compatible CSV parser (`_shared/csvParser.ts`)

**Files:**
- Create: `supabase/functions/_shared/csvParser.ts`

- [ ] **Step 1: Write the CSV parser for Deno**

Port the bank detection and parsing logic from `src/modules/finance/services/csvParserService.ts` to Deno-compatible code (no `FileReader`, no `File` object — works with raw string content).

```typescript
// supabase/functions/_shared/csvParser.ts

/**
 * Deno-compatible CSV parser for bank statements.
 * Ported from src/modules/finance/services/csvParserService.ts.
 * Works with raw string content (no browser File/FileReader APIs).
 */

export interface ParsedCSVTransaction {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
}

export interface CSVParseResult {
  bankName: string;
  periodStart: string;
  periodEnd: string;
  transactions: ParsedCSVTransaction[];
}

type BankFormat = 'nubank' | 'inter' | 'itau' | 'generic';

/**
 * Detect bank format from CSV header row
 */
function detectBankFormat(headerRow: string): BankFormat {
  const lower = headerRow.toLowerCase();

  // Nubank: "Data,Valor,Descrição" or "date,amount,description"
  if (lower.includes('data') && lower.includes('valor') && lower.includes('descri')) return 'nubank';
  if (lower.includes('date') && lower.includes('amount') && lower.includes('description')) return 'nubank';

  // Inter: "Data Lançamento,Histórico,Valor,Saldo"
  if (lower.includes('histórico') || lower.includes('historico')) return 'inter';
  if (lower.includes('lançamento') || lower.includes('lancamento')) return 'inter';

  // Itaú: "data,lançamento,ag./origem,valor"
  if (lower.includes('ag./origem') || lower.includes('ag.origem')) return 'itau';

  return 'generic';
}

/**
 * Parse CSV date to YYYY-MM-DD format
 */
function parseDate(dateStr: string): string {
  const trimmed = dateStr.trim().replace(/"/g, '');

  // DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  return trimmed;
}

/**
 * Parse a CSV value, handling quoted strings and Brazilian number format
 */
function parseAmount(value: string): number {
  const cleaned = value.trim().replace(/"/g, '').replace(/\s/g, '');
  // Brazilian format: 1.234,56 → 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Just comma as decimal: 1234,56 → 1234.56
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  return parseFloat(cleaned);
}

/**
 * Split CSV line respecting quoted fields
 */
function splitCSVLine(line: string, separator = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV content string into structured transactions.
 * Main entry point for Edge Functions.
 */
export function parseCSVContent(content: string): CSVParseResult {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    throw new Error('CSV vazio ou sem transações');
  }

  const headerRow = lines[0];
  const separator = headerRow.includes(';') ? ';' : ',';
  const format = detectBankFormat(headerRow);

  const headers = splitCSVLine(headerRow, separator).map(h => h.toLowerCase().replace(/"/g, ''));

  // Find column indices based on format
  let dateIdx = -1, descIdx = -1, amountIdx = -1;

  switch (format) {
    case 'nubank':
      dateIdx = headers.findIndex(h => h.includes('data') || h === 'date');
      amountIdx = headers.findIndex(h => h.includes('valor') || h === 'amount');
      descIdx = headers.findIndex(h => h.includes('descri') || h === 'description');
      break;
    case 'inter':
      dateIdx = headers.findIndex(h => h.includes('data'));
      descIdx = headers.findIndex(h => h.includes('histórico') || h.includes('historico'));
      amountIdx = headers.findIndex(h => h.includes('valor'));
      break;
    case 'itau':
      dateIdx = headers.findIndex(h => h.includes('data'));
      descIdx = headers.findIndex(h => h.includes('lançamento') || h.includes('lancamento'));
      amountIdx = headers.findIndex(h => h.includes('valor'));
      break;
    default:
      dateIdx = 0;
      amountIdx = headers.length - 1;
      descIdx = headers.length > 2 ? 1 : 0;
  }

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error(`Formato CSV não reconhecido: ${headerRow}`);
  }
  if (descIdx === -1) descIdx = dateIdx === 0 ? 1 : 0;

  const transactions: ParsedCSVTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], separator);
    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

    const dateStr = parseDate(cols[dateIdx]);
    const description = cols[descIdx].replace(/"/g, '').trim();
    const amount = parseAmount(cols[amountIdx]);

    if (!dateStr || isNaN(amount) || !description) continue;

    transactions.push({
      date: dateStr,
      description,
      amount,
      type: amount >= 0 ? 'income' : 'expense',
    });
  }

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação válida encontrada no CSV');
  }

  // Determine period from transactions
  const dates = transactions.map(t => t.date).sort();

  const bankNameMap: Record<BankFormat, string> = {
    nubank: 'Nubank',
    inter: 'Banco Inter',
    itau: 'Itaú',
    generic: 'Banco',
  };

  return {
    bankName: bankNameMap[format],
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    transactions,
  };
}
```

- [ ] **Step 2: Verify no browser APIs are used**

Check: No `FileReader`, `File`, `Blob`, `document`, `window` references. Only pure string operations and standard JavaScript.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/csvParser.ts
git commit -m "feat(finance): add Deno-compatible CSV parser for email import pipeline"
```

---

### Task 8: Extend `receive-email-import` to route finance files

**Files:**
- Modify: `supabase/functions/receive-email-import/index.ts`

This is the highest-effort task. Read the existing file first to understand the full structure.

- [ ] **Step 1: Update `ALLOWED_EXTENSIONS`**

```typescript
// BEFORE (line 36):
const ALLOWED_EXTENSIONS = ['.txt', '.zip'];

// AFTER:
const ALLOWED_EXTENSIONS = ['.txt', '.zip', '.pdf', '.csv'];
```

- [ ] **Step 2: Add finance file size constant**

```typescript
const MAX_FINANCE_FILE_SIZE = 10 * 1024 * 1024; // 10MB (Finance limit)
```

- [ ] **Step 3: Add finance file detection helper**

```typescript
function isFinanceFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'pdf' || ext === 'csv';
}
```

- [ ] **Step 4: Add `import_type` to `email_import_log` — set during per-attachment processing**

The initial `email_import_log` insert (line 379) happens BEFORE the per-attachment loop,
so the filename is not yet known. Instead, update `import_type` inside the attachment loop
after the file extension is determined:

```typescript
// Inside the per-attachment processing loop, after determining the file extension:
// Update the log entry with the correct import_type
if (isFinanceFile(attachment.filename)) {
  await supabaseAdmin.from('email_import_log')
    .update({ import_type: 'finance' })
    .eq('id', logId);
}
// Default 'whatsapp' from the column default handles the WhatsApp case
```

Note: The `updateLog` helper only updates `status` and `rejection_reason`, so we use a
direct `.update()` call here. Alternatively, extend `updateLog` to accept `import_type`.

- [ ] **Step 5: Add finance routing after download**

After the attachment is downloaded and before the WhatsApp processing, add a routing branch:

```typescript
// After downloading attachment content:
if (isFinanceFile(attachment.filename)) {
  // Finance file size check
  if (fileContent.byteLength > MAX_FINANCE_FILE_SIZE) {
    await updateLog(logId, 'rejected', 'Arquivo financeiro muito grande (max 10MB)');
    // Send error email
    await sendReplyEmail(senderEmail, userResult.name || '',
      '❌ Erro ao importar extrato',
      `O arquivo "${attachment.filename}" excede o limite de 10MB para extratos financeiros.`
    );
    continue;
  }

  // Route to finance pipeline
  await processFinanceAttachment(
    supabaseAdmin, userResult.userId, attachment.filename,
    fileContent, logId, senderEmail, userResult.name || ''
  );
  continue;
}

// ... existing WhatsApp processing below
```

- [ ] **Step 6: Implement `processFinanceAttachment` function**

```typescript
async function processFinanceAttachment(
  supabaseAdmin: SupabaseClient,
  userId: string,
  filename: string,
  content: ArrayBuffer,
  logId: string,
  senderEmail: string,
  userName: string,
): Promise<void> {
  const ext = filename.toLowerCase().split('.').pop();

  try {
    if (ext === 'csv') {
      await processFinanceCSV(supabaseAdmin, userId, filename, content, logId);
    } else if (ext === 'pdf') {
      await processFinancePDF(supabaseAdmin, userId, filename, content, logId);
    }

    // Send success confirmation email
    await sendReplyEmail(senderEmail, userName,
      `✅ Extrato importado — ${filename}`,
      `Seu extrato "${filename}" foi processado com sucesso. Acesse https://aica.guru/finance para ver as transações.`
    );

    await updateLog(logId, 'completed', null);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Finance] Processing error:', errorMsg);

    await updateLog(logId, 'failed', errorMsg);

    // Send error email
    await sendReplyEmail(senderEmail, userName,
      '❌ Erro ao importar extrato',
      `Não foi possível processar "${filename}": ${errorMsg}. Tente importar manualmente em https://aica.guru/finance`
    );
  }
}

async function processFinanceCSV(
  supabaseAdmin: SupabaseClient,
  userId: string,
  filename: string,
  content: ArrayBuffer,
  _logId: string,
): Promise<void> {
  const { parseCSVContent } = await import('../_shared/csvParser.ts');

  const text = new TextDecoder('utf-8').decode(content);
  const parsed = parseCSVContent(text);

  // Upload to storage
  const timestamp = Date.now();
  const storagePath = `${userId}/email_${timestamp}_${filename}`;
  await supabaseAdmin.storage.from('finance-statements').upload(storagePath, new Blob([content]), {
    contentType: 'text/csv',
    upsert: false,
  });

  // Create statement record
  const { data: statement, error: stmtError } = await supabaseAdmin
    .from('finance_statements')
    .insert({
      user_id: userId,
      file_name: filename,
      file_size_bytes: content.byteLength,
      storage_path: storagePath,
      source_type: 'csv',
      source_bank: parsed.bankName.toLowerCase().replace(/\s+/g, '_'),
      bank_name: parsed.bankName,
      statement_period_start: parsed.periodStart,
      statement_period_end: parsed.periodEnd,
      transaction_count: parsed.transactions.length,
      processing_status: 'processing',
      processing_started_at: new Date().toISOString(),
      mime_type: 'text/csv',
    })
    .select('id')
    .single();

  if (stmtError) throw new Error(`Erro ao criar registro: ${stmtError.message}`);

  // Generate hash and upsert transactions
  const txRecords = await Promise.all(
    parsed.transactions.map(async (tx) => {
      const hashData = `${userId}|${tx.date}|${tx.description}|${Math.abs(tx.amount).toFixed(2)}`;
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashData));
      const hashId = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      return {
        user_id: userId,
        statement_id: statement.id,
        hash_id: hashId,
        transaction_date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.amount),
        type: tx.type,
        category: 'other',
        is_recurring: false,
      };
    })
  );

  const { data: upsertResult, error: txError } = await supabaseAdmin
    .from('finance_transactions')
    .upsert(txRecords, { onConflict: 'hash_id', ignoreDuplicates: true })
    .select('id');

  if (txError) throw new Error(`Erro ao inserir transações: ${txError.message}`);

  const inserted = upsertResult?.length || 0;
  console.log(`[Finance-CSV] ${inserted} inserted, ${txRecords.length - inserted} skipped for ${filename}`);

  // Mark statement completed
  await supabaseAdmin.from('finance_statements').update({
    processing_status: 'completed',
    processing_completed_at: new Date().toISOString(),
    total_credits: parsed.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0),
    total_debits: parsed.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0),
  }).eq('id', statement.id);
}

async function processFinancePDF(
  supabaseAdmin: SupabaseClient,
  userId: string,
  filename: string,
  content: ArrayBuffer,
  _logId: string,
): Promise<void> {
  // Upload to storage
  const timestamp = Date.now();
  const storagePath = `${userId}/email_${timestamp}_${filename}`;
  await supabaseAdmin.storage.from('finance-statements').upload(storagePath, new Blob([content]), {
    contentType: 'application/pdf',
    upsert: false,
  });

  // Create statement record
  const { data: statement, error: stmtError } = await supabaseAdmin
    .from('finance_statements')
    .insert({
      user_id: userId,
      file_name: filename,
      file_size_bytes: content.byteLength,
      storage_path: storagePath,
      source_type: 'pdf',
      processing_status: 'pending',
      mime_type: 'application/pdf',
    })
    .select('id')
    .single();

  if (stmtError) throw new Error(`Erro ao criar registro: ${stmtError.message}`);

  // Call gemini-chat to parse the PDF statement
  // The PDF text extraction + AI parsing happens in gemini-chat
  const { data: parseResult, error: parseError } = await supabaseAdmin.functions.invoke('gemini-chat', {
    body: {
      action: 'parse_statement_from_storage',
      payload: {
        statementId: statement.id,
        storagePath,
        userId,
      },
    },
  });

  if (parseError || !parseResult?.success) {
    throw new Error(parseResult?.error || parseError?.message || 'Erro ao processar PDF');
  }

  console.log(`[Finance-PDF] Statement ${statement.id} processed via gemini-chat for ${filename}`);
}
```

- [ ] **Step 7: Verify Edge Function syntax**

Run: `npx supabase functions serve receive-email-import` (local test)

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/receive-email-import/index.ts
git commit -m "feat(finance): extend email import to accept PDF/CSV and route to Finance pipeline"
```

---

## Chunk 4: Verification & PR

### Task 9: Full verification

**Files:** All modified files from Tasks 1-8

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All new tests pass, no regressions

- [ ] **Step 2: Run build**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, no errors

- [ ] **Step 3: Manual verification — re-import test**

1. Start dev server: `npm run dev`
2. Go to Finance → Upload
3. Upload a CSV for March 2026 (if exists)
4. Upload the same CSV again → should show info message, not error
5. Check transaction count — no duplicates

- [ ] **Step 4: Deploy Edge Functions to staging**

```bash
npx supabase functions deploy receive-email-import --no-verify-jwt
```

- [ ] **Step 5: Push migration**

```bash
npx supabase db push
```

- [ ] **Step 6: Create PR**

```bash
gh pr create --title "feat(finance): incremental import + email import for PDF/CSV" --body "$(cat <<'EOF'
## Summary
- Allow re-importing bank statements for overlapping periods without blocking
- New transactions are added via SHA-256 hash dedup, existing ones silently skipped
- Extend email import (receive-email-import) to accept .pdf/.csv and route to Finance
- Add import_type column to email_import_log for audit trail
- Add Deno-compatible CSV parser for Edge Functions

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` — new incremental import tests pass
- [ ] Manual: re-upload CSV for same month → info message, no duplicates
- [ ] Manual: send PDF to import@import.aica.guru → confirmation email received

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
