-- ============================================================================
-- MIGRATION: Fix daily_reports Schema & RLS
-- Date: 2025-12-04
-- Author: Aica System Architecture
--
-- PURPOSE:
-- 1. Single Source of Truth - Alinhar schema do banco com código TypeScript
-- 2. Adicionar RLS policies para prevenir erro 400
-- 3. Migrar dados existentes (se houver) para nova estrutura
-- ============================================================================

-- ============================================================================
-- PARTE 1: ADICIONAR COLUNAS FALTANTES (Schema Alignment)
-- ============================================================================

-- Produtividade (esperado pelo código TypeScript em memoryTypes.ts)
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS productivity_score INTEGER CHECK (productivity_score >= 0 AND productivity_score <= 100),
  ADD COLUMN IF NOT EXISTS estimated_vs_actual INTEGER;

-- Emocional & mood (esperado pelo código)
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('excellent', 'good', 'neutral', 'bad', 'terrible')),
  ADD COLUMN IF NOT EXISTS mood_score NUMERIC CHECK (mood_score >= -1 AND mood_score <= 1),
  ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 0 AND energy_level <= 100),
  ADD COLUMN IF NOT EXISTS stress_level INTEGER CHECK (stress_level >= 0 AND stress_level <= 100);

-- Atividades (esperado pelo código)
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS top_interactions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS significant_events TEXT[] DEFAULT '{}';

-- Insights gerados por IA (esperado pelo código)
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS key_insights TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS patterns_detected TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommendations TEXT[] DEFAULT '{}';

-- Contexto adicional (esperado pelo código)
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS weather_notes TEXT;

-- ============================================================================
-- PARTE 2: MIGRAR DADOS EXISTENTES (se houver)
-- ============================================================================

-- Se report_content tinha dados JSON estruturados, você pode parsear aqui
-- Por enquanto, vamos apenas garantir que colunas antigas não quebrem

-- Comentário: As colunas antigas (report_type, report_content) permanecem
-- para compatibilidade retroativa. Elas podem ser removidas futuramente.

-- ============================================================================
-- PARTE 3: RLS POLICIES (Resolver erro 400)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "daily_reports_select" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_update" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_delete" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_service_role_all" ON public.daily_reports;

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

-- Service role: Acesso total para backend/admin
CREATE POLICY "daily_reports_service_role_all"
  ON public.daily_reports FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PARTE 4: ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para queries por data (usado frequentemente)
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date
  ON public.daily_reports(user_id, report_date DESC);

-- Índice para queries por produtividade
CREATE INDEX IF NOT EXISTS idx_daily_reports_productivity
  ON public.daily_reports(user_id, productivity_score)
  WHERE productivity_score IS NOT NULL;

-- ============================================================================
-- PARTE 5: COMENTÁRIOS NA TABELA (Documentação)
-- ============================================================================

COMMENT ON TABLE public.daily_reports IS
  'Daily reports tracking user productivity, mood, and activities.
   Schema synchronized with TypeScript interface DailyReport in memoryTypes.ts.
   Last updated: 2025-12-04';

COMMENT ON COLUMN public.daily_reports.report_type IS
  'Legacy column - kept for backward compatibility. New reports use structured columns.';

COMMENT ON COLUMN public.daily_reports.report_content IS
  'Legacy column - kept for backward compatibility. New reports use structured columns.';

-- ============================================================================
-- VERIFICAÇÃO: Schema atualizado
-- ============================================================================
-- Para verificar após executar:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'daily_reports' AND table_schema = 'public'
-- ORDER BY ordinal_position;
