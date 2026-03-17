-- =====================================================
-- Finance Monthly Digests — Persisted AI Summaries
-- =====================================================
-- Stores AI-generated monthly financial digests so they
-- don't need to be regenerated for closed months.
-- month is 1-indexed (1=Jan, 12=Dec) matching FinanceContext convention.

CREATE TABLE IF NOT EXISTS public.finance_monthly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-indexed (1=Jan, 12=Dec)
  digest_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  transaction_count INTEGER DEFAULT 0,
  total_income NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  UNIQUE(user_id, year, month)
);

-- RLS — Non-Negotiable
ALTER TABLE public.finance_monthly_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own digests" ON public.finance_monthly_digests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digests" ON public.finance_monthly_digests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digests" ON public.finance_monthly_digests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own digests" ON public.finance_monthly_digests
  FOR DELETE USING (auth.uid() = user_id);
