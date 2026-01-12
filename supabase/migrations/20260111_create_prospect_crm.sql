-- =============================================================================
-- PROSPECT CRM MIGRATION
-- Issue #101 - Sistema de prospeccao e CRM de patrocinadores
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PART 1: CREATE prospect_activities - Registro de atividades de prospeccao
-- =============================================================================

CREATE TABLE IF NOT EXISTS prospect_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES project_sponsors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de atividade
  activity_type VARCHAR(30) NOT NULL
    CHECK (activity_type IN (
      'email_sent', 'email_received', 'call_outbound', 'call_inbound',
      'meeting', 'proposal_sent', 'follow_up', 'negotiation',
      'contract_sent', 'contract_signed', 'note', 'other'
    )),

  -- Conteudo
  title VARCHAR(200) NOT NULL,
  description TEXT,
  outcome VARCHAR(50), -- 'positive', 'negative', 'neutral', 'pending'

  -- Proxima acao
  next_action TEXT,
  next_action_date DATE,

  -- Metadata
  duration_minutes INTEGER, -- Para calls e meetings
  attachments JSONB DEFAULT '[]'::jsonb, -- Links para arquivos

  -- Timestamps
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_prospect_activities_sponsor ON prospect_activities(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_user ON prospect_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_type ON prospect_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_date ON prospect_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_next_action ON prospect_activities(next_action_date)
  WHERE next_action_date IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_prospect_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prospect_activities_updated_at ON prospect_activities;
CREATE TRIGGER trigger_prospect_activities_updated_at
  BEFORE UPDATE ON prospect_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_activities_updated_at();

-- =============================================================================
-- PART 2: CREATE prospect_reminders - Lembretes de follow-up
-- =============================================================================

CREATE TABLE IF NOT EXISTS prospect_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES project_sponsors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES prospect_activities(id) ON DELETE SET NULL,

  -- Conteudo
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Agendamento
  remind_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Recorrencia (opcional)
  recurrence_type VARCHAR(20), -- 'daily', 'weekly', 'monthly', null
  recurrence_end_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_prospect_reminders_sponsor ON prospect_reminders(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_prospect_reminders_user ON prospect_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_reminders_remind_at ON prospect_reminders(remind_at)
  WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_prospect_reminders_pending ON prospect_reminders(user_id, remind_at)
  WHERE is_completed = false;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_prospect_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prospect_reminders_updated_at ON prospect_reminders;
CREATE TRIGGER trigger_prospect_reminders_updated_at
  BEFORE UPDATE ON prospect_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_reminders_updated_at();

-- =============================================================================
-- PART 3: RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_reminders ENABLE ROW LEVEL SECURITY;

-- prospect_activities policies
DROP POLICY IF EXISTS "Users can view their own activities" ON prospect_activities;
CREATE POLICY "Users can view their own activities"
  ON prospect_activities FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own activities" ON prospect_activities;
CREATE POLICY "Users can insert their own activities"
  ON prospect_activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own activities" ON prospect_activities;
CREATE POLICY "Users can update their own activities"
  ON prospect_activities FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own activities" ON prospect_activities;
CREATE POLICY "Users can delete their own activities"
  ON prospect_activities FOR DELETE
  USING (user_id = auth.uid());

-- prospect_reminders policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON prospect_reminders;
CREATE POLICY "Users can view their own reminders"
  ON prospect_reminders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own reminders" ON prospect_reminders;
CREATE POLICY "Users can insert their own reminders"
  ON prospect_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own reminders" ON prospect_reminders;
CREATE POLICY "Users can update their own reminders"
  ON prospect_reminders FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own reminders" ON prospect_reminders;
CREATE POLICY "Users can delete their own reminders"
  ON prospect_reminders FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- PART 4: VIEWS para metricas de pipeline
-- =============================================================================

-- View para metricas de conversao por projeto
CREATE OR REPLACE VIEW prospect_pipeline_metrics AS
SELECT
  ps.project_id,
  ps.status,
  COUNT(*) as count,
  SUM(COALESCE(ps.negotiated_value, st.value)) as total_value,
  AVG(EXTRACT(EPOCH FROM (ps.status_changed_at - ps.created_at)) / 86400)::INTEGER as avg_days_in_pipeline
FROM project_sponsors ps
JOIN sponsorship_tiers st ON ps.tier_id = st.id
GROUP BY ps.project_id, ps.status;

-- View para atividades recentes com detalhes do sponsor
CREATE OR REPLACE VIEW recent_prospect_activities AS
SELECT
  pa.*,
  ps.company_name,
  ps.contact_name,
  ps.status as sponsor_status,
  st.name as tier_name,
  gp.project_name
FROM prospect_activities pa
JOIN project_sponsors ps ON pa.sponsor_id = ps.id
JOIN sponsorship_tiers st ON ps.tier_id = st.id
JOIN grant_projects gp ON ps.project_id = gp.id
ORDER BY pa.activity_date DESC;

-- =============================================================================
-- PART 5: FUNCTION para calcular metricas de conversao
-- =============================================================================

CREATE OR REPLACE FUNCTION get_prospect_conversion_metrics(p_project_id UUID)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  total_value NUMERIC,
  conversion_rate NUMERIC,
  avg_time_days INTEGER
) AS $$
DECLARE
  total_leads BIGINT;
BEGIN
  -- Contar total de leads
  SELECT COUNT(*) INTO total_leads
  FROM project_sponsors
  WHERE project_id = p_project_id;

  RETURN QUERY
  WITH stage_data AS (
    SELECT
      ps.status::TEXT as stage,
      COUNT(*)::BIGINT as cnt,
      SUM(COALESCE(ps.negotiated_value, st.value))::NUMERIC as total_val,
      AVG(
        CASE
          WHEN ps.status_changed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ps.status_changed_at - ps.created_at)) / 86400
          ELSE NULL
        END
      )::INTEGER as avg_days
    FROM project_sponsors ps
    JOIN sponsorship_tiers st ON ps.tier_id = st.id
    WHERE ps.project_id = p_project_id
    GROUP BY ps.status
  )
  SELECT
    sd.stage,
    sd.cnt,
    sd.total_val,
    CASE
      WHEN total_leads > 0 THEN ROUND((sd.cnt::NUMERIC / total_leads::NUMERIC) * 100, 2)
      ELSE 0
    END as conversion_rate,
    sd.avg_days
  FROM stage_data sd
  ORDER BY
    CASE sd.stage
      WHEN 'lead' THEN 1
      WHEN 'contacted' THEN 2
      WHEN 'meeting_scheduled' THEN 3
      WHEN 'proposal_sent' THEN 4
      WHEN 'negotiating' THEN 5
      WHEN 'committed' THEN 6
      WHEN 'contract_signed' THEN 7
      WHEN 'payment_pending' THEN 8
      WHEN 'payment_partial' THEN 9
      WHEN 'payment_complete' THEN 10
      WHEN 'declined' THEN 11
      WHEN 'churned' THEN 12
      ELSE 99
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_prospect_conversion_metrics(UUID) TO authenticated;

-- =============================================================================
-- PART 6: FUNCTION para buscar lembretes pendentes
-- =============================================================================

CREATE OR REPLACE FUNCTION get_pending_reminders(p_user_id UUID, p_days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  reminder_id UUID,
  sponsor_id UUID,
  company_name TEXT,
  contact_name TEXT,
  project_name TEXT,
  title TEXT,
  description TEXT,
  remind_at TIMESTAMPTZ,
  days_until INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id as reminder_id,
    pr.sponsor_id,
    ps.company_name::TEXT,
    ps.contact_name::TEXT,
    gp.project_name::TEXT,
    pr.title::TEXT,
    pr.description::TEXT,
    pr.remind_at,
    EXTRACT(DAY FROM (pr.remind_at - NOW()))::INTEGER as days_until
  FROM prospect_reminders pr
  JOIN project_sponsors ps ON pr.sponsor_id = ps.id
  JOIN grant_projects gp ON ps.project_id = gp.id
  WHERE pr.user_id = p_user_id
    AND pr.is_completed = false
    AND pr.remind_at <= NOW() + (p_days_ahead || ' days')::INTERVAL
  ORDER BY pr.remind_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pending_reminders(UUID, INTEGER) TO authenticated;
