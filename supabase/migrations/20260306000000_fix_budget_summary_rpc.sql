-- Fix get_budget_summary to include ALL categories with expenses, not just those with budgets.
-- Uses FULL OUTER JOIN so categories appear even without a budget row.

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
    COALESCE(b.category, t.cat) AS category,
    COALESCE(b.budget_amount, 0) AS budget_amount,
    COALESCE(t.total_spent, 0) AS spent,
    COALESCE(b.budget_amount, 0) - COALESCE(t.total_spent, 0) AS remaining,
    CASE
      WHEN COALESCE(b.budget_amount, 0) > 0 THEN ROUND((COALESCE(t.total_spent, 0) / b.budget_amount) * 100, 1)
      ELSE 0
    END AS percentage
  FROM (
    SELECT
      fb.category,
      fb.budget_amount
    FROM public.finance_budgets fb
    WHERE fb.user_id = p_user_id
      AND fb.month = p_month
      AND fb.year = p_year
  ) b
  FULL OUTER JOIN (
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
  ORDER BY COALESCE(t.total_spent, 0) DESC, COALESCE(b.budget_amount, 0) DESC;
END;
$$;
