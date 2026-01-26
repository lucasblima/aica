-- ============================================================
-- Fix Journey Counters - RPC Functions para Incrementar Contadores
-- Data: 2026-01-26
-- ============================================================
--
-- PROBLEMA: O código cliente usa supabase.sql que não funciona
-- SOLUÇÃO: Criar RPC functions para incrementar atomicamente
--
-- ============================================================

-- 1. Function para incrementar total_questions_answered
CREATE OR REPLACE FUNCTION public.increment_questions_answered(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_consciousness_stats
  SET total_questions_answered = total_questions_answered + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_questions_answered IS 'Incrementa contador de perguntas respondidas';

-- 2. Function para incrementar total_summaries_reflected
CREATE OR REPLACE FUNCTION public.increment_summaries_reflected(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_consciousness_stats
  SET total_summaries_reflected = total_summaries_reflected + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_summaries_reflected IS 'Incrementa contador de reflexões em resumos semanais';

-- 3. Verificar e corrigir os dados do usuário atual
-- Substitua o UUID pelo seu user_id
UPDATE public.user_consciousness_stats
SET total_questions_answered = (
  SELECT COUNT(*) FROM public.question_responses WHERE user_id = '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'
),
total_moments = (
  SELECT COUNT(*) FROM public.moments WHERE user_id = '3d88f68e-87a5-4d45-93d1-5a28dfacaf86'
)
WHERE user_id = '3d88f68e-87a5-4d45-93d1-5a28dfacaf86';

-- 4. Verificação
SELECT
  'Contadores atualizados!' AS status,
  total_points,
  total_moments,
  total_questions_answered,
  current_streak,
  longest_streak
FROM public.user_consciousness_stats
WHERE user_id = '3d88f68e-87a5-4d45-93d1-5a28dfacaf86';
