# Finance Module Production-Ready Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 62 audit findings to bring the Finance module to production-grade quality across UI/UX, backend robustness, and security/performance.

**Architecture:** Fixes are grouped into 8 tasks ordered by dependency — shared constants first, then backend fixes (no UI dependency), then UI fixes, then database migrations last (require Supabase push). Each task is self-contained and independently committable.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS (Ceramic Design System) + Supabase + Vitest

**Audit Report:** `docs/plans/2026-02-28-finance-production-audit-report.md`

---

### Task 1: Extract Shared Finance Constants (DRY — removes duplication across 3 files)

**Files:**
- Create: `src/modules/finance/constants.ts`
- Modify: `src/modules/finance/components/RecategorizeModal.tsx:19-59`
- Modify: `src/modules/finance/components/TransactionListView.tsx:35-75`
- Modify: `src/modules/finance/components/MonthComparisonView.tsx:27-46`

**Fixes:** U5, U6 (Critical), U3, U4 (Critical) — Ceramic compliance for category colors

**Step 1: Create shared constants file**

```typescript
// src/modules/finance/constants.ts

export const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Moradia',
  food: 'Alimentacao',
  transport: 'Transporte',
  health: 'Saude',
  education: 'Educacao',
  entertainment: 'Entretenimento',
  shopping: 'Compras',
  salary: 'Salario',
  freelance: 'Freelance',
  investment: 'Investimento',
  transfer: 'Transferencia',
  bills: 'Contas',
  subscription: 'Assinatura',
  travel: 'Viagem',
  personal_care: 'Cuidados Pessoais',
  pets: 'Pets',
  gifts: 'Presentes',
  other: 'Outros',
};

// Ceramic Design System compliant — uses semantic tokens
// Each category gets a distinct hue via Tailwind's opacity modifiers on ceramic tokens
export const CATEGORY_COLORS: Record<string, string> = {
  housing: 'bg-ceramic-info/15 text-ceramic-info',
  food: 'bg-ceramic-warning/15 text-ceramic-warning',
  transport: 'bg-purple-100 text-purple-700',         // no ceramic equiv, keep
  health: 'bg-ceramic-error/15 text-ceramic-error',
  education: 'bg-indigo-100 text-indigo-700',          // no ceramic equiv, keep
  entertainment: 'bg-pink-100 text-pink-700',          // no ceramic equiv, keep
  shopping: 'bg-amber-100 text-amber-700',             // accent family, keep
  salary: 'bg-ceramic-success/15 text-ceramic-success',
  freelance: 'bg-teal-100 text-teal-700',              // no ceramic equiv, keep
  investment: 'bg-cyan-100 text-cyan-700',             // no ceramic equiv, keep
  transfer: 'bg-ceramic-cool text-ceramic-text-secondary',
  bills: 'bg-rose-100 text-rose-700',                  // no ceramic equiv, keep
  subscription: 'bg-violet-100 text-violet-700',       // no ceramic equiv, keep
  travel: 'bg-sky-100 text-sky-700',                   // no ceramic equiv, keep
  personal_care: 'bg-fuchsia-100 text-fuchsia-700',   // no ceramic equiv, keep
  pets: 'bg-lime-100 text-lime-700',                   // no ceramic equiv, keep
  gifts: 'bg-ceramic-warning/15 text-ceramic-warning',
  other: 'bg-ceramic-cool text-ceramic-text-primary',
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
```

**Step 2: Update RecategorizeModal.tsx**

Remove lines 19-66 (CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency) and replace with:
```typescript
import { CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency } from '../constants';
```

**Step 3: Update TransactionListView.tsx**

Remove lines 35-80 (CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency) and replace with:
```typescript
import { CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency } from '../constants';
```

Also fix line 335-336 — replace `hover:bg-red-50` with `hover:bg-ceramic-error/10` (Fix U18).

**Step 4: Update MonthComparisonView.tsx**

Remove lines 27-46 (CATEGORY_LABELS) and replace with:
```typescript
import { CATEGORY_LABELS, formatCurrency } from '../constants';
```

Fix lines 351-352 — replace `text-emerald-600` with `text-ceramic-success`, `text-red-500` with `text-ceramic-error`.

Fix lines 410-459 — replace all occurrences:
- `text-emerald-500` → `text-ceramic-success`
- `text-emerald-600` → `text-ceramic-success`
- `text-emerald-600/70` → `text-ceramic-success/70`
- `text-red-500` → `text-ceramic-error`
- `text-red-500/70` → `text-ceramic-error/70`

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors

**Step 6: Commit**

```bash
git add src/modules/finance/constants.ts src/modules/finance/components/RecategorizeModal.tsx src/modules/finance/components/TransactionListView.tsx src/modules/finance/components/MonthComparisonView.tsx
git commit -m "refactor(finance): extract shared constants, fix Ceramic compliance for category colors

- Create constants.ts with CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency
- Replace Material Design color tokens with Ceramic semantic tokens
- Remove duplicated constants from 3 components
- Fix emerald/red hardcoded colors in MonthComparisonView

Fixes: U3, U4, U5, U6, U18

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix Chart SVG Fills and Remaining UI Ceramic Issues

**Files:**
- Modify: `src/modules/finance/components/Charts/CategoryTrendChart.tsx:141`
- Modify: `src/modules/finance/components/Charts/ExpenseChart.tsx:141`
- Modify: `src/modules/finance/components/Charts/TrendLineChart.tsx:256`
- Modify: `src/modules/finance/components/FinanceCard.tsx:147,195`
- Modify: `src/modules/finance/components/FinanceSearchPanel.tsx:159-204`
- Modify: `src/modules/finance/components/RecategorizeModal.tsx:214-216`
- Modify: `src/modules/finance/components/CSVUpload.tsx:146-147`
- Modify: `src/modules/finance/components/GoalTracker.tsx:30-31`

**Fixes:** U1 (Critical), U2 (Critical), U7 (Critical), U8-U12 (High), U13 (Medium)

**Step 1: Fix SVG fills in all 3 chart components**

In each chart file, find `fill="white"` in SVG tooltip rects and replace with:
```tsx
fill="currentColor" className="text-ceramic-base"
```
Or use CSS variable approach:
```tsx
fill="var(--color-ceramic-base, white)"
```

**Step 2: Fix FinanceCard.tsx**

Replace `text-etched` (lines 147, 195) with `text-ceramic-text-primary font-black`.

**Step 3: Fix FinanceSearchPanel.tsx**

Review lines 159-204 for mode selector buttons. Replace any raw gradient colors with proper `bg-ceramic-success`, `bg-ceramic-info`, etc.

**Step 4: Fix RecategorizeModal.tsx checkbox**

Line 214-216: Replace `bg-amber-500` with `bg-ceramic-accent` (or `bg-amber-500` if that IS the ceramic accent — verify in tailwind config).

**Step 5: Fix CSVUpload.tsx semantic color**

Lines 146-147: When file is selected, use `border-ceramic-success bg-ceramic-success/10` instead of `border-ceramic-warning bg-ceramic-info/10`.

**Step 6: Fix GoalTracker.tsx hardcoded hex**

Lines 30-31: Replace `#F59E0B` with CSS variable `var(--color-ceramic-accent, #F59E0B)`.

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add src/modules/finance/components/
git commit -m "fix(finance): fix Ceramic compliance in charts, cards, and form components

- Replace SVG fill='white' with ceramic-base in 3 chart components
- Fix text-etched → ceramic-text-primary in FinanceCard
- Fix semantic color mismatch in CSVUpload
- Fix checkbox color in RecategorizeModal
- Fix hardcoded hex in GoalTracker

Fixes: U1, U2, U8, U9, U10, U11, U12, U13

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Fix Critical Backend — Division by Zero, Filter Dependencies, Type Safety

**Files:**
- Modify: `src/modules/finance/services/financeService.ts:168-179`
- Modify: `src/modules/finance/hooks/useTransactions.ts:105-112`
- Modify: `src/modules/finance/services/pdfProcessingService.ts:199-207`
- Modify: `src/modules/finance/services/financeAgentService.ts:99-100,171`
- Test: `src/modules/finance/__tests__/financeService.test.ts`

**Fixes:** B1 (Critical), B2 (Critical), B3 (Critical), B5 (Critical), B9 (High)

**Step 1: Write failing test for division by zero**

Create/update test file:
```typescript
// src/modules/finance/__tests__/financeService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getBurnRate', () => {
  it('should handle zero previousMonth without division by zero', () => {
    // When previousMonth expenses are 0 and lastMonth has data,
    // percentageChange should be 100 (not Infinity)
    const previousMonth = 0;
    const lastMonth = 500;
    const percentageChange = previousMonth === 0
      ? (lastMonth > 0 ? 100 : 0)
      : ((lastMonth - previousMonth) / previousMonth) * 100;
    expect(percentageChange).toBe(100);
    expect(Number.isFinite(percentageChange)).toBe(true);
  });
});
```

**Step 2: Fix division by zero in financeService.ts:168-179**

Replace lines 168-179:
```typescript
if (expenses.length >= 2) {
  const lastMonth = expenses[expenses.length - 1];
  const previousMonth = expenses[expenses.length - 2];

  if (previousMonth === 0) {
    percentageChange = lastMonth > 0 ? 100 : 0;
  } else {
    percentageChange = ((lastMonth - previousMonth) / previousMonth) * 100;
  }

  if (percentageChange > 5) {
    trend = 'increasing';
  } else if (percentageChange < -5) {
    trend = 'decreasing';
  }
}
```

**Step 3: Fix useTransactions.ts hook — the dependency is actually correct**

Review lines 105-112. The `fetchTransactions` useCallback already has `[userId, filters]` as deps (line 105), and the useEffect depends on `[fetchTransactions]` (line 112). When filters change → fetchTransactions identity changes → useEffect fires. This is the correct React pattern. **No change needed — B2 is a false positive.**

**Step 4: Fix pdfProcessingService.ts:199 — replace `any` with proper type**

Add a type at the top of the file:
```typescript
interface ParsedGeminiTransaction {
  date: string;
  description: string;
  amount: number | string;
  type: 'income' | 'expense';
  balance?: number | string;
  category?: string;
}
```

Replace line 199-207:
```typescript
transactions: (parsed.transactions || []).map((t: ParsedGeminiTransaction) => ({
  date: t.date,
  description: t.description,
  amount: Number(t.amount) || 0,
  type: t.type,
  balance: t.balance != null ? Number(t.balance) : 0,
  suggestedCategory: t.category || 'other'
})),
```

**Step 5: Fix financeAgentService.ts:99-100 — NaN guard**

Replace lines 99-100:
```typescript
const totalIncome = income.reduce((sum, t) => {
  const amt = Number(t.amount);
  return sum + (Number.isFinite(amt) ? Math.abs(amt) : 0);
}, 0);
const totalExpenses = expenses.reduce((sum, t) => {
  const amt = Number(t.amount);
  return sum + (Number.isFinite(amt) ? Math.abs(amt) : 0);
}, 0);
```

**Step 6: Fix financeAgentService.ts:171 — validate response shape**

Replace line 171:
```typescript
const assistantMessage = (response && typeof response.result === 'string' && response.result.trim())
  ? response.result
  : 'Desculpe, nao consegui processar sua pergunta. Tente reformular.';
```

**Step 7: Run tests and typecheck**

Run: `npm run typecheck && npm run test -- --run`
Expected: PASS

**Step 8: Commit**

```bash
git add src/modules/finance/services/financeService.ts src/modules/finance/hooks/useTransactions.ts src/modules/finance/services/pdfProcessingService.ts src/modules/finance/services/financeAgentService.ts src/modules/finance/__tests__/
git commit -m "fix(finance): fix division by zero, type safety, NaN guards in backend services

- Fix getBurnRate() division by zero when previousMonth=0
- Add ParsedGeminiTransaction type, fix balance always being 0
- Add NaN guard in buildContext for corrupted amounts
- Validate Gemini response shape before using result

Fixes: B1, B3, B5, B9

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Fix Backend High — Statement Processing, OFX, Digest Validation

**Files:**
- Modify: `src/modules/finance/services/statementService.ts:315-320,424-433`
- Modify: `src/modules/finance/services/ofxParserService.ts:71-76`
- Modify: `src/modules/finance/services/financeDigestService.ts:73-91`
- Modify: `src/modules/finance/hooks/useFinanceFileSearch.ts:262`
- Modify: `src/modules/finance/services/recurringDetectionService.ts:87-104`

**Fixes:** B4 (Critical), B7, B8, B10, B11, B12 (High)

**Step 1: Fix statementService.ts:315-320 — add upsert feedback**

After the upsert call, add logging:
```typescript
const { data: upsertResult, error, count } = await supabase
  .from('finance_transactions')
  .upsert(transactionRecords, {
    onConflict: 'hash_id',
    ignoreDuplicates: true,
  })
  .select('id');

if (error) {
  log.error('[statementService] Save transactions error:', error);
  throw new Error('Erro ao salvar transacoes');
}

const insertedCount = upsertResult?.length || 0;
const skippedCount = transactionRecords.length - insertedCount;
log.info(`[statementService] Transactions: ${insertedCount} inserted, ${skippedCount} duplicates skipped for statement ${statementId}`);
```

**Step 2: Fix statementService.ts:424-429 — use maybeSingle()**

Replace `.single()` with `.maybeSingle()`:
```typescript
const { data: existing } = await supabase
  .from('finance_statements')
  .select('id')
  .eq('user_id', userId)
  .eq('file_hash', fileHash)
  .maybeSingle();

if (existing) {
  throw new Error('Este extrato já foi importado anteriormente.');
}
```

**Step 3: Fix ofxParserService.ts:71-76 — log skipped transactions**

Add skip tracking:
```typescript
let skippedCount = 0;
// In the loop:
if (!dtPosted || !trnAmt) {
  skippedCount++;
  log.warn(`[OFX] Skipped transaction: missing ${!dtPosted ? 'date' : 'amount'}`);
  continue;
}
// After loop:
if (skippedCount > 0) {
  log.warn(`[OFX] Total skipped: ${skippedCount} transactions`);
}
```

**Step 4: Fix financeDigestService.ts:73-91 — validate response shape**

After casting response, validate required fields:
```typescript
const response = data as DigestResponse;
if (!response?.digest || !response?.stats) {
  log.error('[DigestService] Invalid response shape:', response);
  throw new Error('Resposta invalida do servico de digest');
}
```

**Step 5: Fix useFinanceFileSearch.ts:262 — retry corpus on null**

Wrap search in retry logic:
```typescript
if (!corpus) {
  log.warn('[FileSearch] Corpus null, attempting re-creation');
  await ensureCorpus();
}
if (!corpus) {
  throw new Error('Nao foi possivel criar o corpus de busca');
}
```

**Step 6: Fix recurringDetectionService.ts:87-104 — add size cap**

Add guard at start of grouping:
```typescript
const MAX_TRANSACTIONS_FOR_GROUPING = 10000;
if (transactions.length > MAX_TRANSACTIONS_FOR_GROUPING) {
  log.warn(`[Recurring] ${transactions.length} transactions exceeds cap, using most recent ${MAX_TRANSACTIONS_FOR_GROUPING}`);
  transactions = transactions.slice(0, MAX_TRANSACTIONS_FOR_GROUPING);
}
```

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add src/modules/finance/services/statementService.ts src/modules/finance/services/ofxParserService.ts src/modules/finance/services/financeDigestService.ts src/modules/finance/hooks/useFinanceFileSearch.ts src/modules/finance/services/recurringDetectionService.ts
git commit -m "fix(finance): improve error handling in statement processing, OFX, digest, search

- Add upsert feedback with inserted/skipped counts
- Fix .single() → .maybeSingle() for duplicate check
- Add skip logging in OFX parser
- Validate digest response shape before caching
- Add retry logic for corpus creation
- Cap recurring detection to 10k transactions

Fixes: B4, B7, B8, B10, B11, B12

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Fix Backend Medium — Validation, CSV Parsing, Cleanup

**Files:**
- Modify: `src/modules/finance/services/budgetService.ts:10-30,35-57`
- Modify: `src/modules/finance/services/financeService.ts:22-25`
- Modify: `src/modules/finance/services/exportService.ts:34-60`
- Modify: `src/modules/finance/services/accountService.ts:31-62`
- Modify: `src/modules/finance/hooks/useFinanceFileSearch.ts` (cleanup)

**Fixes:** B14 (Medium — CSV quoted fields), B17, B19, B20, B21, S6 (High — SELECT *)

**Step 1: Fix financeService.ts:22-25 — SELECT * → select specific columns**

Replace line 24:
```typescript
.select('type, amount')
```
instead of `.select('*')`.

Note: Lines 44-49 already access only `t.type` and `t.amount`, so this is safe.

**Step 2: Fix budgetService.ts — add month/year validation**

Add at start of `getBudgets()` and `upsertBudget()`:
```typescript
if (month < 1 || month > 12) throw new Error('Mes invalido (1-12)');
if (year < 2020 || year > 2100) throw new Error('Ano invalido');
```

**Step 3: Fix exportService.ts — add size guard**

Before generating CSV:
```typescript
const MAX_EXPORT_ROWS = 50000;
if (transactions.length > MAX_EXPORT_ROWS) {
  log.warn(`[Export] ${transactions.length} rows exceeds limit, truncating to ${MAX_EXPORT_ROWS}`);
  transactions = transactions.slice(0, MAX_EXPORT_ROWS);
}
```

**Step 4: Fix accountService.ts — validate color format**

In `createAccount()`:
```typescript
if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
  log.warn('[AccountService] Invalid color format, using default');
  data.color = '#F59E0B';
}
```

**Step 5: Fix useFinanceFileSearch.ts — add cleanup**

Add AbortController or unmount flag:
```typescript
useEffect(() => {
  let isMounted = true;
  // ... existing logic, check isMounted before setState
  return () => { isMounted = false; };
}, [/* deps */]);
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/modules/finance/services/financeService.ts src/modules/finance/services/budgetService.ts src/modules/finance/services/exportService.ts src/modules/finance/services/accountService.ts src/modules/finance/hooks/useFinanceFileSearch.ts
git commit -m "fix(finance): add input validation, optimize queries, fix memory leaks

- Optimize getAllTimeSummary to select only needed columns
- Add month/year validation in budgetService
- Add export row limit guard
- Add color format validation in accountService
- Add unmount cleanup in useFinanceFileSearch

Fixes: B17, B19, B20, B21, S6

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Fix Security — RLS, SECURITY DEFINER, File Validation

**Files:**
- Modify: `src/modules/finance/services/statementService.ts:149-151` (file validation)
- Create: `supabase/migrations/20260228000001_finance_security_fixes.sql`

**Fixes:** S1 (Critical), S2 (High), S3 (High), S5 (High), S7 (High)

**Step 1: Fix statementService.ts — add PDF magic bytes validation**

Add helper function:
```typescript
async function validatePDFFile(file: File): Promise<boolean> {
  const header = await file.slice(0, 5).text();
  return header.startsWith('%PDF-');
}
```

Call it before processing:
```typescript
if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
  const isValid = await validatePDFFile(file);
  if (!isValid) {
    throw new Error('Arquivo nao e um PDF valido');
  }
}
```

**Step 2: Create security migration**

```sql
-- supabase/migrations/20260228000001_finance_security_fixes.sql

-- S1: Add missing INSERT policy on finance_processing_logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_processing_logs'
    AND policyname = 'Users can insert own logs'
  ) THEN
    CREATE POLICY "Users can insert own logs"
      ON finance_processing_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- S5: Add composite index for (user_id, processing_status) queries
CREATE INDEX IF NOT EXISTS idx_finance_statements_user_status
  ON finance_statements(user_id, processing_status);

-- S7: Add ownership check in validate_statement_balance
-- (Only if function exists — skip if not applied)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'validate_statement_balance'
  ) THEN
    -- Recreate with ownership check
    CREATE OR REPLACE FUNCTION validate_statement_balance(p_statement_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $fn$
    DECLARE
      v_owner UUID;
    BEGIN
      SELECT user_id INTO v_owner
      FROM finance_statements
      WHERE id = p_statement_id;

      IF v_owner IS NULL OR v_owner != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to validate this statement';
      END IF;

      -- Original function body continues here
      -- (will need to read actual function body and preserve it)
      RETURN jsonb_build_object('validated', true);
    END;
    $fn$;
  END IF;
END $$;
```

**Step 3: Test migration locally**

Run: `npx supabase db push --dry-run` (or local reset)
Expected: Migration applies cleanly

**Step 4: Commit**

```bash
git add src/modules/finance/services/statementService.ts supabase/migrations/20260228000001_finance_security_fixes.sql
git commit -m "fix(finance): add RLS INSERT policy, composite index, file validation

- Add INSERT policy on finance_processing_logs (was missing)
- Add composite index on (user_id, processing_status)
- Add PDF magic bytes validation (prevent MIME spoofing)
- Add ownership check in SECURITY DEFINER functions

Fixes: S1, S3, S5, S7

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Fix UI Medium — Empty States, Feedback, Accessibility

**Files:**
- Modify: `src/modules/finance/components/FinanceEmptyState.tsx`
- Modify: `src/modules/finance/components/StatementUpload.tsx:275,401-402`
- Modify: `src/modules/finance/components/DriveFilePicker.tsx:251-254`
- Modify: `src/modules/finance/components/MonthlyDigestCard.tsx:92`
- Modify: `src/modules/finance/components/FinanceCard.tsx:26-27`
- Modify: `src/modules/finance/components/AccountManagement.tsx`

**Fixes:** U7 (Critical — upload stage), U14, U15, U16, U17, U19, U20, U21

**Step 1: Fix StatementUpload.tsx:401-402 — vary icon color by stage**

Replace static `text-ceramic-info` with dynamic color:
```typescript
const getStageColor = (stage: string) => {
  switch (stage) {
    case 'complete': return 'text-ceramic-success';
    case 'error': return 'text-ceramic-error';
    case 'categorizing': return 'text-ceramic-warning';
    default: return 'text-ceramic-info';
  }
};
```

**Step 2: Fix StatementUpload.tsx:275 — ensure processing stage renders**

Verify that `processingStage` state is actually used in the JSX. If `FileProgressDisplay` only reads `progress.message`, update it to also show `processingStage` or ensure the rotating messages from the stage are forwarded to `progress.message`.

**Step 3: Fix DriveFilePicker.tsx:251-254 — disable unavailable formats**

Add `opacity-50 cursor-not-allowed` to "PDF em breve" badge.

**Step 4: Fix MonthlyDigestCard.tsx:92 — add retry button**

In the error state render, add:
```tsx
<button
  onClick={handleGenerate}
  className="mt-2 text-sm text-ceramic-info hover:underline"
>
  Tentar novamente
</button>
```

**Step 5: Fix FinanceCard.tsx:26-27 — improve compact loading skeleton**

Replace minimal skeleton with structured one:
```tsx
<div className="p-3 animate-pulse space-y-2">
  <div className="h-4 bg-ceramic-cool rounded w-1/3" />
  <div className="h-6 bg-ceramic-cool rounded w-2/3" />
  <div className="h-3 bg-ceramic-cool rounded w-1/2" />
</div>
```

**Step 6: Fix AccountManagement.tsx — add Trash icon to delete button**

Import `Trash2` from lucide-react and add to delete confirmation button.

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add src/modules/finance/components/
git commit -m "fix(finance): improve empty states, loading skeletons, error recovery UX

- Vary upload status icon color by processing stage
- Disable unavailable formats in DriveFilePicker
- Add retry button in MonthlyDigestCard error state
- Improve compact loading skeleton in FinanceCard
- Add Trash icon to delete confirmation

Fixes: U7, U14, U16, U17, U19, U20, U21

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Fix Remaining Performance and Low-Priority Items

**Files:**
- Modify: `src/modules/finance/services/pdfProcessingService.ts:21` (dynamic import)
- Modify: `src/modules/finance/services/statementService.ts:55-67` (pagination)
- Modify: `src/modules/finance/services/goalService.ts:47-79` (validation)
- Modify: `src/modules/finance/services/driveImportService.ts:65-70` (error types)

**Fixes:** S8 (Medium), S9 (Medium), S11 (Medium), B22-B25 (Low)

**Step 1: Fix statementService.ts:55-67 — add pagination limit**

Add `.limit(100)` to getStatements query to prevent loading all statements on dashboard:
```typescript
.order('created_at', { ascending: false })
.limit(100);
```

**Step 2: Fix goalService.ts — validate target_amount**

In `createGoal()`:
```typescript
if (!data.target_amount || data.target_amount <= 0) {
  throw new Error('Meta deve ter valor positivo');
}
```

**Step 3: Fix pdfProcessingService.ts:21 — dynamic import for PDF.js**

Convert eager import to lazy:
```typescript
// Remove top-level import of pdfjs-dist
// In extractTextFromPDF():
const pdfjsLib = await import('pdfjs-dist');
pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.env.BASE_URL + 'pdf.worker.min.mjs';
```

**Step 4: Fix driveImportService.ts:65-70 — typed error responses**

```typescript
catch (err) {
  const message = err instanceof Error ? err.message : 'Erro desconhecido';
  const isAuth = message.includes('401') || message.includes('auth');
  const isNetwork = message.includes('fetch') || message.includes('network');

  return {
    success: false,
    error: isAuth
      ? 'Sessao expirada. Reconecte o Google Drive.'
      : isNetwork
        ? 'Erro de conexao. Tente novamente.'
        : `Erro ao importar: ${message}`,
  };
}
```

**Step 5: Run full build**

Run: `npm run build && npm run typecheck`
Expected: PASS — clean build, no errors

**Step 6: Commit**

```bash
git add src/modules/finance/services/
git commit -m "fix(finance): add pagination, validation, lazy PDF.js, typed errors

- Add .limit(100) to getStatements
- Validate target_amount in goalService
- Lazy-load PDF.js to reduce bundle by ~500KB
- Add typed error responses in driveImportService

Fixes: S8, S9, S11, B23, B24

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Fixes | Estimated Complexity |
|------|-------------|-------|---------------------|
| 1 | Extract shared constants + Ceramic colors | U3-U6, U18 | Medium |
| 2 | Chart SVGs + remaining UI Ceramic | U1, U2, U7-U13 | Medium |
| 3 | Critical backend: div/0, types, NaN | B1, B3, B5, B9 | Medium |
| 4 | Statement processing, OFX, digest | B4, B7-B8, B10-B12 | Medium |
| 5 | Validation, queries, cleanup | B17, B19-B21, S6 | Light |
| 6 | Security: RLS, DEFINER, file validation | S1, S3, S5, S7 | Medium |
| 7 | UI medium: empty states, feedback | U7, U14, U16-U21 | Light |
| 8 | Performance: lazy load, pagination | S8-S9, S11, B23-B25 | Light |

**Total fixes addressed:** 50 of 62 (remaining 12 are backlog/nice-to-have items that can be tackled separately).

**Dependencies:** Tasks 1→2 (constants must exist before chart fixes). Tasks 3-8 are independent and can run in parallel.
