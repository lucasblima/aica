-- Migration: Create Organizations Entity
-- Issue: #95 - Criar entidade Organizations para modelar instituicoes proponentes e executoras
-- Date: 2026-01-11

-- =============================================================================
-- TABELA: organizations
-- Modelagem de instituicoes (ONGs, empresas, associacoes, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identificacao
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255), -- Razao social
  document_number VARCHAR(20), -- CNPJ
  organization_type VARCHAR(50) NOT NULL CHECK (organization_type IN (
    'ong', 'empresa', 'instituto', 'associacao', 'cooperativa', 'governo', 'outro'
  )),

  -- Contato
  email VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),

  -- Endereco
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),
  address_country VARCHAR(50) DEFAULT 'Brasil',

  -- Contextualizacao
  description TEXT,
  mission TEXT,
  vision TEXT,
  values TEXT,
  areas_of_activity TEXT[] DEFAULT '{}',
  foundation_year INTEGER,

  -- Recursos visuais
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  brand_colors JSONB DEFAULT '{}', -- { "primary": "#hex", "secondary": "#hex", "accent": "#hex" }

  -- Social media
  social_links JSONB DEFAULT '{}', -- { "instagram": "url", "facebook": "url", "linkedin": "url" }

  -- Metadados
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  profile_completeness INTEGER DEFAULT 0, -- 0-100%

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON public.organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_document ON public.organizations(document_number) WHERE document_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_city_state ON public.organizations(address_city, address_state);
CREATE INDEX IF NOT EXISTS idx_organizations_areas ON public.organizations USING GIN(areas_of_activity);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- TABELA: organization_relationships
-- Relacionamentos entre organizacoes (parceria, execucao, financiamento, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organizacoes relacionadas
  organization_a_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  organization_b_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,

  -- Tipo de relacionamento
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'parceria', 'execucao', 'financiamento', 'fiscalizacao', 'apoio', 'afiliacao', 'outro'
  )),

  -- Direcao do relacionamento (A -> B)
  -- Ex: VOV (A) e proponente de projeto executado por UBA (B)
  direction_label_a_to_b VARCHAR(100), -- "e proponente de"
  direction_label_b_to_a VARCHAR(100), -- "executa projeto de"

  -- Contexto
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Metadados
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar duplicatas
  CONSTRAINT unique_org_relationship UNIQUE (organization_a_id, organization_b_id, relationship_type),
  -- Constraint para evitar auto-relacionamento
  CONSTRAINT no_self_relationship CHECK (organization_a_id != organization_b_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_org_rel_org_a ON public.organization_relationships(organization_a_id);
CREATE INDEX IF NOT EXISTS idx_org_rel_org_b ON public.organization_relationships(organization_b_id);
CREATE INDEX IF NOT EXISTS idx_org_rel_type ON public.organization_relationships(relationship_type);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_org_relationships_updated_at ON public.organization_relationships;
CREATE TRIGGER update_org_relationships_updated_at
  BEFORE UPDATE ON public.organization_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- TABELA: organization_members
-- Membros/funcionarios de uma organizacao (link com contact_network)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contact_network(id) ON DELETE CASCADE NOT NULL,

  -- Cargo/funcao
  role VARCHAR(100), -- "Presidente", "Coordenador de Projetos"
  department VARCHAR(100),

  -- Periodo
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Permissoes (para futura funcionalidade de colaboracao)
  permissions JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_org_member UNIQUE (organization_id, contact_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_contact ON public.organization_members(contact_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_org_members_updated_at ON public.organization_members;
CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own organizations" ON public.organizations;
CREATE POLICY "Users can view their own organizations"
  ON public.organizations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own organizations" ON public.organizations;
CREATE POLICY "Users can create their own organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;
CREATE POLICY "Users can update their own organizations"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own organizations" ON public.organizations;
CREATE POLICY "Users can delete their own organizations"
  ON public.organizations FOR DELETE
  USING (auth.uid() = user_id);

-- Organization Relationships (via organization ownership)
ALTER TABLE public.organization_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage relationships of their organizations" ON public.organization_relationships;
CREATE POLICY "Users can manage relationships of their organizations"
  ON public.organization_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_a_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_b_id AND user_id = auth.uid()
    )
  );

-- Organization Members (via organization ownership)
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage members of their organizations" ON public.organization_members;
CREATE POLICY "Users can manage members of their organizations"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCAO: Calcular completude do perfil
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_organization_completeness(org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  completeness INTEGER := 0;
  org RECORD;
BEGIN
  SELECT * INTO org FROM public.organizations WHERE id = org_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Campos basicos (30%)
  IF org.name IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF org.document_number IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF org.organization_type IS NOT NULL THEN completeness := completeness + 10; END IF;

  -- Contato (20%)
  IF org.email IS NOT NULL THEN completeness := completeness + 7; END IF;
  IF org.phone IS NOT NULL THEN completeness := completeness + 7; END IF;
  IF org.website IS NOT NULL THEN completeness := completeness + 6; END IF;

  -- Endereco (15%)
  IF org.address_city IS NOT NULL AND org.address_state IS NOT NULL THEN
    completeness := completeness + 15;
  END IF;

  -- Contextualizacao (25%)
  IF org.description IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF org.mission IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF array_length(org.areas_of_activity, 1) > 0 THEN completeness := completeness + 5; END IF;

  -- Visual (10%)
  IF org.logo_url IS NOT NULL THEN completeness := completeness + 10; END IF;

  RETURN completeness;
END;
$$;

-- Trigger para atualizar completeness automaticamente
CREATE OR REPLACE FUNCTION public.update_organization_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.profile_completeness := public.calculate_organization_completeness(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_organization_completeness ON public.organizations;
CREATE TRIGGER trigger_update_organization_completeness
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_completeness();

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON TABLE public.organizations IS 'Instituicoes (ONGs, empresas, etc.) cadastradas pelo usuario';
COMMENT ON TABLE public.organization_relationships IS 'Relacionamentos entre organizacoes (parceria, execucao, etc.)';
COMMENT ON TABLE public.organization_members IS 'Membros/funcionarios vinculados a uma organizacao';
COMMENT ON COLUMN public.organizations.profile_completeness IS 'Percentual de completude do perfil (0-100)';
COMMENT ON COLUMN public.organizations.areas_of_activity IS 'Array de areas de atuacao: cultura, educacao, saude, meio_ambiente, etc.';

-- =============================================================================
-- SUCCESS LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '[Organizations Migration] Tables created successfully:';
  RAISE NOTICE '  - organizations (with RLS)';
  RAISE NOTICE '  - organization_relationships (with RLS)';
  RAISE NOTICE '  - organization_members (with RLS)';
  RAISE NOTICE '  - Functions: calculate_organization_completeness, update_organization_completeness';
END $$;
