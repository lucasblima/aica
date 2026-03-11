# Finance Module Harmonization — Design Doc

**Date**: 2026-03-11
**Approach**: B — Context Provider + Category CRUD
**Status**: Approved

## Problem Statement

1. Charts show all-time data while summary shows selected month
2. Categories hardcoded in 4 inconsistent places (constants.ts: 18, types: 12, ExpenseChart: 12, gemini-chat: 17)
3. No custom category support — user can't add "Pensao", "Escola", "Transporte Escolar"
4. Tabs don't share period state — BudgetView has own month nav, TransactionListView has own filters
5. Orcamento tab disconnected from reality (8 hardcoded categories)
6. TransactionListView crash: missing import of TRANSACTION_CATEGORIES (FIXED during brainstorming)

## Architecture

### Database: `finance_categories`

```sql
CREATE TABLE finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#6b7280',
  is_expense BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);
```

- RLS: all CRUD restricted to `auth.uid() = user_id`
- No `is_default` — all categories deletable
- Delete rule: if category has transactions, user must migrate them first (modal with dropdown)
- Seed: RPC `seed_default_categories(p_user_id)` called on first access (0 categories)

### 20 Default Categories (seed)

**Expense (17)**: housing, food, transport, health, education, entertainment, shopping, bills, subscription, personal_care, pets, travel, gifts, pensao, escola, transporte_escolar, other
**Income (3)**: salary, freelance, investment

### FinanceContext Provider

```typescript
interface FinanceContextValue {
  // Period (shared across all tabs)
  selectedYear: number;
  selectedMonth: number | null;  // null = "Todos os periodos"
  setSelectedYear: (y: number) => void;
  setSelectedMonth: (m: number | null) => void;

  // Categories (from DB)
  categories: FinanceCategory[];
  categoriesLoading: boolean;
  createCategory: (data: CreateCategoryInput) => Promise<void>;
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string, migrateToId?: string) => Promise<void>;
  getCategoryByKey: (key: string) => FinanceCategory | undefined;

  // Shared data
  statements: FinanceStatement[];
  refreshData: () => Promise<void>;
}
```

Wraps all tabs. Categories load once on mount, refresh after CRUD. Period persists across tab switches.

### Tab Integration

**Visao Geral:**
- Gastos por Categoria: filtered by selected month (not all-time)
- Receita vs Despesa: selected month + trend sparkline
- "Todos" option shows aggregate of all imported periods
- Categories from context (dynamic labels, colors, icons)

**Transacoes:**
- Receives selectedMonth/Year from context as initial filter
- ExpenseChart added at top (filtered by current view)
- Category dropdown in filter + inline edit from context (DB)

**Orcamento:**
- Receives Burn Rate Mensal (moved from Visao Geral)
- Category CRUD section: list with icon/label/color/transaction count
- Create, edit inline, delete with migration modal
- Budget per category: dynamic (not 8 hardcoded)

### Category Unification

```
BEFORE: constants.ts (18) + types/index.ts (12) + ExpenseChart (12) + gemini-chat (17)
AFTER:  finance_categories table -> FinanceContext -> all components
```

- `constants.ts`: keeps only `formatCurrency` + utilities
- `CATEGORY_LABELS`, `CATEGORY_COLORS`: removed — from DB
- `TRANSACTION_CATEGORIES` type: derived from DB with hardcoded fallback
- `ExpenseChart`: receives categories via props from context
- `gemini-chat`: receives user categories in request payload

### Delete with Migration

```sql
-- RPC: delete_category_with_migration(p_category_id UUID, p_migrate_to_key TEXT)
-- 1. UPDATE finance_transactions SET category = p_migrate_to_key
--    WHERE category = old_key AND user_id = auth.uid()
-- 2. DELETE FROM finance_categories WHERE id = p_category_id AND user_id = auth.uid()
```

UI flow:
1. Click delete on category
2. If 0 transactions -> delete immediately
3. If N transactions -> modal: "Migrar N transacoes para qual categoria?" -> dropdown -> confirm -> migrate + delete

### Gemini Integration

Frontend includes user categories in Edge Function calls:
```json
{ "user_categories": ["housing", "food", "pensao", "escola", ...] }
```

Edge Function prompt uses this list instead of hardcoded categories.

## Out of Scope

- Tab merge/redesign (Comparativo, Metas, Contas stay as-is)
- Category hierarchy (parent/child)
- Shared categories between users
- Category budget templates
