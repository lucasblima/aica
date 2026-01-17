-- Migration: Link Organizations to Ventures
-- Issue: #100 - Wizard gamificado - Integracao Organization -> Venture
-- Date: 2026-01-14
--
-- Quando uma Organization e criada no modulo Grants, ela pode ser
-- automaticamente vinculada a um VenturesEntity no modulo Connections.

-- =============================================================================
-- ADICIONAR COLUNAS DE VINCULACAO
-- =============================================================================

-- Adicionar FK para vincular Organization ao ConnectionSpace
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS connection_space_id UUID REFERENCES public.connection_spaces(id) ON DELETE SET NULL;

-- Adicionar FK para vincular Organization ao VenturesEntity
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS ventures_entity_id UUID REFERENCES public.ventures_entities(id) ON DELETE SET NULL;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_organizations_connection_space
  ON public.organizations(connection_space_id)
  WHERE connection_space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_ventures_entity
  ON public.organizations(ventures_entity_id)
  WHERE ventures_entity_id IS NOT NULL;

-- =============================================================================
-- FUNCAO: Criar Venture a partir de Organization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_venture_from_organization(
  p_organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_space_id UUID;
  v_entity_id UUID;
  v_entity_type VARCHAR(20);
  v_sector VARCHAR(100);
BEGIN
  -- Buscar dados da organization
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', p_organization_id;
  END IF;

  -- Verificar se ja tem venture vinculado
  IF v_org.ventures_entity_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Organization already linked to a venture',
      'ventures_entity_id', v_org.ventures_entity_id
    );
  END IF;

  -- Mapear organization_type para entity_type
  v_entity_type := CASE v_org.organization_type
    WHEN 'empresa' THEN 'LTDA'
    WHEN 'ong' THEN 'NONPROFIT'
    WHEN 'instituto' THEN 'NONPROFIT'
    WHEN 'associacao' THEN 'NONPROFIT'
    WHEN 'cooperativa' THEN 'LTDA'
    WHEN 'governo' THEN 'NONPROFIT'
    ELSE 'LTDA'
  END;

  -- Mapear areas_of_activity para sector (pegar primeiro)
  v_sector := CASE
    WHEN array_length(v_org.areas_of_activity, 1) > 0
    THEN v_org.areas_of_activity[1]
    ELSE NULL
  END;

  -- 1. Criar ConnectionSpace com archetype 'ventures'
  INSERT INTO public.connection_spaces (
    user_id,
    archetype,
    name,
    subtitle,
    description,
    icon,
    color_theme,
    is_active,
    is_favorite
  ) VALUES (
    v_org.user_id,
    'ventures',
    COALESCE(v_org.name, v_org.legal_name, 'Nova Empresa'),
    v_org.legal_name,
    v_org.description,
    'building-2', -- Lucide icon
    COALESCE((v_org.brand_colors->>'primary')::VARCHAR, '#3B82F6'),
    true,
    false
  )
  RETURNING id INTO v_space_id;

  -- 2. Criar VenturesEntity
  INSERT INTO public.ventures_entities (
    space_id,
    legal_name,
    trading_name,
    cnpj,
    entity_type,
    email,
    phone,
    website,
    address_line1,
    city,
    state,
    postal_code,
    country,
    sector,
    founded_at,
    is_active
  ) VALUES (
    v_space_id,
    COALESCE(v_org.legal_name, v_org.name),
    v_org.name,
    v_org.document_number,
    v_entity_type,
    v_org.email,
    v_org.phone,
    v_org.website,
    CONCAT_WS(', ', v_org.address_street, v_org.address_number, v_org.address_complement),
    v_org.address_city,
    v_org.address_state,
    v_org.address_zip,
    COALESCE(v_org.address_country, 'Brasil'),
    v_sector,
    CASE
      WHEN v_org.foundation_year IS NOT NULL
      THEN make_date(v_org.foundation_year, 1, 1)::TEXT
      ELSE NULL
    END,
    true
  )
  RETURNING id INTO v_entity_id;

  -- 3. Atualizar Organization com os IDs criados
  UPDATE public.organizations
  SET
    connection_space_id = v_space_id,
    ventures_entity_id = v_entity_id,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'organization_id', p_organization_id,
    'connection_space_id', v_space_id,
    'ventures_entity_id', v_entity_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automatico por ser uma funcao
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'organization_id', p_organization_id
    );
END;
$$;

-- =============================================================================
-- FUNCAO: Sincronizar Organization -> Venture
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_organization_to_venture(
  p_organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_entity_type VARCHAR(20);
  v_sector VARCHAR(100);
BEGIN
  -- Buscar dados da organization
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', p_organization_id;
  END IF;

  -- Verificar se tem venture vinculado
  IF v_org.ventures_entity_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Organization not linked to a venture'
    );
  END IF;

  -- Mapear tipos
  v_entity_type := CASE v_org.organization_type
    WHEN 'empresa' THEN 'LTDA'
    WHEN 'ong' THEN 'NONPROFIT'
    WHEN 'instituto' THEN 'NONPROFIT'
    WHEN 'associacao' THEN 'NONPROFIT'
    WHEN 'cooperativa' THEN 'LTDA'
    WHEN 'governo' THEN 'NONPROFIT'
    ELSE 'LTDA'
  END;

  v_sector := CASE
    WHEN array_length(v_org.areas_of_activity, 1) > 0
    THEN v_org.areas_of_activity[1]
    ELSE NULL
  END;

  -- Atualizar ConnectionSpace
  UPDATE public.connection_spaces
  SET
    name = COALESCE(v_org.name, v_org.legal_name),
    subtitle = v_org.legal_name,
    description = v_org.description,
    color_theme = COALESCE((v_org.brand_colors->>'primary')::VARCHAR, color_theme),
    updated_at = NOW()
  WHERE id = v_org.connection_space_id;

  -- Atualizar VenturesEntity
  UPDATE public.ventures_entities
  SET
    legal_name = COALESCE(v_org.legal_name, v_org.name),
    trading_name = v_org.name,
    cnpj = v_org.document_number,
    entity_type = v_entity_type,
    email = v_org.email,
    phone = v_org.phone,
    website = v_org.website,
    address_line1 = CONCAT_WS(', ', v_org.address_street, v_org.address_number, v_org.address_complement),
    city = v_org.address_city,
    state = v_org.address_state,
    postal_code = v_org.address_zip,
    country = COALESCE(v_org.address_country, 'Brasil'),
    sector = v_sector,
    founded_at = CASE
      WHEN v_org.foundation_year IS NOT NULL
      THEN make_date(v_org.foundation_year, 1, 1)::TEXT
      ELSE founded_at
    END,
    updated_at = NOW()
  WHERE id = v_org.ventures_entity_id;

  RETURN json_build_object(
    'success', true,
    'organization_id', p_organization_id,
    'ventures_entity_id', v_org.ventures_entity_id,
    'synced_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =============================================================================
-- TRIGGER: Auto-sync Organization -> Venture on UPDATE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_sync_org_to_venture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas sincronizar se ja tiver venture vinculado
  IF NEW.ventures_entity_id IS NOT NULL THEN
    PERFORM public.sync_organization_to_venture(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_sync_org_venture ON public.organizations;
CREATE TRIGGER trigger_auto_sync_org_venture
  AFTER UPDATE ON public.organizations
  FOR EACH ROW
  WHEN (OLD.ventures_entity_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_sync_org_to_venture();

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON COLUMN public.organizations.connection_space_id IS 'FK para ConnectionSpace (archetype=ventures) no modulo Connections';
COMMENT ON COLUMN public.organizations.ventures_entity_id IS 'FK para VenturesEntity no modulo Connections';
COMMENT ON FUNCTION public.create_venture_from_organization IS 'Cria ConnectionSpace + VenturesEntity a partir de uma Organization';
COMMENT ON FUNCTION public.sync_organization_to_venture IS 'Sincroniza dados da Organization para o VenturesEntity vinculado';

-- =============================================================================
-- SUCCESS LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '[Link Organizations to Ventures] Migration completed:';
  RAISE NOTICE '  - Added columns: connection_space_id, ventures_entity_id';
  RAISE NOTICE '  - Created function: create_venture_from_organization';
  RAISE NOTICE '  - Created function: sync_organization_to_venture';
  RAISE NOTICE '  - Created trigger: trigger_auto_sync_org_venture';
END $$;
