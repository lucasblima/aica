# fix-finance-csv-pdf-ux Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 Finance bugs (CSV parsing #749, PDF upload 401 #750, UX/period/cedilla #751) and redesign FinanceDashboard with compact hybrid layout.

**Architecture:** Bug fixes are isolated changes in csvParserService, edgeFunctionService, and text corrections. The UX redesign replaces the current FinanceDashboard "history" view with a compact header + summary cards + category-grouped transaction list, while preserving existing tab navigation and sub-views.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Ceramic Design System, Vitest

---

## Task 1: Fix CSV Column Matching (Issue #749)

**Files:**
- Modify: `src/modules/finance/services/csvParserService.ts:179-213`

**Context:** The `detectFormat` method (line 179) lowercases the raw header string and checks `header.includes(dateCol)`. This works for Nubank (`date,title,amount`) but fails for CSVs where column names contain accents (e.g. `Descrição`) because the lowercase check `header.includes('descrição')` matches correctly BUT the actual issue is that the Inter format expects semicolons AND a "Saldo" column. A CSV with `Data,Valor,Identificador,Descrição` (comma-delimited, no Saldo) matches Inter's date+desc columns in the raw string, gets assigned Inter format, but then `getColumnIndices` fails because it expects semicolon-delimited parsing.

The `buildGenericFormat` fallback (line 219) already handles this case correctly with accent-aware aliases, but it never gets reached because `detectFormat` incorrectly matches Inter first (since `header.includes('data')` and `header.includes('descrição')` both match in the lowercased raw string).

**Step 1: Write failing test**

Create file `src/modules/finance/services/__tests__/csvParserService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CSVParserService } from '../csvParserService';

describe('CSVParserService', () => {
  const parser = new CSVParserService();

  describe('parseCSV - generic comma-delimited CSV with accented columns', () => {
    it('should parse CSV with Data,Valor,Identificador,Descrição columns', async () => {
      const csvContent = 'Data,Valor,Identificador,Descrição\n2025-01-15,-120.50,ABC123,Compra no mercado\n2025-01-16,5200.00,DEF456,Salário\n';
      const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' });

      const result = await parser.parseCSV(file);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].description).toBe('Compra no mercado');
      expect(result.transactions[0].amount).toBe(120.50);
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[1].amount).toBe(5200.00);
      expect(result.transactions[1].type).toBe('income');
    });

    it('should parse CSV with semicolon delimiter and Brazilian date format', async () => {
      const csvContent = 'Data;Valor;Descrição\n15/01/2025;-120,50;Compra no mercado\n16/01/2025;5200,00;Salário\n';
      const file = new File([csvContent], 'extrato.csv', { type: 'text/csv' });

      const result = await parser.parseCSV(file);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].date).toBe('2025-01-15');
      expect(result.transactions[0].amount).toBe(120.50);
    });

    it('should still correctly detect Nubank format', async () => {
      const csvContent = 'date,title,amount\n2025-01-15,Compra no mercado,-120.50\n';
      const file = new File([csvContent], 'nubank.csv', { type: 'text/csv' });

      const result = await parser.parseCSV(file);

      expect(result.bankName).toBe('Nubank');
      expect(result.transactions).toHaveLength(1);
    });

    it('should still correctly detect Inter format', async () => {
      const csvContent = 'Data;Descrição;Valor;Saldo\n15/01/2025;Compra no mercado;-120,50;1000,00\n';
      const file = new File([csvContent], 'inter.csv', { type: 'text/csv' });

      const result = await parser.parseCSV(file);

      expect(result.bankName).toBe('Banco Inter');
      expect(result.transactions).toHaveLength(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/finance/services/__tests__/csvParserService.test.ts`
Expected: FAIL on first test — the parser will match Inter format (wrong delimiter) and fail in getColumnIndices.

**Step 3: Fix detectFormat to verify delimiter match**

In `csvParserService.ts`, modify `detectFormat` (lines 179-213). The fix: before matching a known format, verify that the header actually uses the format's delimiter. If the format expects `;` but the header uses `,`, skip that format.

Replace lines 187-199 with:

```typescript
    // Detect by header columns — try known bank formats first
    for (const format of KNOWN_FORMATS) {
      // Verify delimiter match: if format expects ';' but header has more ',' than ';', skip
      const semicolonCount = (headerRaw.match(/;/g) || []).length;
      const commaCount = (headerRaw.match(/,/g) || []).length;
      const actualDelimiter = semicolonCount > commaCount ? ';' : ',';

      if (actualDelimiter !== format.delimiter) continue;

      const dateCol = typeof format.columns.date === 'string'
        ? format.columns.date.toLowerCase()
        : format.columns.date;
      const descCol = typeof format.columns.description === 'string'
        ? format.columns.description.toLowerCase()
        : format.columns.description;

      if (typeof dateCol === 'string' && typeof descCol === 'string') {
        // Parse header columns for accurate matching
        const headerCols = headerRaw.split(format.delimiter).map(c => c.trim().replace(/^["']|["']$/g, '').toLowerCase());
        if (headerCols.includes(dateCol) && headerCols.includes(descCol)) {
          return format;
        }
      }
    }
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/finance/services/__tests__/csvParserService.test.ts`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add src/modules/finance/services/__tests__/csvParserService.test.ts src/modules/finance/services/csvParserService.ts
git commit -m "$(cat <<'EOF'
fix(finance): CSV parser now validates delimiter before matching bank format (#749)

The detectFormat method was matching Banco Inter format for comma-delimited
CSVs because it checked column names in the raw header string. Now it
verifies the actual delimiter matches the expected format delimiter before
attempting column matching, allowing the generic fallback to handle
non-standard CSV layouts correctly.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Fix PDF Upload 401 — Token Refresh on Auth Error (Issue #750)

**Files:**
- Modify: `src/services/edgeFunctionService.ts:180-249`

**Context:** `callGeminiEdgeFunction` uses `getCachedSession()` which has a 2s TTL cache. If the token expired between cache and Edge Function call, the function returns 401. There is no retry logic in `callGeminiEdgeFunction` (unlike `invokeEdgeFunction` which accepts `retryCount`). The fix: detect 401/auth errors and retry once with a fresh (non-cached) session.

**Step 1: Write failing test**

Create file `src/services/__tests__/edgeFunctionService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase and auth cache before imports
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/services/authCacheService', () => ({
  getCachedSession: vi.fn(),
  invalidateAuthCache: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { callGeminiEdgeFunction } from '../edgeFunctionService';
import { supabase } from '@/services/supabaseClient';
import { getCachedSession, invalidateAuthCache } from '@/services/authCacheService';

describe('callGeminiEdgeFunction', () => {
  const mockSession = { access_token: 'valid-token-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCachedSession as any).mockResolvedValue({ session: mockSession, error: null });
  });

  it('should retry with fresh session on FunctionsHttpError (401)', async () => {
    const freshSession = { access_token: 'fresh-token-456' };

    // First call: 401 error
    const httpError = new Error('Edge Function returned a non-2xx status code');
    httpError.name = 'FunctionsHttpError';
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({ data: null, error: httpError })
      // Second call: success with fresh token
      .mockResolvedValueOnce({
        data: { success: true, result: { parsed: true } },
        error: null,
      });

    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: freshSession },
      error: null,
    });

    const result = await callGeminiEdgeFunction('parse_statement', { rawText: 'test' });

    expect(result).toEqual({ parsed: true });
    expect(invalidateAuthCache).toHaveBeenCalled();
    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it('should throw if retry also fails', async () => {
    const httpError = new Error('Edge Function returned a non-2xx status code');
    httpError.name = 'FunctionsHttpError';
    (supabase.functions.invoke as any)
      .mockResolvedValueOnce({ data: null, error: httpError })
      .mockResolvedValueOnce({ data: null, error: httpError });

    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    });

    await expect(
      callGeminiEdgeFunction('parse_statement', { rawText: 'test' })
    ).rejects.toThrow('Edge Function error');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/edgeFunctionService.test.ts`
Expected: FAIL — current code doesn't retry on 401.

**Step 3: Add retry-on-401 logic to callGeminiEdgeFunction**

In `edgeFunctionService.ts`, modify `callGeminiEdgeFunction` (lines 180-249):

Add import at top of file (after existing imports):

```typescript
import { getCachedSession, invalidateAuthCache } from './authCacheService'
```

Note: `getCachedSession` is already imported. Add `invalidateAuthCache` to the existing import.

Replace the error handling block (lines 213-216) with retry logic:

```typescript
    if (error) {
      // Detect auth errors (401) — retry once with fresh session
      const isAuthError = error.name === 'FunctionsHttpError'
        || error.message?.includes('401')
        || error.message?.includes('non-2xx');

      if (isAuthError) {
        log.warn(`[EdgeFunction] Auth error for action "${action}", retrying with fresh session`);
        invalidateAuthCache();

        const { data: freshData } = await supabase.auth.getSession();
        if (freshData.session?.access_token) {
          const { data: retryData, error: retryError } = await supabase.functions.invoke('gemini-chat', {
            body,
            headers: {
              Authorization: `Bearer ${freshData.session.access_token}`
            }
          });

          if (retryError) {
            log.error(`[EdgeFunction] Retry failed for action "${action}":`, { error: retryError });
            throw new Error(`Edge Function error: ${retryError.message || 'Unknown error'}`);
          }

          if (!retryData || !(retryData as EdgeFunctionResponse).success) {
            throw new Error('Edge Function returned no data or success: false after retry');
          }

          const retryResponse = retryData as EdgeFunctionResponse<T>;
          return {
            ...retryResponse.result,
            ...(retryResponse.usageMetadata && { __usageMetadata: retryResponse.usageMetadata })
          } as T & { __usageMetadata?: EdgeFunctionResponse['usageMetadata'] };
        }
      }

      log.error(`[EdgeFunction] Error calling action "${action}":`, { error });
      throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
    }
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/edgeFunctionService.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/services/__tests__/edgeFunctionService.test.ts src/services/edgeFunctionService.ts
git commit -m "$(cat <<'EOF'
fix(finance): retry Edge Function call with fresh session on 401 (#750)

When gemini-chat returns a FunctionsHttpError (typically 401 from expired
token), the service now invalidates the auth cache, gets a fresh session,
and retries once before failing. This prevents PDF upload failures caused
by stale cached tokens.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Fix Cedilha — "Financas" to "Financas" Everywhere

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx:610`
- Modify: `src/modules/finance/views/FinanceDashboard.tsx:63-68` (VIEW_TABS labels)
- Modify: `src/modules/finance/components/FinanceEmptyState.tsx:56`
- Modify: `src/modules/finance/services/financeAgentService.ts:216,354`

**Step 1: Fix all occurrences**

`FinanceDashboard.tsx` line 610:
```
- Financas
+ Finanças
```

`FinanceDashboard.tsx` VIEW_TABS lines 63-68 — fix labels missing accents:
```
- { key: 'history', label: 'Visao Geral', icon: BarChart3 },
- { key: 'transactions', label: 'Transacoes', icon: List },
- { key: 'budget', label: 'Orcamento', icon: Target },
+ { key: 'history', label: 'Visão Geral', icon: BarChart3 },
+ { key: 'transactions', label: 'Transações', icon: List },
+ { key: 'budget', label: 'Orçamento', icon: Target },
```

`FinanceEmptyState.tsx` line 56:
```
- Organize suas financas de forma inteligente. Importe seus extratos,
- configure orcamentos e deixe a IA trabalhar por voce.
+ Organize suas finanças de forma inteligente. Importe seus extratos,
+ configure orçamentos e deixe a IA trabalhar por você.
```

`financeAgentService.ts` line 216:
```
- Use estas informacoes para responder as perguntas do usuario sobre suas financas.
+ Use estas informações para responder as perguntas do usuário sobre suas finanças.
```

`financeAgentService.ts` line 354:
```
- Identifique oportunidades de economia nas minhas financas.
+ Identifique oportunidades de economia nas minhas finanças.
```

Also fix other missing accents found in FinanceDashboard.tsx while touching the file:
- Line 607: `Modulo` -> `Módulo`
- Line 690: `Visao consolidada` -> `Visão consolidada`
- Line 712: `transacoes processadas` -> `transações processadas`
- Line 930: `transacao` / `transacoes` -> `transação` / `transações`

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx src/modules/finance/components/FinanceEmptyState.tsx src/modules/finance/services/financeAgentService.ts
git commit -m "$(cat <<'EOF'
fix(finance): add missing Portuguese accents throughout Finance module (#751)

Fixes "Financas" -> "Finanças", "Transacoes" -> "Transações",
"Orcamento" -> "Orçamento", "Visao" -> "Visão", and other
missing cedillas and accents in user-facing strings.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Fix Period Navigation — Year-Agnostic Month Selector (Issue #751)

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx:326-456` (monthlyData logic)
- Modify: `src/modules/finance/views/FinanceDashboard.tsx:604-633` (header section)

**Context:** The dashboard hardcodes `currentYear` (line 327) and generates 12 months for only that year. Jan 2025 data uploaded from 2026 is invisible. The fix: replace fixed 12-month grid with a month/year selector that navigates all available data.

**Step 1: Add state for selected period**

In FinanceDashboard component (after line 98), add:

```typescript
const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
```

**Step 2: Compute available months from statements**

Replace the `monthlyData` useMemo (lines 326-456) with year-aware logic:

```typescript
  // Compute all available year-months from statements
  const availableMonths = useMemo(() => {
    if (!statements || statements.length === 0) return [];

    const months = new Set<string>();
    statements.forEach((s) => {
      if (s.statement_period_start) {
        const [y, m] = s.statement_period_start.split('-');
        months.add(`${y}-${m}`);
      }
    });

    return Array.from(months)
      .map(key => {
        const [y, m] = key.split('-');
        return { year: parseInt(y), month: parseInt(m) };
      })
      .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  }, [statements]);

  // Filtered data for the selected month
  const selectedMonthTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => {
      const d = new Date(t.transaction_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  }, [allTransactions, selectedYear, selectedMonth]);

  // Summary for selected month
  const selectedMonthSummary = useMemo(() => {
    const income = selectedMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = selectedMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses, count: selectedMonthTransactions.length };
  }, [selectedMonthTransactions]);
```

**Step 3: Replace header with compact period selector**

Replace lines 604-633 (the header section) with:

```tsx
      {/* Compact Header */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-black text-ceramic-text-primary text-etched">
          Finanças
        </h1>

        {/* Period Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const prev = selectedMonth === 1
                ? { month: 12, year: selectedYear - 1 }
                : { month: selectedMonth - 1, year: selectedYear };
              setSelectedMonth(prev.month);
              setSelectedYear(prev.year);
            }}
            className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
          </button>

          <span className="text-sm font-bold text-ceramic-text-primary min-w-[100px] text-center">
            {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][selectedMonth - 1]} {selectedYear}
          </span>

          <button
            onClick={() => {
              const next = selectedMonth === 12
                ? { month: 1, year: selectedYear + 1 }
                : { month: selectedMonth + 1, year: selectedYear };
              setSelectedMonth(next.month);
              setSelectedYear(next.year);
            }}
            className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary rotate-180" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={toggleVisibility}
            className="ceramic-concave p-2 hover:scale-95 transition-transform"
            title={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {isValuesVisible ? (
              <EyeOff className="w-4 h-4 text-ceramic-text-secondary" />
            ) : (
              <Eye className="w-4 h-4 text-ceramic-text-secondary" />
            )}
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="ceramic-card p-2 hover:scale-105 transition-transform"
            title="Upload de Extrato"
          >
            <Upload className="w-4 h-4 text-ceramic-text-primary" />
          </button>
        </div>
      </div>
```

**Step 4: Add compact summary cards below header**

After the header div, add summary cards:

```tsx
      {/* Summary Cards */}
      {hasData && (
        <div className="px-6 pb-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="ceramic-tray p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Receita</p>
              <p className="text-lg font-black text-ceramic-success">
                {formatCurrency(selectedMonthSummary.income)}
              </p>
            </div>
            <div className="ceramic-tray p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Despesa</p>
              <p className="text-lg font-black text-ceramic-error">
                {formatCurrency(selectedMonthSummary.expenses)}
              </p>
            </div>
            <div className="ceramic-tray p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary">Saldo</p>
              <p className={`text-lg font-black ${selectedMonthSummary.balance >= 0 ? 'text-ceramic-positive' : 'text-ceramic-negative'}`}>
                {formatCurrency(selectedMonthSummary.balance)}
              </p>
            </div>
          </div>
        </div>
      )}
```

**Step 5: Update loadData to fetch all transactions (not just 6 months)**

In `loadData` function (line 124), change the date range to cover all time so that navigating to Jan 2025 has data:

```typescript
      // Use the earliest statement period or 2 years back
      const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
      const trendStart = twoYearsAgo.toISOString().split('T')[0];
```

**Step 6: Verify build**

Run: `npx tsc --noEmit && npx vite build`
Expected: Build passes.

**Step 7: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "$(cat <<'EOF'
feat(finance): add month/year period navigation to dashboard (#751)

Replace hardcoded current-year 12-month grid with a month/year
navigator that allows browsing all periods with data. Jan 2025
data is now accessible when viewing from 2026. Added compact
summary cards (income/expense/balance) for the selected period.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Handle Statements Missing period_start

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx` (monthlyData logic)

**Context:** Statements with null `statement_period_start` generate warnings and are excluded from navigation. The fix: infer period from associated transactions when period_start is null.

**Step 1: Add period inference in the statements processing**

In the `availableMonths` useMemo (from Task 4), after the forEach that processes statements with period_start, add fallback logic:

```typescript
    statements.forEach((s) => {
      if (s.statement_period_start) {
        const [y, m] = s.statement_period_start.split('-');
        months.add(`${y}-${m}`);
      } else if (allTransactions.length > 0) {
        // Infer period from transactions associated with this statement
        const stmtTransactions = allTransactions.filter(t => t.statement_id === s.id);
        if (stmtTransactions.length > 0) {
          const dates = stmtTransactions.map(t => new Date(t.transaction_date));
          const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
          const y = earliest.getFullYear().toString();
          const m = (earliest.getMonth() + 1).toString().padStart(2, '0');
          months.add(`${y}-${m}`);
          log.info('[FinanceDashboard] Inferred period for statement', s.id, `${y}-${m}`);
        } else {
          log.warn('[FinanceDashboard] Statement has no period_start and no transactions:', s.id);
        }
      }
    });
```

Update the useMemo dependency array to include `allTransactions`.

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "$(cat <<'EOF'
fix(finance): infer period from transactions for statements missing period_start (#751)

When a statement has no period_start, the dashboard now looks at
its associated transactions to determine the period. This ensures
imported statements that failed to extract dates are still visible
in the month navigator.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Compact Dashboard — Remove Redundant Sections

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx:670-999` (main content area)

**Context:** The current "history" view shows: (1) MonthlyDigest AI card, (2) budget alerts, (3) large summary card with 5xl balance, (4) charts, (5) goal tracker, (6) burn rate card, (7) 12-month grid calendar, (8) statement management. This is too much vertical space. The redesign: since we now have compact summary cards in the header, remove the large summary card. Keep charts, move the 12-month grid into a collapsible section, and simplify.

**Step 1: Simplify the history view content**

Remove the large "Resumo Financeiro" card (lines 682-747) since income/expense/balance is now shown in the compact header cards.

Remove the fixed 12-month grid calendar (lines 804-999) since the period navigator replaces it.

Keep:
- MonthlyDigestCard (AI insights)
- Budget alerts
- Charts (IncomeVsExpense, ExpenseChart, TrendLineChart)
- GoalTracker
- BurnRate (compact)
- Statement management (collapsible)

**Step 2: Verify build and visual**

Run: `npx vite build`
Expected: Build passes.

**Step 3: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "$(cat <<'EOF'
refactor(finance): remove redundant summary card and month grid from dashboard (#751)

The compact header cards and period navigator replace the large summary
section and fixed 12-month calendar grid, significantly reducing vertical
space usage while keeping all data accessible.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final Verification and Build

**Step 1: Run all Finance tests**

Run: `npx vitest run src/modules/finance/`
Expected: All tests PASS.

**Step 2: Run edge function service tests**

Run: `npx vitest run src/services/__tests__/edgeFunctionService.test.ts`
Expected: PASS.

**Step 3: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Run full build**

Run: `npx vite build`
Expected: Build succeeds.

**Step 5: Verify dev server**

Run: `npm run dev`
Navigate to Finance page, verify:
- Title shows "Finanças" (with cedilla)
- Period navigator works (can go to Jan 2025)
- Summary cards show income/expense/balance
- Upload CSV with `Data,Valor,Identificador,Descrição` columns works
- Layout is compact and elegant

**Step 6: Final commit if any adjustments needed, then push**

```bash
git push -u origin fix/fix-finance-csv-pdf-ux
```
