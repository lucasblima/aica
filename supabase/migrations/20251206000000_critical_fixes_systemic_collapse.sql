-- ============================================================================
-- MIGRATION: Critical Fixes - Systemic Collapse Recovery
-- Date: 2025-12-06
-- Author: System Recovery Task Force
--
-- PURPOSE: Resolver colapso sistêmico em 3 frentes:
-- 1. Recursão infinita em RLS (associations/association_members)
-- 2. Colunas faltantes (updated_at, completed_at)
-- 3. Schema alignment (podcast_team_members, work_items)
-- ============================================================================

-- ============================================================================
-- PARTE 1: SECURITY DEFINER FUNCTION (FIX RECURSÃO)
-- ============================================================================

-- Dropar políticas antigas que causam recursão
DROP POLICY IF EXISTS "Users can view associations they are members of" ON public.associations;
DROP POLICY IF EXISTS "Users can view their association memberships" ON public.association_members;

-- Dropar função antiga (assinatura diferente)
DROP FUNCTION IF EXISTS public.check_membership(uuid);

-- Criar função SECURITY DEFINER para verificar membership sem recursão
CREATE OR REPLACE FUNCTION public.check_membership(_user_id uuid, _association_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- Roda como admin, bypassa RLS
SET search_path = public  -- Previne SQL injection
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE user_id = _user_id
      AND association_id = _association_id
  );
END;
$$;

-- Recriar políticas usando a função SECURITY DEFINER
CREATE POLICY "Users can view associations they are members of"
  ON public.associations FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR public.check_membership(auth.uid(), id)
  );

CREATE POLICY "Users can view their association memberships"
  ON public.association_members FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- PARTE 2: SCHEMA PATCHES (COLUNAS FALTANTES)
-- ============================================================================

-- Adicionar updated_at em podcast_episodes (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'podcast_episodes'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.podcast_episodes
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Adicionar trigger para auto-update
    CREATE OR REPLACE FUNCTION update_podcast_episodes_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.podcast_episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_podcast_episodes_updated_at();
  END IF;
END $$;

-- Adicionar completed_at em work_items (se tabela e coluna não existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_items'
        AND column_name = 'completed_at'
    ) THEN
      ALTER TABLE public.work_items
      ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Garantir que work_items tem updated_at (se tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_items'
        AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.work_items
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

      CREATE OR REPLACE FUNCTION update_work_items_updated_at()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;

      CREATE TRIGGER set_updated_at_work_items
      BEFORE UPDATE ON public.work_items
      FOR EACH ROW
      EXECUTE FUNCTION update_work_items_updated_at();
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PARTE 3: PODCAST_TEAM_MEMBERS TABLE (GARANTIR EXISTÊNCIA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.podcast_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('host', 'guest', 'producer', 'tech')),
  whatsapp TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para podcast_team_members
ALTER TABLE public.podcast_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view team members for their episodes" ON public.podcast_team_members;
CREATE POLICY "Users can view team members for their episodes"
  ON public.podcast_team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes e
      JOIN public.podcast_shows s ON e.show_id = s.id
      WHERE e.id = episode_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage team members for their episodes" ON public.podcast_team_members;
CREATE POLICY "Users can manage team members for their episodes"
  ON public.podcast_team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_episodes e
      JOIN public.podcast_shows s ON e.show_id = s.id
      WHERE e.id = episode_id
        AND s.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PARTE 4: ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Índice para check_membership (acelera lookup)
CREATE INDEX IF NOT EXISTS idx_association_members_lookup
  ON public.association_members(user_id, association_id);

-- Índice para podcast queries
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_show_id
  ON public.podcast_episodes(show_id);

CREATE INDEX IF NOT EXISTS idx_podcast_team_members_episode_id
  ON public.podcast_team_members(episode_id);

-- ============================================================================
-- PARTE 5: VALIDAÇÃO E COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION public.check_membership IS
  'SECURITY DEFINER function to check association membership without RLS recursion. Used by RLS policies.';

COMMENT ON TABLE public.podcast_team_members IS
  'Team members for podcast episodes (host, guest, producer, tech). Linked to episodes via episode_id FK.';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
