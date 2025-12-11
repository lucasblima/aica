# Mapas Visuais da Jornada UX
## Aica Life OS - Fluxos e Interações

**Data:** 11 de dezembro de 2025
**Formato:** ASCII diagrams + descrições

---

## 1. JORNADA DO NOVO USUÁRIO: ONBOARDING PROPOSTO

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         NEW USER ONBOARDING FLOW                         │
└──────────────────────────────────────────────────────────────────────────┘

                              [Login com Google]
                                      │
                                      ▼
                    ┌──────────────────────────────┐
                    │    Check Onboarding Status   │
                    │   (hasCompletedOnboarding)   │
                    └──────────────────────────────┘
                                      │
                    ┌─────────────────┴──────────────┐
                    │ FALSE (not completed)          │
                    ▼                                ▼
                    [Show Onboarding]        [Go to Dashboard]
                    │
                    ▼
        ┌─────────────────────────────────┐
        │ Step 0: SPLASH SCREEN (2s)      │
        │ - Logo + Tagline                │
        │ - Auto-progress or manual skip  │
        └─────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────┐
        │ Step 1: WELCOME TOUR (30s)      │
        │ - 4 Pilares Carousel            │
        │ - Dots navigation               │
        │ - Prev/Next buttons             │
        └─────────────────────────────────┘
                    │
              ┌─────┴─────┐
              │           │ (skip)
              ▼           ▼
        ┌──────────┐  ┌────────────────────┐
        │Continue  │  │Mark as Skipped +   │
        │          │  │Go to Completion    │
        └──────────┘  └────────────────────┘
              │
              ▼
        ┌─────────────────────────────────┐
        │ Step 2: CREATE FIRST MOMENT     │
        │ (1-2min) ⭐ CRITICAL STEP       │
        │ - Explain what is a moment      │
        │ - Examples to inspire           │
        │ - Textarea input                │
        │ - Submit → Show success + CP    │
        │ - Confetti animation            │
        └─────────────────────────────────┘
                    │
              ┌─────┴─────┐
              │           │ (skip)
              ▼           ▼
        ┌──────────┐  ┌────────────────────┐
        │Success   │  │Mark as Skipped +   │
        │+ 5 CP   │  │Continue             │
        │animation │  │                    │
        └──────────┘  └────────────────────┘
              │                   │
              └───────┬───────────┘
                      ▼
        ┌─────────────────────────────────┐
        │ Step 3: LIFE IN WEEKS EXPLAINER │
        │ (30s)                           │
        │ - Show % lived with animation   │
        │ - Current week / total weeks    │
        │ - Explain CP, Level, Streak     │
        │ - Educational cards             │
        └─────────────────────────────────┘
                    │
              ┌─────┴─────┐
              │           │ (skip)
              ▼           ▼
        ┌──────────┐  ┌────────────────────┐
        │Continue  │  │Skip + Continue     │
        │          │  │                    │
        └──────────┘  └────────────────────┘
              │
              ▼
        ┌─────────────────────────────────┐
        │ Step 4: DAILY QUESTION (1min)   │
        │ - Show question of the day      │
        │ - Text input                    │
        │ - Submit or skip                │
        └─────────────────────────────────┘
                    │
              ┌─────┴─────┐
              │           │ (skip)
              ▼           ▼
        ┌──────────┐  ┌────────────────────┐
        │Success   │  │Mark as Skipped +   │
        │+ 10 CP   │  │Continue             │
        │animation │  │                    │
        └──────────┘  └────────────────────┘
              │                   │
              └───────┬───────────┘
                      ▼
        ┌─────────────────────────────────┐
        │ Step 5: AGENDA PREVIEW (1min)   │
        │ - Show timeline preview         │
        │ - Explain Google Calendar sync  │
        │ - CTA "Conectar" or "Depois"    │
        └─────────────────────────────────┘
                    │
              ┌─────┴──────┐
              │            │ (skip)
              ▼            ▼
        ┌──────────┐  ┌────────────────────┐
        │OAuth     │  │Mark as Skipped +   │
        │redirect  │  │Continue             │
        │(Google)  │  │                    │
        └──────────┘  └────────────────────┘
              │                   │
              └───────┬───────────┘
                      ▼
        ┌─────────────────────────────────┐
        │ Step 6: COMPLETION SCREEN       │
        │ (15s) 🎉 CELEBRATION             │
        │ - Achievements checklist        │
        │ - Tips for next actions         │
        │ - CTA "Explore Aica"            │
        │ - Save completion to DB         │
        └─────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────┐
        │ 🎯 DASHBOARD (Minha Vida)       │
        │ - User is now engaged           │
        │ - Has created first moment      │
        │ - Understands 4 pillars         │
        │ - Ready to explore modules      │
        └─────────────────────────────────┘
```

**Key Metrics for This Flow:**
- Target: Complete in ~5 minutes
- Skip-friendly: Any step can be skipped
- Action-oriented: Steps 2 & 4 have real actions
- Motivating: Celebrate first success

---

## 2. JORNADA ATUAL DO USUÁRIO (AS-IS)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CURRENT ONBOARDING FLOW (AS-IS)                       │
└──────────────────────────────────────────────────────────────────────────┘

[Login com Google]
       │
       ▼
[Check Onboarding]
       │
       ▼
┌──────────────────────────────┐
│ Step 1: Welcome              │
│ "Bem-vindo ao Aica 🎉"       │
│ - Generic welcome text       │
│ - Button "Continuar"         │
│ OR "Pular configuração"      │
└──────────────────────────────┘
       │
  ┌────┴────┐
  │          │ (skip)
  ▼          ▼
Continue   [Dashboard]
  │
  ▼
┌──────────────────────────────┐
│ Step 2: Calendar Connection  │
│ "Conectar Google Calendar?"  │
│ - Benefits listed            │
│ - Button "Conectar"          │
│ OR "Depois"                  │
└──────────────────────────────┘
  │
  ├─ Conectar → Google OAuth
  │             → Return to app
  │
  └─ Depois → [Dashboard]


⚠️ PROBLEMS WITH THIS FLOW:

❌ Generic welcome - no context about what Aica is
❌ Jumps directly to Google Calendar integration (technical detail)
❌ Doesn't explain the 4 pillars
❌ No "first action" to create momentum
❌ User reaches dashboard without understanding value
❌ Abandonment rate likely very high
❌ No hands-on learning
```

---

## 3. ESTRUTURA DO DASHBOARD PRINCIPAL

```
┌────────────────────────────────────────────────────────────────┐
│                 MINHA VIDA (Dashboard Principal)               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Header: "Minha Vida" + Tab Selection (Pessoal / Conexões)   │
│                                                                │
├─ PESSOAL TAB ─────────────────────────────────────────────────┤
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Unified Journey Card (3/4 width)                          │ │
│ │ - % Vivido: 42%                                           │ │
│ │ - Semana 2,184 de 4,745                                   │ │
│ │ - Level 7 "Aprendiz"                                      │ │
│ │ - Streak: 12 dias                                         │ │
│ │ - Last moment: "Fechei deal importante"                   │ │
│ │ - Daily Question (Pending)                                │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Efficiency Medallion                                       │ │
│ │ Score: 84 | Focus: 245h | Streak: 7 | XP: 1,250          │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Efficiency Trend Chart (30 days)                          │ │
│ │ [Graph visualization]                                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│ │ Finanças     │ Grants       │ Saúde        │ Educação     │ │
│ │ (2x2 grid)   │ (2x2 grid)   │ (1x1)        │ (1x1)        │ │
│ ├──────────────┼──────────────┼──────────────┼──────────────┤ │
│ │ Jurídico     │ Associações  │ Podcast      │              │ │
│ │ (1x1)        │ (1x1)        │ (1x1)        │              │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                │
├─ CONEXÕES TAB ────────────────────────────────────────────────┤
│                                                                │
│ Option A: Empty State                                         │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Archetypes Cards:                                         │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │ │
│ │ │ 🏠 Habitat   │ │ 💼 Ventures  │ │ 🎓 Academia  │        │ │
│ │ │ "Condomínio" │ │ "Projetos"   │ │ "Cursos"     │        │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘        │ │
│ │ ┌──────────────┐                                          │ │
│ │ │ 👥 Tribo     │                                          │ │
│ │ │ "Comunidades"│                                          │ │
│ │ └──────────────┘                                          │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ Option B: With Associations                                   │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ [+ Criar Associação] (CTA)                                │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ Associação 1: "Startup XYZ"        [→ Details]           │ │
│ │ Associação 2: "Family"              [→ Details]           │ │
│ │ Associação 3: "Podcast Community"   [→ Details]           │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Bottom Navigation (Fixed Floating Dock)                        │
│                                                                │
│     Vida        🎙️ Voice AI          📅 Agenda               │
│    (Grid)        (Center)            (Calendar)               │
│                 (Future Feature)                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. FLUXO: REGISTRAR PRIMEIRO MOMENTO

```
                        [Journey Card]
                             │
                    [Click "Registrar Momento"]
                             │
                             ▼
                ┌──────────────────────────────┐
                │ Expand Journey Card          │
                │ - Show input field           │
                │ - Tab: "Momento"             │
                │ - Placeholder text           │
                └──────────────────────────────┘
                             │
                    [Type moment text]
                             │
                             ▼
                ┌──────────────────────────────┐
                │ Input shows character count  │
                │ - Submit button enabled      │
                │ - "Registrar Momento"        │
                └──────────────────────────────┘
                             │
                    [Click "Registrar"]
                             │
                             ▼
                ┌──────────────────────────────┐
                │ Loading state                │
                │ - Spinner animation          │
                │ - "Registrando..."           │
                └──────────────────────────────┘
                             │
          [Save to DB + Generate AI Insight]
                             │
                             ▼
                ┌──────────────────────────────┐
                │ Success Celebration          │
                │ - Confetti animation         │
                │ - "+ 5 CP" badge            │
                │ - Toast notification         │
                │ - "PostCaptureInsight"       │
                │   (AI-generated reflection)  │
                └──────────────────────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │ Journey Card Collapses       │
                │ - Shows updated stats        │
                │ - Streak counter updated     │
                │ - Last moment updated        │
                └──────────────────────────────┘

MICRO-INTERACTIONS:
- Input field: Outline glow on focus
- Submit button: Scale animation on hover
- Character counter: Color change warning if too long
- Success toast: Slide in from bottom
- CP badge: Bounce animation
```

---

## 5. FLUXO: EXPLORAR MÓDULO VAZIO (EXEMPLO: FINANÇAS)

```
[Click Finance Card on Dashboard]
           │
           ▼
┌──────────────────────────────────────────────────┐
│ Finance Dashboard (Empty State)                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Header: "Finanças" + Settings menu               │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 💡 Getting Started                         │  │
│ │ "Para começar, envie seu primeiro extrato" │  │
│ │                                            │  │
│ │ ┌──────────────────────────────────────┐  │  │
│ │ │ Upload Extrato Bancário              │  │  │
│ │ │ (PDF, CSV, ou foto)                  │  │  │
│ │ └──────────────────────────────────────┘  │  │
│ │                                            │  │
│ │ OR                                         │  │
│ │                                            │  │
│ │ ┌──────────────────────────────────────┐  │  │
│ │ │ Entrar Dados Manualmente             │  │  │
│ │ │ (CSV import)                         │  │  │
│ │ └──────────────────────────────────────┘  │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ [Help Section]                                  │
│ - Como enviar extratos                         │
│ - Formatos suportados                          │
│ - Privacy & Security info                      │
│                                                  │
└──────────────────────────────────────────────────┘

PROBLEM: First-time user doesn't know where to start
SOLUTION: Modal on first entry with CTA

                        [Fix Proposed]
                             │
        After onboarding,    │    After opening
        show modal:          │    module for first time:
                             │
                    ┌────────┴─────────┐
                    ▼                  ▼
         [In Onboarding Wizard]  [Modal "Getting Started"]
         Step mentions Finance   "How to get started with
         but doesn't deep-dive   Finance tracking"

           Best approach:
           Conditional modal on first entry
```

---

## 6. MICROINTERAÇÕES: ANIMAÇÃO DE LEVEL UP

```
[User reaches new level via CP]
        │
        ▼
┌────────────────────────────────┐
│ Trigger: CP threshold reached  │
└────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│ Animation sequence:                    │
│ 1. Screen overlay fades in (0.3s)      │
│ 2. Level badge appears + bounces       │
│ 3. "Level 8: Consciência" text         │
│ 4. Confetti animation (1s)             │
│ 5. Sound effect (optional)             │
│ 6. Auto-dismiss after 3s               │
└────────────────────────────────────────┘

                    ↓

          ┌──────────────┐
          │   Level 8    │
          │              │
          │ Consciência  │  ← Badge bounces
          │              │     (scale 1 → 1.2 → 1)
          └──────────────┘

            ✨  ✨
          ✨      ✨      ← Confetti particles
        ✨          ✨       (random trajectory,
      ✨              ✨      falling down)
    ✨                  ✨

After 3s: Auto fade out or can be dismissed
```

---

## 7. ESTRUTURA DE NAVEGAÇÃO PROPOSTA

```
┌─────────────────────────────────────────────────────────────────┐
│                    AICA NAVIGATION HIERARCHY                    │
└─────────────────────────────────────────────────────────────────┘

                            ROOT
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
       LOGIN         DASHBOARD           SPECIALTY
          │           (Vida)              MODULES
          │             │                   │
          └─→ Onboarding│               ┌───┴────┬────────┬──────┐
              (V2)       │               │        │        │      │
                         ▼               ▼        ▼        ▼      ▼
                    ┌─────────────┐  Podcast Finance Grants  ...
                    │  VIDA MAIN  │
                    └─────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
        PESSOAL TAB             CONEXÕES TAB
            │                       │
     ┌──────┴──────┐              │
     ▼             ▼              ▼
   Modules   Journey         Associations
     │                           │
     ├─ Finanças                ├─ Habitat
     ├─ Grants                  ├─ Ventures
     ├─ Saúde                   ├─ Academia
     ├─ Educação                ├─ Tribo
     └─ Jurídico                └─ Custom


BOTTOM DOCK (Always visible):
┌─────────────────────────────────────────┐
│  Vida (Hub)  🎙️ Voice AI  📅 Agenda   │
│   ↑ Current: DASHBOARD               │
│   ├─ Overview (current)              │
│   ├─ Jornada (expandable)            │
│   └─ Meu Dia (shortcut)              │
└─────────────────────────────────────────┘

PROPOSED ENHANCEMENT (Option A):
Bottom dock could have sub-menu on long-press:
┌──────────────────────────────┐
│ ☰ Menu (long-press on Vida)  │
├──────────────────────────────┤
│ 🏠 Minha Vida (Overview)     │
│ 📖 Minha Jornada (Deep)      │
│ 🤝 Minha Rede (Network)      │
│ 📅 Meu Dia (Timeline)        │
└──────────────────────────────┘
```

---

## 8. RESPONSIVE LAYOUT: DESKTOP VS MOBILE

```
DESKTOP (> 1024px)
┌────────────────────────────────────────────────────────────────┐
│ Header: "Minha Vida" | Tabs (Pessoal|Conexões) | Settings      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────┐ ┌──────────────────────────┐ │
│ │ Journey Card (60% width)     │ │ Quick Actions (40%)      │ │
│ │ - Stats visible              │ │ - New Moment CTA         │ │
│ │ - Expandable                 │ │ - Last Question          │ │
│ └──────────────────────────────┘ │ - Week Progress          │
│                                  └──────────────────────────┘ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Efficiency Medallion (Full width)                          │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌───────────┬───────────┬───────────┬───────────┐             │
│ │Finanças   │Grants     │Saúde      │Educação   │             │
│ │(2x2)      │(2x2)      │(1x1)      │(1x1)      │             │
│ ├───────────┼───────────┼───────────┼───────────┤             │
│ │Jurídico   │Assoc.     │Podcast    │           │             │
│ │(1x1)      │(1x1)      │(1x1)      │           │             │
│ └───────────┴───────────┴───────────┴───────────┘             │
│                                                                │
└────────────────────────────────────────────────────────────────┘


TABLET (640px - 1024px)
┌────────────────────────────────┐
│ Header: "Minha Vida" | Tabs    │
├────────────────────────────────┤
│                                │
│ ┌──────────────────────────┐   │
│ │ Journey Card (Full width)│   │
│ │ - Stacked layout         │   │
│ │ - More compact           │   │
│ └──────────────────────────┘   │
│                                │
│ ┌──────────┬──────────┐        │
│ │Finanças  │Grants    │        │
│ │(2x2)     │(2x2)     │        │
│ ├──────────┼──────────┤        │
│ │Saúde     │Educação  │        │
│ │(1x1)     │(1x1)     │        │
│ ├──────────┼──────────┤        │
│ │Jurídico  │Assoc.    │        │
│ │(1x1)     │(1x1)     │        │
│ └──────────┴──────────┘        │
│                                │
└────────────────────────────────┘


MOBILE (< 640px)
┌────────────────────────┐
│ Minha Vida | ≡ Menu   │
├────────────────────────┤
│                        │
│ ┌──────────────────┐   │
│ │ Journey Card     │   │
│ │ - Very compact   │   │
│ │ - Tappable       │   │
│ │ - Stacked        │   │
│ └──────────────────┘   │
│                        │
│ ┌──────────────────┐   │
│ │ Efficiency Med.  │   │
│ │ - Compact        │   │
│ └──────────────────┘   │
│                        │
│ ┌──────────────────┐   │
│ │ Modules Stack    │   │
│ │ ┌──────────────┐ │   │
│ │ │Finanças      │ │   │
│ │ ├──────────────┤ │   │
│ │ │Grants        │ │   │
│ │ ├──────────────┤ │   │
│ │ │Saúde         │ │   │
│ │ ├──────────────┤ │   │
│ │ │Educação      │ │   │
│ │ ├──────────────┤ │   │
│ │ │Jurídico      │ │   │
│ │ ├──────────────┤ │   │
│ │ │Associações   │ │   │
│ │ ├──────────────┤ │   │
│ │ │Podcast       │ │   │
│ │ └──────────────┘ │   │
│ └──────────────────┘   │
│                        │
├────────────────────────┤
│ Bottom Dock (Fixed)    │
│ Vida | 🎙️ | 📅         │
└────────────────────────┘
```

---

## 9. MODAL: CRIAÇÃO DE ASSOCIAÇÃO

```
Trigger: Click "Criar Associação" ou Archetype

    ┌───────────────────────────────────────┐
    │ 🏗️  Criar Nova Associação             │
    ├───────────────────────────────────────┤
    │                                       │
    │ ┌─ Passo 1: Tipo (Selected) ────────┐ │
    │ │ • Habitat (Residência/Condomínio) │ │
    │ │ • Ventures (Projetos/Empresas)    │ │
    │ │ • Academia (Cursos/Aprendizado)   │ │
    │ │ • Tribo (Comunidades/Clubes)      │ │
    │ │ • Personalizado                   │ │
    │ └───────────────────────────────────┘ │
    │                                       │
    │ ┌─ Passo 2: Informações ────────────┐ │
    │ │ Nome:          [                ] │ │
    │ │ Descrição:     [                ] │ │
    │ │ Membros:       [+ Add Members  ] │ │
    │ │ Módulos:       [☐ Finance]     │ │
    │ │                [☐ Health]      │ │
    │ │                [☐ Education]   │ │
    │ └───────────────────────────────────┘ │
    │                                       │
    │ [Voltar] [Criar Associação]           │
    └───────────────────────────────────────┘
```

---

## 10. ESTADO: JOURNADA COMPLETA (USUARIO ENGAJADO)

```
After 2 weeks of consistent use:

┌─────────────────────────────────────────────────────┐
│ Minha Vida Dashboard (Active User)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ % Vivido: 42.3% ↑ (aumentou 0.1% this week)        │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ Journey Card                                 │   │
│ │ - Level 9 "Observador"                       │   │
│ │ - 📈 28 day streak                           │   │
│ │ - 🎯 156 CP (1,247 total)                    │   │
│ │ - 📔 47 moments registered                   │   │
│ │ - 🤔 14 questions answered                   │   │
│ │ - Last: "Lancei meu projeto novo!" 2h ago   │   │
│ │ - Next: "Qual foi seu maior aprendizado?"   │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ Efficiency Score: 87 (↑5 from last week)            │
│ Weekly focus hours: 34h 22m                         │
│ Productivity streak: 15 days                        │
│                                                     │
│ Recent Activity:                                    │
│ ✓ Made 6 financial entries (Finance module)        │
│ ✓ Added 3 new contacts to network                  │
│ ✓ Started 2 grants applications                    │
│ ✓ Registered podcast guest                         │
│                                                     │
│ Next events:                                        │
│ 📅 Today 3:00 PM - Client meeting                  │
│ 📅 Tomorrow 10:00 AM - Podcast recording           │
│ 📅 Friday - Reflection check-in                    │
│                                                     │
└─────────────────────────────────────────────────────┘

This is the SUCCESS STATE we want to achieve!
```

---

**End of Visual Journey Maps**

These diagrams help visualize the user flows, information architecture, and interactions across the Aica Life OS platform. They should be used for:
- Onboarding the team
- Planning feature improvements
- Understanding user pathways
- Identifying potential UX friction points

