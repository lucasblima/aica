# Finance Redesign V2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Finance module from 6 scattered tabs to 5 purposeful tabs, surfacing hidden Financial Health scoring, real budget alerts, savings projections, bulk actions, and chart visualizations.

**Architecture:** Consolidate state into FinanceContext (with accounts). Reorganize views: Panorama (read-only status), Transações (browse + bulk), Orçamento (budget + goals + projections), Análise (charts + trends), Configuração (settings + data management). Reuse existing components that were built but never rendered (FinancialHealthCard, SavingsGoalProjection, CategoryTrendChart, LossFramingBanner).

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase + Ceramic Design System

**Design doc:** `docs/plans/2026-03-11-finance-redesign-v2-design.md`

---

## Phase 1: Foundation

### Task 1: Restore FinanceContext with accounts support

The FinanceContext file exists at `src/modules/finance/contexts/FinanceContext.tsx` but FinanceDashboard.tsx currently uses local state. We need to restore the context usage and add accounts.

**Files:**
- Modify: `src/modules/finance/contexts/FinanceContext.tsx`
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Step 1:** Read FinanceContext.tsx and verify it provides: selectedYear, selectedMonth, setSelectedYear, setSelectedMonth, categories, statements, refreshAll.

**Step 2:** Add accounts to FinanceContext:
```typescript
// Add to FinanceContextValue interface:
accounts: FinanceAccount[];
accountsLoading: boolean;
refreshAccounts: () => Promise<void>;

// Add to FinanceProvider:
const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
const [accountsLoading, setAccountsLoading] = useState(false);

const loadAccounts = async () => {
  setAccountsLoading(true);
  try {
    const data = await getAccounts(userId);
    setAccounts(data);
  } catch (err) {
    log.error('Failed to load accounts:', err);
  } finally {
    setAccountsLoading(false);
  }
};
```

Import `getAccounts` from `../services/accountService` and `FinanceAccount` from `../types`.

**Step 3:** Modify FinanceDashboard.tsx to use FinanceContext:
- Wrap component with `<FinanceProvider userId={userId}>`
- Replace local `useState` for selectedYear/selectedMonth/statements with `useFinanceContext()`
- Keep local state for: summary, burnRate, categoryBreakdown, allTransactions, loading, showUpload, etc.

**Step 4:** Run `npm run build && npm run typecheck` — verify no errors.

**Step 5:** Commit:
```bash
git add src/modules/finance/contexts/FinanceContext.tsx src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): restore FinanceContext with accounts support"
```

---

### Task 2: Change tab structure to 5 tabs

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Step 1:** Update the DashboardView type and VIEW_TABS:
```typescript
type DashboardView = 'panorama' | 'transactions' | 'budget' | 'analysis' | 'settings';

import { Settings } from 'lucide-react';

const VIEW_TABS: ViewTab[] = [
  { key: 'panorama', label: 'Panorama', icon: BarChart3 },
  { key: 'transactions', label: 'Transações', icon: List },
  { key: 'budget', label: 'Orçamento', icon: Target },
  { key: 'analysis', label: 'Análise', icon: GitCompare },
  { key: 'settings', label: 'Configuração', icon: Settings },
];
```

**Step 2:** Update `activeView` default from `'history'` to `'panorama'`.

**Step 3:** Update `renderSubView()` switch statement:
- `case 'panorama'`: return null (handled by main render below, same as old 'history')
- `case 'transactions'`: keep existing TransactionListView render
- `case 'budget'`: keep existing BudgetView render
- `case 'analysis'`: render MonthComparisonView (for now, will be enhanced in Phase 5)
- `case 'settings'`: render AccountManagement (for now, will be enhanced in Phase 6)
- Remove cases: 'comparison', 'goals', 'accounts'

**Step 4:** Update the main render condition from `activeView !== 'history'` to `activeView !== 'panorama'`.

**Step 5:** Run `npm run build && npm run typecheck`.

**Step 6:** Commit:
```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): restructure to 5 tabs — panorama, transactions, budget, analysis, settings"
```

---

### Task 3: Delete deprecated files

**Files:**
- Delete: `src/modules/finance/components/RecategorizeModal.tsx`
- Delete: `src/modules/finance/components/AccountSelector.tsx`
- Delete: `src/modules/finance/hooks/useFinanceStatements.ts`
- Delete: `src/modules/finance/services/financeAgentService.ts`

**Step 1:** Search for imports of each file across the codebase:
```bash
grep -r "RecategorizeModal" src/ --include="*.tsx" --include="*.ts" -l
grep -r "AccountSelector" src/ --include="*.tsx" --include="*.ts" -l
grep -r "useFinanceStatements" src/ --include="*.tsx" --include="*.ts" -l
grep -r "financeAgentService" src/ --include="*.tsx" --include="*.ts" -l
```

**Step 2:** Remove any import statements referencing these files from other files. If RecategorizeModal is imported somewhere, replace with RecategorizationReview or remove the import entirely.

**Step 3:** Delete the 4 files:
```bash
rm src/modules/finance/components/RecategorizeModal.tsx
rm src/modules/finance/components/AccountSelector.tsx
rm src/modules/finance/hooks/useFinanceStatements.ts
rm src/modules/finance/services/financeAgentService.ts
```

**Step 4:** Run `npm run build && npm run typecheck` — verify no broken imports.

**Step 5:** Commit:
```bash
git add -u
git commit -m "chore(finance): delete deprecated files — RecategorizeModal, AccountSelector, useFinanceStatements, financeAgentService"
```

---

## Phase 2: Panorama Tab

### Task 4: Surface Financial Health Score on Panorama

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Context:** `FinancialHealthCard` exists at `src/modules/finance/components/FinancialHealthCard.tsx`. It takes `{ result: FinancialHealthResult; trend?: 'improving' | 'stable' | 'declining' }`. The hook `useFinancialHealth()` at `src/modules/finance/hooks/useFinancialHealth.ts` returns `{ result, history, loading, error, compute, refresh }`.

**Step 1:** Add imports to FinanceDashboard.tsx:
```typescript
import { FinancialHealthCard } from '../components/FinancialHealthCard';
import { useFinancialHealth } from '../hooks/useFinancialHealth';
```

**Step 2:** Call the hook inside FinanceDashboardInner:
```typescript
const { result: healthResult, loading: healthLoading, compute: computeHealth } = useFinancialHealth();
```

**Step 3:** Trigger health computation after data loads. In `loadData()`, after setting summary/burnRate, call:
```typescript
// After all data loaded, compute financial health
if (summaryData && burnRateData) {
  computeHealth({
    monthlyIncome: summaryData.totalIncome / Math.max(statementsData.length, 1),
    monthlyExpenses: summaryData.totalExpenses / Math.max(statementsData.length, 1),
    billsOnTimeRate: 0.9, // default — no late bill tracking yet
    emergencyFundMonths: burnRateData.averageMonthlyExpense > 0
      ? summaryData.currentBalance / burnRateData.averageMonthlyExpense : 0,
    savingsRate: summaryData.totalIncome > 0
      ? (summaryData.totalIncome - summaryData.totalExpenses) / summaryData.totalIncome : 0,
    debtToIncomeRatio: 0, // no debt tracking yet
    creditUtilization: 0,
    hasInsurance: false,
    retirementSaving: false,
    hasEmergencyFund: summaryData.currentBalance > burnRateData.averageMonthlyExpense * 3,
  });
}
```

**Step 4:** Render FinancialHealthCard below summary cards, above charts:
```tsx
{/* Financial Health Score */}
{healthResult && (
  <FinancialHealthCard
    result={healthResult}
    trend={burnRate?.trend === 'decreasing' ? 'improving' : burnRate?.trend === 'increasing' ? 'declining' : 'stable'}
  />
)}
```

**Step 5:** Run `npm run build && npm run typecheck`.

**Step 6:** Commit:
```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): surface Financial Health Score on Panorama tab"
```

---

### Task 5: Surface LossFramingBanner and simplify Panorama

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Context:** `LossFramingBanner` at `src/modules/finance/components/LossFramingBanner.tsx` takes `{ todaySpend?, dailyBudget?, monthlySavings?, goalCurrent?, goalTarget?, mode? }`.

**Step 1:** Import LossFramingBanner:
```typescript
import { LossFramingBanner } from '../components/LossFramingBanner';
```

**Step 2:** Render below FinancialHealthCard, above charts:
```tsx
{/* Loss Framing — behavioral nudge */}
{selectedMonthSummary && (
  <LossFramingBanner
    monthlySavings={selectedMonthSummary.income - selectedMonthSummary.expenses}
    mode="savings"
  />
)}
```

**Step 3:** Remove from Panorama (move to other tabs later):
- Remove GoalTracker render (will go to Orçamento in Task 8)
- Remove Burn Rate card section (will go to Orçamento in Task 8)
- Remove TrendLineChart (will go to Análise in Task 10)
- Remove statement management section (expandable "Gerenciar Extratos" — will go to Configuração in Task 11)
- Remove File Search Panel (will go to Configuração in Task 11)

**Step 4:** Run `npm run build && npm run typecheck`.

**Step 5:** Commit:
```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): add LossFramingBanner, simplify Panorama — move GoalTracker, BurnRate, TrendLine, StatementMgmt to their new tabs"
```

---

## Phase 3: Transações Tab

### Task 6: Add bulk select and actions to TransactionListView

**Files:**
- Modify: `src/modules/finance/components/TransactionListView.tsx`

**Step 1:** Add state for bulk selection:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkAction, setBulkAction] = useState<'recategorize' | 'delete' | null>(null);
const [bulkCategory, setBulkCategory] = useState<string>('');
```

**Step 2:** Add "Select all" checkbox in header and per-row checkboxes:
```tsx
// Header — render when any transactions visible
<div className="flex items-center gap-2 mb-3">
  <input
    type="checkbox"
    checked={selectedIds.size === transactions.length && transactions.length > 0}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedIds(new Set(transactions.map(t => t.id)));
      } else {
        setSelectedIds(new Set());
      }
    }}
    className="rounded border-ceramic-border"
  />
  <span className="text-xs text-ceramic-text-secondary">
    {selectedIds.size > 0 ? `${selectedIds.size} selecionadas` : 'Selecionar tudo'}
  </span>
  {selectedIds.size > 0 && (
    <div className="flex gap-2 ml-auto">
      <button onClick={() => setBulkAction('recategorize')} className="text-xs px-3 py-1 bg-amber-500 text-white rounded-lg font-semibold">
        Re-categorizar
      </button>
      <button onClick={() => setBulkAction('delete')} className="text-xs px-3 py-1 bg-ceramic-error text-white rounded-lg font-semibold">
        Deletar
      </button>
    </div>
  )}
</div>

// Per-row checkbox (inside transaction row, before icon)
<input
  type="checkbox"
  checked={selectedIds.has(tx.id)}
  onChange={() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(tx.id)) next.delete(tx.id);
      else next.add(tx.id);
      return next;
    });
  }}
  className="rounded border-ceramic-border flex-shrink-0"
/>
```

**Step 3:** Add bulk action modals:
```tsx
{/* Bulk recategorize modal */}
{bulkAction === 'recategorize' && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="ceramic-card p-6 w-96 space-y-4">
      <h3 className="text-lg font-bold text-ceramic-text-primary">Re-categorizar {selectedIds.size} transações</h3>
      <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}
        className="w-full p-2 rounded-lg border border-ceramic-border bg-ceramic-base">
        <option value="">Selecione a categoria</option>
        {categories.filter(c => c.is_expense).map(c => (
          <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
        ))}
      </select>
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setBulkAction(null); setBulkCategory(''); }}
          className="px-4 py-2 text-sm text-ceramic-text-secondary">Cancelar</button>
        <button disabled={!bulkCategory} onClick={handleBulkRecategorize}
          className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg font-semibold disabled:opacity-50">
          Aplicar
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 4:** Implement handlers:
```typescript
const handleBulkRecategorize = async () => {
  const ids = Array.from(selectedIds);
  const { error } = await supabase
    .from('finance_transactions')
    .update({ category: bulkCategory })
    .in('id', ids);
  if (!error) {
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkCategory('');
    refresh(); // from useTransactions
  }
};

const handleBulkDelete = async () => {
  if (!confirm(`Deletar ${selectedIds.size} transações? Esta ação não pode ser desfeita.`)) return;
  const ids = Array.from(selectedIds);
  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .in('id', ids);
  if (!error) {
    setSelectedIds(new Set());
    setBulkAction(null);
    refresh();
  }
};
```

**Step 5:** Run `npm run build && npm run typecheck`.

**Step 6:** Commit:
```bash
git add src/modules/finance/components/TransactionListView.tsx
git commit -m "feat(finance): add bulk select, re-categorize, and delete to Transações tab"
```

---

### Task 7: Add account filter to TransactionListView

**Files:**
- Modify: `src/modules/finance/components/TransactionListView.tsx`
- Modify: `src/modules/finance/hooks/useTransactions.ts`

**Step 1:** Add `accountId` to the `useTransactions` hook filter:
```typescript
// In useTransactions.ts, add to filter params:
interface TransactionFilters {
  // existing fields...
  accountId?: string | null;
}

// In the query builder:
if (filters.accountId) {
  query = query.eq('account_id', filters.accountId);
}
```

**Step 2:** In TransactionListView, add account filter dropdown in the filter section:
```tsx
// Get accounts from context
const { accounts } = useFinanceContext();
const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

// In filters UI:
<select value={selectedAccountId || ''} onChange={e => setSelectedAccountId(e.target.value || null)}
  className="text-xs p-2 rounded-lg border border-ceramic-border bg-ceramic-base">
  <option value="">Todas as contas</option>
  {accounts.map(a => (
    <option key={a.id} value={a.id}>{a.name} ({a.bank_name})</option>
  ))}
</select>
```

**Step 3:** Pass `accountId` to `useTransactions`:
```typescript
const { transactions, loading, ... } = useTransactions(userId, {
  ...existingFilters,
  accountId: selectedAccountId,
});
```

**Step 4:** Run `npm run build && npm run typecheck`.

**Step 5:** Commit:
```bash
git add src/modules/finance/components/TransactionListView.tsx src/modules/finance/hooks/useTransactions.ts
git commit -m "feat(finance): add account filter to Transações tab"
```

---

## Phase 4: Orçamento Tab (Total Refactor)

### Task 8: Refactor BudgetView — add month summary, burn rate, real alerts

**Files:**
- Modify: `src/modules/finance/views/BudgetView.tsx`
- Create: `src/modules/finance/components/BurnRateCard.tsx`

**Step 1:** Extract BurnRateCard from FinanceDashboard inline JSX into a standalone component:
```typescript
// src/modules/finance/components/BurnRateCard.tsx
import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { BurnRateData } from '../types';

interface BurnRateCardProps {
  burnRate: BurnRateData;
  currentBalance?: number;
}

export const BurnRateCard: React.FC<BurnRateCardProps> = ({ burnRate, currentBalance }) => {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const monthsOfReserve = currentBalance && burnRate.averageMonthlyExpense > 0
    ? (currentBalance / burnRate.averageMonthlyExpense).toFixed(1)
    : null;

  const TrendIcon = burnRate.trend === 'decreasing' ? TrendingDown : burnRate.trend === 'increasing' ? TrendingUp : Minus;
  const trendColor = burnRate.trend === 'decreasing' ? 'text-ceramic-success' : burnRate.trend === 'increasing' ? 'text-ceramic-error' : 'text-ceramic-text-secondary';

  return (
    <div className="ceramic-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ceramic-text-primary">Burn Rate Mensal</h3>
          <p className="text-xs text-ceramic-text-secondary">Média de gastos mensais</p>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-ceramic-text-primary">{formatCurrency(burnRate.averageMonthlyExpense)}</span>
        <span className={`text-sm font-bold ${trendColor}`}>
          {burnRate.trend === 'decreasing' ? '↓' : burnRate.trend === 'increasing' ? '↑' : '→'} {Math.abs(burnRate.percentageChange).toFixed(1)}%
        </span>
      </div>
      {monthsOfReserve && (
        <p className="text-xs text-ceramic-text-secondary">
          Reserva para <span className="font-bold text-ceramic-text-primary">{monthsOfReserve} meses</span> no ritmo atual
        </p>
      )}
    </div>
  );
};
```

**Step 2:** Refactor BudgetView to add 4 sections:

Section 1 — **Resumo do Mês** (new):
```tsx
<div className="ceramic-card p-6">
  <h3 className="text-sm font-bold text-ceramic-text-primary mb-4">Resumo do Mês</h3>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Receita</p>
      <p className="text-lg font-black text-ceramic-success">{formatCurrency(monthIncome)}</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Orçado</p>
      <p className="text-lg font-black text-ceramic-info">{formatCurrency(totalBudgeted)}</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Gasto</p>
      <p className="text-lg font-black text-ceramic-error">{formatCurrency(totalSpent)}</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-ceramic-text-secondary">Disponível</p>
      <p className={`text-lg font-black ${available >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
        {formatCurrency(available)}
      </p>
    </div>
  </div>
</div>
```

Where:
```typescript
const totalBudgeted = budgetSummary.reduce((sum, b) => sum + b.budget_amount, 0);
const totalSpent = budgetSummary.reduce((sum, b) => sum + b.spent, 0);
const available = totalBudgeted - totalSpent;
```

Section 2 — **BurnRateCard** (migrated):
```tsx
import { BurnRateCard } from '../components/BurnRateCard';
// Load burnRate via getBurnRate(userId) — same as FinanceDashboard did
{burnRate && <BurnRateCard burnRate={burnRate} currentBalance={summary?.currentBalance} />}
```

Section 3 — **Budget por Categoria** — keep existing progress bars but fix alerts:
```typescript
// Replace naive threshold with real budget data:
const budgetAlerts = budgetSummary
  .filter(b => b.budget_amount > 0 && b.spent / b.budget_amount >= 0.8)
  .map(b => ({
    category: b.category,
    ratio: b.spent / b.budget_amount,
    type: b.spent / b.budget_amount >= 1 ? 'danger' as const : 'warning' as const,
    message: b.spent / b.budget_amount >= 1
      ? `${getCategoryLabel(b.category)} estourou o orçamento`
      : `${getCategoryLabel(b.category)} atingiu ${Math.round((b.spent / b.budget_amount) * 100)}% do orçamento`,
  }));
```

Section 4 — Goals integrated — add GoalTracker + SavingsGoalProjection below budget categories (Task 9).

**Step 3:** Remove Category CRUD section from BudgetView (will move to Configuração in Task 11).

**Step 4:** Run `npm run build && npm run typecheck`.

**Step 5:** Commit:
```bash
git add src/modules/finance/views/BudgetView.tsx src/modules/finance/components/BurnRateCard.tsx
git commit -m "feat(finance): refactor Orçamento — add month summary, BurnRateCard, real budget alerts"
```

---

### Task 9: Integrate Goals and SavingsGoalProjection into Orçamento

**Files:**
- Modify: `src/modules/finance/views/BudgetView.tsx`

**Context:**
- `GoalTracker` at `src/modules/finance/components/GoalTracker.tsx` takes `{ userId: string }`.
- `SavingsGoalProjection` at `src/modules/finance/components/SavingsGoalProjection.tsx` takes `{ monthlyContribution, targetAmount, currentAmount, goalTitle, deadline? }`.

**Step 1:** Import both components in BudgetView:
```typescript
import { GoalTracker } from '../components/GoalTracker';
import { SavingsGoalProjection } from '../components/SavingsGoalProjection';
```

**Step 2:** Load goals data for projection:
```typescript
const [goals, setGoals] = useState<FinanceGoal[]>([]);

useEffect(() => {
  supabase
    .from('finance_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .then(({ data }) => { if (data) setGoals(data); });
}, [userId]);
```

**Step 3:** Render Section 4 — Metas Financeiras below budget categories:
```tsx
{/* Section 4: Metas Financeiras */}
<div className="space-y-4">
  <h3 className="text-sm font-bold text-ceramic-text-primary">Metas Financeiras</h3>
  <GoalTracker userId={userId} />

  {/* Savings Projections for active goals */}
  {goals.filter(g => g.target_amount > (g.current_amount || 0)).map(goal => (
    <SavingsGoalProjection
      key={goal.id}
      goalTitle={goal.title}
      targetAmount={goal.target_amount}
      currentAmount={goal.current_amount || 0}
      monthlyContribution={monthlySavings}
      deadline={goal.deadline}
    />
  ))}
</div>
```

Where `monthlySavings` = income - expenses for the selected month.

**Step 4:** Run `npm run build && npm run typecheck`.

**Step 5:** Commit:
```bash
git add src/modules/finance/views/BudgetView.tsx
git commit -m "feat(finance): integrate GoalTracker + SavingsGoalProjection into Orçamento tab"
```

---

## Phase 5: Análise Tab

### Task 10: Enhance MonthComparisonView with charts

**Files:**
- Modify: `src/modules/finance/components/MonthComparisonView.tsx`

**Context:**
- `CategoryTrendChart` at `src/modules/finance/components/Charts/CategoryTrendChart.tsx` takes `{ data: CategoryTrendDataPoint[], category: string, color: string }` where `CategoryTrendDataPoint = { month: string; amount: number }`.
- `TrendLineChart` at `src/modules/finance/components/Charts/TrendLineChart.tsx` takes `{ data: TrendDataPoint[] }` where `TrendDataPoint = { month: string; income: number; expense: number }`.
- `BarChartSimple` at `src/components/features/visualizations/BarChartSimple.tsx`.

**Step 1:** Import chart components:
```typescript
import { CategoryTrendChart } from './Charts/CategoryTrendChart';
import { TrendLineChart } from './Charts/TrendLineChart';
import { BarChartSimple } from '@/components/features/visualizations';
```

**Step 2:** After the existing comparison summary, add grouped bar chart for category comparison:
```tsx
{/* Category comparison bar chart */}
{comparisonData && (
  <div className="ceramic-card p-6">
    <h3 className="text-sm font-bold text-ceramic-text-primary mb-4">Comparativo por Categoria</h3>
    <BarChartSimple
      data={comparisonData.categories.slice(0, 8).map(cat => ({
        label: getCategoryLabel(cat.category),
        values: [
          { key: 'monthA', value: cat.amountA, color: 'bg-ceramic-info/70' },
          { key: 'monthB', value: cat.amountB, color: 'bg-amber-500/70' },
        ],
      }))}
      legend={[
        { key: 'monthA', label: monthALabel, color: 'bg-ceramic-info/70' },
        { key: 'monthB', label: monthBLabel, color: 'bg-amber-500/70' },
      ]}
      formatValue={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
    />
  </div>
)}
```

**Step 3:** Add CategoryTrendChart — show top 3 expense categories over 6 months:
```tsx
{/* Category spending trends */}
<div className="ceramic-card p-6">
  <h3 className="text-sm font-bold text-ceramic-text-primary mb-4">Tendência por Categoria</h3>
  <div className="space-y-6">
    {topCategories.slice(0, 3).map(cat => (
      <CategoryTrendChart
        key={cat.category}
        data={cat.trendData}
        category={getCategoryLabel(cat.category)}
        color={getCategoryColor(cat.category)}
      />
    ))}
  </div>
</div>
```

Where `topCategories` is computed from allTransactions grouped by category and month.

**Step 4:** Add TrendLineChart (migrated from Panorama):
```tsx
{/* Income vs Expense Trend */}
{trendData.length > 0 && (
  <div className="overflow-hidden">
    <TrendLineChart data={trendData} />
  </div>
)}
```

Build trendData from allTransactions (same logic as FinanceDashboard).

**Step 5:** Add highlight cards:
```tsx
{/* Highlights */}
{comparisonData && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {comparisonData.bestCategory && (
      <div className="ceramic-card p-4 border-l-4 border-ceramic-success">
        <p className="text-xs text-ceramic-text-secondary">Maior economia</p>
        <p className="text-sm font-bold text-ceramic-success">
          {comparisonData.bestCategory.label}: {comparisonData.bestCategory.delta}%
        </p>
      </div>
    )}
    {comparisonData.worstCategory && (
      <div className="ceramic-card p-4 border-l-4 border-ceramic-error">
        <p className="text-xs text-ceramic-text-secondary">Maior aumento</p>
        <p className="text-sm font-bold text-ceramic-error">
          {comparisonData.worstCategory.label}: +{comparisonData.worstCategory.delta}%
        </p>
      </div>
    )}
  </div>
)}
```

**Step 6:** Run `npm run build && npm run typecheck`.

**Step 7:** Commit:
```bash
git add src/modules/finance/components/MonthComparisonView.tsx
git commit -m "feat(finance): enhance Análise tab with CategoryTrendChart, comparison bars, TrendLineChart, highlights"
```

---

## Phase 6: Configuração Tab

### Task 11: Create SettingsView with 4 sub-tabs

**Files:**
- Create: `src/modules/finance/views/SettingsView.tsx`
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Step 1:** Create SettingsView component with 4 sub-tabs:
```typescript
// src/modules/finance/views/SettingsView.tsx
import React, { useState } from 'react';
import { Building2, Tag, FileText, Settings } from 'lucide-react';
import { AccountManagement } from '../components/AccountManagement';
// CategoryManager extracted from BudgetView category CRUD section
// StatementManager extracted from FinanceDashboard statement section

type SettingsTab = 'accounts' | 'categories' | 'statements' | 'preferences';

interface SettingsViewProps {
  userId: string;
}

const SETTINGS_TABS = [
  { key: 'accounts' as const, label: 'Contas', icon: Building2 },
  { key: 'categories' as const, label: 'Categorias', icon: Tag },
  { key: 'statements' as const, label: 'Extratos', icon: FileText },
  { key: 'preferences' as const, label: 'Preferências', icon: Settings },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('accounts');

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-ceramic-border pb-2">
        {SETTINGS_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors ${
                isActive ? 'bg-ceramic-cool text-ceramic-text-primary border-b-2 border-amber-500' : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {activeTab === 'accounts' && <AccountManagement userId={userId} />}
      {activeTab === 'categories' && <CategoryManager userId={userId} />}
      {activeTab === 'statements' && <StatementManager userId={userId} />}
      {activeTab === 'preferences' && <PreferencesPanel />}
    </div>
  );
};
```

**Step 2:** Create CategoryManager — extract category CRUD from BudgetView into a standalone component. This component uses `useFinanceContext()` for categories CRUD (createCategory, updateCategory, deleteCategory, getTransactionCount). Render: list of categories with inline edit, create form, delete with migration modal.

**Step 3:** Create StatementManager — extract statement management from FinanceDashboard (upload section, statement list with delete, missing months alert, File Search Panel). Move the JSX wholesale, adapting state management to use local state + context statements.

**Step 4:** Create PreferencesPanel — simple component:
```tsx
const PreferencesPanel: React.FC = () => {
  const [hideValues, setHideValues] = useState(() => {
    const saved = localStorage.getItem('finance_values_visible');
    return saved !== null ? !JSON.parse(saved) : false;
  });

  return (
    <div className="ceramic-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-ceramic-text-primary">Preferências</h3>
      <label className="flex items-center justify-between">
        <span className="text-sm text-ceramic-text-primary">Ocultar valores por padrão</span>
        <input type="checkbox" checked={hideValues}
          onChange={e => {
            setHideValues(e.target.checked);
            localStorage.setItem('finance_values_visible', JSON.stringify(!e.target.checked));
          }}
          className="rounded border-ceramic-border" />
      </label>
    </div>
  );
};
```

**Step 5:** Update FinanceDashboard renderSubView:
```typescript
case 'settings':
  return (
    <div className="flex-1 overflow-hidden">
      <SettingsView userId={userId} />
    </div>
  );
```

**Step 6:** Run `npm run build && npm run typecheck`.

**Step 7:** Commit:
```bash
git add src/modules/finance/views/SettingsView.tsx src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): create Configuração tab with 4 sub-tabs — accounts, categories, statements, preferences"
```

---

## Phase 7: Budget Alerts Integration

### Task 12: Fix Panorama budget alerts to use real budgets

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Step 1:** Import `getBudgetSummary` from budgetService:
```typescript
import { getBudgetSummary } from '../services/budgetService';
```

**Step 2:** Replace the naive `budgetAlerts` useMemo in FinanceDashboard:
```typescript
// BEFORE (naive — 2x average):
const budgetAlerts = useMemo(() => {
  const avgPerCategory = summary.totalExpenses / Math.max(categoryBreakdown.length, 1);
  categoryBreakdown.forEach(cat => {
    if (cat.amount > avgPerCategory * 2) alerts.push(...)
  });
}, [summary, categoryBreakdown]);

// AFTER (real budgets):
const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

useEffect(() => {
  if (!userId || selectedMonth === null) return;
  getBudgetSummary(userId, selectedYear, selectedMonth).then(budgets => {
    const alerts: BudgetAlert[] = budgets
      .filter(b => b.budget_amount > 0)
      .filter(b => b.spent / b.budget_amount >= 0.8)
      .map(b => ({
        id: `budget-${b.category}`,
        type: b.spent / b.budget_amount >= 1 ? 'danger' : 'warning',
        category: b.category,
        message: b.spent / b.budget_amount >= 1
          ? `${getCategoryLabel(b.category)} estourou o orçamento`
          : `${getCategoryLabel(b.category)} atingiu ${Math.round((b.spent / b.budget_amount) * 100)}% do orçamento`,
        amount: b.spent,
        threshold: b.budget_amount,
        created_at: new Date().toISOString(),
      }));
    setBudgetAlerts(alerts);
  });
}, [userId, selectedYear, selectedMonth]);
```

**Step 3:** Run `npm run build && npm run typecheck`.

**Step 4:** Commit:
```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "fix(finance): Panorama budget alerts now use real finance_budgets instead of naive threshold"
```

---

## Phase 8: Cleanup & Verification

### Task 13: Final build verification and cleanup

**Files:**
- All modified files from previous tasks

**Step 1:** Run full verification:
```bash
npm run build && npm run typecheck
```

**Step 2:** Run tests:
```bash
npm run test
```

**Step 3:** Verify no unused imports or dead code introduced. Check for TypeScript warnings.

**Step 4:** Manual verification checklist:
- [ ] Panorama shows Financial Health Score (4 components)
- [ ] Panorama shows LossFramingBanner
- [ ] Panorama does NOT show upload, statement management, GoalTracker, BurnRate, TrendLine
- [ ] Transações has bulk select checkboxes
- [ ] Transações has account filter dropdown
- [ ] Orçamento shows Month Summary with "Disponível"
- [ ] Orçamento shows BurnRateCard
- [ ] Orçamento shows real budget alerts (not 2x average)
- [ ] Orçamento shows GoalTracker + SavingsGoalProjection
- [ ] Análise shows comparison bars chart
- [ ] Análise shows CategoryTrendChart
- [ ] Análise shows TrendLineChart
- [ ] Configuração has 4 sub-tabs: Contas, Categorias, Extratos, Preferências
- [ ] 4 deprecated files deleted
- [ ] Budget alerts on Panorama use real budgets

**Step 5:** Final commit:
```bash
git add -A
git commit -m "chore(finance): final cleanup and verification for Finance Redesign V2"
```

---

## Task Dependency Graph

```
Task 1 (FinanceContext) ──→ Task 2 (5 tabs) ──→ Task 3 (delete deprecated)
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              Task 4-5     Task 6-7     Task 8-9
              (Panorama)   (Transações) (Orçamento)
                    │           │           │
                    ▼           ▼           ▼
              Task 10      Task 11      Task 12
              (Análise)    (Config)     (Budget Alerts)
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                           Task 13
                        (Verification)
```

Tasks 4-5, 6-7, 8-9 can run in parallel after Task 3.
Tasks 10, 11, 12 can run in parallel after their respective phase.
Task 13 runs last.
