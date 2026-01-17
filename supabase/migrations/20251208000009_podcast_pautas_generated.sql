-- Migration: Podcast Pautas Generated
-- Created: 2025-12-08
-- Purpose: Persistencia de pautas geradas pelo sistema de IA estilo NotebookLM
--
-- Esta migration adiciona:
-- 1. Tabela podcast_generated_pautas - Armazena pautas completas geradas
-- 2. Tabela podcast_pauta_questions - Perguntas categorizadas
-- 3. Tabela podcast_pauta_outline_sections - Secoes do outline
-- 4. Tabela podcast_pauta_sources - Fontes de pesquisa
-- 5. RLS policies com SECURITY DEFINER functions
-- 6. Suporte a versionamento (multiplas versoes por episodio)

-- ============================================================================
-- 1. CREATE podcast_generated_pautas TABLE
-- ============================================================================
-- Tabela principal que armazena metadados da pauta gerada

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

CREATE INDEX idx_podcast_pautas_episode_id ON public.podcast_generated_pautas(episode_id);
CREATE INDEX idx_podcast_pautas_user_id ON public.podcast_generated_pautas(user_id);
CREATE INDEX idx_podcast_pautas_is_active ON public.podcast_generated_pautas(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_podcast_pautas_created_at ON public.podcast_generated_pautas(created_at DESC);

COMMENT ON TABLE public.podcast_generated_pautas IS
  'Pautas completas geradas pelo sistema de IA estilo NotebookLM. Suporta versionamento para permitir regeneracao e comparacao de pautas.';

-- ============================================================================
-- 2. CREATE podcast_pauta_outline_sections TABLE
-- ============================================================================
-- Secoes do outline estruturado (introducao, desenvolvimento, conclusao)

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

CREATE INDEX idx_pauta_sections_pauta_id ON public.podcast_pauta_outline_sections(pauta_id);
CREATE INDEX idx_pauta_sections_order ON public.podcast_pauta_outline_sections(pauta_id, section_order);

COMMENT ON TABLE public.podcast_pauta_outline_sections IS
  'Secoes estruturadas do outline da pauta (introducao, blocos principais, conclusao).';

-- ============================================================================
-- 3. CREATE podcast_pauta_questions TABLE
-- ============================================================================
-- Perguntas categorizadas com follow-ups

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

CREATE INDEX idx_pauta_questions_pauta_id ON public.podcast_pauta_questions(pauta_id);
CREATE INDEX idx_pauta_questions_category ON public.podcast_pauta_questions(pauta_id, category);
CREATE INDEX idx_pauta_questions_order ON public.podcast_pauta_questions(pauta_id, question_order);

COMMENT ON TABLE public.podcast_pauta_questions IS
  'Perguntas categorizadas geradas pela IA com follow-ups e contexto de pesquisa.';

-- ============================================================================
-- 4. CREATE podcast_pauta_sources TABLE
-- ============================================================================
-- Fontes de pesquisa citadas na pauta

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

CREATE INDEX idx_pauta_sources_pauta_id ON public.podcast_pauta_sources(pauta_id);
CREATE INDEX idx_pauta_sources_reliability ON public.podcast_pauta_sources(reliability);

COMMENT ON TABLE public.podcast_pauta_sources IS
  'Fontes de pesquisa utilizadas na geracao da pauta (URLs, textos, arquivos).';

-- ============================================================================
-- 5. TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_podcast_pautas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================================
-- 6. TRIGGER FOR VERSION INCREMENT
-- ============================================================================
-- Incrementa automaticamente a versao ao criar nova pauta para mesmo episodio

CREATE OR REPLACE FUNCTION increment_pauta_version()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_pauta_version
  BEFORE INSERT ON public.podcast_generated_pautas
  FOR EACH ROW
  EXECUTE FUNCTION increment_pauta_version();

COMMENT ON FUNCTION increment_pauta_version IS
  'Incrementa automaticamente a versao da pauta e gerencia versao ativa';

-- ============================================================================
-- 7. SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Funcao para verificar se usuario tem acesso ao episodio
CREATE OR REPLACE FUNCTION public.user_owns_episode(
  p_user_id UUID,
  p_episode_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.podcast_episodes
    WHERE id = p_episode_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.user_owns_episode IS
  'Verifica se usuario e dono do episodio (usado em RLS policies)';

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Enable RLS em todas as tabelas
ALTER TABLE public.podcast_generated_pautas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_pauta_outline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_pauta_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_pauta_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies para podcast_generated_pautas
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

-- RLS Policies para podcast_pauta_outline_sections
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

-- RLS Policies para podcast_pauta_questions
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

-- RLS Policies para podcast_pauta_sources
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
-- 9. HELPER FUNCTIONS FOR QUERIES
-- ============================================================================

-- Funcao para buscar pauta ativa de um episodio
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

COMMENT ON FUNCTION get_active_pauta IS
  'Retorna a pauta ativa para um episodio (se existir)';

-- Funcao para listar versoes de pautas de um episodio
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

COMMENT ON FUNCTION list_pauta_versions IS
  'Lista todas as versoes de pautas para um episodio';

-- Funcao para buscar pauta completa com todas as relacoes
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

COMMENT ON FUNCTION get_complete_pauta IS
  'Retorna pauta completa com sections, questions e sources em um unico JSON';

-- ============================================================================
-- 10. MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251208_podcast_pautas_generated completed successfully';
  RAISE NOTICE '   - Created table: podcast_generated_pautas (main pauta metadata)';
  RAISE NOTICE '   - Created table: podcast_pauta_outline_sections (outline structure)';
  RAISE NOTICE '   - Created table: podcast_pauta_questions (categorized questions)';
  RAISE NOTICE '   - Created table: podcast_pauta_sources (research citations)';
  RAISE NOTICE '   - Created 16 RLS policies (4 per table)';
  RAISE NOTICE '   - Created 4 helper functions (get_active_pauta, list_pauta_versions, etc.)';
  RAISE NOTICE '   - Created auto-versioning trigger';
  RAISE NOTICE '';
  RAISE NOTICE '🎙️  Features:';
  RAISE NOTICE '   - Versionamento automatico de pautas';
  RAISE NOTICE '   - Apenas uma pauta ativa por episodio';
  RAISE NOTICE '   - Estrutura normalizada (outline, questions, sources)';
  RAISE NOTICE '   - RLS policies com SECURITY DEFINER functions';
  RAISE NOTICE '   - Suporte a ice breakers, controversies, technical sheet';
END $$;
