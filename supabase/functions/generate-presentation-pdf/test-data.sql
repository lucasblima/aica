-- ============================================================================
-- TEST DATA for generate-presentation-pdf Edge Function
-- Issue #117 - Phase 4: PDF Generation
-- ============================================================================
--
-- PURPOSE:
-- Create sample deck and slides to test PDF generation locally or in staging.
--
-- USAGE:
-- 1. Replace {YOUR_USER_ID} with actual authenticated user UUID
-- 2. Replace {YOUR_ORG_ID} with actual organization UUID
-- 3. Run this script in Supabase SQL Editor
-- 4. Copy the deck_id from the output
-- 5. Test Edge Function with:
--    POST /functions/v1/generate-presentation-pdf
--    Body: { "deck_id": "copied_uuid", "user_id": "your_user_id" }
-- ============================================================================

-- STEP 1: Create test deck
INSERT INTO public.generated_decks (
  user_id,
  organization_id,
  title,
  template,
  target_company,
  target_focus
) VALUES (
  '{YOUR_USER_ID}',  -- Replace with actual user UUID
  '{YOUR_ORG_ID}',   -- Replace with actual organization UUID
  'Test Presentation - Cultural Project',
  'professional',
  'Acme Corporation',
  'esg'
) RETURNING id;

-- Save the returned UUID as {DECK_ID}

-- STEP 2: Create test slides
-- Slide 1: Cover
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',  -- Replace with deck UUID from STEP 1
  'cover',
  0,
  '{
    "title": "Projeto Cultural Inovador",
    "subtitle": "Transformando vidas através da arte e cultura",
    "tagline": "Cultura que inspira, arte que transforma",
    "approvalNumber": "PRONAC 123456"
  }'::jsonb
);

-- Slide 2: Organization
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'organization',
  1,
  '{
    "name": "Instituto Cultural Brasil",
    "description": "Organização sem fins lucrativos dedicada à promoção da cultura brasileira através de projetos educacionais e artísticos.",
    "mission": "Democratizar o acesso à cultura de qualidade em todas as regiões do Brasil",
    "achievements": [
      "Mais de 50.000 beneficiários diretos em 10 anos",
      "Parceria com 200+ escolas públicas",
      "Reconhecimento internacional pela UNESCO"
    ]
  }'::jsonb
);

-- Slide 3: Project
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'project',
  2,
  '{
    "name": "Arte na Escola",
    "executiveSummary": "Projeto que leva oficinas de arte, música e teatro para escolas públicas em regiões de vulnerabilidade social, desenvolvendo talentos e ampliando horizontes culturais.",
    "objectives": [
      "Alcançar 10.000 estudantes em 50 escolas públicas",
      "Oferecer 200 oficinas gratuitas de arte e cultura",
      "Formar 50 arte-educadores nas comunidades atendidas",
      "Realizar 5 apresentações públicas com trabalhos dos alunos"
    ],
    "duration": "12 meses",
    "location": "São Paulo, Rio de Janeiro e Salvador"
  }'::jsonb
);

-- Slide 4: Impact Metrics
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'impact-metrics',
  3,
  '{
    "title": "Impacto Esperado",
    "impactStatement": "Nosso projeto visa transformar a realidade de milhares de jovens através do acesso à cultura",
    "metrics": [
      {
        "label": "Estudantes Beneficiados",
        "value": "10.000",
        "unit": "+",
        "icon": "👥",
        "description": "Alcance direto nas escolas parceiras"
      },
      {
        "label": "Oficinas Realizadas",
        "value": "200",
        "icon": "🎨",
        "description": "Arte, música, teatro e literatura"
      },
      {
        "label": "Escolas Parceiras",
        "value": "50",
        "icon": "🏫",
        "description": "Nas principais capitais brasileiras"
      },
      {
        "label": "Arte-Educadores Formados",
        "value": "50",
        "icon": "🎓",
        "description": "Capacitação de multiplicadores locais"
      }
    ]
  }'::jsonb
);

-- Slide 5: Timeline
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'timeline',
  4,
  '{
    "title": "Cronograma de Execução",
    "events": [
      {
        "date": "Mês 1-2",
        "title": "Planejamento e Seleção",
        "description": "Seleção de escolas, formação de equipe e preparação de materiais",
        "isHighlighted": false
      },
      {
        "date": "Mês 3-5",
        "title": "Primeira Fase de Oficinas",
        "description": "Início das oficinas em 25 escolas nas regiões Sul e Sudeste",
        "isHighlighted": true
      },
      {
        "date": "Mês 6-8",
        "title": "Segunda Fase de Oficinas",
        "description": "Expansão para 25 escolas nas regiões Norte e Nordeste",
        "isHighlighted": true
      },
      {
        "date": "Mês 9-10",
        "title": "Formação de Arte-Educadores",
        "description": "Capacitação dos multiplicadores locais",
        "isHighlighted": false
      },
      {
        "date": "Mês 11-12",
        "title": "Apresentações e Encerramento",
        "description": "Mostras públicas dos trabalhos e avaliação final",
        "isHighlighted": true
      }
    ]
  }'::jsonb
);

-- Slide 6: Team
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'team',
  5,
  '{
    "title": "Nossa Equipe",
    "members": [
      {
        "name": "Maria Silva",
        "role": "Coordenadora Geral",
        "bio": "20 anos de experiência em gestão cultural e projetos sociais"
      },
      {
        "name": "João Santos",
        "role": "Diretor Pedagógico",
        "bio": "Mestre em Artes e especialista em educação inclusiva"
      },
      {
        "name": "Ana Costa",
        "role": "Coordenadora de Parcerias",
        "bio": "Ampla rede de contatos com escolas públicas e organizações culturais"
      },
      {
        "name": "Pedro Oliveira",
        "role": "Diretor Artístico",
        "bio": "Premiado arte-educador com projetos reconhecidos nacionalmente"
      }
    ]
  }'::jsonb
);

-- Slide 7: Incentive Law
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'incentive-law',
  6,
  '{
    "lawName": "Lei Federal de Incentivo à Cultura",
    "lawShortName": "Lei Rouanet",
    "jurisdiction": "Federal",
    "taxType": "Imposto de Renda",
    "deductionPercentage": 100,
    "description": "A Lei Rouanet permite que empresas e pessoas físicas deduzam do imposto de renda valores destinados a projetos culturais aprovados pelo Ministério da Cultura."
  }'::jsonb
);

-- Slide 8: Tiers
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'tiers',
  7,
  '{
    "title": "Cotas de Patrocínio",
    "currency": "R$",
    "tiers": [
      {
        "name": "Bronze",
        "value": 50000,
        "description": "Apoio inicial ao projeto",
        "deliverables": [
          { "title": "Logo em materiais impressos" },
          { "title": "Menção em redes sociais (2x)" },
          { "title": "Certificado de patrocinador" }
        ],
        "isHighlighted": false
      },
      {
        "name": "Prata",
        "value": 100000,
        "description": "Parceria estratégica",
        "deliverables": [
          { "title": "Logo em destaque em materiais" },
          { "title": "Menção em redes sociais (5x)" },
          { "title": "Participação em evento de lançamento" },
          { "title": "Relatório de impacto personalizado" },
          { "title": "Visita às escolas parceiras" }
        ],
        "isHighlighted": true
      },
      {
        "name": "Ouro",
        "value": 200000,
        "description": "Patrocinador master",
        "deliverables": [
          { "title": "Naming rights do projeto" },
          { "title": "Logo exclusivo em todos os materiais" },
          { "title": "Campanha de mídia dedicada" },
          { "title": "Apresentações privadas para convidados" },
          { "title": "Relatórios mensais de acompanhamento" },
          { "title": "Direito a veto criativo (limitado)" }
        ],
        "isHighlighted": false
      }
    ]
  }'::jsonb
);

-- Slide 9: Testimonials
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'testimonials',
  8,
  '{
    "title": "O Que Dizem Sobre Nós",
    "testimonials": [
      {
        "quote": "O projeto transformou nossa escola. Os alunos estão mais engajados e descobrindo talentos que nem sabiam que tinham.",
        "author": "Carla Mendes",
        "role": "Diretora - E.E. Paulo Freire"
      },
      {
        "quote": "Uma iniciativa fundamental para democratizar o acesso à cultura. Parabéns pela seriedade e profissionalismo!",
        "author": "Dr. Roberto Almeida",
        "role": "Secretário Municipal de Cultura - SP"
      }
    ]
  }'::jsonb
);

-- Slide 10: Media
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'media',
  9,
  '{
    "title": "Repercussão na Mídia",
    "mediaItems": [
      {
        "outlet": "Folha de S.Paulo",
        "headline": "Projeto leva arte para escolas públicas e forma novos talentos",
        "date": "15/01/2026"
      },
      {
        "outlet": "G1",
        "headline": "Instituto cultural transforma vidas através da educação artística",
        "date": "20/12/2025"
      },
      {
        "outlet": "TV Cultura",
        "headline": "Especial mostra impacto de projeto social em comunidades",
        "date": "10/11/2025"
      }
    ]
  }'::jsonb
);

-- Slide 11: Comparison (Why Sponsor Us)
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'comparison',
  10,
  '{
    "title": "Por Que Patrocinar Nosso Projeto?",
    "items": [
      {
        "label": "Nosso Projeto",
        "features": [
          { "name": "Impacto social mensurável", "available": true },
          { "name": "Transparência total na gestão", "available": true },
          { "name": "Equipe com experiência comprovada", "available": true },
          { "name": "Contrapartidas personalizadas", "available": true },
          { "name": "Visibilidade de marca garantida", "available": true },
          { "name": "100% de dedução fiscal", "available": true }
        ]
      },
      {
        "label": "Projetos Tradicionais",
        "features": [
          { "name": "Impacto social mensurável", "available": false },
          { "name": "Transparência total na gestão", "available": false },
          { "name": "Equipe com experiência comprovada", "available": true },
          { "name": "Contrapartidas personalizadas", "available": false },
          { "name": "Visibilidade de marca garantida", "available": true },
          { "name": "100% de dedução fiscal", "available": true }
        ]
      }
    ]
  }'::jsonb
);

-- Slide 12: Contact
INSERT INTO public.deck_slides (deck_id, slide_type, sort_order, content) VALUES (
  '{DECK_ID}',
  'contact',
  11,
  '{
    "title": "Vamos Transformar Vidas Juntos?",
    "callToAction": "Entre em contato conosco e faça parte dessa história de transformação através da cultura!",
    "name": "Instituto Cultural Brasil",
    "email": "contato@institutocultural.org.br",
    "phone": "(11) 3456-7890",
    "website": "www.institutocultural.org.br",
    "address": "Av. Paulista, 1234 - São Paulo/SP"
  }'::jsonb
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check created deck
SELECT
  id,
  title,
  template,
  target_company,
  target_focus,
  created_at
FROM public.generated_decks
WHERE user_id = '{YOUR_USER_ID}'
ORDER BY created_at DESC
LIMIT 1;

-- Check all slides for the deck
SELECT
  slide_type,
  sort_order,
  content->>'title' AS title,
  jsonb_pretty(content) AS content_preview
FROM public.deck_slides
WHERE deck_id = '{DECK_ID}'
ORDER BY sort_order;

-- Count slides by type
SELECT
  slide_type,
  COUNT(*) AS count
FROM public.deck_slides
WHERE deck_id = '{DECK_ID}'
GROUP BY slide_type;

-- ============================================================================
-- TEST EDGE FUNCTION (curl command)
-- ============================================================================
--
-- Replace {DECK_ID}, {YOUR_USER_ID}, and {YOUR_JWT_TOKEN}
--
-- curl -i --location --request POST \
--   'https://YOUR_PROJECT.supabase.co/functions/v1/generate-presentation-pdf' \
--   --header 'Authorization: Bearer {YOUR_JWT_TOKEN}' \
--   --header 'Content-Type: application/json' \
--   --data '{
--     "deck_id": "{DECK_ID}",
--     "user_id": "{YOUR_USER_ID}"
--   }'
--
-- ============================================================================
