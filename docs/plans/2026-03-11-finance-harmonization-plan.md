# Finance Module Harmonization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify Finance module's category system (DB-backed CRUD), harmonize data periods across tabs, and integrate Visao Geral + Transacoes + Orcamento via shared FinanceContext.

**Architecture:** New `finance_categories` table with RLS + seed RPC. `FinanceContext` provider wraps all tabs sharing period state + categories. Charts filter by selected month. BudgetView uses dynamic DB categories instead of 8 hardcoded ones.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + Edge Functions), Tailwind/Ceramic Design System

---

## Task 1: Database Migration — `finance_categories` table

**Files:**
- Create: `supabase/migrations/20260311120000_create_finance_categories.sql`

**Step 1: Write the migration**

```sql
-- =============================================================
-- finance_categories — User-managed transaction categories
-- =============================================================

CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#6b7280',
  is_expense BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, key)
);

-- RLS
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own categories"
  ON public.finance_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.finance_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.finance_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.finance_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_finance_categories_user_id ON public.finance_categories(user_id);

-- =============================================================
-- seed_default_categories — Called on first access when user has 0 categories
-- =============================================================
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only seed if user has no categories
  IF EXISTS (SELECT 1 FROM finance_categories WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO finance_categories (user_id, key, label, icon, color, is_expense, sort_order) VALUES
    -- Expense categories
    (p_user_id, 'housing',             'Moradia',             '🏠', '#6366f1', true,  1),
    (p_user_id, 'food',                'Alimentacao',         '🍽️', '#f59e0b', true,  2),
    (p_user_id, 'transport',           'Transporte',          '🚗', '#10b981', true,  3),
    (p_user_id, 'health',              'Saude',               '💊', '#ec4899', true,  4),
    (p_user_id, 'education',           'Educacao',            '📚', '#3b82f6', true,  5),
    (p_user_id, 'entertainment',       'Entretenimento',      '🎬', '#8b5cf6', true,  6),
    (p_user_id, 'shopping',            'Compras',             '🛍️', '#f97316', true,  7),
    (p_user_id, 'bills',               'Contas',              '📄', '#e11d48', true,  8),
    (p_user_id, 'subscription',        'Assinatura',          '🔄', '#7c3aed', true,  9),
    (p_user_id, 'personal_care',       'Cuidados Pessoais',   '💅', '#d946ef', true,  10),
    (p_user_id, 'pets',                'Pets',                '🐾', '#84cc16', true,  11),
    (p_user_id, 'travel',              'Viagem',              '✈️', '#0ea5e9', true,  12),
    (p_user_id, 'gifts',               'Presentes',           '🎁', '#f59e0b', true,  13),
    (p_user_id, 'pensao',              'Pensao',              '👨‍👧', '#0891b2', true,  14),
    (p_user_id, 'escola',              'Escola',              '🏫', '#2563eb', true,  15),
    (p_user_id, 'transporte_escolar',  'Transporte Escolar',  '🚌', '#059669', true,  16),
    (p_user_id, 'transfer',            'Transferencia',       '🔀', '#94a3b8', true,  17),
    (p_user_id, 'other',               'Outros',              '📦', '#6b7280', true,  18),
    -- Income categories
    (p_user_id, 'salary',              'Salario',             '💰', '#22c55e', false, 19),
    (p_user_id, 'freelance',           'Freelance',           '💻', '#14b8a6', false, 20),
    (p_user_id, 'investment',          'Investimento',        '📈', '#06b6d4', false, 21);
END;
$$;

-- =============================================================
-- delete_category_with_migration — Migrate transactions then delete
-- =============================================================
CREATE OR REPLACE FUNCTION public.delete_category_with_migration(
  p_category_id UUID,
  p_migrate_to_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_key TEXT;
  v_tx_count INTEGER;
BEGIN
  -- Get category info
  SELECT user_id, key INTO v_user_id, v_old_key
  FROM finance_categories
  WHERE id = p_category_id AND user_id = auth.uid();

  IF v_old_key IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Category not found');
  END IF;

  -- Count transactions with this category
  SELECT COUNT(*) INTO v_tx_count
  FROM finance_transactions
  WHERE user_id = v_user_id AND category = v_old_key;

  -- If transactions exist, must provide migration target
  IF v_tx_count > 0 AND p_migrate_to_key IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Category has transactions, must provide migration target',
      'transaction_count', v_tx_count
    );
  END IF;

  -- Migrate transactions if needed
  IF v_tx_count > 0 AND p_migrate_to_key IS NOT NULL THEN
    UPDATE finance_transactions
    SET category = p_migrate_to_key, updated_at = now()
    WHERE user_id = v_user_id AND category = v_old_key;
  END IF;

  -- Also update finance_budgets if they reference this category
  UPDATE finance_budgets
  SET category = COALESCE(p_migrate_to_key, 'other')
  WHERE user_id = v_user_id AND category = v_old_key;

  -- Delete the category
  DELETE FROM finance_categories WHERE id = p_category_id AND user_id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'migrated_transactions', v_tx_count,
    'old_key', v_old_key,
    'new_key', p_migrate_to_key
  );
END;
$$;
```

**Step 2: Apply migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify table and RPC exist**

Run via Supabase Dashboard SQL Editor:
```sql
SELECT * FROM finance_categories LIMIT 1;
SELECT public.seed_default_categories('00000000-0000-0000-0000-000000000000'::uuid);
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260311120000_create_finance_categories.sql
git commit -m "feat(finance): create finance_categories table with RLS, seed RPC, delete migration RPC"
```

---

## Task 2: Category Service — CRUD operations

**Files:**
- Create: `src/modules/finance/services/categoryService.ts`
- Create: `src/modules/finance/services/__tests__/categoryService.test.ts`

**Step 1: Write failing tests**

```typescript
// src/modules/finance/services/__tests__/categoryService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { getCategories, createCategory, updateCategory, deleteCategoryWithMigration, getTransactionCountByCategory } from '../categoryService';
import { supabase } from '@/services/supabaseClient';

describe('categoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategories', () => {
    it('returns categories sorted by sort_order', async () => {
      const mockCategories = [
        { id: '1', key: 'food', label: 'Alimentacao', sort_order: 2 },
        { id: '2', key: 'housing', label: 'Moradia', sort_order: 1 },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getCategories('user-1');
      expect(result).toEqual(mockCategories);
      expect(supabase.from).toHaveBeenCalledWith('finance_categories');
    });

    it('seeds defaults when user has no categories', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      // After seed, return defaults
      const secondCall = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: '1', key: 'housing', label: 'Moradia' }],
          error: null,
        }),
      };
      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockChain as any)  // first call: empty
        .mockReturnValueOnce(secondCall as any); // after seed: has data

      const result = await getCategories('user-1');
      expect(supabase.rpc).toHaveBeenCalledWith('seed_default_categories', { p_user_id: 'user-1' });
    });
  });

  describe('getTransactionCountByCategory', () => {
    it('returns count of transactions for a category key', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Mock the last .eq to resolve
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({
        data: [{ id: '1' }, { id: '2' }],
        error: null,
        count: 2,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const count = await getTransactionCountByCategory('user-1', 'food');
      expect(typeof count).toBe('number');
    });
  });
});
```

**Step 2: Run tests — verify they fail**

Run: `npm run test -- src/modules/finance/services/__tests__/categoryService.test.ts`
Expected: FAIL — module not found

**Step 3: Write the service**

```typescript
// src/modules/finance/services/categoryService.ts
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('CategoryService');

export interface FinanceCategoryRow {
  id: string;
  user_id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  is_expense: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateCategoryInput {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  is_expense?: boolean;
}

export interface UpdateCategoryInput {
  label?: string;
  icon?: string;
  color?: string;
  is_expense?: boolean;
  sort_order?: number;
}

/**
 * Get all categories for a user.
 * Seeds defaults on first access (0 categories).
 */
export async function getCategories(userId: string): Promise<FinanceCategoryRow[]> {
  try {
    const { data, error } = await supabase
      .from('finance_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Seed defaults if user has no categories
    if (!data || data.length === 0) {
      log.info('No categories found, seeding defaults for user:', userId);
      const { error: seedError } = await supabase.rpc('seed_default_categories', {
        p_user_id: userId,
      });
      if (seedError) {
        log.error('Error seeding default categories:', seedError);
        throw seedError;
      }

      // Re-fetch after seeding
      const { data: seeded, error: refetchError } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (refetchError) throw refetchError;
      return seeded || [];
    }

    return data;
  } catch (error) {
    log.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Create a new category.
 * Key is auto-generated from label (slugified).
 */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<FinanceCategoryRow> {
  try {
    // Generate key from label if not provided
    const key = input.key || input.label
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    // Get max sort_order
    const { data: existing } = await supabase
      .from('finance_categories')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('finance_categories')
      .insert({
        user_id: userId,
        key,
        label: input.label,
        icon: input.icon || '📦',
        color: input.color || '#6b7280',
        is_expense: input.is_expense ?? true,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Update a category.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<FinanceCategoryRow> {
  try {
    const { data, error } = await supabase
      .from('finance_categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a category. If it has transactions, migrates them to target category first.
 */
export async function deleteCategoryWithMigration(
  categoryId: string,
  migrateToKey?: string
): Promise<{ success: boolean; migrated_transactions?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('delete_category_with_migration', {
      p_category_id: categoryId,
      p_migrate_to_key: migrateToKey || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error deleting category:', error);
    throw error;
  }
}

/**
 * Count transactions using a specific category key for a user.
 */
export async function getTransactionCountByCategory(
  userId: string,
  categoryKey: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('finance_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', categoryKey);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    log.error('Error counting transactions:', error);
    throw error;
  }
}
```

**Step 4: Run tests — verify they pass**

Run: `npm run test -- src/modules/finance/services/__tests__/categoryService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/modules/finance/services/categoryService.ts src/modules/finance/services/__tests__/categoryService.test.ts
git commit -m "feat(finance): add categoryService with CRUD, seed, and migration delete"
```

---

## Task 3: Update Types — Simplify FinanceCategory, add period-filtered service

**Files:**
- Modify: `src/modules/finance/types/index.ts:131-151` (replace FinanceCategory interface)
- Modify: `src/modules/finance/services/financeService.ts` (add `getCategoryBreakdownByPeriod`)

**Step 1: Update FinanceCategory type to match DB schema**

Replace the existing `FinanceCategory` interface (lines 135-151 of `src/modules/finance/types/index.ts`) with:

```typescript
export interface FinanceCategory {
  id: string;
  user_id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  is_expense: boolean;
  sort_order: number;
  created_at: string;
}
```

Also remove the `CategoryType` type at line 133 (no longer needed).

**Step 2: Add period-filtered category breakdown to financeService.ts**

Add this function after `getAllTimeCategoryBreakdown`:

```typescript
/**
 * Get category breakdown filtered by year/month.
 * If month is null, returns all-time data.
 */
export async function getCategoryBreakdownByPeriod(
  userId: string,
  year: number | null,
  month: number | null
): Promise<CategoryBreakdown[]> {
  try {
    let query = supabase
      .from('finance_transactions')
      .select('category, amount, type')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .limit(50000);

    // Apply date filter if month specified
    if (year !== null && month !== null) {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      query = query
        .gte('transaction_date', firstDay.toISOString().split('T')[0])
        .lte('transaction_date', lastDay.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const transactions = data || [];
    const categoryMap: { [key: string]: { amount: number; count: number } } = {};
    let totalAmount = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { amount: 0, count: 0 };
      }
      categoryMap[t.category].amount += amount;
      categoryMap[t.category].count += 1;
      totalAmount += amount;
    });

    const breakdown: CategoryBreakdown[] = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactionCount: data.count,
    }));

    return breakdown.sort((a, b) => b.amount - a.amount);
  } catch (error) {
    log.error('Error fetching period category breakdown:', error);
    throw error;
  }
}
```

**Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Success (some unused import warnings are OK)

**Step 4: Commit**

```bash
git add src/modules/finance/types/index.ts src/modules/finance/services/financeService.ts
git commit -m "feat(finance): simplify FinanceCategory type, add getCategoryBreakdownByPeriod"
```

---

## Task 4: FinanceContext Provider

**Files:**
- Create: `src/modules/finance/contexts/FinanceContext.tsx`

**Step 1: Write the context provider**

```typescript
// src/modules/finance/contexts/FinanceContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import {
  getCategories,
  createCategory as createCategorySvc,
  updateCategory as updateCategorySvc,
  deleteCategoryWithMigration,
  getTransactionCountByCategory,
} from '../services/categoryService';
import type { FinanceCategoryRow, CreateCategoryInput, UpdateCategoryInput } from '../services/categoryService';
import { statementService } from '../services/statementService';
import type { FinanceStatement } from '../types';

const log = createNamespacedLogger('FinanceContext');

interface FinanceContextValue {
  // Period
  selectedYear: number;
  selectedMonth: number | null; // null = "Todos"
  setSelectedYear: (y: number) => void;
  setSelectedMonth: (m: number | null) => void;

  // Categories
  categories: FinanceCategoryRow[];
  categoriesLoading: boolean;
  createCategory: (input: CreateCategoryInput) => Promise<FinanceCategoryRow>;
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string, migrateToKey?: string) => Promise<{ success: boolean; migrated_transactions?: number; error?: string }>;
  getCategoryByKey: (key: string) => FinanceCategoryRow | undefined;
  getCategoryLabel: (key: string) => string;
  getCategoryColor: (key: string) => string;
  getCategoryIcon: (key: string) => string;
  getTransactionCount: (categoryKey: string) => Promise<number>;
  refreshCategories: () => Promise<void>;

  // Statements
  statements: FinanceStatement[];
  statementsLoading: boolean;
  refreshStatements: () => Promise<void>;

  // Global refresh
  refreshAll: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

interface FinanceProviderProps {
  userId: string;
  children: React.ReactNode;
}

export function FinanceProvider({ userId, children }: FinanceProviderProps) {
  // Period state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth() + 1);

  // Categories
  const [categories, setCategories] = useState<FinanceCategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Statements
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(true);

  // Load categories
  const refreshCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const cats = await getCategories(userId);
      setCategories(cats);
    } catch (error) {
      log.error('Error loading categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, [userId]);

  // Load statements
  const refreshStatements = useCallback(async () => {
    try {
      setStatementsLoading(true);
      const stmts = await statementService.getStatements(userId);
      setStatements(stmts);
    } catch (error) {
      log.error('Error loading statements:', error);
    } finally {
      setStatementsLoading(false);
    }
  }, [userId]);

  // Refresh all
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCategories(), refreshStatements()]);
  }, [refreshCategories, refreshStatements]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category CRUD
  const handleCreateCategory = useCallback(async (input: CreateCategoryInput) => {
    const created = await createCategorySvc(userId, input);
    await refreshCategories();
    return created;
  }, [userId, refreshCategories]);

  const handleUpdateCategory = useCallback(async (id: string, input: UpdateCategoryInput) => {
    await updateCategorySvc(id, input);
    await refreshCategories();
  }, [refreshCategories]);

  const handleDeleteCategory = useCallback(async (id: string, migrateToKey?: string) => {
    const result = await deleteCategoryWithMigration(id, migrateToKey);
    if (result.success) {
      await refreshCategories();
    }
    return result;
  }, [refreshCategories]);

  // Category lookups
  const getCategoryByKey = useCallback(
    (key: string) => categories.find(c => c.key === key),
    [categories]
  );

  const getCategoryLabel = useCallback(
    (key: string) => categories.find(c => c.key === key)?.label || key,
    [categories]
  );

  const getCategoryColor = useCallback(
    (key: string) => categories.find(c => c.key === key)?.color || '#6b7280',
    [categories]
  );

  const getCategoryIcon = useCallback(
    (key: string) => categories.find(c => c.key === key)?.icon || '📦',
    [categories]
  );

  const getTransactionCount = useCallback(
    (categoryKey: string) => getTransactionCountByCategory(userId, categoryKey),
    [userId]
  );

  const value = useMemo<FinanceContextValue>(() => ({
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    categories,
    categoriesLoading,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    getCategoryByKey,
    getCategoryLabel,
    getCategoryColor,
    getCategoryIcon,
    getTransactionCount,
    refreshCategories,
    statements,
    statementsLoading,
    refreshStatements,
    refreshAll,
  }), [
    selectedYear, selectedMonth, categories, categoriesLoading,
    statements, statementsLoading,
    handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
    getCategoryByKey, getCategoryLabel, getCategoryColor, getCategoryIcon,
    getTransactionCount, refreshCategories, refreshStatements, refreshAll,
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinanceContext(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinanceContext must be used within a FinanceProvider');
  }
  return ctx;
}
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`

**Step 3: Commit**

```bash
git add src/modules/finance/contexts/FinanceContext.tsx
git commit -m "feat(finance): create FinanceContext with shared period, categories CRUD, statements"
```

---

## Task 5: Wrap FinanceDashboard with FinanceProvider

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`

**Step 1: Add FinanceProvider wrapper**

At the top of FinanceDashboard, wrap the entire component with `<FinanceProvider>`:

1. Import `FinanceProvider` and `useFinanceContext`
2. Split into two components: outer `FinanceDashboard` (wraps with provider) and inner `FinanceDashboardInner` (current logic)
3. Replace local `selectedYear`/`selectedMonth` state with context values
4. Replace local `statements` state with context values
5. Pass context values to sub-tabs via props (period, categories)

Key changes in the inner component:
- Remove: `const [selectedYear, setSelectedYear] = useState(...)` — use context
- Remove: `const [selectedMonth, setSelectedMonth] = useState(...)` — use context
- Remove: statements loading from `loadData()` — use context
- Add `selectedMonth: null` option to period navigator ("Todos")
- Replace `getAllTimeCategoryBreakdown(userId)` with `getCategoryBreakdownByPeriod(userId, selectedYear, selectedMonth)`
- Pass `selectedYear` and `selectedMonth` to `BudgetView` and `TransactionListView`

**Step 2: Update renderSubView to pass period**

```typescript
const renderSubView = () => {
  switch (activeView) {
    case 'budget':
      return <BudgetView userId={userId} onBack={onBack} />;
    case 'transactions':
      return <TransactionListView userId={userId} />;
    // ... other tabs unchanged
  }
};
```

BudgetView and TransactionListView will use `useFinanceContext()` internally instead of props — they're already children of the provider.

**Step 3: Verify build**

Run: `npm run build && npm run typecheck`

**Step 4: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): wrap FinanceDashboard with FinanceProvider, use shared period state"
```

---

## Task 6: Update Charts — Dynamic categories from context

**Files:**
- Modify: `src/modules/finance/components/Charts/ExpenseChart.tsx`
- Modify: `src/modules/finance/constants.ts`

**Step 1: Update ExpenseChart to accept dynamic category metadata**

Add optional prop for category metadata:

```typescript
interface ExpenseChartProps {
  data: CategoryBreakdown[];
  totalExpenses: number;
  categoryMeta?: Array<{ key: string; label: string; color: string }>;
}
```

When `categoryMeta` is provided, use it for labels and colors instead of the hardcoded `CATEGORY_COLORS`/`CATEGORY_LABELS`. Fall back to existing hardcoded values if not provided (backward compatibility).

**Step 2: Keep constants.ts as fallback**

`CATEGORY_LABELS` and `CATEGORY_COLORS` in `constants.ts` remain as fallbacks for components not yet connected to the context. They will eventually be removed when all consumers use context.

**Step 3: Verify build**

Run: `npm run build && npm run typecheck`

**Step 4: Commit**

```bash
git add src/modules/finance/components/Charts/ExpenseChart.tsx
git commit -m "feat(finance): ExpenseChart accepts dynamic category metadata from context"
```

---

## Task 7: Update Visao Geral — Filter by selected month

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx` (history/overview section)

**Step 1: Replace all-time chart data with period-filtered data**

In the `loadData()` function or a new `useEffect` for period changes:

1. Replace `getAllTimeCategoryBreakdown(userId)` with `getCategoryBreakdownByPeriod(userId, selectedYear, selectedMonth)`
2. When `selectedMonth === null` ("Todos"), call with `(userId, null, null)` for all-time
3. Pass `categoryMeta` from context categories to `<ExpenseChart>`
4. Update `<IncomeVsExpense>` to show selected month data (use `selectedMonthSummary` already computed)

**Step 2: Add "Todos" option to period navigator**

Add a button/toggle to set `selectedMonth = null`:

```tsx
<button
  onClick={() => setSelectedMonth(null)}
  className={selectedMonth === null ? 'active-styles' : 'inactive-styles'}
>
  Todos
</button>
```

**Step 3: Verify build + visual check**

Run: `npm run build && npm run typecheck`
Manual: Open Finance, switch months, verify charts update

**Step 4: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): Visao Geral charts filtered by selected month, add Todos option"
```

---

## Task 8: Update Transacoes tab — Add ExpenseChart + context categories

**Files:**
- Modify: `src/modules/finance/components/TransactionListView.tsx`

**Step 1: Add ExpenseChart above transaction list**

1. Import `useFinanceContext` and `ExpenseChart`
2. Get `categories`, `getCategoryLabel`, `getCategoryColor`, `selectedYear`, `selectedMonth` from context
3. Compute category breakdown from loaded transactions (local memo)
4. Render `<ExpenseChart>` at top of component
5. Replace `TRANSACTION_CATEGORIES` import with categories from context for the category dropdown
6. Replace `CATEGORY_LABELS` usage with `getCategoryLabel()` from context

**Step 2: Use context period as initial filter**

When component mounts, initialize date range filter from context's `selectedYear`/`selectedMonth` if available.

**Step 3: Verify build + visual check**

Run: `npm run build && npm run typecheck`
Manual: Open Transacoes tab, verify chart + category labels are dynamic

**Step 4: Commit**

```bash
git add src/modules/finance/components/TransactionListView.tsx
git commit -m "feat(finance): TransactionListView adds ExpenseChart, uses context categories"
```

---

## Task 9: Update Orcamento tab — Dynamic categories + CRUD + Burn Rate

**Files:**
- Modify: `src/modules/finance/views/BudgetView.tsx`

**Step 1: Replace CATEGORY_CONFIG with context categories**

1. Import `useFinanceContext`
2. Remove `CATEGORY_CONFIG` constant
3. Get `categories`, CRUD functions, `selectedYear`, `selectedMonth` from context
4. Build `budgetCategories` from context categories (expense categories only) instead of hardcoded 8
5. Keep existing budget editing logic (upsertBudget) — just use dynamic category list

**Step 2: Remove local month navigation**

BudgetView currently has its own `selectedYear`/`selectedMonth` state (lines 72-73). Remove these and use the context values instead. The month navigator in the dashboard controls all tabs.

**Step 3: Add Category CRUD section**

Add a "Gerenciar Categorias" section at bottom of BudgetView:

```tsx
{/* Category Management Section */}
<div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-ceramic-text-primary font-medium">Gerenciar Categorias</h3>
    <button onClick={() => setShowCreateCategory(true)} className="...">
      + Nova Categoria
    </button>
  </div>

  {/* Category list */}
  {categories.filter(c => c.is_expense).map(cat => (
    <div key={cat.id} className="flex items-center gap-3 py-2 border-b border-ceramic-border/30">
      <span>{cat.icon}</span>
      <span className="flex-1">{cat.label}</span>
      <span className="text-xs text-ceramic-text-secondary">{txCount} transacoes</span>
      <button onClick={() => startEditCategory(cat)}>Editar</button>
      <button onClick={() => startDeleteCategory(cat)}>Excluir</button>
    </div>
  ))}
</div>
```

**Step 4: Add create/edit modal**

Simple form: label, icon (emoji picker or text input), color (hex input or presets), is_expense toggle.

**Step 5: Add delete with migration modal**

```tsx
{/* Delete Modal */}
{deletingCategory && (
  <div className="modal">
    <p>Excluir "{deletingCategory.label}"?</p>
    {txCount > 0 ? (
      <>
        <p>{txCount} transacoes serao migradas para:</p>
        <select value={migrateTo} onChange={...}>
          {categories.filter(c => c.id !== deletingCategory.id).map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </>
    ) : (
      <p>Nenhuma transacao vinculada. Sera excluida diretamente.</p>
    )}
    <button onClick={handleConfirmDelete}>Confirmar</button>
    <button onClick={() => setDeletingCategory(null)}>Cancelar</button>
  </div>
)}
```

**Step 6: Move Burn Rate to Orcamento**

1. In `FinanceDashboard.tsx`: remove `<BurnRateCard>` or burn rate display from Visao Geral
2. In `BudgetView.tsx`: import burn rate data (either via context or local fetch)
3. Render burn rate card at top of Orcamento tab

**Step 7: Verify build + visual check**

Run: `npm run build && npm run typecheck`
Manual: Open Orcamento, verify dynamic categories, CRUD, burn rate

**Step 8: Commit**

```bash
git add src/modules/finance/views/BudgetView.tsx src/modules/finance/views/FinanceDashboard.tsx
git commit -m "feat(finance): BudgetView with dynamic categories, CRUD, migration delete, burn rate"
```

---

## Task 10: Update remaining category consumers

**Files:**
- Modify: `src/modules/finance/components/RecategorizeModal.tsx` (uses TRANSACTION_CATEGORIES)
- Modify: `src/modules/finance/components/GoalForm.tsx` (uses TRANSACTION_CATEGORIES)
- Modify: `src/modules/finance/components/RecategorizationReview.tsx` (may use CATEGORY_LABELS)

**Step 1: Update each component**

For each file, replace hardcoded `TRANSACTION_CATEGORIES` / `CATEGORY_LABELS` with `useFinanceContext()`:

```typescript
const { categories, getCategoryLabel } = useFinanceContext();
const categoryKeys = categories.map(c => c.key);
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`

**Step 3: Commit**

```bash
git add src/modules/finance/components/RecategorizeModal.tsx src/modules/finance/components/GoalForm.tsx src/modules/finance/components/RecategorizationReview.tsx
git commit -m "refactor(finance): remaining components use context categories instead of hardcoded lists"
```

---

## Task 11: Gemini Integration — Pass user categories to Edge Functions

**Files:**
- Modify: `src/modules/finance/services/pdfProcessingService.ts`
- Modify: `supabase/functions/gemini-chat/index.ts`

**Step 1: Update pdfProcessingService to accept category list**

In `processStatement()` and the categorization call, accept optional `userCategories: string[]` parameter. Pass to Edge Function payload:

```typescript
const result = await EdgeFunctionService.callGeminiEdgeFunction('parse_statement', {
  text: preprocessedText,
  user_categories: userCategories, // NEW
});
```

**Step 2: Update gemini-chat Edge Function**

In the `parse_statement` and `categorize_transactions` handlers:

```typescript
// If user_categories provided, use them instead of hardcoded list
const categories = payload.user_categories || DEFAULT_CATEGORIES;
const categoryList = categories.join(', ');
// Inject into prompt: "Categorize into one of: ${categoryList}"
```

**Step 3: Update FinanceDashboard upload flow**

When uploading a PDF, pass categories from context:

```typescript
const { categories } = useFinanceContext();
const categoryKeys = categories.map(c => c.key);
// Pass to processStatement()
```

**Step 4: Deploy Edge Function**

Run: `npx supabase functions deploy gemini-chat --no-verify-jwt`

**Step 5: Verify end-to-end**

Manual: Upload a PDF, verify new categories (pensao, escola) appear in suggestions

**Step 6: Commit**

```bash
git add src/modules/finance/services/pdfProcessingService.ts supabase/functions/gemini-chat/index.ts
git commit -m "feat(finance): Gemini uses user categories from DB for categorization"
```

---

## Task 12: Final Verification & Cleanup

**Files:**
- All modified files

**Step 1: Full build verification**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

**Step 2: Run all finance tests**

Run: `npm run test -- src/modules/finance/`
Expected: All pass

**Step 3: Manual verification checklist**

- [ ] Visao Geral: Gastos por Categoria shows selected month data
- [ ] Visao Geral: "Todos" shows all-time data
- [ ] Visao Geral: Month navigator persists across tab switches
- [ ] Transacoes: ExpenseChart visible at top
- [ ] Transacoes: Category dropdown shows DB categories
- [ ] Transacoes: Inline edit uses DB categories
- [ ] Transacoes: No crash (TRANSACTION_CATEGORIES fix)
- [ ] Orcamento: Shows all DB categories (not just 8)
- [ ] Orcamento: Create new category works
- [ ] Orcamento: Edit category (label, icon, color) works
- [ ] Orcamento: Delete category with 0 transactions works
- [ ] Orcamento: Delete category with N transactions shows migration modal
- [ ] Orcamento: Burn Rate card visible
- [ ] PDF upload: Uses user categories for Gemini categorization

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(finance): final cleanup and verification"
```

---

## Execution Order & Dependencies

```
Task 1 (DB migration)
  └─> Task 2 (Category service) — needs table
       └─> Task 3 (Types + period service) — needs service types
            └─> Task 4 (FinanceContext) — needs service + types
                 └─> Task 5 (Wrap Dashboard) — needs context
                      ├─> Task 6 (Charts) — independent of other tabs
                      ├─> Task 7 (Visao Geral) — needs charts done
                      ├─> Task 8 (Transacoes) — needs context
                      ├─> Task 9 (Orcamento) — needs context
                      └─> Task 10 (Other consumers) — needs context
                           └─> Task 11 (Gemini) — needs categories flowing
                                └─> Task 12 (Verification)
```

Tasks 6-10 can be parallelized after Task 5 is complete.
