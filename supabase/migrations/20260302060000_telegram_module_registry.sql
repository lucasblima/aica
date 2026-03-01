-- Telegram Module Card in Module Hub
-- Adds Telegram as a beta integration module in the registry

INSERT INTO module_registry (
  slug, name, tagline, status, sort_order, category, color,
  teaser_features, icon_name
) VALUES (
  'telegram',
  'Telegram',
  'Chat integrado com a AICA via Telegram Bot',
  'beta',
  10,
  'integracoes',
  '#229ED9',
  '["Bot inteligente com IA", "Resumo diario automatico", "Comandos rapidos", "Notificacoes proativas"]'::jsonb,
  'Send'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  category = EXCLUDED.category,
  color = EXCLUDED.color,
  teaser_features = EXCLUDED.teaser_features,
  icon_name = EXCLUDED.icon_name,
  updated_at = now();
