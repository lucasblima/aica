-- Migration: fix_rls_recursion_and_missing_columns
-- Date: 2025-12-03
-- Purpose: Operação de Resgate - Corrigir recursão RLS, criar colunas e tabelas faltantes

-- 1. Corrigir Recursão RLS (Associations)
-- Criar função auxiliar para evitar recursão infinita
CREATE OR REPLACE FUNCTION public.is_member_of(_association_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE association_id = _association_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover política recursiva antiga e criar nova com função auxiliar
DROP POLICY IF EXISTS "Membros podem ver suas associações" ON public.associations;
CREATE POLICY "Membros podem ver suas associações" ON public.associations
FOR SELECT USING (owner_user_id = auth.uid() OR public.is_member_of(id));

-- 2. Criar Colunas/Tabelas Faltantes

-- 2.1. Adicionar coluna completed_at em work_items (se não existir)
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2.2. Criar tabela podcast_team_members (se não existir)
CREATE TABLE IF NOT EXISTS public.podcast_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    whatsapp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela podcast_team_members
ALTER TABLE public.podcast_team_members ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso para podcast_team_members (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'podcast_team_members' AND policyname = 'Acesso total a team_members'
  ) THEN
    CREATE POLICY "Acesso total a team_members" ON public.podcast_team_members
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Ajustar Tópicos (Renomear coluna para bater com Frontend)
-- Renomear is_completed para completed se a coluna existir
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE public.podcast_topics RENAME COLUMN is_completed TO completed;
  END IF;
END $$;
