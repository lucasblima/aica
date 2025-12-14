-- ============================================================================
-- MIGRATION: Connection Ventures - Business & Entrepreneurship Archetype
-- Date: 2025-12-14
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Create specialized tables for the Ventures archetype:
-- - ventures_entities: Business entities and legal structure
-- - ventures_metrics: Financial KPIs and business health
-- - ventures_milestones: Product, financial, and team milestones
-- - ventures_stakeholders: Founders, investors, advisors, team
--
-- PHILOSOPHY:
-- Ventures is the "Motor de Criação" - cockpit of professional ambition.
-- Clarity, precision, metric-driven. Focus on business health and growth.
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE VENTURES_ENTITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ventures_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,

    -- Legal information
    legal_name TEXT NOT NULL,
    trading_name TEXT,
    cnpj TEXT,
    entity_type TEXT, -- 'MEI', 'EIRELI', 'LTDA', 'SA', 'SLU', 'STARTUP', 'NONPROFIT'

    -- Contact information
    email TEXT,
    phone TEXT,
    website TEXT,

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'BR',

    -- Business classification
    founded_at DATE,
    sector TEXT, -- Technology, Finance, Healthcare, Education, etc.
    subsector TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_legal_name_not_empty CHECK (legal_name <> '')
);

COMMENT ON TABLE public.ventures_entities IS
'Business entities within Ventures spaces. Stores legal structure and company information.';
COMMENT ON COLUMN public.ventures_entities.entity_type IS 'Legal entity type: MEI, EIRELI, LTDA, SA, SLU, STARTUP, NONPROFIT';
COMMENT ON COLUMN public.ventures_entities.sector IS 'Business sector/industry classification';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ventures_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ventures_entities_updated_at
    BEFORE UPDATE ON public.ventures_entities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ventures_entities_updated_at();

-- Enable RLS
ALTER TABLE public.ventures_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ventures_entities_select"
    ON public.ventures_entities FOR SELECT
    USING (is_connection_space_member(space_id));

CREATE POLICY "ventures_entities_insert"
    ON public.ventures_entities FOR INSERT
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "ventures_entities_update"
    ON public.ventures_entities FOR UPDATE
    USING (is_connection_space_admin(space_id))
    WITH CHECK (is_connection_space_admin(space_id));

CREATE POLICY "ventures_entities_delete"
    ON public.ventures_entities FOR DELETE
    USING (is_connection_space_admin(space_id));

-- Indexes
CREATE INDEX idx_ventures_entities_space_id
    ON public.ventures_entities(space_id);
CREATE INDEX idx_ventures_entities_is_active
    ON public.ventures_entities(space_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_ventures_entities_cnpj
    ON public.ventures_entities(cnpj)
    WHERE cnpj IS NOT NULL;

-- ============================================================================
-- PART 2: CREATE VENTURES_METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ventures_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES public.ventures_entities(id) ON DELETE CASCADE,

    -- Period information
    period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Revenue metrics
    mrr NUMERIC(12, 2), -- Monthly Recurring Revenue
    arr NUMERIC(12, 2), -- Annual Recurring Revenue
    total_revenue NUMERIC(12, 2),

    -- Expense metrics
    total_expenses NUMERIC(12, 2),
    payroll NUMERIC(12, 2),
    operational NUMERIC(12, 2),
    marketing NUMERIC(12, 2),

    -- Cash flow & runway
    burn_rate NUMERIC(12, 2), -- Monthly cash burn
    cash_balance NUMERIC(12, 2), -- Current cash on hand
    runway_months INTEGER, -- Months until cash runs out

    -- Profitability
    gross_margin_pct NUMERIC(5, 2), -- Percentage
    net_margin_pct NUMERIC(5, 2), -- Percentage
    ebitda NUMERIC(12, 2),

    -- Customer metrics
    active_customers INTEGER,
    new_customers INTEGER,
    churned_customers INTEGER,
    churn_rate_pct NUMERIC(5, 2),

    -- Unit economics
    cac NUMERIC(10, 2), -- Customer Acquisition Cost
    ltv NUMERIC(10, 2), -- Lifetime Value
    ltv_cac_ratio NUMERIC(5, 2), -- LTV/CAC ratio

    -- Team metrics
    employee_count INTEGER,
    contractor_count INTEGER,

    -- Flags
    is_current BOOLEAN DEFAULT FALSE, -- Is this the current period?
    is_projected BOOLEAN DEFAULT FALSE, -- Is this a projection/forecast?

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_period_type CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    CONSTRAINT check_period_dates CHECK (period_end > period_start),
    CONSTRAINT unique_entity_period UNIQUE(entity_id, period_start, period_end)
);

COMMENT ON TABLE public.ventures_metrics IS
'Financial and operational metrics for ventures. Tracks KPIs, burn rate, runway, and unit economics.';
COMMENT ON COLUMN public.ventures_metrics.mrr IS 'Monthly Recurring Revenue';
COMMENT ON COLUMN public.ventures_metrics.arr IS 'Annual Recurring Revenue';
COMMENT ON COLUMN public.ventures_metrics.burn_rate IS 'Monthly cash burn rate';
COMMENT ON COLUMN public.ventures_metrics.runway_months IS 'Months until cash runs out at current burn rate';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ventures_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ventures_metrics_updated_at
    BEFORE UPDATE ON public.ventures_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ventures_metrics_updated_at();

-- Enable RLS
ALTER TABLE public.ventures_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ventures_metrics_select"
    ON public.ventures_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_metrics.entity_id
            AND is_connection_space_member(ve.space_id)
        )
    );

CREATE POLICY "ventures_metrics_insert"
    ON public.ventures_metrics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_metrics.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

CREATE POLICY "ventures_metrics_update"
    ON public.ventures_metrics FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_metrics.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_metrics.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

CREATE POLICY "ventures_metrics_delete"
    ON public.ventures_metrics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_metrics.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

-- Indexes
CREATE INDEX idx_ventures_metrics_entity_id
    ON public.ventures_metrics(entity_id);
CREATE INDEX idx_ventures_metrics_period
    ON public.ventures_metrics(entity_id, period_start DESC);
CREATE INDEX idx_ventures_metrics_is_current
    ON public.ventures_metrics(entity_id, is_current)
    WHERE is_current = TRUE;
CREATE INDEX idx_ventures_metrics_period_type
    ON public.ventures_metrics(entity_id, period_type);

-- ============================================================================
-- PART 3: CREATE VENTURES_MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ventures_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES public.ventures_entities(id) ON DELETE CASCADE,

    -- Milestone details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'produto', 'financeiro', 'equipe', 'legal', 'mercado', 'tecnologia'

    -- Target information
    target_date DATE,
    target_value NUMERIC(12, 2), -- Numeric target (revenue, users, etc.)
    target_metric TEXT, -- What is being measured (e.g., 'MRR', 'Users', 'Team Size')
    target_unit TEXT, -- Unit of measurement (e.g., 'BRL', 'users', 'employees')

    -- Progress tracking
    current_value NUMERIC(12, 2),
    progress_pct INTEGER DEFAULT 0, -- 0-100

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'achieved', 'missed', 'cancelled'
    achieved_at TIMESTAMPTZ,

    -- Priority
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Dependencies
    depends_on_milestone_id UUID REFERENCES public.ventures_milestones(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_title_not_empty CHECK (title <> ''),
    CONSTRAINT check_progress_range CHECK (progress_pct BETWEEN 0 AND 100),
    CONSTRAINT check_status CHECK (status IN ('pending', 'in_progress', 'achieved', 'missed', 'cancelled')),
    CONSTRAINT check_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

COMMENT ON TABLE public.ventures_milestones IS
'Milestones and goals for ventures. Tracks progress toward product, financial, team, and market objectives.';
COMMENT ON COLUMN public.ventures_milestones.category IS 'Milestone category: produto, financeiro, equipe, legal, mercado, tecnologia';
COMMENT ON COLUMN public.ventures_milestones.target_value IS 'Numeric target (e.g., 100000 for 100k MRR)';
COMMENT ON COLUMN public.ventures_milestones.progress_pct IS 'Progress percentage (0-100)';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ventures_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ventures_milestones_updated_at
    BEFORE UPDATE ON public.ventures_milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ventures_milestones_updated_at();

-- Enable RLS
ALTER TABLE public.ventures_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ventures_milestones_select"
    ON public.ventures_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_milestones.entity_id
            AND is_connection_space_member(ve.space_id)
        )
    );

CREATE POLICY "ventures_milestones_insert"
    ON public.ventures_milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_milestones.entity_id
            AND is_connection_space_member(ve.space_id)
        )
    );

CREATE POLICY "ventures_milestones_update"
    ON public.ventures_milestones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_milestones.entity_id
            AND is_connection_space_member(ve.space_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_milestones.entity_id
            AND is_connection_space_member(ve.space_id)
        )
    );

CREATE POLICY "ventures_milestones_delete"
    ON public.ventures_milestones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_milestones.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

-- Indexes
CREATE INDEX idx_ventures_milestones_entity_id
    ON public.ventures_milestones(entity_id);
CREATE INDEX idx_ventures_milestones_status
    ON public.ventures_milestones(entity_id, status);
CREATE INDEX idx_ventures_milestones_target_date
    ON public.ventures_milestones(entity_id, target_date);
CREATE INDEX idx_ventures_milestones_category
    ON public.ventures_milestones(entity_id, category)
    WHERE category IS NOT NULL;
CREATE INDEX idx_ventures_milestones_priority
    ON public.ventures_milestones(entity_id, priority);
CREATE INDEX idx_ventures_milestones_depends_on
    ON public.ventures_milestones(depends_on_milestone_id)
    WHERE depends_on_milestone_id IS NOT NULL;

-- ============================================================================
-- PART 4: CREATE VENTURES_STAKEHOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ventures_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES public.ventures_entities(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.connection_members(id) ON DELETE SET NULL,

    -- Stakeholder type
    stakeholder_type TEXT NOT NULL, -- 'founder', 'co-founder', 'investor', 'advisor', 'employee', 'contractor', 'board'
    role_title TEXT, -- Job title (e.g., 'CEO', 'CTO', 'Lead Engineer')

    -- Equity information
    equity_pct NUMERIC(5, 2), -- Percentage of ownership
    shares_count BIGINT, -- Number of shares
    share_class TEXT, -- 'common', 'preferred'

    -- Vesting
    vesting_start_date DATE,
    vesting_cliff_months INTEGER, -- Months until first vesting
    vesting_period_months INTEGER, -- Total vesting period in months
    vesting_schedule TEXT, -- 'monthly', 'quarterly', 'yearly'

    -- Investment information (for investors)
    investment_amount NUMERIC(12, 2),
    investment_date DATE,
    investment_round TEXT, -- 'pre-seed', 'seed', 'series-a', 'series-b', etc.
    investment_instrument TEXT, -- 'equity', 'safe', 'convertible-note'

    -- Employment information
    employment_type TEXT, -- 'full-time', 'part-time', 'contractor', 'advisor'
    start_date DATE,
    end_date DATE,
    salary NUMERIC(10, 2),

    -- Contact & bio
    bio TEXT,
    linkedin_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT check_stakeholder_type CHECK (
        stakeholder_type IN ('founder', 'co-founder', 'investor', 'advisor', 'employee', 'contractor', 'board')
    ),
    CONSTRAINT check_equity_range CHECK (equity_pct IS NULL OR equity_pct BETWEEN 0 AND 100)
);

COMMENT ON TABLE public.ventures_stakeholders IS
'Stakeholders in ventures: founders, investors, advisors, employees. Tracks equity, vesting, and investments.';
COMMENT ON COLUMN public.ventures_stakeholders.stakeholder_type IS 'Type: founder, co-founder, investor, advisor, employee, contractor, board';
COMMENT ON COLUMN public.ventures_stakeholders.equity_pct IS 'Percentage of ownership (0-100)';
COMMENT ON COLUMN public.ventures_stakeholders.vesting_cliff_months IS 'Months until first vesting event';
COMMENT ON COLUMN public.ventures_stakeholders.investment_round IS 'Investment round: pre-seed, seed, series-a, series-b, etc.';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ventures_stakeholders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ventures_stakeholders_updated_at
    BEFORE UPDATE ON public.ventures_stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ventures_stakeholders_updated_at();

-- Enable RLS
ALTER TABLE public.ventures_stakeholders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ventures_stakeholders_select"
    ON public.ventures_stakeholders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_stakeholders.entity_id
            AND is_connection_space_member(ve.space_id)
        )
    );

CREATE POLICY "ventures_stakeholders_insert"
    ON public.ventures_stakeholders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_stakeholders.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

CREATE POLICY "ventures_stakeholders_update"
    ON public.ventures_stakeholders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_stakeholders.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_stakeholders.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

CREATE POLICY "ventures_stakeholders_delete"
    ON public.ventures_stakeholders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.ventures_entities ve
            WHERE ve.id = ventures_stakeholders.entity_id
            AND is_connection_space_admin(ve.space_id)
        )
    );

-- Indexes
CREATE INDEX idx_ventures_stakeholders_entity_id
    ON public.ventures_stakeholders(entity_id);
CREATE INDEX idx_ventures_stakeholders_member_id
    ON public.ventures_stakeholders(member_id)
    WHERE member_id IS NOT NULL;
CREATE INDEX idx_ventures_stakeholders_type
    ON public.ventures_stakeholders(entity_id, stakeholder_type);
CREATE INDEX idx_ventures_stakeholders_is_active
    ON public.ventures_stakeholders(entity_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_ventures_stakeholders_investment_round
    ON public.ventures_stakeholders(entity_id, investment_round)
    WHERE investment_round IS NOT NULL;

-- ============================================================================
-- PART 5: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_entities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures_stakeholders TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETION VERIFICATION
-- ============================================================================

-- Tables created:
-- 1. ventures_entities - Business entities and legal structure
-- 2. ventures_metrics - Financial KPIs and business health
-- 3. ventures_milestones - Milestone tracking
-- 4. ventures_stakeholders - Founders, investors, advisors, team
--
-- All tables:
-- - Have RLS enabled
-- - Use SECURITY DEFINER functions for permission checks
-- - Include proper indexes for performance
-- - Have update triggers for updated_at timestamps
-- - Reference connection_spaces for multi-tenant security
--
-- Verification query:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename LIKE 'ventures_%'
-- ORDER BY tablename, policyname;
