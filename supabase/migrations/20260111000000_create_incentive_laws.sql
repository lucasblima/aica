-- Migration: Create Incentive Laws Entity
-- Issue: #96 - Cadastro de leis de incentivo fiscal (Rouanet, ProAC, ISS-RJ)
-- Date: 2026-01-11
-- Priority: P0 - Critical (MVP)

-- =============================================================================
-- TABELA: incentive_laws
-- Cadastro de leis de incentivo fiscal (federal, estadual, municipal)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.incentive_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificacao
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL, -- ex: "Rouanet", "ProAC"
  official_name TEXT, -- nome oficial da lei
  law_number TEXT, -- ex: "Lei 8.313/91"

  -- Jurisdicao
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('federal', 'state', 'municipal')),
  state VARCHAR(2), -- se estadual (ex: "SP", "RJ")
  city VARCHAR(100), -- se municipal (ex: "Rio de Janeiro")

  -- Beneficios Fiscais
  tax_type TEXT NOT NULL CHECK (tax_type IN ('IR', 'ICMS', 'ISS', 'IPTU', 'mixed')),
  max_deduction_percentage DECIMAL(5,2), -- % maximo de deducao (ex: 4% do IR)
  max_project_value DECIMAL(15,2), -- valor maximo por projeto
  min_counterpart_percentage DECIMAL(5,2), -- % minimo de contrapartida propria

  -- Elegibilidade
  eligible_company_types TEXT[] DEFAULT '{}', -- ['PJ lucro real', 'PJ lucro presumido', 'PF']
  eligible_project_types TEXT[] DEFAULT '{}', -- ['show', 'festival', 'exposicao', 'livro', ...]
  eligible_proponent_types TEXT[] DEFAULT '{}', -- ['ong', 'oscip', 'empresa', 'pessoa_fisica']

  -- Processo
  approval_entity TEXT, -- ex: "MinC", "Secretaria de Cultura SP"
  approval_process_description TEXT,
  average_approval_days INTEGER,

  -- Datas importantes
  fiscal_year_deadline DATE, -- prazo para captacao no ano fiscal

  -- Conteudo para IA
  description TEXT,
  benefits_summary TEXT, -- resumo para apresentacoes
  how_it_works TEXT, -- explicacao didatica
  common_questions JSONB DEFAULT '{}', -- FAQ estruturado

  -- Links e referencias
  official_url TEXT,
  regulation_url TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_incentive_laws_jurisdiction ON public.incentive_laws(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_incentive_laws_tax_type ON public.incentive_laws(tax_type);
CREATE INDEX IF NOT EXISTS idx_incentive_laws_state ON public.incentive_laws(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incentive_laws_is_active ON public.incentive_laws(is_active);
CREATE INDEX IF NOT EXISTS idx_incentive_laws_short_name ON public.incentive_laws(short_name);
CREATE INDEX IF NOT EXISTS idx_incentive_laws_eligible_project_types ON public.incentive_laws USING GIN(eligible_project_types);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_incentive_laws_updated_at ON public.incentive_laws;
CREATE TRIGGER update_incentive_laws_updated_at
  BEFORE UPDATE ON public.incentive_laws
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Dados publicos - qualquer usuario autenticado pode ler
-- Apenas admins podem modificar
-- =============================================================================

ALTER TABLE public.incentive_laws ENABLE ROW LEVEL SECURITY;

-- Politica de leitura: qualquer usuario autenticado pode ler
DROP POLICY IF EXISTS "Anyone can read incentive laws" ON public.incentive_laws;
CREATE POLICY "Anyone can read incentive laws"
  ON public.incentive_laws
  FOR SELECT
  USING (true);

-- Politica de escrita: apenas admins podem modificar
DROP POLICY IF EXISTS "Only admins can modify incentive laws" ON public.incentive_laws;
CREATE POLICY "Only admins can modify incentive laws"
  ON public.incentive_laws
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =============================================================================
-- SEED DATA: Leis principais
-- =============================================================================

-- Lei Rouanet (Federal)
INSERT INTO public.incentive_laws (
  name, short_name, official_name, law_number,
  jurisdiction, tax_type,
  max_deduction_percentage, eligible_company_types,
  eligible_project_types, eligible_proponent_types,
  approval_entity, description, benefits_summary, how_it_works,
  official_url, is_active
) VALUES (
  'Lei Federal de Incentivo a Cultura',
  'Rouanet',
  'Lei de Incentivo a Cultura',
  'Lei 8.313/91',
  'federal',
  'IR',
  4.00, -- 4% do IR devido
  ARRAY['PJ lucro real'],
  ARRAY['show', 'festival', 'exposicao', 'livro', 'filme', 'patrimonio', 'musica', 'teatro', 'danca', 'circo', 'artes visuais', 'fotografia'],
  ARRAY['ong', 'oscip', 'empresa', 'pessoa_fisica'],
  'Ministerio da Cultura / Secretaria de Fomento',
  'A Lei Rouanet permite que empresas e pessoas fisicas destinem parte do Imposto de Renda devido para projetos culturais aprovados. E o principal mecanismo de fomento a cultura no Brasil, movimentando bilhoes de reais anualmente.',
  'Empresas podem deduzir ate 4% do IR devido ao apoiar projetos culturais aprovados. O patrocinio gera visibilidade de marca e e 100% dedutivel. Nao ha custo real para a empresa - o valor seria pago como imposto.',
  'O proponente submete o projeto ao MinC atraves do Sistema Salic. Apos aprovacao (media de 60-90 dias), tem 24 meses para captar recursos junto a patrocinadores. A empresa patrocinadora deduz o valor do IR no exercicio seguinte. O projeto deve prestar contas ao final da execucao.',
  'https://www.gov.br/cultura/pt-br/assuntos/lei-rouanet',
  true
) ON CONFLICT (name) DO NOTHING;

-- ProAC-SP (Estadual)
INSERT INTO public.incentive_laws (
  name, short_name, official_name, law_number,
  jurisdiction, state, tax_type,
  max_deduction_percentage, eligible_company_types,
  eligible_project_types, eligible_proponent_types,
  approval_entity, description, benefits_summary, how_it_works,
  official_url, is_active
) VALUES (
  'Programa de Acao Cultural',
  'ProAC',
  'Programa de Acao Cultural de Sao Paulo',
  'Lei 12.268/2006',
  'state',
  'SP',
  'ICMS',
  3.00, -- 3% do ICMS devido
  ARRAY['PJ contribuinte ICMS'],
  ARRAY['show', 'festival', 'exposicao', 'livro', 'filme', 'patrimonio', 'musica', 'teatro', 'danca', 'circo', 'artes visuais'],
  ARRAY['ong', 'oscip', 'empresa', 'pessoa_fisica', 'coletivo'],
  'Secretaria de Cultura e Economia Criativa de SP',
  'O ProAC permite que empresas contribuintes de ICMS em Sao Paulo destinem parte do imposto para projetos culturais aprovados no estado. E uma das principais leis estaduais de incentivo a cultura do pais.',
  'Empresas paulistas podem deduzir ate 3% do ICMS devido ao apoiar projetos culturais no estado de Sao Paulo. O patrocinio fortalece a marca regionalmente e e 100% dedutivel do ICMS.',
  'O proponente submete o projeto atraves do sistema online da Secretaria de Cultura de SP. Apos aprovacao, tem prazo para captar recursos de empresas contribuintes de ICMS no estado. A empresa deduz o valor patrocinado do ICMS mensal.',
  'https://proac.sp.gov.br/',
  true
) ON CONFLICT (name) DO NOTHING;

-- ISS Cultural RJ (Municipal)
INSERT INTO public.incentive_laws (
  name, short_name, official_name, law_number,
  jurisdiction, state, city, tax_type,
  max_deduction_percentage, eligible_company_types,
  eligible_project_types, eligible_proponent_types,
  approval_entity, description, benefits_summary, how_it_works,
  official_url, is_active
) VALUES (
  'Lei Municipal de Incentivo a Cultura RJ',
  'ISS Cultural RJ',
  'Lei de Incentivo a Cultura do Rio de Janeiro',
  'Lei 5.553/2013',
  'municipal',
  'RJ',
  'Rio de Janeiro',
  'ISS',
  20.00, -- ate 20% do ISS devido
  ARRAY['PJ prestadora de servicos'],
  ARRAY['show', 'festival', 'exposicao', 'livro', 'filme', 'patrimonio', 'musica', 'teatro', 'danca', 'circo', 'artes visuais', 'carnaval'],
  ARRAY['ong', 'oscip', 'empresa', 'pessoa_fisica'],
  'Secretaria Municipal de Cultura RJ',
  'Permite deducao de ISS para patrocinio de projetos culturais aprovados pela Secretaria Municipal de Cultura do Rio de Janeiro. Fomenta a producao cultural na cidade.',
  'Empresas prestadoras de servico no Rio podem deduzir ate 20% do ISS ao patrocinar projetos culturais cariocas. E uma excelente opcao para empresas de servicos com sede no municipio.',
  'O proponente submete o projeto a Secretaria Municipal de Cultura do Rio. Apos aprovacao, pode captar recursos de empresas prestadoras de servico estabelecidas no municipio. A empresa deduz o valor do ISS mensal.',
  'https://cultura.prefeitura.rio/',
  true
) ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- FUNCAO: Formatar lei para contexto de IA
-- Gera texto estruturado para uso em prompts de IA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_incentive_law_ai_context(law_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  law RECORD;
  context TEXT;
BEGIN
  SELECT * INTO law FROM public.incentive_laws WHERE id = law_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  context := format(
    E'=== LEI DE INCENTIVO FISCAL ===\n' ||
    E'Nome: %s (%s)\n' ||
    E'Lei: %s\n' ||
    E'Jurisdicao: %s%s%s\n' ||
    E'Tipo de Imposto: %s\n' ||
    E'Deducao Maxima: %s%%\n\n' ||
    E'DESCRICAO:\n%s\n\n' ||
    E'COMO FUNCIONA:\n%s\n\n' ||
    E'BENEFICIOS PARA PATROCINADORES:\n%s\n\n' ||
    E'ORGAO RESPONSAVEL: %s\n' ||
    E'SITE OFICIAL: %s\n' ||
    E'=== FIM DA LEI ===',
    law.name,
    law.short_name,
    COALESCE(law.law_number, 'N/A'),
    law.jurisdiction,
    CASE WHEN law.state IS NOT NULL THEN ' - ' || law.state ELSE '' END,
    CASE WHEN law.city IS NOT NULL THEN ' - ' || law.city ELSE '' END,
    law.tax_type,
    COALESCE(law.max_deduction_percentage::TEXT, 'Variavel'),
    COALESCE(law.description, 'Sem descricao disponivel'),
    COALESCE(law.how_it_works, 'Sem informacoes sobre o processo'),
    COALESCE(law.benefits_summary, 'Consulte o site oficial'),
    COALESCE(law.approval_entity, 'N/A'),
    COALESCE(law.official_url, 'N/A')
  );

  RETURN context;
END;
$$;

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON TABLE public.incentive_laws IS 'Cadastro de leis de incentivo fiscal (federal, estadual, municipal)';
COMMENT ON COLUMN public.incentive_laws.jurisdiction IS 'Nivel de jurisdicao: federal, state, municipal';
COMMENT ON COLUMN public.incentive_laws.tax_type IS 'Tipo de imposto: IR, ICMS, ISS, IPTU, mixed';
COMMENT ON COLUMN public.incentive_laws.max_deduction_percentage IS 'Percentual maximo de deducao do imposto devido';
COMMENT ON COLUMN public.incentive_laws.eligible_company_types IS 'Tipos de empresa elegiveis para patrocinio';
COMMENT ON COLUMN public.incentive_laws.eligible_project_types IS 'Tipos de projeto elegiveis para aprovacao';
COMMENT ON COLUMN public.incentive_laws.benefits_summary IS 'Resumo dos beneficios para uso em apresentacoes comerciais';
COMMENT ON COLUMN public.incentive_laws.how_it_works IS 'Explicacao didatica do funcionamento da lei';
COMMENT ON COLUMN public.incentive_laws.common_questions IS 'FAQ estruturado em formato JSON';
COMMENT ON FUNCTION public.get_incentive_law_ai_context IS 'Formata dados da lei para uso em prompts de IA';

-- =============================================================================
-- SUCCESS LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '[Incentive Laws Migration] Completed successfully:';
  RAISE NOTICE '  - Table: incentive_laws (with RLS)';
  RAISE NOTICE '  - Seed data: Rouanet, ProAC-SP, ISS Cultural RJ';
  RAISE NOTICE '  - Function: get_incentive_law_ai_context';
  RAISE NOTICE '  - Policies: public read, admin write';
END $$;
