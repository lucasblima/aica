# Landing Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current AICA landing page with 9 modular sections that communicate scientific differentiators, cross-module intelligence, and conscious gamification — transforming perception from "another chatbot" to "science-based Life OS."

**Architecture:** Modular section components rendered by a thin orchestrator (`LandingPage.tsx`). Each section is self-contained with its own animations. Sections below the fold are lazy-loaded via Intersection Observer. All data is hardcoded (no auth required). Existing invite code + waitlist logic preserved in the new CTA section.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (Ceramic tokens), Framer Motion v12, SVG for charts/diagrams, Canvas for particle effects.

**Design Doc:** `docs/plans/2026-03-01-landing-page-redesign-design.md`

---

## Pre-Implementation Checklist

Before starting:
```bash
git pull origin main
git checkout -b feature/feat-landing-page-redesign
npm install
npm run dev  # Verify current landing works
```

Key files to reference throughout:
- Animation presets: `src/lib/animations.ts` and `src/lib/animations/ceramic-motion.ts`
- Ceramic tokens: `tailwind.config.js` (ceramic-base, ceramic-accent, etc.)
- Scoring texts: `src/services/scoring/scoreExplainerService.ts`
- Domain labels: `src/services/scoring/lifeScoreService.ts`
- CP data: `src/types/consciousnessPoints.ts`
- Spiral pairs: `src/services/scoring/spiralDetectionService.ts`
- Pricing: `src/modules/billing/pages/PricingPage.tsx`
- Current landing: `src/modules/onboarding/components/landing/LandingPage.tsx`
- Existing animations: import `staggerContainer`, `staggerItem`, `cardElevationVariants` from `@/lib/animations/ceramic-motion`

---

## Task 1: Scaffolding — New LandingPage Orchestrator + Shared Hook

**Files:**
- Modify: `src/modules/onboarding/components/landing/LandingPage.tsx`
- Create: `src/modules/onboarding/components/landing/hooks/useScrollReveal.ts`
- Create: `src/modules/onboarding/components/landing/data/landingData.ts`

**Goal:** Replace LandingPage.tsx with a thin orchestrator that renders the new sections in order. Create a shared `useScrollReveal` hook for viewport-triggered animations. Create a data file with all hardcoded content (domain labels, scoring models, pricing tiers, CP categories, etc.) pulled from the real services.

**Step 1: Create the landing data file**

File: `src/modules/onboarding/components/landing/data/landingData.ts`

This file contains ALL hardcoded content for the landing page, sourced from real service files. Include:
- `DOMAINS` array: 7 objects with `id`, `label`, `model`, `reference`, `icon` (lucide icon name), `description`, `validatedPtBr` boolean
- `SCORING_MODELS` array: 18 objects from scoreExplainerService with `id`, `title`, `summary`, `domain`, `formula`, `scale`, `contested`
- `SPIRAL_PAIRS` array: 6 pairs from spiralDetectionService
- `CP_CATEGORIES` array: 5 objects with `id`, `icon` (emoji), `label`, `description`, `color`
- `PRICING_TIERS` array: 3 tiers with `name`, `price`, `credits`, `features[]`, `highlighted` boolean
- `COMPOUND_EXAMPLES` array: 3 example strings

Use exact PT-BR strings from the codebase — do NOT translate or paraphrase.

**Step 2: Create the useScrollReveal hook**

File: `src/modules/onboarding/components/landing/hooks/useScrollReveal.ts`

Simple hook wrapping Framer Motion's `useInView`:
```typescript
import { useRef } from 'react';
import { useInView } from 'framer-motion';

export function useScrollReveal(options?: { once?: boolean; margin?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: options?.margin ?? '-100px',
  });
  return { ref, isInView };
}
```

**Step 3: Replace LandingPage.tsx**

Rewrite `LandingPage.tsx` as a thin orchestrator:
- Keep the existing imports for `AuthSheet`, `Logo`, invite code logic (`validateInviteCode`, `storeInviteCode`, `getStoredInviteCode`), and `useWaitlist`
- Keep ALL state management for invite codes and waitlist (these get passed to CTASection)
- Keep the fixed header (frosted glass with Logo + nav)
- Keep SEO meta tags
- Replace the body with: `HeroSection` → `DifferentiatorSection` → `ScoringEngineSection` → `GrantsShowcaseSection` → `CompoundEffectSection` → `GamificationSection` → `PricingSection` → `CTASection` → `FooterSection`
- Use `React.lazy` + `Suspense` for sections below the fold (everything after HeroSection)
- Pass invite/waitlist props to CTASection

**Step 4: Update barrel exports**

File: `src/modules/onboarding/components/landing/index.ts`

Update to export all new section components.

**Step 5: Verify and commit**

```bash
npm run typecheck
npm run build
```

The app should render with just the header + empty section placeholders (components don't exist yet, so use placeholder stubs or conditional rendering).

```bash
git add src/modules/onboarding/components/landing/
git commit -m "feat(landing): scaffold new landing page orchestrator with data and hooks"
```

---

## Task 2: HeroSection — Life Score Radar Chart

**Files:**
- Create: `src/modules/onboarding/components/landing/components/HeroSection.tsx` (overwrite existing)
- Create: `src/modules/onboarding/components/landing/components/LifeScoreRadar.tsx`

**Goal:** Fullscreen hero with headline left and animated Life Score radar chart right. The radar draws from 0 to demo values with spring physics.

**Step 1: Create LifeScoreRadar component**

File: `src/modules/onboarding/components/landing/components/LifeScoreRadar.tsx`

SVG-based radar chart:
- Accept `domains` prop (7 items with label + demo value 0-1)
- Accept `isVisible` boolean to trigger animation
- Draw 7-pointed radar with concentric rings (0.25, 0.5, 0.75, 1.0)
- Vertex labels positioned outside the polygon
- Filled polygon area with amber gradient (`ceramic-accent` with 20% opacity)
- Border of polygon in `ceramic-accent`
- Center text: "Life Score" + animated counter "0.72"
- Animation: When `isVisible` becomes true, polygon vertices interpolate from center (0) to their demo values over 1.5s with spring easing. Stagger 200ms per vertex.
- Each vertex has a small pulsing dot (scale animation loop, 3s period)
- Use Framer Motion `useSpring` or `useMotionValue` for smooth interpolation
- Mobile: radar takes full width, centered above text
- Desktop: radar is ~400x400px

Demo values (realistic):
```typescript
const DEMO_SCORES = {
  atlas: 0.78,       // Produtividade
  journey: 0.65,     // Bem-estar
  connections: 0.72, // Relacionamentos
  finance: 0.58,     // Finanças
  grants: 0.85,      // Captação
  studio: 0.70,      // Produção
  flux: 0.62,        // Treinamento
};
```

**Step 2: Create new HeroSection**

File: `src/modules/onboarding/components/landing/components/HeroSection.tsx` (overwrite)

Layout:
- Fullscreen (`min-h-screen`) with `bg-ceramic-base`
- Flex row on desktop, column on mobile
- Left (text): H1 + subtitle + CTA button + micro text
- Right: LifeScoreRadar component
- Use `useScrollReveal` for visibility trigger (though hero is above fold, radar should still animate on load)
- H1: "Meça, entenda e transforme cada área da sua vida" — `text-4xl md:text-5xl lg:text-6xl font-black text-ceramic-text-primary`
- Subtitle: "O AICA integra 18+ modelos científicos..." — `text-lg text-ceramic-text-secondary max-w-lg`
- CTA: "Começar gratuitamente" — `bg-ceramic-accent hover:bg-ceramic-accent-dark text-white rounded-xl px-8 py-4 text-lg font-semibold`
- Micro: "Sem cartão. 500 créditos grátis." — `text-sm text-ceramic-text-secondary`
- Text side animates with `fadeInUp` from `@/lib/animations`
- Radar animates independently with its own trigger

**Step 3: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: hero renders with animated radar
```

```bash
git add src/modules/onboarding/components/landing/components/HeroSection.tsx
git add src/modules/onboarding/components/landing/components/LifeScoreRadar.tsx
git commit -m "feat(landing): add hero section with animated Life Score radar chart"
```

---

## Task 3: DifferentiatorSection — "Não é só chat"

**Files:**
- Create: `src/modules/onboarding/components/landing/components/DifferentiatorSection.tsx`

**Goal:** Side-by-side comparison showing linear chatbot flow (muted) vs. AICA's circular intelligence flow (vibrant).

**Step 1: Create DifferentiatorSection**

Layout:
- Section wrapper: `py-24 px-6 bg-ceramic-cool`
- Caption above: "Outros apps respondem perguntas. O AICA entende sua vida." — centered, `text-3xl font-bold`
- 2-column grid (`grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto`)

Left column (muted):
- Title: "Apps tradicionais" — `text-ceramic-text-secondary`
- 3 vertical steps connected by dashed lines:
  1. Chat icon + "Você pergunta"
  2. Bot icon + "IA responde"
  3. Stop icon + "...e acabou" (with opacity fade)
- All in `text-ceramic-text-secondary/60`, grayscale icons
- Static, no animation beyond fade-in

Right column (vibrant):
- Title: "AICA" — `text-ceramic-accent font-bold`
- 5 steps in a circular/loop arrangement (visually suggest a cycle):
  1. "Você conversa" (MessageCircle icon)
  2. "IA analisa padrões" (Brain icon)
  3. "Cruza dados entre módulos" (Network icon)
  4. "Detecta tendências" (TrendingUp icon)
  5. "Sugere ações com base em ciência" (Lightbulb icon)
- Arrows between steps that pulse (Framer Motion loop animation)
- Colors: `text-ceramic-accent` for icons, `text-ceramic-text-primary` for text
- Each step has a small amber dot that glows

Animation:
- Left column slides in from left (`x: -40 → 0, opacity: 0 → 1`)
- Right column slides in from right with 300ms delay, larger scale (`scale: 0.95 → 1`)
- Arrow pulse starts after both columns are visible
- Use `staggerContainer` + `staggerItem` from ceramic-motion

**Step 2: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: both columns render, animations work on scroll
```

```bash
git add src/modules/onboarding/components/landing/components/DifferentiatorSection.tsx
git commit -m "feat(landing): add differentiator section comparing AICA vs traditional chatbots"
```

---

## Task 4: ScoringEngineSection — 7 Domains + Explainer

**Files:**
- Create: `src/modules/onboarding/components/landing/components/ScoringEngineSection.tsx`
- Create: `src/modules/onboarding/components/landing/components/DomainCard.tsx`
- Create: `src/modules/onboarding/components/landing/components/SpiralDetectionVisual.tsx`

**Goal:** Showcase the 7 scoring domains with interactive explainer panels and a spiral detection highlight.

**Step 1: Create DomainCard component**

File: `src/modules/onboarding/components/landing/components/DomainCard.tsx`

Props: `{ domain: DomainData; isExpanded: boolean; onToggle: () => void; delay: number }`

Card layout:
- `bg-ceramic-base rounded-2xl p-6 shadow-ceramic-emboss cursor-pointer`
- Hover: `shadow-ceramic-elevated` + `translateY(-2px)` via Framer Motion
- Icon (lucide) in amber circle background
- Domain label: `font-bold text-ceramic-text-primary`
- Model reference: `text-sm text-ceramic-text-secondary` (e.g., "Sweller (1988)")
- Score bar: horizontal bar that fills to demo % on viewport enter (amber gradient)
- Optional badge: "Validado em PT-BR" for Journey domain (green/ceramic-success)
- On click: toggles expanded explainer panel

Expanded panel (AnimatePresence):
- Slides down below the card with spring animation
- Shows: formula (monospace), scale description, contested warning if applicable
- Uses texts from `landingData.ts` (sourced from scoreExplainerService)
- Close button or click-outside to collapse

**Step 2: Create SpiralDetectionVisual**

File: `src/modules/onboarding/components/landing/components/SpiralDetectionVisual.tsx`

Small SVG visualization:
- 3 circles representing domains (e.g., Bem-estar, Produtividade, Finanças)
- Red connecting lines between them that pulse (stroke-dasharray animation)
- Below: text "Quando 3+ áreas caem ao mesmo tempo, o AICA detecta o padrão e alerta você antes que vire crise."
- `bg-ceramic-error-bg rounded-2xl p-6 border border-ceramic-error/20`

**Step 3: Create ScoringEngineSection**

Layout:
- Section: `py-24 px-6 bg-ceramic-base`
- Title: "7 domínios. 18+ modelos científicos. Um Life Score." — `text-3xl md:text-4xl font-black text-center`
- Subtitle: "Cada pontuação tem uma metodologia transparente. Você sempre sabe como é calculado." — `text-ceramic-text-secondary text-center`
- Grid of 7 DomainCards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (4+3 layout)
  - First row: Atlas, Journey, Connections, Finance
  - Second row: Grants, Studio, Flux (centered with `col-start-1 lg:col-start-1` or flex)
- SpiralDetectionVisual below the grid, max-w-2xl centered
- State: `expandedDomain: string | null` — only one card expanded at a time
- Stagger animation for cards: 100ms between each

**Step 4: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: 7 cards render, click expands explainer, spiral visual shows
```

```bash
git add src/modules/onboarding/components/landing/components/ScoringEngineSection.tsx
git add src/modules/onboarding/components/landing/components/DomainCard.tsx
git add src/modules/onboarding/components/landing/components/SpiralDetectionVisual.tsx
git commit -m "feat(landing): add scientific scoring engine section with 7 domains and spiral detection"
```

---

## Task 5: GrantsShowcaseSection — Captação

**Files:**
- Create: `src/modules/onboarding/components/landing/components/GrantsShowcaseSection.tsx`

**Goal:** Dedicated section for the Grants module targeting Brazilian researchers.

**Step 1: Create GrantsShowcaseSection**

Layout:
- Section: `py-24 px-6 bg-ceramic-cool` (slightly different bg for visual separation)
- Title: "Pesquisador brasileiro? O AICA foi feito para você." — `text-3xl md:text-4xl font-black text-center`
- Subtitle: "Nenhuma outra ferramenta faz parsing de editais da FAPERJ, FINEP e CNPq com inteligência artificial." — `text-ceramic-text-secondary text-center`
- 3 feature cards in a row (`grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto`):
  1. **Parsing de PDF com IA** — FileText + Sparkles icons
     - "Envie o edital em PDF. O AICA extrai requisitos, prazos e critérios automaticamente."
  2. **Busca Semântica** — Search + Brain icons
     - "Pergunte em linguagem natural: 'Qual o limite de financiamento?' O AICA encontra no documento."
  3. **Geração de Deck** — Presentation icon
     - "Gere apresentações profissionais a partir dos dados do edital e do seu perfil de pesquisador."
- Each card: `bg-ceramic-base rounded-2xl p-8 shadow-ceramic-emboss text-center`
- Icon in amber gradient circle at top
- Below cards: stat row with 2 stats side by side:
  - "USD 68.9M → USD 170.8M até 2033" with TrendingUp icon
  - "Researcher Strength Score: h-index + impacto + colaboração"
- Stats animated with count-up on viewport enter
- CTA: "Explorar módulo Captação" — `border-2 border-ceramic-accent text-ceramic-accent rounded-xl px-6 py-3 hover:bg-ceramic-accent hover:text-white`
- Animation: cards slide-up stagger, stat numbers count up, CTA fades in last

**Step 2: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: 3 feature cards + stats + CTA render
```

```bash
git add src/modules/onboarding/components/landing/components/GrantsShowcaseSection.tsx
git commit -m "feat(landing): add grants showcase section for Brazilian researchers"
```

---

## Task 6: CompoundEffectSection — Network Diagram

**Files:**
- Create: `src/modules/onboarding/components/landing/components/CompoundEffectSection.tsx`
- Create: `src/modules/onboarding/components/landing/components/ModuleNetwork.tsx`

**Goal:** Network diagram showing 7 modules interconnected with flowing particles, plus 3 concrete examples.

**Step 1: Create ModuleNetwork component**

File: `src/modules/onboarding/components/landing/components/ModuleNetwork.tsx`

SVG + Canvas hybrid:
- SVG for nodes and connection lines (static structure)
- Canvas overlay for flowing particles (performance)
- 7 nodes positioned in a roughly circular layout (not perfect circle — organic)
- Each node: circle with domain icon + label below
- Connection lines between related modules (based on spiral pairs + additional logical connections)
- Particles: small amber dots that travel along the connection lines at varying speeds
- On hover of a node: highlight its connections (increase opacity), dim unconnected ones
- Responsive: scale down on mobile (reduce to ~300px), simplify particle count
- Use `requestAnimationFrame` for particle animation loop
- Cleanup: cancel RAF on unmount

Node positions (approximate, SVG viewBox 600x400):
```typescript
const NODE_POSITIONS = {
  atlas:       { x: 300, y: 60 },   // top center
  journey:     { x: 500, y: 120 },  // top right
  connections: { x: 540, y: 280 },  // right
  finance:     { x: 400, y: 360 },  // bottom right
  grants:      { x: 200, y: 360 },  // bottom left
  studio:      { x: 60,  y: 280 },  // left
  flux:        { x: 100, y: 120 },  // top left
};
```

Connection lines (from spiral pairs + extras):
- journey ↔ atlas, finance ↔ journey, connections ↔ journey
- atlas ↔ flux, finance ↔ connections, journey ↔ flux
- grants ↔ atlas (edital → task), studio ↔ connections (guest → contact)

**Step 2: Create CompoundEffectSection**

Layout:
- Section: `py-24 px-6 bg-ceramic-base`
- Title: "Quanto mais você usa, mais inteligente o sistema fica" — centered, `text-3xl md:text-4xl font-black`
- Subtitle: "Dados que entram em um módulo enriquecem todos os outros. É o efeito composto."
- ModuleNetwork: centered, `max-w-3xl mx-auto`
- 3 example cards below (`grid-cols-1 md:grid-cols-3 gap-6`):
  1. Atlas → Grants → Connections example (task → edital → meeting)
  2. Finance → Journey (spending patterns → wellbeing)
  3. Cross-module spiral detection (systemic alert)
- Each example card: `bg-ceramic-warm/30 rounded-xl p-6 border border-ceramic-border`
- Icons at start of each example representing the modules involved
- Animation: nodes pop-in (scale 0→1 spring), lines draw progressively (stroke-dashoffset), particles start flowing 500ms after lines complete, example cards stagger slide-up

**Step 3: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: network diagram renders, particles flow, examples show
```

```bash
git add src/modules/onboarding/components/landing/components/CompoundEffectSection.tsx
git add src/modules/onboarding/components/landing/components/ModuleNetwork.tsx
git commit -m "feat(landing): add compound effect section with animated network diagram"
```

---

## Task 7: GamificationSection — CP + Compassionate Streaks

**Files:**
- Create: `src/modules/onboarding/components/landing/components/GamificationSection.tsx`
- Create: `src/modules/onboarding/components/landing/components/StreakRing.tsx`

**Goal:** Showcase Consciousness Points (5 categories) and the compassionate streak system.

**Step 1: Create StreakRing component**

File: `src/modules/onboarding/components/landing/components/StreakRing.tsx`

SVG circular progress ring:
- Props: `{ current: number; total: number; isVisible: boolean }`
- Circle track (gray) + progress arc (amber gradient)
- Center: large number "47/50" with "dias" below
- Animates from 0 to target progress when `isVisible`
- Uses conic-gradient via SVG `stroke-dasharray` + `stroke-dashoffset` animation
- Below ring: 4 small circles for grace periods (3 filled amber, 1 empty outline)
- Grace period icons pop-in sequentially after ring completes

**Step 2: Create GamificationSection**

Layout:
- Section: `py-24 px-6 bg-ceramic-cool`
- Title: "Gamificação que respeita quem você é" — centered, `text-3xl md:text-4xl font-black`
- Subtitle: "Baseada em pesquisa sobre motivação intrínseca. Recompensa consciência, não repetição mecânica."
- 2-column layout (`grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto`):

Left column — Consciousness Points:
- 5 CP category rows, each with:
  - Emoji icon (from CP data: 🧘📔💚🎯🌱)
  - Category name (Presença, Reflexão, Conexão, Intenção, Crescimento)
  - Short description
  - Animated progress bar (fills to random demo % on viewport enter)
  - Bar color matches category color from consciousnessPoints.ts
- Caption: "Limite diário de 100 CP. Qualidade > quantidade."
- Animation: bars fill with stagger (200ms between each)

Right column — Compassionate Streak:
- StreakRing component (47/50)
- Grace period icons below
- Text: "Perdeu um dia? Tudo bem. Você tem 4 grace periods por mês. E se precisar recomeçar, 3 tarefas recuperam seu streak."
- Caption: "Não é sobre perfeição. É sobre consistência com compaixão."

Below both columns — Badge showcase:
- Horizontal row of 5 badge miniatures (generic circular icons with amber tones)
- Text: "16+ tipos de conquistas com lógica composta"
- Badges scale-in with bounce stagger

**Step 3: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: CP bars, streak ring, badges all animate
```

```bash
git add src/modules/onboarding/components/landing/components/GamificationSection.tsx
git add src/modules/onboarding/components/landing/components/StreakRing.tsx
git commit -m "feat(landing): add gamification section with CP categories and compassionate streaks"
```

---

## Task 8: PricingSection — 3 Tiers

**Files:**
- Create: `src/modules/onboarding/components/landing/components/PricingSection.tsx`

**Goal:** Classic SaaS pricing comparison with 3 tiers. Pro tier highlighted.

**Step 1: Create PricingSection**

Layout:
- Section: `py-24 px-6 bg-ceramic-base`
- Title: "Planos que crescem com você" — centered, `text-3xl md:text-4xl font-black`
- 3 pricing cards (`grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto`):

Free card:
- `bg-ceramic-base rounded-2xl p-8 shadow-ceramic-emboss`
- Name: "Free"
- Price: "R$ 0" + "/mês"
- Credits: "500 créditos/mês"
- Features: 8 módulos, Scoring básico, Chat com IA, Export de dados
- CTA: "Começar grátis" — outlined button

Pro card (highlighted):
- `bg-ceramic-base rounded-2xl p-8 shadow-ceramic-elevated border-2 border-ceramic-accent relative`
- Badge: "Popular" — `absolute -top-3 left-1/2 -translate-x-1/2 bg-ceramic-accent text-white px-4 py-1 rounded-full text-sm`
- Name: "Pro"
- Price: "R$ 34,99" + "/mês"
- Credits: "2.500 créditos/mês" + "(5x)"
- Features: Tudo do Free + IA avançada (Gemini Pro), Análise cross-module, Suporte prioritário, WhatsApp completo
- CTA: "Assinar Pro" — solid amber button
- Subtle glow: `shadow-[0_0_30px_rgba(217,119,6,0.15)]`

Max card:
- Same base as Free
- Name: "Max"
- Price: "R$ 89,99" + "/mês"
- Credits: "10.000 créditos/mês" + "(20x)"
- Features: Tudo do Pro + Acesso à API, Dashboard avançado, Suporte dedicado
- CTA: "Assinar Max" — outlined button

Below cards:
- "1 crédito = 1 análise rápida. Créditos maiores para relatórios e deep analysis." — `text-sm text-ceramic-text-secondary text-center`
- Trust badges: PIX + Cartão icons + "Pagamento seguro"

Animation: cards scale-in stagger (200ms), Pro card has permanent subtle glow, hover lifts any card (translateY -4px + shadow increase via Framer Motion `whileHover`)

**Step 2: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: 3 pricing cards, Pro highlighted
```

```bash
git add src/modules/onboarding/components/landing/components/PricingSection.tsx
git commit -m "feat(landing): add pricing section with 3 tiers"
```

---

## Task 9: CTASection — Final Call-to-Action

**Files:**
- Create: `src/modules/onboarding/components/landing/components/CTASection.tsx`

**Goal:** Final conversion section preserving invite code + waitlist logic from the old ConversionSection.

**Step 1: Create CTASection**

Props (same as old ConversionSection — passed from LandingPage.tsx):
```typescript
interface CTASectionProps {
  waitlistCount: number;
  onJoinWaitlist: (email: string) => Promise<any>;
  isSubmitting: boolean;
  submitted: boolean;
  error: string | null;
  inviteCode: string;
  onCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCodeSubmit: () => void;
  codeValid: boolean;
  codeError: string;
}
```

Layout:
- Section: `py-24 px-6` with amber gradient background (`bg-gradient-to-br from-ceramic-accent/10 via-ceramic-warm to-ceramic-accent/5`)
- Title: "Comece a medir e melhorar sua vida com ciência" — `text-3xl md:text-4xl font-black text-center`
- Subtitle: "500 créditos grátis. 8 módulos. 18+ modelos científicos. Sem cartão."
- Primary CTA: Large "Criar minha conta grátis" button — `bg-ceramic-accent text-white px-10 py-5 rounded-xl text-xl font-semibold hover:bg-ceramic-accent-dark`
- Below: divider or "ou"
- Invite code section: compact inline input + button (reuse format logic from old ConversionSection)
  - Input: `AICA-XXXX-XXXX` format, mono font
  - Error/success border colors preserved
  - Shake animation on error
  - "Entrar com convite" label
- Waitlist fallback: "Ou entre na lista de espera" + email input + submit (if waitlistCount >= 50, show odometer)
- Keep the mechanical odometer digit animation from old ConversionSection

Animation: title/subtitle fade-in, CTA button scale-in with slight bounce, invite section slides up

**Step 2: Verify and commit**

```bash
npm run typecheck
npm run build
npm run dev  # Visual check: CTA renders, invite code works, waitlist works
```

```bash
git add src/modules/onboarding/components/landing/components/CTASection.tsx
git commit -m "feat(landing): add final CTA section with invite code and waitlist"
```

---

## Task 10: FooterSection Update + Cleanup + Final Integration

**Files:**
- Modify: `src/modules/onboarding/components/landing/components/FooterSection.tsx`
- Modify: `src/modules/onboarding/components/landing/index.ts`
- Delete: old components no longer used (HeroSection old version is already overwritten; review ChaosPanel, OrderPanel, ProcessingPipeline, FounderStorySection, TestimonialSection, WaitlistSection, ModulesOverviewSection, old InteractiveModulesSection)

**Step 1: Update FooterSection**

Add links for:
- "Planos" → `/pricing`
- "Status" → `/status`
Keep existing: Privacy, Terms, Contact

**Step 2: Update barrel exports**

File: `src/modules/onboarding/components/landing/index.ts`

Export all new section components. Remove exports of deleted components.

**Step 3: Clean up old components**

Delete files no longer imported by the new LandingPage.tsx:
- `components/InteractiveModulesSection.tsx` (replaced by ScoringEngineSection)
- `components/ConversionSection.tsx` (replaced by CTASection)
- `components/ChaosPanel.tsx` (not used)
- `components/OrderPanel.tsx` (not used)
- `components/ProcessingPipeline.tsx` (not used)
- `components/FounderStorySection.tsx` (not used)
- `components/TestimonialSection.tsx` (not used)
- `components/WaitlistSection.tsx` (not used)
- `components/ModulesOverviewSection.tsx` (not used)

**CAUTION:** Before deleting, grep each filename to confirm no other file imports it:
```bash
grep -r "InteractiveModulesSection" src/ --include="*.ts" --include="*.tsx"
grep -r "ConversionSection" src/ --include="*.ts" --include="*.tsx"
# etc.
```

Only delete if the component is exclusively imported by the old LandingPage.tsx.

**Step 4: Full build + visual verification**

```bash
npm run typecheck
npm run build
npm run dev
```

Verify:
- [ ] All 9 sections render in correct order
- [ ] Radar chart animates on load
- [ ] Differentiator columns animate on scroll
- [ ] Domain cards expand/collapse
- [ ] Network diagram shows particles
- [ ] CP bars and streak ring animate
- [ ] Pricing cards are styled correctly with Pro highlighted
- [ ] Invite code validation works (try AICA-TEST-CODE)
- [ ] Waitlist submission works
- [ ] Footer links work
- [ ] Mobile responsive (use devtools to check 375px, 768px, 1024px)
- [ ] No TypeScript errors
- [ ] No console errors

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(landing): complete landing page redesign with 9 modular sections

- Hero with animated Life Score radar chart (7 domains)
- Differentiator section (AICA vs traditional chatbots)
- Scientific Scoring Engine (18+ models, interactive explainer)
- Grants showcase for Brazilian researchers
- Compound effect network diagram with particles
- Gamification with Consciousness Points + compassionate streaks
- Pricing (Free/Pro/Max)
- CTA with invite code + waitlist
- Cleanup of unused legacy components

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Mobile Polish + Performance

**Files:**
- Modify: various section components as needed

**Goal:** Ensure mobile-first responsiveness and performance.

**Step 1: Mobile audit**

Check each section at 375px width:
- Hero: text stacks above radar, radar scales to ~280px
- Differentiator: columns stack vertically
- Scoring: cards stack to 1 column
- Grants: features stack to 1 column
- Network: simplify (reduce particle count on mobile, scale diagram)
- Gamification: columns stack
- Pricing: cards stack, Pro card still has highlight
- CTA: full width inputs/buttons

**Step 2: Performance optimizations**

- Ensure sections below fold use `viewport={{ once: true }}` (don't re-animate)
- Canvas particle effects: check if `requestAnimationFrame` is properly cancelled on unmount
- Reduce particle count on mobile (detect with window.innerWidth or matchMedia)
- Images/SVGs should be inline (no network requests for landing page assets)
- Check Lighthouse score target: >80

**Step 3: Verify and commit**

```bash
npm run build
npm run typecheck
```

```bash
git add -A
git commit -m "fix(landing): mobile responsiveness and performance polish"
```

---

## Post-Implementation

After all tasks complete:

```bash
git push -u origin feature/feat-landing-page-redesign
gh pr create --title "feat(landing): complete landing page redesign with scientific positioning" --body "$(cat <<'EOF'
## Summary
- Complete replacement of landing page with 9 modular sections
- Communicates AICA's scientific differentiators (18+ models, Life Score, spiral detection)
- Dedicated Grants showcase for Brazilian researchers
- Animated network diagram showing cross-module intelligence
- Consciousness Points + compassionate streak gamification showcase
- Pricing section with 3 tiers (Free/Pro/Max)
- Preserves invite code + waitlist conversion logic

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Visual check at 375px, 768px, 1024px, 1440px
- [ ] Invite code validation works
- [ ] Waitlist submission works
- [ ] All animations trigger on scroll
- [ ] Radar chart animates on load
- [ ] Network diagram particles flow
- [ ] No console errors
- [ ] Lighthouse > 80

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
