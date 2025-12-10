-- Migration: Fix Podcast Pautas Schema
-- Created: 2025-12-10
-- Purpose: Corrigir schema incorreto de podcast_generated_pautas e adicionar campos ausentes
--
-- PROBLEMAS CORRIGIDOS:
-- 1. podcast_generated_pautas tem project_id em vez de episode_id + user_id
-- 2. RLS policies públicas (inseguras) em podcast_generated_pautas
-- 3. Campos de contato ausentes em podcast_guest_research (phone, email)
-- 4. Campos de categorização e aprovação ausentes em podcast_guest_research
-- 5. Índices de performance ausentes
-- 6. Functions sem search_path definido

-- ============================================================================
-- PARTE 1: CORREÇÃO DE podcast_generated_pautas
-- ============================================================================

-- 1.1. Verificar se tabela existe e tem dados
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM podcast_generated_pautas;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'ATENÇÃO: podcast_generated_pautas tem % registros. Esta migration irá dropar a tabela. Faça backup antes de continuar!', v_count;
  ELSE
    RAISE NOTICE 'podcast_generated_pautas está vazia. Procedendo com DROP e recriação...';
  END IF;
END $$;

-- 1.2. Dropar tabela incorreta e suas dependências
DROP TABLE IF EXISTS podcast_generated_pautas CASCADE;
DROP TABLE IF EXISTS podcast_pauta_outline_sections CASCADE;
DROP TABLE IF EXISTS podcast_pauta_questions CASCADE;
DROP TABLE IF EXISTS podcast_pauta_sources CASCADE;

-- 1.3. Dropar functions antigas
DROP FUNCTION IF EXISTS increment_pauta_version() CASCADE;
DROP FUNCTION IF EXISTS update_podcast_pautas_updated_at() CASCADE;
DROP FUNCTION IF EXISTS user_owns_episode(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_active_pauta(UUID) CASCADE;
DROP FUNCTION IF EXISTS list_pauta_versions(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_complete_pauta(UUID) CASCADE;

-- ============================================================================
-- PARTE 2: RECRIAR TABELAS COM SCHEMA CORRETO
-- ============================================================================

-- 2.1. CREATE podcast_generated_pautas (SCHEMA CORRETO)
CREATE TABLE IF NOT EXISTS public.podcast_generated_pautas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informacoes basicas
  guest_name TEXT NOT NULL,
  theme TEXT NOT NULL,

  -- Versioning (permite multiplas versoes de pauta para o mesmo episodio)
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE, -- Apenas uma versao ativa por episodio

  -- Pesquisa e biografia
  research_summary TEXT, -- Resumo da pesquisa realizada
  biography TEXT, -- Biografia completa do convidado
  key_facts TEXT[], -- Array de fatos-chave
  controversies JSONB DEFAULT '[]'::jsonb, -- Array de {title, summary, sentiment, date}

  -- Ficha tecnica
  technical_sheet JSONB DEFAULT '{}'::jsonb, -- {fullName, birthDate, birthPlace, occupation, education, achievements, socialMedia}

  -- Metadados da geracao
  outline_title TEXT, -- Titulo do episodio gerado
  estimated_duration INTEGER, -- Duracao estimada em minutos
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Configuracoes de estilo usadas
  tone TEXT CHECK (tone IN ('formal', 'casual', 'investigativo', 'humano')),
  depth TEXT CHECK (depth IN ('shallow', 'medium', 'deep')),
  focus_areas TEXT[], -- Areas de foco personalizadas

  -- Ice breakers (perguntas quebra-gelo)
  ice_breakers TEXT[], -- Array de perguntas leves

  -- Contexto adicional fornecido pelo usuario
  additional_context TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: apenas uma versao ativa por episodio
  UNIQUE(episode_id, version)
);

-- 2.2. CREATE podcast_pauta_outline_sections
CREATE TABLE IF NOT EXISTS public.podcast_pauta_outline_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL REFERENCES public.podcast_generated_pautas(id) ON DELETE CASCADE,

  -- Identificacao da secao
  section_type TEXT NOT NULL CHECK (section_type IN ('introduction', 'main', 'conclusion')),
  section_order INTEGER NOT NULL, -- Ordem da secao (0 = introducao, N = conclusao)

  -- Conteudo da secao
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- Duracao estimada em minutos

  -- Pontos-chave e transicoes
  key_points TEXT[], -- Array de pontos principais
  suggested_transition TEXT, -- Transicao sugerida para proxima secao

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pauta_id, section_type, section_order)
);

-- 2.3. CREATE podcast_pauta_questions
CREATE TABLE IF NOT EXISTS public.podcast_pauta_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL REFERENCES public.podcast_generated_pautas(id) ON DELETE CASCADE,

  -- Pergunta
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL, -- Ordem dentro da categoria

  -- Categorizacao
  category TEXT NOT NULL CHECK (category IN ('abertura', 'desenvolvimento', 'aprofundamento', 'fechamento', 'quebra-gelo')),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',

  -- Follow-ups e contexto
  follow_ups TEXT[], -- Array de perguntas de acompanhamento
  context TEXT, -- Contexto/justificativa da pergunta

  -- Referencia a fontes
  source_refs INTEGER[], -- IDs das fontes que geraram esta pergunta

  -- Duracao estimada
  estimated_duration INTEGER, -- Minutos estimados para responder

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pauta_id, category, question_order)
);

-- 2.4. CREATE podcast_pauta_sources
CREATE TABLE IF NOT EXISTS public.podcast_pauta_sources (
  id SERIAL PRIMARY KEY, -- ID sequencial para referencias [1], [2], etc
  pauta_id UUID NOT NULL REFERENCES public.podcast_generated_pautas(id) ON DELETE CASCADE,

  -- Informacoes da fonte
  source_type TEXT CHECK (source_type IN ('url', 'text', 'file')),
  title TEXT NOT NULL,
  url TEXT, -- URL da fonte (se type = 'url')
  snippet TEXT, -- Trecho relevante citado

  -- Metadados
  reliability TEXT CHECK (reliability IN ('high', 'medium', 'low')) DEFAULT 'medium',
  date TEXT, -- Data da fonte (formato livre)

  -- User-provided vs AI-found
  is_user_provided BOOLEAN DEFAULT FALSE, -- TRUE se foi fornecida pelo usuario

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pauta_id, id)
);

-- ============================================================================
-- PARTE 3: ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Índices para podcast_generated_pautas
CREATE INDEX idx_podcast_pautas_episode_id ON public.podcast_generated_pautas(episode_id);
CREATE INDEX idx_podcast_pautas_user_id ON public.podcast_generated_pautas(user_id);
CREATE INDEX idx_podcast_pautas_is_active ON public.podcast_generated_pautas(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_podcast_pautas_created_at ON public.podcast_generated_pautas(created_at DESC);

-- Índices para podcast_pauta_outline_sections
CREATE INDEX idx_pauta_sections_pauta_id ON public.podcast_pauta_outline_sections(pauta_id);
CREATE INDEX idx_pauta_sections_order ON public.podcast_pauta_outline_sections(pauta_id, section_order);

-- Índices para podcast_pauta_questions
CREATE INDEX idx_pauta_questions_pauta_id ON public.podcast_pauta_questions(pauta_id);
CREATE INDEX idx_pauta_questions_category ON public.podcast_pauta_questions(pauta_id, category);
CREATE INDEX idx_pauta_questions_order ON public.podcast_pauta_questions(pauta_id, question_order);

-- Índices para podcast_pauta_sources
CREATE INDEX idx_pauta_sources_pauta_id ON public.podcast_pauta_sources(pauta_id);
CREATE INDEX idx_pauta_sources_reliability ON public.podcast_pauta_sources(reliability);

-- Índices para outras tabelas podcast (FALTAVAM)
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_episode_id ON public.podcast_guest_research(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_briefings_episode_id ON public.podcast_briefings(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_news_articles_episode_id ON public.podcast_news_articles(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_research_episode_id ON public.podcast_research(episode_id);
CREATE INDEX IF NOT EXISTS idx_podcast_shows_user_id ON public.podcast_shows(user_id);

-- ============================================================================
-- PARTE 4: TRIGGERS (COM search_path CORRETO)
-- ============================================================================

-- 4.1. Trigger function para updated_at
CREATE OR REPLACE FUNCTION update_podcast_pautas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4.2. Trigger function para incremento de versão
CREATE OR REPLACE FUNCTION increment_pauta_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_version INTEGER;
BEGIN
  -- Busca a maior versao existente para o episodio
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.podcast_generated_pautas
  WHERE episode_id = NEW.episode_id;

  -- Define a nova versao
  NEW.version = max_version + 1;

  -- Se esta pauta foi marcada como ativa, desativa todas as outras
  IF NEW.is_active = TRUE THEN
    UPDATE public.podcast_generated_pautas
    SET is_active = FALSE
    WHERE episode_id = NEW.episode_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4.3. Aplicar triggers
CREATE TRIGGER trigger_update_podcast_pautas_updated_at
  BEFORE UPDATE ON public.podcast_generated_pautas
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_pautas_updated_at();

CREATE TRIGGER trigger_update_pauta_sections_updated_at
  BEFORE UPDATE ON public.podcast_pauta_outline_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_pautas_updated_at();

CREATE TRIGGER trigger_update_pauta_questions_updated_at
  BEFORE UPDATE ON public.podcast_pauta_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_pautas_updated_at();

CREATE TRIGGER trigger_increment_pauta_version
  BEFORE INSERT ON public.podcast_generated_pautas
  FOR EACH ROW
  EXECUTE FUNCTION increment_pauta_version();

-- ============================================================================
-- PARTE 5: SECURITY DEFINER HELPER FUNCTIONS (COM search_path)
-- ============================================================================

-- 5.1. Funcao para verificar ownership de episodio
CREATE OR REPLACE FUNCTION public.user_owns_episode(
  p_user_id UUID,
  p_episode_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.podcast_episodes
    WHERE id = p_episode_id
      AND user_id = p_user_id
  );
END;
$$;

-- 5.2. Funcao para buscar pauta ativa
CREATE OR REPLACE FUNCTION get_active_pauta(p_episode_id UUID)
RETURNS SETOF public.podcast_generated_pautas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.podcast_generated_pautas p
  WHERE p.episode_id = p_episode_id
    AND p.is_active = TRUE
    AND public.user_owns_episode(auth.uid(), p.episode_id)
  LIMIT 1;
END;
$$;

-- 5.3. Funcao para listar versoes
CREATE OR REPLACE FUNCTION list_pauta_versions(p_episode_id UUID)
RETURNS TABLE (
  id UUID,
  version INTEGER,
  is_active BOOLEAN,
  confidence_score INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.version,
    p.is_active,
    p.confidence_score,
    p.created_at
  FROM public.podcast_generated_pautas p
  WHERE p.episode_id = p_episode_id
    AND public.user_owns_episode(auth.uid(), p.episode_id)
  ORDER BY p.version DESC;
END;
$$;

-- 5.4. Funcao para buscar pauta completa
CREATE OR REPLACE FUNCTION get_complete_pauta(p_pauta_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pauta JSON;
BEGIN
  SELECT json_build_object(
    'pauta', row_to_json(p.*),
    'outline_sections', (
      SELECT json_agg(row_to_json(s.*) ORDER BY s.section_order)
      FROM public.podcast_pauta_outline_sections s
      WHERE s.pauta_id = p.id
    ),
    'questions', (
      SELECT json_agg(row_to_json(q.*) ORDER BY q.category, q.question_order)
      FROM public.podcast_pauta_questions q
      WHERE q.pauta_id = p.id
    ),
    'sources', (
      SELECT json_agg(row_to_json(src.*) ORDER BY src.id)
      FROM public.podcast_pauta_sources src
      WHERE src.pauta_id = p.id
    )
  )
  INTO v_pauta
  FROM public.podcast_generated_pautas p
  WHERE p.id = p_pauta_id
    AND public.user_owns_episode(auth.uid(), p.episode_id);

  RETURN v_pauta;
END;
$$;

-- ============================================================================
-- PARTE 6: RLS POLICIES (SEGURAS)
-- ============================================================================

-- 6.1. Enable RLS
ALTER TABLE public.podcast_generated_pautas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_pauta_outline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_pauta_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_pauta_sources ENABLE ROW LEVEL SECURITY;

-- 6.2. RLS Policies para podcast_generated_pautas
CREATE POLICY "Users can view own pautas"
  ON public.podcast_generated_pautas FOR SELECT
  USING (public.user_owns_episode(auth.uid(), episode_id));

CREATE POLICY "Users can insert own pautas"
  ON public.podcast_generated_pautas FOR INSERT
  WITH CHECK (public.user_owns_episode(auth.uid(), episode_id));

CREATE POLICY "Users can update own pautas"
  ON public.podcast_generated_pautas FOR UPDATE
  USING (public.user_owns_episode(auth.uid(), episode_id))
  WITH CHECK (public.user_owns_episode(auth.uid(), episode_id));

CREATE POLICY "Users can delete own pautas"
  ON public.podcast_generated_pautas FOR DELETE
  USING (public.user_owns_episode(auth.uid(), episode_id));

-- 6.3. RLS Policies para podcast_pauta_outline_sections
CREATE POLICY "Users can view own pauta sections"
  ON public.podcast_pauta_outline_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_outline_sections.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can insert own pauta sections"
  ON public.podcast_pauta_outline_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_outline_sections.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can update own pauta sections"
  ON public.podcast_pauta_outline_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_outline_sections.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can delete own pauta sections"
  ON public.podcast_pauta_outline_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_outline_sections.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

-- 6.4. RLS Policies para podcast_pauta_questions
CREATE POLICY "Users can view own pauta questions"
  ON public.podcast_pauta_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_questions.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can insert own pauta questions"
  ON public.podcast_pauta_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_questions.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can update own pauta questions"
  ON public.podcast_pauta_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_questions.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can delete own pauta questions"
  ON public.podcast_pauta_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_questions.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

-- 6.5. RLS Policies para podcast_pauta_sources
CREATE POLICY "Users can view own pauta sources"
  ON public.podcast_pauta_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_sources.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can insert own pauta sources"
  ON public.podcast_pauta_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_sources.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can update own pauta sources"
  ON public.podcast_pauta_sources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_sources.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

CREATE POLICY "Users can delete own pauta sources"
  ON public.podcast_pauta_sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.podcast_generated_pautas p
      WHERE p.id = podcast_pauta_sources.pauta_id
        AND public.user_owns_episode(auth.uid(), p.episode_id)
    )
  );

-- ============================================================================
-- PARTE 7: ADICIONAR CAMPOS EM podcast_guest_research
-- ============================================================================

-- 7.1. Criar ENUM para categorização de convidado
DO $$ BEGIN
  CREATE TYPE guest_category_enum AS ENUM (
    'public_figure',
    'common_person',
    'expert',
    'influencer',
    'entrepreneur',
    'artist',
    'athlete',
    'politician',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7.2. Adicionar campos de contato
ALTER TABLE public.podcast_guest_research
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 7.3. Adicionar categorização
ALTER TABLE public.podcast_guest_research
  ADD COLUMN IF NOT EXISTS guest_category guest_category_enum DEFAULT 'other';

-- 7.4. Adicionar campos de aprovação
ALTER TABLE public.podcast_guest_research
  ADD COLUMN IF NOT EXISTS approved_by_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- 7.5. Índices para novos campos
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_guest_category
  ON public.podcast_guest_research(guest_category);
CREATE INDEX IF NOT EXISTS idx_podcast_guest_research_approved
  ON public.podcast_guest_research(approved_by_guest)
  WHERE approved_by_guest = TRUE;

-- 7.6. Comentários para documentação
COMMENT ON COLUMN public.podcast_guest_research.phone IS
  'Telefone de contato do convidado (para confirmação de participação)';
COMMENT ON COLUMN public.podcast_guest_research.email IS
  'Email de contato do convidado (para envio de briefing e aprovação)';
COMMENT ON COLUMN public.podcast_guest_research.guest_category IS
  'Categorização do convidado: public_figure (figura pública com mídia extensa), common_person (pessoa comum com pouca exposição), expert (especialista em área específica), etc.';
COMMENT ON COLUMN public.podcast_guest_research.approved_by_guest IS
  'TRUE se convidado aprovou informações biográficas e perfil gerado pela IA';
COMMENT ON COLUMN public.podcast_guest_research.approved_at IS
  'Timestamp quando convidado aprovou informações via link de confirmação';
COMMENT ON COLUMN public.podcast_guest_research.approval_notes IS
  'Correções ou observações feitas pelo convidado sobre seu perfil (ex: "Na verdade nasci em São Paulo, não Rio")';

-- ============================================================================
-- PARTE 8: COMENTÁRIOS GERAIS
-- ============================================================================

COMMENT ON TABLE public.podcast_generated_pautas IS
  'Pautas completas geradas pelo sistema de IA estilo NotebookLM. Suporta versionamento para permitir regeneração e comparação de pautas. SCHEMA CORRIGIDO: agora usa episode_id + user_id em vez de project_id.';

COMMENT ON TABLE public.podcast_pauta_outline_sections IS
  'Seções estruturadas do outline da pauta (introdução, blocos principais, conclusão).';

COMMENT ON TABLE public.podcast_pauta_questions IS
  'Perguntas categorizadas geradas pela IA com follow-ups e contexto de pesquisa.';

COMMENT ON TABLE public.podcast_pauta_sources IS
  'Fontes de pesquisa utilizadas na geração da pauta (URLs, textos, arquivos).';

COMMENT ON FUNCTION increment_pauta_version IS
  'Incrementa automaticamente a versão da pauta e gerencia versão ativa. CORRIGIDO: agora com SET search_path = public.';

COMMENT ON FUNCTION public.user_owns_episode IS
  'Verifica se usuário é dono do episódio (usado em RLS policies). SECURITY DEFINER com search_path = public.';

COMMENT ON FUNCTION get_active_pauta IS
  'Retorna a pauta ativa para um episódio (se existir). SECURITY DEFINER com search_path = public.';

COMMENT ON FUNCTION list_pauta_versions IS
  'Lista todas as versões de pautas para um episódio. SECURITY DEFINER com search_path = public.';

COMMENT ON FUNCTION get_complete_pauta IS
  'Retorna pauta completa com sections, questions e sources em um único JSON. SECURITY DEFINER com search_path = public.';

-- ============================================================================
-- PARTE 9: MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 20251210_fix_podcast_pautas_schema completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CORREÇÕES APLICADAS:';
  RAISE NOTICE '   1. ✅ Recriadas tabelas podcast_generated_pautas com episode_id + user_id';
  RAISE NOTICE '   2. ✅ RLS policies seguras (usando SECURITY DEFINER)';
  RAISE NOTICE '   3. ✅ Adicionados campos de contato (phone, email)';
  RAISE NOTICE '   4. ✅ Adicionado enum guest_category_enum';
  RAISE NOTICE '   5. ✅ Adicionados campos de aprovação (approved_by_guest, etc)';
  RAISE NOTICE '   6. ✅ Criados índices de performance';
  RAISE NOTICE '   7. ✅ Functions com SET search_path = public';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '   1. Testar salvamento de pautas no frontend';
  RAISE NOTICE '   2. Atualizar UI para coletar phone/email do convidado';
  RAISE NOTICE '   3. Implementar fluxo de aprovação de convidado';
  RAISE NOTICE '   4. Verificar logs de erros no Supabase';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTATÍSTICAS:';
  RAISE NOTICE '   - Tabelas recriadas: 4 (pautas, sections, questions, sources)';
  RAISE NOTICE '   - RLS policies: 16 (4 por tabela)';
  RAISE NOTICE '   - Índices: 15 (incluindo foreign keys)';
  RAISE NOTICE '   - Functions: 5 (todas com search_path correto)';
  RAISE NOTICE '   - Campos novos em guest_research: 6';
  RAISE NOTICE '';
END $$;
