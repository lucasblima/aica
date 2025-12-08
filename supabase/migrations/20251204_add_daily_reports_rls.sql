-- Migration: add_daily_reports_rls
-- Date: 2025-12-04
-- Purpose: Adicionar políticas RLS para daily_reports (resolver erro 400)

-- 1. Garantir que RLS está habilitado (já está, mas vamos confirmar)
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas RLS simples: usuário só acessa seus próprios relatórios

-- SELECT: Ver apenas meus relatórios
CREATE POLICY "daily_reports_select"
  ON public.daily_reports FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Criar apenas relatórios para mim mesmo
CREATE POLICY "daily_reports_insert"
  ON public.daily_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Atualizar apenas meus relatórios
CREATE POLICY "daily_reports_update"
  ON public.daily_reports FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: Deletar apenas meus relatórios
CREATE POLICY "daily_reports_delete"
  ON public.daily_reports FOR DELETE
  USING (user_id = auth.uid());

-- 3. Política para service_role (admin/backend access)
CREATE POLICY "daily_reports_service_role_all"
  ON public.daily_reports FOR ALL
  USING (auth.role() = 'service_role');
