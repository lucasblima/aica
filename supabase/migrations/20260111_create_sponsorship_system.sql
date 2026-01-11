-- =============================================================================
-- SPONSORSHIP SYSTEM MIGRATION
-- Issue #97 - Sistema de cotas de patrocinio para projetos aprovados
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PART 1: ALTER grant_projects - Adicionar campos de aprovacao e captacao
-- =============================================================================

-- Campos de aprovacao
ALTER TABLE grant_projects
ADD COLUMN IF NOT EXISTS approved_value NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS approval_date DATE,
ADD COLUMN IF NOT EXISTS approval_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS validity_start DATE,
ADD COLUMN IF NOT EXISTS validity_end DATE;

-- Campos de captacao
ALTER TABLE grant_projects
ADD COLUMN IF NOT EXISTS capture_status VARCHAR(20) DEFAULT 'not_started'
  CHECK (capture_status IN ('not_started', 'in_progress', 'paused', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS captured_value NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS capture_goal NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS capture_deadline DATE;

-- Referencias para organizacoes e leis de incentivo
ALTER TABLE grant_projects
ADD COLUMN IF NOT EXISTS incentive_law_id UUID REFERENCES incentive_laws(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS proponent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS executor_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Indices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_grant_projects_capture_status ON grant_projects(capture_status);
CREATE INDEX IF NOT EXISTS idx_grant_projects_incentive_law ON grant_projects(incentive_law_id);
CREATE INDEX IF NOT EXISTS idx_grant_projects_proponent ON grant_projects(proponent_organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_projects_executor ON grant_projects(executor_organization_id);

-- =============================================================================
-- PART 2: CREATE sponsorship_tiers - Cotas de patrocinio
-- =============================================================================

CREATE TABLE IF NOT EXISTS sponsorship_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES grant_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificacao
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Valores
  value NUMERIC(15,2) NOT NULL CHECK (value >= 0),
  quantity_total INTEGER NOT NULL CHECK (quantity_total > 0),
  quantity_sold INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),

  -- Ordenacao
  display_order INTEGER NOT NULL DEFAULT 1,

  -- Estilo visual
  color VARCHAR(20),
  icon VARCHAR(50),

  -- Configuracoes
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_highlighted BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_quantity_sold CHECK (quantity_sold <= quantity_total)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_project ON sponsorship_tiers(project_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_user ON sponsorship_tiers(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_tiers_active ON sponsorship_tiers(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_sponsorship_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsorship_tiers_updated_at ON sponsorship_tiers;
CREATE TRIGGER trigger_sponsorship_tiers_updated_at
  BEFORE UPDATE ON sponsorship_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsorship_tiers_updated_at();

-- =============================================================================
-- PART 3: CREATE tier_deliverables - Contrapartidas por cota
-- =============================================================================

CREATE TABLE IF NOT EXISTS tier_deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_id UUID NOT NULL REFERENCES sponsorship_tiers(id) ON DELETE CASCADE,

  -- Conteudo
  category VARCHAR(50) NOT NULL
    CHECK (category IN (
      'logo_exposure', 'media_mention', 'event_presence',
      'content_production', 'networking', 'report_access',
      'exclusive_experience', 'product_sample', 'other'
    )),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INTEGER, -- NULL quando a contrapartida nao tem quantidade especifica (ex: "Exposicao de Logo")

  -- Ordenacao
  display_order INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tier_deliverables_tier ON tier_deliverables(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_deliverables_category ON tier_deliverables(category);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tier_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tier_deliverables_updated_at ON tier_deliverables;
CREATE TRIGGER trigger_tier_deliverables_updated_at
  BEFORE UPDATE ON tier_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_deliverables_updated_at();

-- =============================================================================
-- PART 4: CREATE project_sponsors - Patrocinadores com status de funil
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES grant_projects(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES sponsorship_tiers(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Patrocinador (pode ser organizacao existente ou contato avulso)
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  contact_name VARCHAR(200),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  company_name VARCHAR(200),

  -- Pipeline
  status VARCHAR(30) NOT NULL DEFAULT 'lead'
    CHECK (status IN (
      'lead', 'contacted', 'meeting_scheduled', 'proposal_sent',
      'negotiating', 'committed', 'contract_signed',
      'payment_pending', 'payment_partial', 'payment_complete',
      'declined', 'churned'
    )),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_action TEXT,
  next_action_date DATE,

  -- Valores
  negotiated_value NUMERIC(15,2),
  paid_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_due_date DATE,

  -- Notas
  notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_project_sponsors_project ON project_sponsors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_sponsors_tier ON project_sponsors(tier_id);
CREATE INDEX IF NOT EXISTS idx_project_sponsors_user ON project_sponsors(user_id);
CREATE INDEX IF NOT EXISTS idx_project_sponsors_status ON project_sponsors(status);
CREATE INDEX IF NOT EXISTS idx_project_sponsors_organization ON project_sponsors(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_sponsors_payment_due ON project_sponsors(payment_due_date)
  WHERE status IN ('payment_pending', 'payment_partial');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_project_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_sponsors_updated_at ON project_sponsors;
CREATE TRIGGER trigger_project_sponsors_updated_at
  BEFORE UPDATE ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_project_sponsors_updated_at();

-- =============================================================================
-- PART 5: RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE sponsorship_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sponsors ENABLE ROW LEVEL SECURITY;

-- sponsorship_tiers policies
DROP POLICY IF EXISTS "Users can view their own tiers" ON sponsorship_tiers;
CREATE POLICY "Users can view their own tiers"
  ON sponsorship_tiers FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own tiers" ON sponsorship_tiers;
CREATE POLICY "Users can insert their own tiers"
  ON sponsorship_tiers FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own tiers" ON sponsorship_tiers;
CREATE POLICY "Users can update their own tiers"
  ON sponsorship_tiers FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own tiers" ON sponsorship_tiers;
CREATE POLICY "Users can delete their own tiers"
  ON sponsorship_tiers FOR DELETE
  USING (user_id = auth.uid());

-- tier_deliverables policies (via tier ownership)
DROP POLICY IF EXISTS "Users can view deliverables of their tiers" ON tier_deliverables;
CREATE POLICY "Users can view deliverables of their tiers"
  ON tier_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sponsorship_tiers st
      WHERE st.id = tier_deliverables.tier_id
      AND st.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert deliverables to their tiers" ON tier_deliverables;
CREATE POLICY "Users can insert deliverables to their tiers"
  ON tier_deliverables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sponsorship_tiers st
      WHERE st.id = tier_deliverables.tier_id
      AND st.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update deliverables of their tiers" ON tier_deliverables;
CREATE POLICY "Users can update deliverables of their tiers"
  ON tier_deliverables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sponsorship_tiers st
      WHERE st.id = tier_deliverables.tier_id
      AND st.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete deliverables of their tiers" ON tier_deliverables;
CREATE POLICY "Users can delete deliverables of their tiers"
  ON tier_deliverables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sponsorship_tiers st
      WHERE st.id = tier_deliverables.tier_id
      AND st.user_id = auth.uid()
    )
  );

-- project_sponsors policies
DROP POLICY IF EXISTS "Users can view their own sponsors" ON project_sponsors;
CREATE POLICY "Users can view their own sponsors"
  ON project_sponsors FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own sponsors" ON project_sponsors;
CREATE POLICY "Users can insert their own sponsors"
  ON project_sponsors FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sponsors" ON project_sponsors;
CREATE POLICY "Users can update their own sponsors"
  ON project_sponsors FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own sponsors" ON project_sponsors;
CREATE POLICY "Users can delete their own sponsors"
  ON project_sponsors FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- PART 6: TRIGGERS para atualizar captured_value e quantity_sold
-- =============================================================================

-- Trigger para atualizar quantity_sold quando um patrocinador e confirmado
CREATE OR REPLACE FUNCTION update_tier_quantity_sold()
RETURNS TRIGGER AS $$
DECLARE
  confirmed_statuses TEXT[] := ARRAY['committed', 'contract_signed', 'payment_pending', 'payment_partial', 'payment_complete'];
  old_is_confirmed BOOLEAN;
  new_is_confirmed BOOLEAN;
BEGIN
  -- Verificar se o status antigo era confirmado
  old_is_confirmed := OLD.status = ANY(confirmed_statuses);
  -- Verificar se o novo status e confirmado
  new_is_confirmed := NEW.status = ANY(confirmed_statuses);

  -- Se mudou de nao-confirmado para confirmado, incrementar
  IF NOT old_is_confirmed AND new_is_confirmed THEN
    UPDATE sponsorship_tiers
    SET quantity_sold = quantity_sold + 1
    WHERE id = NEW.tier_id;
  -- Se mudou de confirmado para nao-confirmado, decrementar
  ELSIF old_is_confirmed AND NOT new_is_confirmed THEN
    UPDATE sponsorship_tiers
    SET quantity_sold = GREATEST(quantity_sold - 1, 0)
    WHERE id = NEW.tier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tier_quantity_sold ON project_sponsors;
CREATE TRIGGER trigger_update_tier_quantity_sold
  AFTER UPDATE OF status ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_quantity_sold();

-- Trigger para quando um novo patrocinador e inserido com status confirmado
CREATE OR REPLACE FUNCTION handle_new_sponsor_quantity()
RETURNS TRIGGER AS $$
DECLARE
  confirmed_statuses TEXT[] := ARRAY['committed', 'contract_signed', 'payment_pending', 'payment_partial', 'payment_complete'];
BEGIN
  IF NEW.status = ANY(confirmed_statuses) THEN
    UPDATE sponsorship_tiers
    SET quantity_sold = quantity_sold + 1
    WHERE id = NEW.tier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_sponsor_quantity ON project_sponsors;
CREATE TRIGGER trigger_new_sponsor_quantity
  AFTER INSERT ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_sponsor_quantity();

-- Trigger para quando um patrocinador e deletado
CREATE OR REPLACE FUNCTION handle_deleted_sponsor_quantity()
RETURNS TRIGGER AS $$
DECLARE
  confirmed_statuses TEXT[] := ARRAY['committed', 'contract_signed', 'payment_pending', 'payment_partial', 'payment_complete'];
BEGIN
  IF OLD.status = ANY(confirmed_statuses) THEN
    UPDATE sponsorship_tiers
    SET quantity_sold = GREATEST(quantity_sold - 1, 0)
    WHERE id = OLD.tier_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deleted_sponsor_quantity ON project_sponsors;
CREATE TRIGGER trigger_deleted_sponsor_quantity
  AFTER DELETE ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION handle_deleted_sponsor_quantity();

-- Trigger para atualizar captured_value do projeto
CREATE OR REPLACE FUNCTION update_project_captured_value()
RETURNS TRIGGER AS $$
DECLARE
  total_captured NUMERIC(15,2);
  project_uuid UUID;
BEGIN
  -- Determinar o project_id
  IF TG_OP = 'DELETE' THEN
    project_uuid := OLD.project_id;
  ELSE
    project_uuid := NEW.project_id;
  END IF;

  -- Calcular total captado (patrocinadores confirmados)
  SELECT COALESCE(SUM(
    COALESCE(ps.negotiated_value, st.value)
  ), 0)
  INTO total_captured
  FROM project_sponsors ps
  JOIN sponsorship_tiers st ON ps.tier_id = st.id
  WHERE ps.project_id = project_uuid
  AND ps.status IN ('committed', 'contract_signed', 'payment_pending', 'payment_partial', 'payment_complete');

  -- Atualizar projeto
  UPDATE grant_projects
  SET captured_value = total_captured
  WHERE id = project_uuid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_captured_value_insert ON project_sponsors;
CREATE TRIGGER trigger_update_captured_value_insert
  AFTER INSERT ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_project_captured_value();

DROP TRIGGER IF EXISTS trigger_update_captured_value_update ON project_sponsors;
CREATE TRIGGER trigger_update_captured_value_update
  AFTER UPDATE OF status, negotiated_value ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_project_captured_value();

DROP TRIGGER IF EXISTS trigger_update_captured_value_delete ON project_sponsors;
CREATE TRIGGER trigger_update_captured_value_delete
  AFTER DELETE ON project_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_project_captured_value();

-- =============================================================================
-- PART 7: FUNCAO get_project_sponsorship_context() para IA
-- =============================================================================

CREATE OR REPLACE FUNCTION get_project_sponsorship_context(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  project_data RECORD;
  tiers_data JSONB;
  sponsors_by_status JSONB;
  confirmed_count INTEGER;
  confirmed_value NUMERIC(15,2);
BEGIN
  -- Buscar dados do projeto
  SELECT
    gp.id,
    gp.project_name,
    gp.approved_value,
    gp.approval_date,
    gp.approval_number,
    gp.validity_start,
    gp.validity_end,
    gp.capture_status,
    gp.capture_goal,
    gp.capture_deadline,
    gp.captured_value,
    CASE WHEN gp.capture_goal > 0
      THEN LEAST((gp.captured_value / gp.capture_goal) * 100, 100)
      ELSE 0
    END as capture_percentage,
    CASE WHEN il.id IS NOT NULL
      THEN jsonb_build_object(
        'id', il.id,
        'name', il.name,
        'short_name', il.short_name,
        'tax_type', il.tax_type
      )
      ELSE NULL
    END as incentive_law,
    CASE WHEN prop.id IS NOT NULL
      THEN jsonb_build_object(
        'id', prop.id,
        'name', prop.name,
        'document_number', prop.document_number
      )
      ELSE NULL
    END as proponent,
    CASE WHEN exec.id IS NOT NULL
      THEN jsonb_build_object(
        'id', exec.id,
        'name', exec.name,
        'document_number', exec.document_number
      )
      ELSE NULL
    END as executor
  INTO project_data
  FROM grant_projects gp
  LEFT JOIN incentive_laws il ON gp.incentive_law_id = il.id
  LEFT JOIN organizations prop ON gp.proponent_organization_id = prop.id
  LEFT JOIN organizations exec ON gp.executor_organization_id = exec.id
  WHERE gp.id = p_project_id;

  IF project_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar cotas com contrapartidas
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', st.id,
      'name', st.name,
      'value', st.value,
      'quantity_total', st.quantity_total,
      'quantity_sold', st.quantity_sold,
      'quantity_available', st.quantity_total - st.quantity_sold,
      'total_potential_value', st.quantity_total * st.value,
      'deliverables', COALESCE(
        (SELECT jsonb_agg(td.title ORDER BY td.display_order)
         FROM tier_deliverables td
         WHERE td.tier_id = st.id),
        '[]'::jsonb
      )
    ) ORDER BY st.display_order
  )
  INTO tiers_data
  FROM sponsorship_tiers st
  WHERE st.project_id = p_project_id
  AND st.is_active = true;

  -- Contar patrocinadores por status
  SELECT jsonb_object_agg(status, cnt)
  INTO sponsors_by_status
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM project_sponsors
    WHERE project_id = p_project_id
    GROUP BY status
  ) sub;

  -- Contar confirmados e valor confirmado
  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(ps.negotiated_value, st.value)), 0)
  INTO confirmed_count, confirmed_value
  FROM project_sponsors ps
  JOIN sponsorship_tiers st ON ps.tier_id = st.id
  WHERE ps.project_id = p_project_id
  AND ps.status IN ('committed', 'contract_signed', 'payment_pending', 'payment_partial', 'payment_complete');

  -- Montar resultado
  result := jsonb_build_object(
    'project_id', project_data.id,
    'project_name', project_data.project_name,
    'approved_value', project_data.approved_value,
    'approval_date', project_data.approval_date,
    'approval_number', project_data.approval_number,
    'validity_start', project_data.validity_start,
    'validity_end', project_data.validity_end,
    'incentive_law', project_data.incentive_law,
    'proponent', project_data.proponent,
    'executor', project_data.executor,
    'capture_status', project_data.capture_status,
    'capture_goal', project_data.capture_goal,
    'capture_deadline', project_data.capture_deadline,
    'captured_value', project_data.captured_value,
    'capture_percentage', project_data.capture_percentage,
    'tiers', COALESCE(tiers_data, '[]'::jsonb),
    'sponsors_by_status', COALESCE(sponsors_by_status, '{}'::jsonb),
    'total_sponsors', (SELECT COUNT(*) FROM project_sponsors WHERE project_id = p_project_id),
    'confirmed_sponsors', confirmed_count,
    'confirmed_value', confirmed_value
  );

  RETURN result;
END;
$$;

-- Comentarios
COMMENT ON TABLE sponsorship_tiers IS 'Cotas de patrocinio para projetos aprovados';
COMMENT ON TABLE tier_deliverables IS 'Contrapartidas oferecidas em cada cota de patrocinio';
COMMENT ON TABLE project_sponsors IS 'Patrocinadores vinculados a projetos com status de funil de vendas';
COMMENT ON FUNCTION get_project_sponsorship_context IS 'Retorna contexto completo de captacao de um projeto para uso em IA';
