-- ============================================
-- Changelog entries: March 2-3, 2026
-- Adds real commit entries to service_changelog
-- ============================================

INSERT INTO public.service_changelog (date, change_type, description, source, commit_sha, pr_number) VALUES
  -- 2 de marco
  ('2026-03-02', 'fix', 'Correcoes em 7 modulos: Flux, Finance, Grants, Admin e Chat', 'github', '20fc49b', 666),

  -- 3 de marco
  ('2026-03-03', 'feat', 'Nova experiencia de pesquisa no Studio com carrossel de cards e chat AI', 'github', '3f27e3c', NULL),
  ('2026-03-03', 'feat', 'Previsao do tempo no header da pagina Vida e na Agenda', 'github', 'd116d2d', NULL),
  ('2026-03-03', 'feat', 'Atletas demo e campos opcionais de nivel e modalidade no Flux', 'github', '2d50a4f', 700),
  ('2026-03-03', 'fix', 'Logo AICA no header do Studio e correcao na navegacao de retorno', 'github', '5ae7740', 707),
  ('2026-03-03', 'fix', 'Melhoria na renovacao de sessao para evitar desconexoes', 'github', '47e360b', 691),
  ('2026-03-03', 'fix', 'Correcoes em 6 modulos: Journey, Studio e Auth', 'github', 'a80b46f', 668),
  ('2026-03-03', 'improvement', 'Timeline do Studio simplificada e chat mais estavel', 'github', 'f955290', 673);
