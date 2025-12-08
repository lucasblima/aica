-- ============================================================================
-- MIGRATION: Professional RLS Architecture (Security Definer Pattern)
-- Date: 2025-12-04
-- Author: Aica System Architecture
--
-- PURPOSE:
-- Aplicar padrões profissionais de arquitetura para RLS:
-- 1. Security Definer Functions - Quebrar recursão infinita (42P17)
-- 2. Princípio da Não-Circularidade - Desacoplar lógica de permissão
-- 3. Single Source of Truth - Funções centralizadas
-- ============================================================================

-- ============================================================================
-- PARTE 1: CRIAR/ATUALIZAR FUNÇÕES SECURITY DEFINER
-- ============================================================================

-- Função: Verificar se usuário é admin de uma associação
CREATE OR REPLACE FUNCTION public.is_association_admin(_association_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- Roda como admin, ignora RLS
SET search_path = public  -- Segurança: previne injection
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE association_id = _association_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- Função: Verificar se usuário é owner de uma associação
CREATE OR REPLACE FUNCTION public.is_association_owner(_association_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.associations
    WHERE id = _association_id
      AND owner_user_id = auth.uid()
  );
END;
$$;

-- Adicionar search_path às funções existentes (segurança)
CREATE OR REPLACE FUNCTION public.check_membership(assoc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- ✅ FIX: Prevenir função mutable search_path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE association_id = assoc_id
    AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(_association_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- ✅ FIX: Prevenir função mutable search_path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.association_members
    WHERE association_id = _association_id
      AND user_id = auth.uid()
  );
END;
$$;

-- ============================================================================
-- PARTE 2: REMOVER POLÍTICAS RECURSIVAS PROBLEMÁTICAS
-- ============================================================================

-- Remover políticas em ASSOCIATIONS que fazem subqueries diretos
DROP POLICY IF EXISTS "associations_read_member" ON public.associations;
DROP POLICY IF EXISTS "associations_update_admin" ON public.associations;
DROP POLICY IF EXISTS "Acesso a Associações" ON public.associations;

-- Remover política antiga recursiva
DROP POLICY IF EXISTS "Membros podem ver suas associações" ON public.associations;

-- ============================================================================
-- PARTE 3: CRIAR POLÍTICAS NÃO-RECURSIVAS (USANDO FUNÇÕES)
-- ============================================================================

-- ASSOCIATIONS: SELECT - Owner OU Membro
CREATE POLICY "associations_select_v2"
  ON public.associations FOR SELECT
  USING (
    owner_user_id = auth.uid()  -- Sou owner
    OR
    is_member_of(id)  -- ✅ USA FUNÇÃO (não recursiva)
  );

-- ASSOCIATIONS: INSERT - Apenas personal do próprio usuário
-- (Já existe associations_insert_personal, manter)

-- ASSOCIATIONS: UPDATE - Owner OU Admin
CREATE POLICY "associations_update_v2"
  ON public.associations FOR UPDATE
  USING (
    owner_user_id = auth.uid()  -- Sou owner
    OR
    is_association_admin(id)  -- ✅ USA FUNÇÃO (não recursiva)
  );

-- ASSOCIATIONS: DELETE - Apenas owner
CREATE POLICY "associations_delete_v2"
  ON public.associations FOR DELETE
  USING (owner_user_id = auth.uid());

-- ============================================================================
-- PARTE 4: ASSOCIATION_MEMBERS - POLÍTICAS LIMPAS
-- ============================================================================

-- Remover política recursiva antiga
DROP POLICY IF EXISTS "Ver membros das minhas associações" ON public.association_members;

-- association_members: SELECT
-- Ver membros de associações onde sou membro OU owner
CREATE POLICY "association_members_select_v2"
  ON public.association_members FOR SELECT
  USING (
    user_id = auth.uid()  -- Sou eu mesmo
    OR
    is_member_of(association_id)  -- ✅ USA FUNÇÃO
    OR
    is_association_owner(association_id)  -- ✅ USA FUNÇÃO
  );

-- association_members: INSERT
-- Apenas owner pode adicionar membros
-- (Já existe association_members_insert usando associations.owner_user_id, OK)

-- association_members: UPDATE
-- Apenas owner pode atualizar membros
-- (Já existe association_members_update, OK)

-- association_members: DELETE
-- Apenas owner pode remover membros
-- (Já existe association_members_delete, OK)

-- ============================================================================
-- PARTE 5: WORK_ITEMS - SIMPLIFICAR RLS
-- ============================================================================

-- work_items já tem política simples e correta:
-- "Users can manage their own work items" - OK!
-- Não precisa de mudanças.

-- ============================================================================
-- PARTE 6: GARANTIR RLS HABILITADO
-- ============================================================================

ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO: Listar todas as políticas criadas
-- ============================================================================
-- Para verificar após executar:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('associations', 'association_members', 'work_items')
-- ORDER BY tablename, policyname;
