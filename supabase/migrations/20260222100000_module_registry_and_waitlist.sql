-- ============================================================================
-- CS-001: Module Registry + Feature Flags + Waitlist
-- Coming Soon system for AICA Life OS
-- ============================================================================

-- 1. MODULE REGISTRY — Central registry of all modules
CREATE TABLE IF NOT EXISTS module_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT,
  status TEXT NOT NULL DEFAULT 'hidden'
    CHECK (status IN ('hidden', 'teaser', 'preview', 'beta', 'live')),
  sort_order INTEGER DEFAULT 0,

  -- Teaser fields
  teaser_headline TEXT,
  teaser_description TEXT,
  teaser_illustration_url TEXT,
  teaser_features JSONB DEFAULT '[]'::jsonb,

  -- Preview fields
  preview_enabled BOOLEAN DEFAULT false,
  preview_component TEXT,

  -- AI Preview
  ai_preview_enabled BOOLEAN DEFAULT false,
  ai_preview_system_prompt TEXT,

  -- Social proof
  waitlist_count INTEGER DEFAULT 0,

  -- Metadata
  estimated_launch TEXT,
  category TEXT,
  color_primary TEXT,
  color_secondary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MODULE WAITLIST — Users on waitlist per module
CREATE TABLE IF NOT EXISTS module_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES module_registry(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, user_id)
);

-- 3. RLS POLICIES
ALTER TABLE module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_waitlist ENABLE ROW LEVEL SECURITY;

-- module_registry: anyone authenticated can read non-hidden modules
CREATE POLICY "Anyone can read visible modules"
  ON module_registry FOR SELECT
  USING (status != 'hidden');

-- module_waitlist: users manage their own entries
CREATE POLICY "Users can read own waitlist entries"
  ON module_waitlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join waitlist"
  ON module_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave waitlist"
  ON module_waitlist FOR DELETE
  USING (auth.uid() = user_id);

-- 4. TRIGGER: auto-update waitlist_count on module_registry
CREATE OR REPLACE FUNCTION update_module_waitlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE module_registry
    SET waitlist_count = (
      SELECT COUNT(*) FROM module_waitlist WHERE module_id = NEW.module_id
    ),
    updated_at = now()
    WHERE id = NEW.module_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE module_registry
    SET waitlist_count = (
      SELECT COUNT(*) FROM module_waitlist WHERE module_id = OLD.module_id
    ),
    updated_at = now()
    WHERE id = OLD.module_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_waitlist_count
  AFTER INSERT OR DELETE ON module_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_module_waitlist_count();

-- 5. updated_at trigger for module_registry
CREATE OR REPLACE FUNCTION update_module_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_module_registry_updated_at
  BEFORE UPDATE ON module_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_module_registry_updated_at();

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_module_registry_status ON module_registry(status);
CREATE INDEX IF NOT EXISTS idx_module_registry_sort ON module_registry(sort_order);
CREATE INDEX IF NOT EXISTS idx_module_waitlist_module ON module_waitlist(module_id);
CREATE INDEX IF NOT EXISTS idx_module_waitlist_user ON module_waitlist(user_id);

-- 7. SEED DATA — 9 modules
INSERT INTO module_registry (id, name, description, icon_emoji, status, sort_order, category, color_primary, color_secondary, teaser_headline, teaser_description, teaser_features, ai_preview_enabled, ai_preview_system_prompt, estimated_launch)
VALUES
  ('atlas', 'Atlas', 'Gestao de tarefas com Matriz de Eisenhower e priorizacao inteligente', '🗺️', 'live', 1, 'produtividade', '#6366F1', '#818CF8', NULL, NULL, '[]'::jsonb, false, NULL, NULL),

  ('agenda', 'Agenda', 'Calendario inteligente com sincronizacao Google Calendar', '📅', 'live', 2, 'produtividade', '#0EA5E9', '#38BDF8', NULL, NULL, '[]'::jsonb, false, NULL, NULL),

  ('journey', 'Journey', 'Diario de consciencia com pontos de reflexao e insights AI', '🧭', 'live', 3, 'bem-estar', '#8B5CF6', '#A78BFA', NULL, NULL, '[]'::jsonb, false, NULL, NULL),

  ('gmail', 'Gmail Hub', 'Triagem inteligente de emails com categorizacao automatica por IA', '📧', 'teaser', 4, 'produtividade',  '#EF4444', '#F87171',
   'Seus emails, organizados por IA',
   'Triagem automatica, respostas sugeridas e integracao com seus projetos. Nunca mais perca um email importante.',
   '["Triagem inteligente por prioridade", "Respostas sugeridas por IA", "Integracao com Atlas e Grants", "Busca semantica em emails"]'::jsonb,
   true,
   'Voce e o assistente de email da AICA. Demonstre como a triagem inteligente funciona. Responda em portugues brasileiro. Sugira como organizar emails por prioridade e projetos. Limite: maximo 3 paragrafos por resposta.',
   'Q2 2026'),

  ('drive', 'Drive Hub', 'Gestao inteligente de documentos com busca semantica e organizacao automatica', '📁', 'teaser', 5, 'produtividade', '#F59E0B', '#FBBF24',
   'Documentos inteligentes, sempre a mao',
   'Busca semantica, organizacao automatica por projeto e sugestoes de compartilhamento. Encontre qualquer arquivo em segundos.',
   '["Busca semantica por conteudo", "Organizacao automatica por projeto", "Sugestoes de compartilhamento", "Preview inline de documentos"]'::jsonb,
   true,
   'Voce e o assistente de documentos da AICA. Demonstre como a busca semantica e organizacao automatica funcionam. Responda em portugues brasileiro. Sugira formas de organizar documentos por projeto. Limite: maximo 3 paragrafos por resposta.',
   'Q2 2026'),

  ('studio', 'Studio', 'Producao de podcast com roteiros AI, teleprompter e analytics', '🎙️', 'preview', 6, 'criatividade', '#EC4899', '#F472B6',
   'Seu estudio de podcast completo',
   'Da ideia ao episodio publicado. Roteiros gerados por IA, teleprompter inteligente e analytics detalhados.',
   '["Roteiros gerados por IA", "Teleprompter inteligente", "Analytics de episodios", "Gestao de convidados"]'::jsonb,
   false, NULL, NULL),

  ('finance', 'Finance', 'Dashboard financeiro com processamento de extratos e categorizacao AI', '💰', 'preview', 7, 'financas', '#10B981', '#34D399',
   'Suas financas no piloto automatico',
   'Importe extratos bancarios, categorize gastos automaticamente e receba insights sobre seus habitos financeiros.',
   '["Import de extratos bancarios", "Categorizacao automatica por IA", "Dashboard de gastos e receitas", "Insights financeiros personalizados"]'::jsonb,
   false, NULL, NULL),

  ('connections', 'Connections', 'Inteligencia de relacionamentos com analise de conversas WhatsApp', '🤝', 'teaser', 8, 'relacionamentos', '#6366F1', '#818CF8',
   'Relacionamentos com inteligencia',
   'Analise suas conversas, identifique padroes de comunicacao e nunca perca um follow-up importante.',
   '["Analise de conversas WhatsApp", "Dossie automatico de contatos", "Deteccao de intencoes", "Alertas de follow-up"]'::jsonb,
   true,
   'Voce e o assistente de relacionamentos da AICA. Demonstre como a analise de conversas e o dossie de contatos funcionam. Responda em portugues brasileiro. Sugira formas de manter relacionamentos saudaveis. Limite: maximo 3 paragrafos por resposta.',
   'Q2 2026'),

  ('eraforge', 'EraForge', 'Jogo educativo de simulacao historica para criancas', '⚔️', 'teaser', 9, 'educacao', '#F97316', '#FB923C',
   'Historia viva para seus filhos',
   'Simulacao historica interativa onde criancas exploram civilizacoes, tomam decisoes e aprendem brincando com IA.',
   '["Simulacao historica interativa", "Narrativa adaptativa por IA", "Multiplas civilizacoes", "Aprendizado gamificado"]'::jsonb,
   true,
   'Voce e o narrador do EraForge na AICA. Demonstre como funciona a simulacao historica para criancas. Responda em portugues brasileiro de forma divertida e educativa. Sugira uma mini-aventura historica. Limite: maximo 3 paragrafos por resposta.',
   'Q3 2026')

ON CONFLICT (id) DO NOTHING;
