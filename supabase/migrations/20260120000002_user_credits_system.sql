-- ============================================
-- USER CREDITS SYSTEM
-- Process with Aica - Credit-based cost moderation
-- ============================================

-- ============================================
-- USER CREDITS TABLE
-- Tracks user credit balance and lifetime stats
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 50,  -- Starting free credits
    lifetime_earned INTEGER NOT NULL DEFAULT 50,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    last_daily_claim TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_credits UNIQUE (user_id),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- RLS Policies
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
    ON public.user_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
    ON public.user_credits FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- Audit log of all credit movements
-- ============================================
DO $$ BEGIN
    CREATE TYPE credit_transaction_type AS ENUM (
        'initial_grant',      -- First-time user bonus
        'daily_login',        -- Daily login reward
        'task_completion',    -- Completed a task
        'analysis_spend',     -- Spent on contact analysis
        'referral_bonus',     -- Referred a friend
        'achievement_bonus',  -- Unlocked achievement
        'purchase',           -- Future: bought credits
        'admin_adjustment'    -- Manual adjustment
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type credit_transaction_type NOT NULL,
    amount INTEGER NOT NULL,  -- Positive = earned, Negative = spent
    balance_after INTEGER NOT NULL,
    reference_id UUID,  -- Optional: links to contact_analysis, task, etc.
    reference_type TEXT,  -- 'contact_analysis', 'task', 'achievement', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- CONTACT ANALYSIS TABLE
-- Stores AI-generated insights per contact
-- ============================================
DO $$ BEGIN
    CREATE TYPE analysis_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.contact_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contact_network(id) ON DELETE CASCADE,

    -- Processing metadata
    status analysis_status NOT NULL DEFAULT 'pending',
    credits_spent INTEGER NOT NULL DEFAULT 0,
    messages_analyzed INTEGER NOT NULL DEFAULT 0,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,

    -- AI Analysis Results
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    sentiment_summary JSONB DEFAULT '{}',
    -- { overall: 'positive'|'neutral'|'negative', score: 0.0-1.0, breakdown: {...} }

    topics JSONB DEFAULT '[]',
    -- [{ name: string, frequency: number, sentiment: string }]

    action_items JSONB DEFAULT '[]',
    -- [{ text: string, priority: 'high'|'medium'|'low', due_hint: string|null }]

    relationship_insights JSONB DEFAULT '{}',
    -- { communication_style: string, response_patterns: {...}, recommendations: [...] }

    key_moments JSONB DEFAULT '[]',
    -- [{ date: string, summary: string, importance: number }]

    -- Versioning for re-analysis
    analysis_version INTEGER NOT NULL DEFAULT 1,
    model_used TEXT DEFAULT 'gemini-1.5-flash',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_analysis_user_id ON public.contact_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_analysis_contact_id ON public.contact_analysis(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_analysis_status ON public.contact_analysis(status);

-- RLS
ALTER TABLE public.contact_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
    ON public.contact_analysis FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
    ON public.contact_analysis FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
    ON public.contact_analysis FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- UPDATE contact_network TABLE
-- Add columns for analysis integration
-- ============================================
ALTER TABLE public.contact_network
    ADD COLUMN IF NOT EXISTS last_analysis_id UUID REFERENCES public.contact_analysis(id),
    ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- health_score may already exist, add if not
DO $$
BEGIN
    ALTER TABLE public.contact_network ADD COLUMN health_score INTEGER;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create credits for new users
CREATE OR REPLACE FUNCTION public.create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_credits (user_id, balance, lifetime_earned)
    VALUES (NEW.id, 50, 50)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log initial grant transaction
    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, metadata)
    VALUES (NEW.id, 'initial_grant', 50, 50, '{"reason": "Welcome bonus"}');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating credits (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_credits();

-- Function to spend credits (atomic operation)
CREATE OR REPLACE FUNCTION public.spend_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference_id UUID,
    p_reference_type TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock row for update
    SELECT balance INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User credits not found'::TEXT;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient credits'::TEXT;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- Update balance
    UPDATE public.user_credits
    SET balance = v_new_balance,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.credit_transactions (
        user_id, type, amount, balance_after,
        reference_id, reference_type, metadata
    ) VALUES (
        p_user_id, 'analysis_spend', -p_amount, v_new_balance,
        p_reference_id, p_reference_type, p_metadata
    );

    RETURN QUERY SELECT TRUE, v_new_balance, 'Credits spent successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to earn credits
CREATE OR REPLACE FUNCTION public.earn_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type credit_transaction_type,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER) AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.user_credits
    SET balance = balance + p_amount,
        lifetime_earned = lifetime_earned + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
        -- Create credits row if doesn't exist
        INSERT INTO public.user_credits (user_id, balance, lifetime_earned)
        VALUES (p_user_id, p_amount, p_amount)
        RETURNING balance INTO v_new_balance;
    END IF;

    -- Log transaction
    INSERT INTO public.credit_transactions (
        user_id, type, amount, balance_after,
        reference_id, reference_type, metadata
    ) VALUES (
        p_user_id, p_type, p_amount, v_new_balance,
        p_reference_id, p_reference_type, p_metadata
    );

    RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim daily credits
CREATE OR REPLACE FUNCTION public.claim_daily_credits(p_user_id UUID)
RETURNS TABLE (success BOOLEAN, credits_earned INTEGER, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_last_claim TIMESTAMPTZ;
    v_new_balance INTEGER;
    v_daily_amount INTEGER := 5;
BEGIN
    -- Check last claim
    SELECT last_daily_claim INTO v_last_claim
    FROM public.user_credits
    WHERE user_id = p_user_id;

    -- Check if already claimed today
    IF v_last_claim IS NOT NULL AND v_last_claim::DATE = CURRENT_DATE THEN
        SELECT balance INTO v_new_balance FROM public.user_credits WHERE user_id = p_user_id;
        RETURN QUERY SELECT FALSE, 0, COALESCE(v_new_balance, 0), 'Already claimed today'::TEXT;
        RETURN;
    END IF;

    -- Award daily credits
    UPDATE public.user_credits
    SET balance = balance + v_daily_amount,
        lifetime_earned = lifetime_earned + v_daily_amount,
        last_daily_claim = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
        -- Create credits row if doesn't exist
        INSERT INTO public.user_credits (user_id, balance, lifetime_earned, last_daily_claim)
        VALUES (p_user_id, 50 + v_daily_amount, 50 + v_daily_amount, NOW())
        RETURNING balance INTO v_new_balance;
    END IF;

    -- Log transaction
    INSERT INTO public.credit_transactions (
        user_id, type, amount, balance_after, metadata
    ) VALUES (
        p_user_id, 'daily_login', v_daily_amount, v_new_balance,
        jsonb_build_object('claimed_at', NOW())
    );

    RETURN QUERY SELECT TRUE, v_daily_amount, v_new_balance, 'Daily credits claimed!'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp trigger function (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_analysis_updated_at ON public.contact_analysis;
CREATE TRIGGER update_contact_analysis_updated_at
    BEFORE UPDATE ON public.contact_analysis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_credits TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_analysis TO authenticated;

-- ============================================
-- SEED: Create credits for existing users
-- ============================================
INSERT INTO public.user_credits (user_id, balance, lifetime_earned)
SELECT id, 50, 50
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_credits WHERE user_credits.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log initial grant for existing users that just got credits
INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, metadata)
SELECT uc.user_id, 'initial_grant', 50, 50, '{"reason": "Welcome bonus (existing user)"}'
FROM public.user_credits uc
WHERE NOT EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = uc.user_id AND ct.type = 'initial_grant'
);
