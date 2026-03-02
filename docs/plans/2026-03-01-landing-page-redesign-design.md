# Landing Page Redesign — Design Document

**Date:** 2026-03-01
**Session:** feat-landing-page-redesign
**Status:** Approved

## Context

The current landing page communicates AICA as a "unified OS" with 8 modules but fails to showcase the scientific differentiators: 18+ validated scoring models, cross-module intelligence, consciousness-based gamification, and unique Grants capabilities for Brazilian researchers.

## Decisions

- **Approach:** Full replacement with modular section architecture (Approach A)
- **Tone:** Emotional-aspirational (like Calm/Headspace — science as implicit support)
- **Animations:** High — interactive radar chart, flowing particles, scroll-driven reveals
- **Pricing:** Use current code values (Free R$0, Pro R$34.99, Max R$89.99)
- **Design System:** Ceramic (neumorphic, amber/taupe palette)

## Emotional Flow

```
Aspiração (Hero) → Diferenciação (Não é só chat) → Confiança (Ciência) →
Descoberta (Grants) → Conexão (Efeito Composto) → Propósito (Gamificação) →
Decisão (Pricing) → Ação (CTA)
```

## Section Architecture

```
LandingPage.tsx (orchestrator — lazy loads sections below fold)
├── HeroSection.tsx           (fullscreen — Life Score radar)
├── DifferentiatorSection.tsx  ("Não é só chat" comparison)
├── ScoringEngineSection.tsx   (7 domains + explainer + spiral detection)
├── GrantsShowcaseSection.tsx  (Captação dedicated showcase)
├── CompoundEffectSection.tsx  (network diagram + 3 examples)
├── GamificationSection.tsx    (CP categories + compassionate streaks)
├── PricingSection.tsx         (3 tiers)
├── CTASection.tsx             (final call-to-action)
└── FooterSection.tsx          (keep existing, add links)
```

## Section 1: Hero — "Meça, entenda e transforme cada área da sua vida"

**Layout:** Fullscreen, split vertical (text left, radar right)

**Left:**
- H1: "Meça, entenda e transforme cada área da sua vida"
- Sub: "O AICA integra 18+ modelos científicos validados em um sistema que conecta produtividade, bem-estar, finanças, relacionamentos e mais — para que você veja o todo, não pedaços."
- CTA: "Começar gratuitamente" (amber button)
- Micro: "Sem cartão. 500 créditos grátis."

**Right:** Life Score Radar Chart
- Spider/radar with 7 domain vertices
- Animates from 0 to demo values on viewport enter
- Center shows "Life Score: 0.72" with count-up
- Each vertex pulses gently
- Colors: amber/taupe gradient (Ceramic)

**Animation:** Radar draws outside-in with spring physics. Values grow sequentially (stagger 200ms per domain).

## Section 2: "Não é só chat" — Differentiator

**Layout:** 2 comparative columns

**Left (muted):** "Apps tradicionais"
- Linear flow: "Você pergunta" → "IA responde" → "...e acabou"
- Gray tones, static

**Right (vibrant):** "AICA"
- Circular flow with 5 animated steps:
  1. "Você conversa" (chat icon)
  2. "IA analisa padrões" (brain + dots)
  3. "Cruza dados entre módulos" (network)
  4. "Detecta tendências" (trending)
  5. "Sugere ações com base em ciência" (lightbulb)
- Arrows pulse in loop, amber/warm tones

**Caption:** "Outros apps respondem perguntas. O AICA entende sua vida."

**Animation:** Left slides in first, right "explodes" with more energy (scale + glow).

## Section 3: Scientific Scoring Engine — "7 domínios. 18+ modelos. Um Life Score."

**Layout:** Centered title + 7-card grid + interactive explainer + spiral detection

**Grid Cards (7):**
Each card has:
- Domain icon (amber accent)
- Name: "Produtividade", "Bem-estar", etc.
- Primary model: e.g., "Sweller (1988) — Carga Cognitiva"
- Demo score bar (fills on viewport enter)
- Badge: "Validado em PT-BR" for Journey

**Domains:**

| Domain | Label | Model | Reference |
|--------|-------|-------|-----------|
| Atlas | Produtividade | Carga Cognitiva | Sweller (1988) |
| Journey | Bem-estar | PERMA-Profiler | Butler & Kern (2016) |
| Connections | Relacionamentos | Camadas de Dunbar | Dunbar (1992) |
| Finance | Finanças | Saúde Financeira | Financial Health Network (2024) |
| Grants | Captação | Força do Pesquisador | Hirsch (2005) |
| Studio | Produção | Score de Convidado | Best practices |
| Flux | Treinamento | Balanço de Estresse | Banister (1975) |

**Explainer (expands on card click):**
- Simplified formula
- Scale (e.g., "0-1, where 0.80+ = flourishing")
- Contested status (transparency)
- Reuses texts from `scoreExplainerService.ts`

**Spiral Detection (side highlight):**
- Mini diagram: 3 domains connected by red pulsing lines
- Text: "Quando 3+ áreas caem ao mesmo tempo, o AICA detecta o padrão e alerta você antes que vire crise."

**Animation:** Cards stagger fade-in (100ms). Score bars fill with easing. Explainer expands with spring. Spiral lines pulse red.

## Section 4: Módulo Captação — "Pesquisador brasileiro? O AICA foi feito para você."

**Layout:** Feature showcase, slightly darker background

**Features (3 columns):**
1. **Parsing de PDF com IA** — "Envie o edital em PDF. O AICA extrai requisitos, prazos e critérios automaticamente."
2. **Busca Semântica** — "Pergunte em linguagem natural: 'Qual o limite de financiamento?' O AICA encontra no documento."
3. **Geração de Deck** — "Gere apresentações profissionais a partir dos dados do edital e do seu perfil de pesquisador."

**Stats:**
- "Mercado de grants management: USD 68.9M → USD 170.8M até 2033"
- "Researcher Strength Score: mede h-index, impacto, colaboração — seu perfil computado."

**CTA:** "Explorar módulo Captação" (amber outline)

**Animation:** Cards slide-up stagger. Stat numbers count-up. Background radial gradient breathes.

## Section 5: Efeito Composto — "Quanto mais você usa, mais inteligente o sistema fica"

**Layout:** Central network diagram + 3 example cards

**Network Diagram:**
- 7 circular nodes (one per domain) in organic layout
- Connection lines between modules with flowing particles
- Particles move slowly along lines showing data flow
- Hover on node: highlights its connections, dims others
- Node colors: amber/taupe palette

**3 Examples:**
1. "Uma tarefa no Atlas conectada a um edital no Grants e um contato no Connections — o AICA sugere agendar reunião com o co-autor."
2. "Padrões financeiros do Finance cruzados com bem-estar do Journey — detectamos que gastos impulsivos aumentam quando seu humor cai."
3. "Produtividade caindo + bem-estar caindo + finanças deteriorando = alerta sistêmico antes que vire crise."

**Animation:** Nodes pop-in (scale 0→1 spring). Lines draw progressively. Particles start flowing after lines complete. Example cards stagger slide-up.

## Section 6: Gamificação — "Gamificação que respeita quem você é"

**Layout:** 2 columns + badge showcase

**Left — Consciousness Points (CP):**
- 5 categories with icons:
  - 🧘 Presença — "Ser intencional no momento"
  - 📔 Reflexão — "Olhar para dentro com honestidade"
  - 💚 Conexão — "Cuidar de quem importa"
  - 🎯 Intenção — "Agir com propósito"
  - 🌱 Crescimento — "Celebrar conquistas reais"
- Progress bars (demo animated)
- Caption: "Limite diário de 100 CP. Qualidade > quantidade."

**Right — Compassionate Streak:**
- Large counter: "47/50 dias" with ring progress
- 4 grace period icons (3 filled, 1 available)
- Text: "Perdeu um dia? Tudo bem. Você tem 4 grace periods por mês. E se precisar recomeçar, 3 tarefas recuperam seu streak."
- Caption: "Não é sobre perfeição. É sobre consistência com compaixão."

**Badge showcase (row below):**
- 4-5 miniature badge icons
- "16+ tipos de conquistas com lógica composta"

**Animation:** CP bars fill stagger. Streak ring draws (conic-gradient). Grace icons pop-in sequential. Badges scale-in bounce.

## Section 7: Pricing — "Planos que crescem com você"

**Layout:** 3 pricing cards side by side

| | Free | Pro (highlighted) | Max |
|---|---|---|---|
| Price | R$0/mês | R$34,99/mês | R$89,99/mês |
| Credits | 500/mês | 2.500/mês | 10.000/mês |
| CTA | "Começar grátis" | "Assinar Pro" (amber) | "Assinar Max" |

- Below: "1 crédito = 1 análise rápida. Créditos maiores para relatórios e deep analysis."
- Trust: "Pagamento via PIX, cartão ou boleto"

**Animation:** Cards scale-in stagger. Pro has permanent glow. Hover lifts card (translateY -4px).

## Section 8: CTA Final

**Layout:** Fullwidth, amber gradient background

- H2: "Comece a medir e melhorar sua vida com ciência"
- Sub: "500 créditos grátis. 8 módulos. 18+ modelos científicos. Sem cartão."
- CTA: "Criar minha conta grátis" (white on amber, large)
- Link: "Já tem convite? Entrar com código"

## Section 9: Footer

Keep existing footer. Add links to /pricing and /status.

## Technical Notes

- All sections lazy-loaded below the fold (Intersection Observer)
- Framer Motion for animations (useInView, motion.div, AnimatePresence)
- Radar chart: Canvas or SVG-based (no heavy chart library)
- Network diagram: SVG with animated paths
- Particle effects: Canvas overlay or SVG animated circles
- Mobile: stack all columns, simplify animations (reduce particles)
- Reuse texts from `scoreExplainerService.ts` for scientific accuracy
- No invented features — only what exists in PRD/codebase

## Data Sources (Real, Not Invented)

- Domain names/labels: `lifeScoreService.ts`
- Score explanations: `scoreExplainerService.ts`
- CP categories: `consciousnessPoints.ts`
- Spiral detection pairs: `spiralDetectionService.ts`
- Health score components: `healthScore.ts`
- Pricing: `PricingPage.tsx` (CREDIT_TIERS, plans)
