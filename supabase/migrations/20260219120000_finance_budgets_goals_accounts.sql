-- =====================================================
-- Finance Module: Budgets, Goals & Multi-Account Support
-- Migration: 20260219120000_finance_budgets_goals_accounts.sql
-- Created: 2026-02-19
-- Author: db-architect agent
-- =====================================================

-- =====================================================
-- 1. finance_budgets — Monthly category budgets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  budget_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category, month, year)
);

ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON public.finance_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON public.finance_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.finance_budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON public.finance_budgets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finance_budgets_user_month_year
  ON public.finance_budgets(user_id, month, year);

COMMENT ON TABLE public.finance_budgets IS 'Monthly budget targets per category for each user';

-- =====================================================
-- 2. finance_goals — Savings & financial goals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('savings', 'debt_payoff', 'investment', 'emergency_fund', 'custom')),
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.finance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.finance_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.finance_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.finance_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.finance_goals FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finance_goals_user_active
  ON public.finance_goals(user_id, is_active);

COMMENT ON TABLE public.finance_goals IS 'Financial goals with progress tracking (savings, debt payoff, investments, etc.)';

-- =====================================================
-- 3. finance_accounts — Multi-account support
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  bank_name TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),
  is_default BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#F59E0B',
  icon TEXT DEFAULT 'building',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON public.finance_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON public.finance_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.finance_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON public.finance_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_user_active
  ON public.finance_accounts(user_id, is_active);

COMMENT ON TABLE public.finance_accounts IS 'User financial accounts (bank, credit card, investment) for multi-account tracking';

-- =====================================================
-- 4. Add account_id FK to finance_transactions
-- =====================================================
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_account_id
  ON public.finance_transactions(account_id);

-- =====================================================
-- 5. updated_at triggers for new tables
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_finance_budgets ON public.finance_budgets;
CREATE TRIGGER set_updated_at_finance_budgets
  BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_finance_goals ON public.finance_goals;
CREATE TRIGGER set_updated_at_finance_goals
  BEFORE UPDATE ON public.finance_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_finance_accounts ON public.finance_accounts;
CREATE TRIGGER set_updated_at_finance_accounts
  BEFORE UPDATE ON public.finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- 6. RPCs
-- =====================================================

-- 6a. upsert_budget — Insert or update a monthly category budget
CREATE OR REPLACE FUNCTION public.upsert_budget(
  p_user_id UUID,
  p_category TEXT,
  p_amount NUMERIC,
  p_month INT,
  p_year INT
)
RETURNS public.finance_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.finance_budgets;
BEGIN
  INSERT INTO public.finance_budgets (user_id, category, budget_amount, month, year)
  VALUES (p_user_id, p_category, p_amount, p_month, p_year)
  ON CONFLICT (user_id, category, month, year)
  DO UPDATE SET
    budget_amount = EXCLUDED.budget_amount,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- 6b. get_budget_summary — Budget vs actual spending for a given month
CREATE OR REPLACE FUNCTION public.get_budget_summary(
  p_user_id UUID,
  p_month INT,
  p_year INT
)
RETURNS TABLE(
  category TEXT,
  budget_amount NUMERIC,
  spent NUMERIC,
  remaining NUMERIC,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.category,
    b.budget_amount,
    COALESCE(t.total_spent, 0) AS spent,
    b.budget_amount - COALESCE(t.total_spent, 0) AS remaining,
    CASE
      WHEN b.budget_amount > 0 THEN ROUND((COALESCE(t.total_spent, 0) / b.budget_amount) * 100, 1)
      ELSE 0
    END AS percentage
  FROM public.finance_budgets b
  LEFT JOIN (
    SELECT
      ft.category AS cat,
      SUM(ABS(ft.amount)) AS total_spent
    FROM public.finance_transactions ft
    WHERE ft.user_id = p_user_id
      AND ft.type = 'expense'
      AND EXTRACT(MONTH FROM ft.transaction_date)::INT = p_month
      AND EXTRACT(YEAR FROM ft.transaction_date)::INT = p_year
      AND (ft.is_duplicate = false OR ft.is_duplicate IS NULL)
    GROUP BY ft.category
  ) t ON t.cat = b.category
  WHERE b.user_id = p_user_id
    AND b.month = p_month
    AND b.year = p_year
  ORDER BY b.budget_amount DESC;
END;
$$;

-- 6c. get_goal_progress — All goals with calculated progress
CREATE OR REPLACE FUNCTION public.get_goal_progress(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  goal_type TEXT,
  target_amount NUMERIC,
  current_amount NUMERIC,
  progress_pct NUMERIC,
  deadline DATE,
  category TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.title,
    g.goal_type,
    g.target_amount,
    g.current_amount,
    CASE
      WHEN g.target_amount > 0 THEN ROUND((g.current_amount / g.target_amount) * 100, 1)
      ELSE 0
    END AS progress_pct,
    g.deadline,
    g.category,
    g.is_active
  FROM public.finance_goals g
  WHERE g.user_id = p_user_id
  ORDER BY g.is_active DESC, g.deadline ASC NULLS LAST;
END;
$$;

-- 6d. detect_recurring_transactions — Find and mark recurring transactions
CREATE OR REPLACE FUNCTION public.detect_recurring_transactions(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Find transactions with the same normalized description appearing
  -- in 3+ distinct months and mark them as recurring
  WITH recurring_descriptions AS (
    SELECT LOWER(TRIM(ft.description)) AS normalized_desc
    FROM public.finance_transactions ft
    WHERE ft.user_id = p_user_id
      AND (ft.is_duplicate = false OR ft.is_duplicate IS NULL)
    GROUP BY LOWER(TRIM(ft.description))
    HAVING COUNT(DISTINCT DATE_TRUNC('month', ft.transaction_date)) >= 3
  )
  UPDATE public.finance_transactions ft
  SET is_recurring = true
  FROM recurring_descriptions rd
  WHERE ft.user_id = p_user_id
    AND LOWER(TRIM(ft.description)) = rd.normalized_desc
    AND ft.is_recurring = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- 7. Comments on RPCs
-- =====================================================
COMMENT ON FUNCTION public.upsert_budget IS 'Insert or update a monthly category budget for a user';
COMMENT ON FUNCTION public.get_budget_summary IS 'Returns budget vs actual spending per category for a given month/year';
COMMENT ON FUNCTION public.get_goal_progress IS 'Returns all financial goals with calculated progress percentage';
COMMENT ON FUNCTION public.detect_recurring_transactions IS 'Detects and marks recurring transactions based on normalized description frequency across 3+ months';
