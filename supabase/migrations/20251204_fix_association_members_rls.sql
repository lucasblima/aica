-- Migration: fix_association_members_rls
-- Date: 2025-12-04
-- Purpose: Corrigir recursão RLS em association_members

-- PROBLEMA: As políticas em association_members estão causando recursão infinita
-- porque fazem lookup na própria tabela association_members

-- 1. Remover todas as políticas problemáticas em association_members
DROP POLICY IF EXISTS "association_members_insert_admin" ON public.association_members;
DROP POLICY IF EXISTS "Ver membros das minhas associações" ON public.association_members;
DROP POLICY IF EXISTS "Membros podem ver associações" ON public.association_members;
DROP POLICY IF EXISTS "association_members_read_member" ON public.association_members;
DROP POLICY IF EXISTS "association_members_update_admin" ON public.association_members;
DROP POLICY IF EXISTS "association_members_delete_admin" ON public.association_members;

-- 2. Criar políticas NÃO-RECURSIVAS

-- SELECT: Usuário pode ver membros de associações onde ele é membro
CREATE POLICY "association_members_select"
  ON public.association_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    association_id IN (
      SELECT association_id
      FROM public.association_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Apenas admins podem adicionar membros
-- Usamos uma subquery simples que não causa recursão
CREATE POLICY "association_members_insert"
  ON public.association_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.associations
      WHERE id = association_members.association_id
        AND owner_user_id = auth.uid()
    )
  );

-- UPDATE: Apenas admins podem atualizar membros
CREATE POLICY "association_members_update"
  ON public.association_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.associations
      WHERE id = association_members.association_id
        AND owner_user_id = auth.uid()
    )
  );

-- DELETE: Apenas admins podem remover membros
CREATE POLICY "association_members_delete"
  ON public.association_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.associations
      WHERE id = association_members.association_id
        AND owner_user_id = auth.uid()
    )
  );

-- 3. Garantir que RLS está habilitado
ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;
