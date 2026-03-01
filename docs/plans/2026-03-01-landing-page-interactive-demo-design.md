# Landing Page Interactive Demo — Design Document

**Date:** 2026-03-01
**Status:** Approved
**Approach:** Interactive Demo (B)

## Summary

Redesign the AICA public landing page (`LandingPage.tsx`) to showcase the real product through interactive demos, emphasize the Telegram bot integration, and create a dual conversion flow (Telegram quick test + invite code for full access).

## Goals

1. **Show the real product** — Replace abstract metaphors with interactive demos using Ceramic components
2. **Emphasize chat/AI** — Dedicated section showing the Vida AI crossing data from multiple modules
3. **Telegram CTA** — Highlight @AicaLifeBot as immediate entry point
4. **Visual consistency** — Landing uses same Ceramic Design System as the internal app
5. **Hybrid narrative** — Warm atelier tone + concrete product demonstration

## Out of Scope

- Dashboard internal (VidaPage) widget changes
- Chat backend integration improvements
- Skeleton/frame loading for internal pages
- Any auth-required functionality on the landing

## Architecture

### Section Structure

```
1. HERO — "Sua vida, finalmente integrada"
2. CHAT SHOWCASE — "Mais que um chatbot"
3. MODULES — "8 dimensões, 1 sistema"
4. CONVERSION — "Comece agora" (Telegram + Invite)
5. FOOTER — Trust badges + legal links
```

### Navigation

- Fixed frosted glass header: Logo AICA | Section anchors | "Entrar" (login) | "Experimentar" (Telegram)
- Smooth scroll between sections

---

## Section 1: Hero — "Sua vida, finalmente integrada"

### Visual

Full-viewport section with animated mini-dashboard as centerpiece.

```
┌──────────────────────────────────────────┐
│  Headline: "Você não precisa de mais     │
│  um app. Você precisa de um sistema      │
│  que te entenda."                        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Mini Dashboard (Ceramic cards)    │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐      │  │
│  │  │ 3    │ │ R$   │ │ 47   │      │  │
│  │  │tasks │ │2.4k  │ │ dias │      │  │
│  │  │today │ │saldo │ │streak│      │  │
│  │  └──────┘ └──────┘ └──────┘      │  │
│  │  ┌──────────────────────────┐     │  │
│  │  │ Próximos: Reunião 14h   │     │  │
│  │  │ Insight: "Seu padrão..." │     │  │
│  │  └──────────────────────────┘     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Experimentar no Telegram] [Entrar]     │
└──────────────────────────────────────────┘
```

### Behavior

- Cards appear with stagger animation (0.1s delay between each)
- Numbers count up from 0 to target value (counter effect)
- Hover on cards shows tooltip with extra detail
- Dashboard uses real Ceramic tokens: `bg-ceramic-base`, `shadow-ceramic-emboss`, amber accents
- Sub-headline: "Seu sistema operacional de vida — tátil, unificado, inteligente."

### Components

- `HeroDashboardDemo.tsx` — Pure visual component, no auth/Supabase dependency
- Uses Framer Motion for entrance animations
- Responsive: full dashboard on desktop, stacked cards on mobile

---

## Section 2: Chat Showcase — "Mais que um chatbot"

### Visual

Simulated conversation between user and Vida AI, showing cross-module intelligence.

```
┌──────────────────────────────────────────┐
│  "Mais que um chatbot.                   │
│   Uma inteligência que conecta tudo."    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 👤 "Quanto gastei essa semana?"   │    │
│  │                                   │    │
│  │ 🟡 Vida: "R$ 847 — 23% acima..." │    │
│  │   ┌─────────────────────┐        │    │
│  │   │ 📊 Finance Context  │        │    │
│  │   │ Saldo: R$ 2.4k     │        │    │
│  │   └─────────────────────┘        │    │
│  │                                   │    │
│  │ 👤 "E minha produtividade?"       │    │
│  │                                   │    │
│  │ 🟡 Vida: "7 tarefas, streak 47d" │    │
│  │   ┌─────────────────────┐        │    │
│  │   │ 🧠 Journey + Atlas  │        │    │
│  │   └─────────────────────┘        │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Suggested questions:                    │
│  [Meus gastos] [Próximos eventos]        │
│  [Meus padrões] [Resumo do dia]          │
│                                          │
│  [Conversar no Telegram →]               │
└──────────────────────────────────────────┘
```

### Behavior

- Messages appear sequentially with typing indicator (3 dots animation → text)
- Context cards expand with slide-down animation when AI references a module
- Visitor can click "suggested questions" to trigger different demo conversations
- 3-4 pre-defined conversation scripts covering different module combinations:
  1. Finance question → Finance context
  2. Productivity → Atlas + Journey context
  3. Schedule → Agenda context
  4. Emotional check → Journey context
- CTA: "Conversar no Telegram" → `t.me/AicaLifeBot`

### Components

- `ChatDemo.tsx` — Orchestrates the simulated conversation
- `ChatDemoMessage.tsx` — Individual message bubble (user or AI)
- `ChatDemoContext.tsx` — Expandable context card
- `ChatDemoSuggestions.tsx` — Clickable suggestion pills

### Visual Style

- Same bubble style as AicaChatFAB: amber for Vida, ceramic-cool for user
- Monospace feel for data in context cards
- Gentle glow on context cards when they appear

---

## Section 3: Modules — "8 dimensões, 1 sistema"

### Visual

Tab-based module explorer. Left: module selector (vertical tabs). Right: micro-demo panel.

```
┌────────────────────────────────────────────────┐
│  "8 dimensões da sua vida. Um sistema."        │
│                                                 │
│  ┌──────────┐  ┌────────────────────────────┐  │
│  │ ⚡ Atlas  │◄ │  ATLAS — Priorize o que    │  │
│  │ 🧭 Journey│  │  importa                    │  │
│  │ 🎙 Studio │  │  ┌────────┬────────┐       │  │
│  │ 📋 Grants │  │  │Urgente │Urgente │       │  │
│  │ 💰 Finance│  │  │+Import.│-Import.│       │  │
│  │ 🤝 Connect│  │  ├────────┼────────┤       │  │
│  │ 🏋 Flux   │  │  │  Não   │  Não   │       │  │
│  │ 📅 Agenda │  │  │Urgente │Urgente │       │  │
│  │           │  │  │+Import.│-Import.│       │  │
│  └──────────┘  │  └────────┴────────┘       │  │
│                 │  Arraste tarefas →          │  │
│                 └────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### Micro-Demos Per Module

| Module | Demo | Interaction |
|--------|------|-------------|
| **Atlas** | Eisenhower Matrix with 4-5 fake tasks | Drag tasks between quadrants |
| **Journey** | Heatmap (GitHub-style) + emotion circles | Hover to see day detail |
| **Studio** | Episode production timeline (research → script → record) | Click phases to see details |
| **Grants** | Edital card with deadline countdown + match % | Hover for match breakdown |
| **Finance** | Income vs expense bar chart (3 months) | Hover for monthly detail |
| **Connections** | Network map with connected circles | Hover to see contact info |
| **Flux** | Weekly training canvas with modality blocks | Click blocks to see exercises |
| **Agenda** | Mini monthly calendar with colored events | Click day to see event list |

### Behavior

- Module tabs auto-cycle every 5 seconds if user isn't interacting
- Clicking a tab stops auto-cycle and shows that module's demo
- Each demo has subtle entrance animation (fade + slide)
- Mobile: tabs become horizontal scroll, demo panel stacks below

### Components

- `ModuleExplorer.tsx` — Tab selector + panel orchestrator
- `ModuleTab.tsx` — Individual tab button
- `demo/AtlasDemo.tsx` — Eisenhower matrix demo
- `demo/JourneyDemo.tsx` — Heatmap demo
- `demo/StudioDemo.tsx` — Timeline demo
- `demo/GrantsDemo.tsx` — Edital card demo
- `demo/FinanceDemo.tsx` — Chart demo
- `demo/ConnectionsDemo.tsx` — Network map demo
- `demo/FluxDemo.tsx` — Training canvas demo
- `demo/AgendaDemo.tsx` — Calendar demo

### Visual Style

- Active tab: amber-500 left border + `bg-ceramic-50`
- Demo panel: `ceramic-card` with `shadow-ceramic-emboss`
- All demos use Ceramic tokens consistently

---

## Section 4: Conversion — "Comece agora. Sem instalar nada."

### Visual

Two-column layout: Telegram (left) + Full Access (right).

```
┌──────────────────────────────────────────────────┐
│  "Comece agora. Sem instalar nada."              │
│                                                   │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  📱 TELEGRAM      │  │  🔑 ACESSO COMPLETO  │  │
│  │  "Teste rápido"   │  │  "Sistema completo"   │  │
│  │                   │  │                       │  │
│  │  Mockup conversa  │  │  Input convite        │  │
│  │  /resumo → resp.  │  │  AICA-____-____       │  │
│  │  /tarefa → resp.  │  │  [Ativar convite]     │  │
│  │  /gasto → resp.   │  │                       │  │
│  │                   │  │  Não tem convite?      │  │
│  │  [Abrir Telegram] │  │  [Entrar na fila]     │  │
│  │                   │  │  🔢 342 na fila        │  │
│  └──────────────────┘  └──────────────────────┘  │
│                                                   │
│  🔒 LGPD · 🔐 Criptografia · 🚫 Sem acesso      │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Telegram Column

- Mockup of Telegram conversation showing bot commands and responses
- Commands displayed: `/resumo`, `/tarefa`, `/gasto`, `/humor`
- Each shows a realistic simulated response
- CTA button: "Abrir no Telegram" → `t.me/AicaLifeBot`
- Badge: "Disponível 24/7"

### Invite Column

- Preserve existing invite code input (`AICA-XXXX-XXXX` format)
- Validation against Supabase (existing functionality)
- Waitlist with mechanical odometer counter (existing, shown at >= 50)
- Budget display: "50 convites/semana"

### Trust Badges

- LGPD compliant
- End-to-end encryption
- No password access
- Same badges as current, but integrated into conversion section

### Components

- `ConversionSection.tsx` — Two-column layout (refactor of existing)
- `TelegramPreview.tsx` — Bot conversation mockup
- `InviteCodeInput.tsx` — Refactored from existing ConversionSection
- `TrustBadges.tsx` — Security/privacy badges

---

## Section 5: Footer

Minimal footer:
- Links: Privacidade, Termos de Uso, Contato
- Social links (if applicable)
- "AICA Life OS — Feito com cerâmica digital"
- Copyright

---

## Technical Decisions

### Data Strategy

All demo data is **hardcoded** in the landing components. No Supabase queries, no auth dependency. This keeps the landing:
- Fast (no API calls)
- Independent (no auth state)
- Reliable (no backend failures affect it)

Exception: Invite code validation and waitlist counter query Supabase (existing behavior preserved).

### Component Strategy

Landing demo components are **separate from internal app components**. Rationale:
- Internal components depend on auth, hooks, Supabase client
- Demo components are pure visual with fake data
- Avoids coupling landing reliability to app infrastructure

However, they use the **same Ceramic Design System tokens** (tailwind classes) to maintain visual identity.

### Animation Strategy

- Framer Motion for all animations (already in the project)
- Viewport-triggered animations (appear on scroll)
- Stagger patterns for sequential reveals
- Spring physics for interactive elements (drag, hover)
- Auto-cycling in module explorer (with pause on interaction)

### Responsive Strategy

- Mobile-first design
- Hero: stacked cards on mobile, grid on desktop
- Chat: full-width on mobile, centered with max-width on desktop
- Modules: horizontal tab scroll on mobile, vertical tabs on desktop
- Conversion: stacked columns on mobile, side-by-side on desktop

---

## File Structure

```
src/modules/onboarding/components/landing/
├── LandingPage.tsx                    # Main page (refactored)
├── components/
│   ├── HeroSection.tsx                # Refactored hero
│   ├── HeroDashboardDemo.tsx          # Mini dashboard with fake data
│   ├── ChatShowcase.tsx               # Chat demo section
│   ├── ChatDemo.tsx                   # Conversation orchestrator
│   ├── ChatDemoMessage.tsx            # Message bubble
│   ├── ChatDemoContext.tsx            # Expandable context card
│   ├── ChatDemoSuggestions.tsx        # Suggestion pills
│   ├── ModuleExplorer.tsx             # Module tab selector + panel
│   ├── ModuleTab.tsx                  # Individual tab
│   ├── ConversionSection.tsx          # Refactored dual CTA
│   ├── TelegramPreview.tsx            # Bot mockup
│   ├── InviteCodeInput.tsx            # Invite validation
│   ├── TrustBadges.tsx                # Security badges
│   ├── FooterSection.tsx              # Refactored footer
│   └── demo/                          # Module micro-demos
│       ├── AtlasDemo.tsx
│       ├── JourneyDemo.tsx
│       ├── StudioDemo.tsx
│       ├── GrantsDemo.tsx
│       ├── FinanceDemo.tsx
│       ├── ConnectionsDemo.tsx
│       ├── FluxDemo.tsx
│       └── AgendaDemo.tsx
└── data/
    ├── chatScripts.ts                 # Pre-defined conversation scripts
    └── demoData.ts                    # Fake data for all demos
```

## Success Criteria

1. Visitor immediately understands what AICA is (within 5 seconds of landing)
2. Each module's value proposition is clear through interactive demo
3. Chat showcase demonstrates cross-module AI intelligence
4. Two clear conversion paths: Telegram (instant) + Invite (full)
5. Visual identity identical to internal app (Ceramic Design System)
6. Page loads fast (<3s) with no layout shift (skeleton frames for async elements)
7. Mobile experience is polished (responsive, touch-friendly interactions)
