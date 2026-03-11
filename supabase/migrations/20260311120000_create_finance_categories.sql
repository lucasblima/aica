-- =====================================================
-- Finance Module: User-Customizable Categories
-- Migration: 20260311120000_create_finance_categories.sql
-- Created: 2026-03-11
--
-- Adds a finance_categories table so users can customize
-- category labels, icons, colors, and order.
-- Includes a seed RPC for default categories and a
-- delete RPC that migrates transactions before removal.
-- =====================================================

-- =====================================================
-- 1. finance_categories table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- =====================================================
-- 2. RLS — 4 policies
-- =====================================================
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON public.finance_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.finance_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.finance_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.finance_categories FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Index
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id
  ON public.finance_categories(user_id);

-- =====================================================
-- 4. Comments
-- =====================================================
COMMENT ON TABLE public.finance_categories
  IS 'User-customizable finance categories with label, icon, color, and sort order';

-- =====================================================
-- 5. RPC: seed_default_categories
--    Only seeds if the user has 0 categories.
-- =====================================================
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Guard: only seed when user has no categories yet
  SELECT COUNT(*) INTO v_count
    FROM public.finance_categories
   WHERE user_id = p_user_id;

  IF v_count > 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.finance_categories
    (user_id, key, label, icon, color, is_expense, sort_order)
  VALUES
    -- Expense categories (18)
    (p_user_id, 'housing',              'Moradia',              '🏠', '#8B5CF6', true,  1),
    (p_user_id, 'food',                 'Alimentacao',          '🍽️', '#F59E0B', true,  2),
    (p_user_id, 'transport',            'Transporte',           '🚗', '#3B82F6', true,  3),
    (p_user_id, 'health',               'Saude',                '💊', '#EF4444', true,  4),
    (p_user_id, 'education',            'Educacao',             '📚', '#6366F1', true,  5),
    (p_user_id, 'entertainment',        'Lazer',                '🎬', '#EC4899', true,  6),
    (p_user_id, 'shopping',             'Compras',              '🛒', '#F97316', true,  7),
    (p_user_id, 'bills',                'Contas',               '📄', '#64748B', true,  8),
    (p_user_id, 'subscription',         'Assinaturas',          '📱', '#0EA5E9', true,  9),
    (p_user_id, 'personal_care',        'Cuidados Pessoais',    '💅', '#D946EF', true, 10),
    (p_user_id, 'pets',                 'Pets',                 '🐾', '#A3E635', true, 11),
    (p_user_id, 'travel',               'Viagem',               '✈️', '#14B8A6', true, 12),
    (p_user_id, 'gifts',                'Presentes',            '🎁', '#FB923C', true, 13),
    (p_user_id, 'pensao',               'Pensao',               '👨‍👧', '#78716C', true, 14),
    (p_user_id, 'escola',               'Escola (filhos)',      '🎒', '#4F46E5', true, 15),
    (p_user_id, 'transporte_escolar',   'Transporte Escolar',   '🚌', '#0284C7', true, 16),
    (p_user_id, 'transfer',             'Transferencia',        '🔄', '#94A3B8', true, 17),
    (p_user_id, 'other',                'Outros',               '📦', '#6B7280', true, 18),
    -- Income categories (3)
    (p_user_id, 'salary',               'Salario',              '💰', '#22C55E', false, 1),
    (p_user_id, 'freelance',            'Freelance',            '💻', '#10B981', false, 2),
    (p_user_id, 'investment',           'Investimentos',        '📈', '#059669', false, 3);
END;
$$;

COMMENT ON FUNCTION public.seed_default_categories
  IS 'Seeds default finance categories for a user (no-op if categories already exist)';

-- =====================================================
-- 6. RPC: delete_category_with_migration
--    Deletes a category, optionally migrating its
--    transactions and budgets to another category key.
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_category_with_migration(
  p_category_id UUID,
  p_migrate_to_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_key TEXT;
  v_tx_count INT;
  v_migrated INT := 0;
BEGIN
  -- 1. Fetch the category and verify ownership
  SELECT fc.user_id, fc.key
    INTO v_user_id, v_old_key
    FROM public.finance_categories fc
   WHERE fc.id = p_category_id
     AND fc.user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'category_not_found_or_not_owner'
    );
  END IF;

  -- 2. Count transactions using this category
  SELECT COUNT(*) INTO v_tx_count
    FROM public.finance_transactions ft
   WHERE ft.user_id = v_user_id
     AND ft.category = v_old_key;

  -- 3. If transactions exist but no migration target → error
  IF v_tx_count > 0 AND p_migrate_to_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_transactions',
      'transaction_count', v_tx_count
    );
  END IF;

  -- 4. Migrate transactions + budgets if needed
  IF v_tx_count > 0 AND p_migrate_to_key IS NOT NULL THEN
    UPDATE public.finance_transactions
       SET category = p_migrate_to_key
     WHERE user_id = v_user_id
       AND category = v_old_key;

    GET DIAGNOSTICS v_migrated = ROW_COUNT;

    UPDATE public.finance_budgets
       SET category = p_migrate_to_key
     WHERE user_id = v_user_id
       AND category = v_old_key;
  END IF;

  -- 5. Delete the category
  DELETE FROM public.finance_categories
   WHERE id = p_category_id
     AND user_id = auth.uid();

  -- 6. Return result
  RETURN jsonb_build_object(
    'success', true,
    'migrated_transactions', v_migrated,
    'old_key', v_old_key,
    'new_key', COALESCE(p_migrate_to_key, '__deleted__')
  );
END;
$$;

COMMENT ON FUNCTION public.delete_category_with_migration
  IS 'Deletes a finance category, optionally migrating transactions and budgets to another category key';
