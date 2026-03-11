# Finance Module Redesign V2 — Design Doc

**Date**: 2026-03-11
**Approach**: B — Reestruturação em 5 abas com propósito claro
**Status**: Approved

## Problem Statement

1. Orçamento é uma casca vazia — progress bars sem rollover, sem alertas reais, sem "quanto posso gastar"
2. Financial Health engine completo (4 scores, behavioral econ, loss framing) mas 100% escondido
3. Contas é CRUD isolado — zero integração com transações ou análise
4. Comparativo é texto puro — CategoryTrendChart existe mas nunca renderizado
5. Metas desconectadas — SavingsGoalProjection existe mas não integrado
6. Redundância: RecategorizeModal vs RecategorizationReview, useFinanceStatements vs FinanceContext
7. Budget Alerts usam threshold ingênuo (2x média) em vez de finance_budgets reais
8. 6 abas com potencial desperdiçado → consolidar em 5 com propósito claro

## Architecture: 5 Tabs

### Tab 1: Panorama (ex-Visão Geral)

**Propósito**: "Como estou financeiramente?" — read-only, status snapshot.

**Layout (top to bottom)**:
1. Summary Cards: Receita / Despesa / Saldo (filtered by selected month)
2. **Financial Health Score** (NEW — surfacing existing `FinancialHealthCard`):
   - 4 scores: Spend, Save, Borrow, Plan (0-100 each)
   - Composite score with trend (improving/declining/stable)
   - Uses `financialHealthScoring.ts` + `useFinancialHealth` hook (both exist)
3. **Loss Framing Banner** (NEW — surfacing existing `LossFramingBanner`)
4. IncomeVsExpense chart (monthly bars + sparkline)
5. ExpenseChart (donut by category)
6. AI Digest Mensal (`MonthlyDigestCard`)
7. Categorization Alert (poorly categorized transactions)

**Removed from Panorama (migrated)**:
- Upload/statement management → Configuração > Extratos
- GoalTracker → Orçamento > Metas
- Burn Rate → Orçamento > Resumo
- TrendLineChart → Análise
- File Search Panel → Configuração > Extratos

### Tab 2: Transações

**Propósito**: "O que aconteceu?" — browse, search, bulk edit.

**Kept as-is**:
- Search (debounced 400ms)
- Type filter (All/Income/Expense)
- Category filter dropdown
- Date range pickers
- ExpenseChart filtered by current view
- Inline edit (expand → category/description/notes)
- Pagination (50 per page)

**New features**:
- **Account filter** dropdown — uses `finance_accounts` from context, filters by `account_id`
- **Bulk select** — checkbox per transaction + "Select all" header
- **Bulk re-categorize** — select N → category dropdown modal → batch UPDATE
- **Bulk delete** — select N → confirm → batch DELETE

**State additions in TransactionListView**:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkAction, setBulkAction] = useState<'recategorize' | 'delete' | null>(null);
```

### Tab 3: Orçamento (total refactor)

**Propósito**: "Quanto posso gastar?" — budgeting + goals + projections.

**4 sections**:

1. **Resumo do Mês** (NEW):
   - Receita (from selectedMonthSummary)
   - Total orçado (SUM of finance_budgets for month)
   - Total gasto (SUM of expense transactions for month)
   - **Disponível** = Orçado - Gasto (the key number)

2. **Burn Rate** (migrated from Panorama):
   - Extract to reusable `BurnRateCard` component
   - Average monthly expense + trend (↑↓)
   - Months of reserve = balance ÷ burn rate

3. **Orçamento por Categoria** (refactored):
   - Each category: spent / budget + colored progress bar
   - Colors: green <60%, orange 60-80%, red >80%, pulsing >100%
   - Inline edit of budget amount (click → input → save)
   - Real alerts from `finance_budgets` table (not naive 2x average)
   - [+ Add category to budget] button

4. **Metas Financeiras** (migrated from Goals tab):
   - GoalTracker with SVG progress rings (existing)
   - **SavingsGoalProjection** integrated (existing component, never rendered)
   - Projected achievement date based on 3-month saving rate
   - [+ New goal] button

**Budget Alerts reform**:
```typescript
// BEFORE (naive)
if (cat.amount > avgPerCategory * 2) alerts.push(...)

// AFTER (real budgets)
const budgets = await getBudgetSummary(userId, year, month);
budgets.forEach(b => {
  const ratio = b.spent / b.budget_amount;
  if (ratio >= 0.8) alerts.push({ type: ratio >= 1 ? 'danger' : 'warning', ... });
});
```

These alerts feed both Orçamento tab AND Panorama tab.

### Tab 4: Análise (ex-Comparativo)

**Propósito**: "Como estou evoluindo?" — trends, comparisons, charts.

**Layout (top to bottom)**:
1. Mode toggle: Mensal / Anual
2. **Comparison summary** (existing MonthComparisonView data):
   - Month A vs Month B selectors
   - Income / Expense / Balance with delta %
3. **Grouped bar chart by category** (NEW visualization):
   - Side-by-side bars per category (Month A vs Month B)
   - Uses `BarChartSimple` (existing component)
4. **CategoryTrendChart** (existing component, never rendered):
   - Line chart showing spending per category over 6 months
   - Multi-line with legend
5. **TrendLineChart** (migrated from Panorama):
   - Income vs Expense trend over 6 months
   - Existing component, zero changes
6. **Highlights cards** (existing data, better presentation):
   - ✅ Best category (biggest decrease)
   - ⚠️ Worst category (biggest increase)

**No new queries** — all data from `getTransactionsByDateRange()` + `getYearlyAggregates()`.

### Tab 5: Configuração (ex-Contas)

**Propósito**: "Como organizo meu sistema?" — settings, data management.

**4 sub-tabs**:

1. **Contas** — `AccountManagement` migrated as-is from dedicated tab
2. **Categorias** — Category CRUD migrated from BudgetView:
   - List: icon, label, color, is_expense, transaction count
   - Inline edit (label, icon, color)
   - Delete with migration modal (if has transactions)
   - Create new category
   - Uses existing `categoryService` + FinanceContext
3. **Extratos** — Statement management migrated from Panorama:
   - Upload PDF (`StatementUpload`) + CSV (`CSVUpload`)
   - Statement list with status, period, tx count, delete
   - Missing months alert
   - Delete all
   - File Search Panel (if indexed)
4. **Preferências** (NEW, lightweight):
   - Toggle "hide values by default" (exists in localStorage)
   - Trend chart months selector (today hardcoded to 6)

## Code Cleanup

### Delete (deprecated/redundant)

| File | Reason |
|------|--------|
| `RecategorizeModal.tsx` | Replaced by `RecategorizationReview` |
| `financeAgentService.ts` | Deprecated — gemini-chat is active path |
| `useFinanceStatements.ts` | Redundant with FinanceContext |
| `AccountSelector.tsx` | Never used in any tab |

### Extract (reusable)

| Component | From | To |
|-----------|------|-----|
| `BurnRateCard` | Inline JSX in FinanceDashboard | Standalone component |
| Statement management section | FinanceDashboard lines ~950-1150 | `StatementManager` component |

## Data Flow

```
FinanceContext (shared across all 5 tabs)
├── selectedYear / selectedMonth (null = "Todos")
├── categories[] (from finance_categories)
├── statements[] (from finance_statements)
├── accounts[] (NEW — from finance_accounts)
└── refreshAll()

Tab-specific data loading:
├── Panorama: getAllTimeSummary, getCategoryBreakdownByPeriod, useFinancialHealth
├── Transações: useTransactions (paginated + filters + accountId)
├── Orçamento: getBudgetSummary, goals from finance_goals, getBurnRate
├── Análise: getTransactionsByDateRange, getYearlyAggregates
└── Configuração: accounts/categories/statements from context
```

## Tab Type Change

```typescript
// BEFORE
type DashboardView = 'history' | 'budget' | 'transactions' | 'comparison' | 'goals' | 'accounts';

// AFTER
type DashboardView = 'panorama' | 'transactions' | 'budget' | 'analysis' | 'settings';
```

## Out of Scope

- Account balance tracking (requires bank API integration)
- Account reconciliation workflow
- Budget rollover between months
- Budget rules/templates (auto-allocate by % of income)
- Transaction receipt/attachment upload
- Category hierarchy (parent/child)
- Recurring transaction detection UI
- Transaction tags UI
- Merchant consolidation
- Export to CSV/PDF

## Success Criteria

1. Financial Health Score visible on Panorama (4 scores + composite)
2. Budget alerts use real `finance_budgets`, not naive threshold
3. Goals show projected achievement date (SavingsGoalProjection)
4. Análise tab has charts (CategoryTrendChart + comparison bars)
5. Bulk select + recategorize/delete works in Transações
6. Account filter available in Transações
7. Configuration centralizes all settings (accounts, categories, statements, preferences)
8. 4 deprecated files removed
9. Build passes, no regressions
