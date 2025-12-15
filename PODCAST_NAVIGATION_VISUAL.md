# Podcast Navigation - Visual Reference

## Navigation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PodcastCopilotView                            │
│                   (View State Manager)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                view: 'wizard'│ view: 'preproduction'
                    │         │         │
                    ▼         ▼         ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │StudioLay│  │StudioLay│  │StudioLay│
            │out      │  │out      │  │out      │
            │(Wizard) │  │(PreProd)│  │(Prod)   │
            └──────────┘  └──────────┘  └──────────┘
                    │         │         │
                    ▼         ▼         ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │GuestIdentity │  │PreProduction │  │ProductionMode│
            │Wizard        │  │Hub           │  │              │
            └──────────────┘  └──────────────┘  └──────────────┘
```

## StudioLayout - Three Configurations

### 1. Wizard View (Non-Studio Mode)
```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  ← │ Novo Episódio │ draft                           │     │
│  └─────────────────────────────────────────────────────┘     │
│                (Floating Header - Centered)                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                                                     │     │
│  │    GuestIdentificationWizard (max-w-4xl centered)   │     │
│  │                                                     │     │
│  │    [Step 1 of 3]                                    │     │
│  │    Guest Name, Profile, Theme Selection...          │     │
│  │                                                     │     │
│  │    [Previous] [Next]                                │     │
│  │                                                     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

Key Features:
- isStudioMode: false
- Floating header with back button
- Full UI visible
- Scrollable content
- Status: 'draft'
```

### 2. Pre-Production View (Non-Studio Mode)
```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  ← │ John Doe │ draft                              │     │
│  └─────────────────────────────────────────────────────┘     │
│                (Floating Header - Centered)                  │
│                                                               │
│  John Doe • Inovação em Tecnologia                           │
│                                                               │
│  ┌────────────────────┐  ┌────────────────────┐              │
│  │ Pauta              │  │ Pesquisa  | Ficha  │              │
│  │ ────────────────── │  │ ────────────────── │              │
│  │ • Bio              │  │ Biografia...       │              │
│  │ • Quebra-gelo      │  │                    │              │
│  │ • Tópicos          │  │ Chat com Aica      │              │
│  │ • Sponsor          │  │ [chat interface]   │              │
│  │                    │  │                    │              │
│  └────────────────────┘  └────────────────────┘              │
│                                                               │
│                       ┌──────────────────────────┐            │
│                       │ ◯ Enviar Aprovação       │            │
│                       │ ▶ Ir para Gravação       │            │
│                       └──────────────────────────┘            │
│                      (Floating Bottom-Right)                 │
└───────────────────────────────────────────────────────────────┘

Key Features:
- isStudioMode: false
- Floating header with back button
- Full 2-column research interface
- Floating action buttons (bottom-right)
- Status: 'draft'
```

### 3. Production View (Studio Mode - Reductive)
```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│         ┌─────────────────────────────────────┐               │
│         │ GRAVANDO  •  01:23:45  • Teleprompter│              │
│         └─────────────────────────────────────┘               │
│              (Floating Top-Center - Only Essential)           │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Pauta do Dia         │  │ Co-Host Aica         │           │
│  │ ──────────────────── │  │                      │           │
│  │ ✓ Quebra-gelo        │  │ [Monitor] [Active]   │           │
│  │   Tema 1             │  │                      │           │
│  │   Tema 2             │  │ Chat                 │           │
│  │ ⚬ Tema 3             │  │ ──────────────────── │           │
│  │   Tema 4             │  │ [chat messages]      │           │
│  │                      │  │                      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                               │
│          ┌─────────────┐   ┌──────────────┐                  │
│          │     REC     │   │ Finalizar    │                  │
│          └─────────────┘   └──────────────┘                  │
│           (Recording Controls - Bottom)                      │
│                                                               │
│  ◄ (Exit button - top-left corner, minimal)                  │
└───────────────────────────────────────────────────────────────┘

Key Features:
- isStudioMode: true
- NO floating header (vanishes)
- Minimal exit button in corner
- Only essential controls visible
- Floating timer/status at top-center
- Maximum focus on recording interface
- Status: 'recording'
```

## Navigation State Transitions

### Transition 1: Dashboard → Wizard
```
Before:                          After:
┌────────────────┐               ┌────────────────┐
│  PodcastDash   │               │  GuestWizard   │
│  └ Episodes    │  ──────────→  │  (StudioLayout)│
│  └ New Episode │               │  isStudioMode: │
└────────────────┘               │      false     │
                                 └────────────────┘
Animation: Header slides in from top, content fades in
```

### Transition 2: Wizard → PreProduction
```
Before:                          After:
┌────────────────┐               ┌────────────────┐
│  GuestWizard   │               │ PreProduction  │
│  (Wizard Data) │  ──────────→  │  (StudioLayout)│
│  [Complete]    │               │  Research Tabs │
└────────────────┘               │  Pauta Builder │
                                 └────────────────┘
Animation: Cross-fade, new title updates
```

### Transition 3: PreProduction → Production (REDUCTIVE!)
```
Before:                          After:
┌────────────────┐               ┌────────────────┐
│ PreProduction  │               │  Production    │
│ Full UI        │  ──────────→  │  (Studio Mode) │
│ Research Tabs  │               │  Minimal UI    │
│ Pauta + Chat   │               │  Timer + Pauta │
└────────────────┘               │  Co-Host Chat  │
                                 └────────────────┘
Animation: Header vanishes, content scales up slightly, focus intensifies
```

### Transition 4: Production → PostProduction
```
Before:                          After:
┌────────────────┐               ┌────────────────┐
│  Production    │               │ PostProduction │
│  Recording...  │  ──────────→  │  (StudioLayout)│
│  [Finish]      │               │  Transcription │
└────────────────┘               │  Content Cuts  │
                                 └────────────────┘
Animation: Recording stops, content transitions to post-production view
```

## Back Button Behavior

```
┌─────────────────────────────────────────────┐
│ GuestWizard ← [Back Button]                 │
│  └─ onBack() → handleBackToDashboard()      │
│     └─ view = 'dashboard' (Explicit!)       │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ PreProduction ← [Back Button]               │
│  └─ onBack() → handleBackToDashboard()      │
│     └─ view = 'dashboard' (Explicit!)       │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Production ← [Back Button - Corner]         │
│  └─ onBack() → handleBackToPreProduction()  │
│     └─ view = 'preproduction' (Explicit!)   │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ PostProduction ← [Back Button]              │
│  └─ onBack() → handleBackToDashboard()      │
│     └─ view = 'dashboard' (Explicit!)       │
└─────────────────────────────────────────────┘

KEY: All navigation is EXPLICIT - never using navigate(-1)
```

## StudioLayout Component Behavior

```
┌─────────────────────────────────────────────────────┐
│              StudioLayout Wrapper                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ if !isStudioMode ────────────────────────┐    │
│  │  ┌───────────────────────────────────┐    │    │
│  │  │ Floating Header (AnimatePresence) │    │    │
│  │  │ [Back] | Title | Status           │    │    │
│  │  └───────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ if isStudioMode ─────────────────────────┐    │
│  │  ┌───────────────────────────────────┐    │    │
│  │  │ Minimal Exit Button (Corner)      │    │    │
│  │  │ [◄]                               │    │    │
│  │  └───────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌───────────────────────────────────────────┐    │
│  │         Main Content (children)           │    │
│  │   - Variant: 'scrollable' or 'fixed'      │    │
│  │   - Padding adjustment based on mode      │    │
│  │   - AnimatePresence for transitions       │    │
│  └───────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘

StudioLayout Props:
├─ title: string (shown in header or minimal)
├─ status: 'draft' | 'recording' | 'published'
├─ onExit: () => void (explicit navigation)
├─ variant: 'scrollable' | 'fixed' (overflow behavior)
├─ isStudioMode: boolean (reductive design toggle)
└─ children: React.ReactNode (main content)
```

## Ceramic Design - Visual Hierarchy

```
┌─────────────────────────────────────────────────────┐
│           FLOATING ELEMENTS (Top Layer)              │
│  ┌─────────────────────────────────────────────┐   │
│  │ Glass/Ceramic: backdrop-blur-md, bg-white/70    │
│  │ Shadow: shadow-lg, border: white/20             │
│  │ Shape: rounded-2xl, smooth curves               │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│       BACKGROUND (Base Color: ceramic-base)         │
│  ┌─────────────────────────────────────────────┐   │
│  │ F0EFE9 - Warm, neutral background              │
│  │ Provides visual anchor and breathing room       │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│      SURFACE CARDS (White with subtle borders)      │
│  ┌─────────────────────────────────────────────┐   │
│  │ White (opaque), border: #E5E3DC                 │
│  │ shadow-sm, rounded-2xl                          │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

Color Tokens Used:
- ceramic-base: #F0EFE9
- ceramic-text-primary: #2D2820
- ceramic-text-secondary: #665D52
- ceramic-text-tertiary: #A5A096
- Border: #E5E3DC, #D6D3CD
```

## Focus States & Interactions

```
┌──────────────────────────────────────────┐
│  Button States                           │
├──────────────────────────────────────────┤
│                                          │
│  [Normal]      hover:scale-[1.02]        │
│                active:scale-[0.98]       │
│                                          │
│  [Disabled]    opacity-50                │
│                disabled:hover:scale-100  │
│                                          │
│  [Primary]     bg-gradient-to-r          │
│                shadow-lg                 │
│                                          │
│  [Secondary]   bg-ceramic-text-primary   │
│                text-ceramic-base         │
│                                          │
└──────────────────────────────────────────┘

Input States:
├─ Focus: ring-2 ring-[color]/50
├─ Background: bg-[#EBE9E4]
├─ Text: text-ceramic-text-primary
├─ Placeholder: placeholder-ceramic-text-tertiary
└─ Border: border-none (uses background contrast)
```

## Animation Timings

```
Header Appearance/Disappearance:
├─ Duration: 300ms (0.3s)
├─ Easing: [0.4, 0, 0.2, 1] (custom ease-in-out)
├─ Initial: y: -100, opacity: 0
└─ Final: y: 0, opacity: 1

Content Transition:
├─ Duration: 400ms (0.4s)
├─ Mode: 'wait' (AnimatePresence)
├─ Scale: 0.98 → 1 (normal) or 1.02 → 1 (studio)
└─ Opacity: 0 → 1

Tab/Card Changes:
├─ Duration: Default (200ms)
├─ Initial: opacity: 0
└─ Animate: opacity: 1
```

## Summary: Key Improvements

✓ **Fluidity**: Smooth transitions between all views with consistent animation
✓ **Anchors**: Floating header provides spatial context (except in studio mode)
✓ **Reductive**: Studio mode hides all UI except essentials - maximum focus
✓ **Explicit Navigation**: Never uses navigate(-1), always explicit paths
✓ **Design Consistency**: All views use same StudioLayout pattern
✓ **Modal Safety**: Dialogs layer correctly above layout
✓ **Responsive**: Scales properly on different screen sizes
