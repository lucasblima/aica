-- ============================================
-- Seed: Changelog from real recent commits + Roadmap items
-- Issue #599 — Idempotent (skips if data exists)
-- ============================================

DO $$
BEGIN
  -- Only seed changelog if table is empty
  IF NOT EXISTS (SELECT 1 FROM public.service_changelog LIMIT 1) THEN
    INSERT INTO public.service_changelog (date, change_type, description, source, pr_number) VALUES
      ('2026-03-01', 'feat', 'Adicionadas 11 novas funcoes AI para todos os modulos AICA via Telegram', 'github', 598),
      ('2026-02-28', 'fix', 'Correcao na exibicao de cards da biblioteca, unidades de tempo e calculo de duracao no Flux', 'github', 592),
      ('2026-02-28', 'feat', 'Analise de momentos Journey via get_moments_summary no Telegram', 'github', 597),
      ('2026-02-28', 'fix', 'Alinhamento do router AI com schemas reais do banco no Telegram', 'github', 596),
      ('2026-02-28', 'fix', 'Correcao de threading em Forum Topics + card de modulo no Telegram', 'github', 595),
      ('2026-02-27', 'feat', 'Redesign do chat com nova arquitetura de streaming', 'github', NULL),
      ('2026-02-26', 'feat', 'Sistema de cupons de credito para convites', 'github', NULL),
      ('2026-02-25', 'feat', 'Pipeline de processamento de arquivos com testes E2E', 'github', NULL),
      ('2026-02-24', 'feat', 'Redesign da pagina Vida com novo layout', 'github', NULL),
      ('2026-02-24', 'feat', 'Ciclos de treino e releases no modulo Flux', 'github', NULL);
  END IF;

  -- Only seed roadmap if table is empty
  IF NOT EXISTS (SELECT 1 FROM public.roadmap_items LIMIT 1) THEN
    INSERT INTO public.roadmap_items (title, description, module, status, quarter, priority) VALUES
      -- In Progress
      ('Chat AI Redesign', 'Nova experiencia de chat com streaming, contexto persistente e sugestoes inteligentes', 'Chat', 'in_progress', 'Q1 2026', 90),
      ('Telegram Bot Completo', 'Integracao completa com Telegram para todos os 8 modulos', 'Integracoes', 'in_progress', 'Q1 2026', 85),
      ('Pagina de Status e Roadmap', 'Transparencia total sobre status da plataforma e proximos passos', 'Plataforma', 'in_progress', 'Q1 2026', 80),
      -- Planned
      ('Life Score Cross-Domain', 'Metrica composta que avalia saude geral da vida do usuario em todos os dominios', 'Gamificacao', 'planned', 'Q2 2026', 75),
      ('Notificacoes Inteligentes', 'Sistema de notificacoes proativas baseado em padroes do usuario', 'Plataforma', 'planned', 'Q2 2026', 70),
      ('Finance AI Agent', 'Agente de IA para analise financeira automatizada e recomendacoes', 'Finance', 'planned', 'Q2 2026', 65),
      ('Studio Teleprompter', 'Teleprompter inteligente para gravacao de podcasts com pauta sincronizada', 'Studio', 'planned', 'Q2 2026', 60),
      ('Flux WhatsApp Sync', 'Sincronizacao de treinos e feedback via WhatsApp para coaches e atletas', 'Flux', 'planned', 'Q2 2026', 55),
      ('Grants PDF AI Parser', 'Parsing avancado de editais com File Search e extracao estruturada', 'Grants', 'planned', 'Q2 2026', 50),
      ('Journey Weekly Digest', 'Resumo semanal automatico de momentos, emocoes e padroes', 'Journey', 'planned', 'Q2 2026', 45),
      -- Done (recent)
      ('Cupons de Credito', 'Sistema de cupons para convites com creditos de IA', 'Plataforma', 'done', 'Q1 2026', 40),
      ('Flux Canvas Editor', 'Editor visual de blocos de treino para coaches', 'Flux', 'done', 'Q1 2026', 35),
      ('Connections CRM', 'CRM pessoal com 4 arquetipos de espacos e dossie de contatos', 'Connections', 'done', 'Q1 2026', 30);
  END IF;
END $$;
