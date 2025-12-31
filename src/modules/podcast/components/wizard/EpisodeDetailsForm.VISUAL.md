# EpisodeDetailsForm - Visual Design Specification

## Component Preview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     Detalhes do Episódio                        │
│              Configure as informações do episódio               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Tema da Conversa *                                             │
│                                                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐       │
│  │   ⚡ Aica Auto   [✓]   │ │     ✏️ Manual          │       │
│  └─────────────────────────┘ └─────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 Tema gerado automaticamente:                         │   │
│  │                                                         │   │
│  │ "Conversa com João Silva sobre empreendedorismo        │   │
│  │  e inovação"                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Temporada *                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1                                                   [▲▼] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Localização *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Estúdio Remoto                                      [▼] │   │
│  └─────────────────────────────────────────────────────────┘   │
│    ├─ Estúdio Remoto                                           │
│    ├─ Presencial - Estúdio Aica                                │
│    ├─ Presencial - Local do Convidado                          │
│    └─ Presencial - Outro Local                                 │
│                                                                 │
│  Data e Hora (opcional)                                         │
│  ┌───────────────────────────┐ ┌───────────────────────────┐   │
│  │ 2025-01-15        [📅]   │ │ 14:00             [🕐]   │   │
│  └───────────────────────────┘ └───────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💡 Dica: Use "Aica Auto" para gerar um tema            │   │
│  │    automaticamente baseado no convidado. Você pode      │   │
│  │    sempre editar depois na fase de pré-produção.        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────┐                            ┌─────────────┐    │
│  │ ◀ Voltar   │                            │ ✓ Completar │    │
│  └─────────────┘                            └─────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Mode: Aica Auto (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│  Tema da Conversa *                                             │
│                                                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐       │
│  │   ⚡ Aica Auto   [✓]   │ │     ✏️ Manual          │       │
│  │   bg-amber-500         │ │   bg-ceramic-surface   │       │
│  │   text-white           │ │   text-gray-600        │       │
│  │   shadow-lg            │ │   hover:bg-gray-100    │       │
│  │   scale-[1.02]         │ │                        │       │
│  └─────────────────────────┘ └─────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 Tema gerado automaticamente:                         │   │
│  │                                                         │   │
│  │ "Conversa com Maria Santos sobre liderança e           │   │
│  │  transformação"                                         │   │
│  │                                                         │   │
│  │ (Auto-generated, read-only display)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

Theme generation happens instantly on:
- Component mount
- Guest name change
- Toggle to Auto mode
```

## Mode: Manual

```
┌─────────────────────────────────────────────────────────────────┐
│  Tema da Conversa *                                             │
│                                                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐       │
│  │   ⚡ Aica Auto         │ │     ✏️ Manual    [✓]   │       │
│  │   bg-ceramic-surface   │ │   bg-blue-500          │       │
│  │   text-gray-600        │ │   text-white           │       │
│  │   hover:bg-gray-100    │ │   shadow-lg            │       │
│  │                        │ │   scale-[1.02]         │       │
│  └─────────────────────────┘ └─────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Políticas Públicas e Sustentabilidade_                  │   │
│  │                                                         │   │
│  │ (Editable text input)                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Placeholder: "Ex: Políticas Públicas, Empreendedorismo..."    │
└─────────────────────────────────────────────────────────────────┘

User can type custom theme
Input is enabled and focused
```

## Complete Button States

### Enabled (Valid Form)
```
┌─────────────────┐
│ ✓ Completar    │  ← bg-amber-500 (or primary color)
│                │     text-white
│   (Clickable)  │     hover:bg-amber-600
└─────────────────┘     cursor-pointer
                        shadow-md
```

### Disabled (Invalid Form)
```
┌─────────────────┐
│ ✓ Completar    │  ← bg-gray-300
│                │     text-gray-500
│  (Disabled)    │     cursor-not-allowed
└─────────────────┘     opacity-60
```

**Disabled when**:
- Manual mode AND theme is empty
- Season < 1
- Location is empty

## Location Dropdown States

### Closed
```
┌─────────────────────────────────────────────────────────┐
│ Estúdio Remoto                                      [▼] │
└─────────────────────────────────────────────────────────┘
```

### Open
```
┌─────────────────────────────────────────────────────────┐
│ Estúdio Remoto ✓                                    [▲] │
├─────────────────────────────────────────────────────────┤
│ ○ Estúdio Remoto                                        │
├─────────────────────────────────────────────────────────┤
│ ○ Presencial - Estúdio Aica                             │
├─────────────────────────────────────────────────────────┤
│ ○ Presencial - Local do Convidado                       │
├─────────────────────────────────────────────────────────┤
│ ○ Presencial - Outro Local                              │
└─────────────────────────────────────────────────────────┘
```

## Date/Time Inputs

### Empty (Default)
```
┌───────────────────────────┐ ┌───────────────────────────┐
│ DD/MM/AAAA        [📅]   │ │ --:--             [🕐]   │
└───────────────────────────┘ └───────────────────────────┘
     (Optional)                    (Optional)
```

### Filled
```
┌───────────────────────────┐ ┌───────────────────────────┐
│ 15/01/2025        [📅]   │ │ 14:30             [🕐]   │
└───────────────────────────┘ └───────────────────────────┘
```

## Season Input

```
┌─────────────────────────────────────────────────────────┐
│ 1                                                   [▲▼] │
└─────────────────────────────────────────────────────────┘

Type: number
Min: 1
Max: 100
Default: 1

User can:
- Type directly
- Use arrow buttons ▲▼
- Scroll with mouse wheel
```

## Responsive Breakpoints

### Mobile (< 768px)
```
┌──────────────────────────────┐
│ Detalhes do Episódio         │
│                              │
│ Tema da Conversa *           │
│ ┌──────────────────────────┐ │
│ │ ⚡ Aica Auto       [✓]  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ✏️ Manual              │ │
│ └──────────────────────────┘ │
│                              │
│ Auto theme display...        │
│                              │
│ Temporada *                  │
│ ┌──────────────────────────┐ │
│ │ 1                    [▲▼]│ │
│ └──────────────────────────┘ │
│                              │
│ Localização *                │
│ ┌──────────────────────────┐ │
│ │ Estúdio Remoto       [▼]│ │
│ └──────────────────────────┘ │
│                              │
│ Data (opcional)              │
│ ┌──────────────────────────┐ │
│ │ 2025-01-15         [📅] │ │
│ └──────────────────────────┘ │
│                              │
│ Hora (opcional)              │
│ ┌──────────────────────────┐ │
│ │ 14:30              [🕐] │ │
│ └──────────────────────────┘ │
│                              │
│ [◀ Voltar]  [✓ Completar]   │
└──────────────────────────────┘
```

### Desktop (>= 768px)
```
┌─────────────────────────────────────────────────────────────┐
│                    Detalhes do Episódio                     │
│                                                             │
│ Tema  [⚡ Aica Auto ✓]  [✏️ Manual]                       │
│                                                             │
│ Auto theme display...                                       │
│                                                             │
│ Temporada *        Localização *                            │
│ [1      ▲▼]        [Estúdio Remoto          ▼]             │
│                                                             │
│ Data e Hora (opcional)                                      │
│ [2025-01-15 📅]    [14:30 🕐]                              │
│                                                             │
│ [◀ Voltar]                            [✓ Completar]        │
└─────────────────────────────────────────────────────────────┘
```

## Color Palette (Ceramic Design System)

### Primary Colors
```css
--amber-500: #F59E0B    /* Aica Auto button (active) */
--blue-500: #3B82F6     /* Manual button (active) */
--green-500: #10B981    /* Complete button (enabled) */
```

### Neutral Colors
```css
--gray-100: #F3F4F6     /* Inactive button background */
--gray-300: #D1D5DB     /* Disabled button background */
--gray-500: #6B7280     /* Disabled text */
--gray-700: #374151     /* Secondary text */
--gray-900: #111827     /* Primary text */
```

### Ceramic Tokens
```css
--ceramic-surface: rgba(255, 255, 255, 0.8)
--ceramic-text-primary: #1F2937
--ceramic-text-secondary: #6B7280
--ceramic-inset: rgba(0, 0, 0, 0.05)
```

## Animations & Transitions

### Button Toggle
```css
transition: all 200ms ease-in-out

/* State change */
opacity: 0 → 1
scale: 1 → 1.02
box-shadow: none → shadow-lg
```

### Form Submit
```css
/* Click animation */
transform: scale(0.98)
transition: transform 100ms
```

### Input Focus
```css
/* Focus ring */
ring: 2px solid blue-500
ring-opacity: 50%
transition: ring 150ms
```

## Typography

### Headings
```
Title: 2xl font-bold text-ceramic-text-primary
Subtitle: base text-ceramic-text-secondary
```

### Labels
```
Labels: sm font-medium text-ceramic-text-primary
Required: * text-red-500
```

### Inputs
```
Input text: base text-ceramic-text-primary
Placeholder: base text-gray-400
```

### Buttons
```
Button text: base font-bold
Icons: text-xl
```

## Spacing Scale

```
p-8   → Padding: 2rem (main card)
p-6   → Padding: 1.5rem (buttons)
p-4   → Padding: 1rem (info boxes)
p-3   → Padding: 0.75rem (inputs)

gap-6 → Gap: 1.5rem (main sections)
gap-4 → Gap: 1rem (buttons)
gap-3 → Gap: 0.75rem (toggle buttons)
gap-2 → Gap: 0.5rem (date/time)

mb-2  → Margin bottom: 0.5rem (labels)
mb-3  → Margin bottom: 0.75rem (toggle buttons)
```

## Z-Index Layers

```
z-0  → Base layer (card background)
z-10 → Dropdown menu
z-20 → Info boxes
z-30 → Tooltips (future)
z-40 → Modal overlays (future)
```

## Accessibility Features

### ARIA Attributes
```html
<label for="episode-season" aria-required="true">
  Temporada *
</label>

<input
  id="episode-season"
  type="number"
  aria-invalid="false"
  aria-describedby="season-help"
/>

<button
  aria-pressed={themeMode === 'auto'}
  aria-label="Gerar tema automaticamente com Aica"
>
  ⚡ Aica Auto
</button>
```

### Focus Indicators
```css
/* Keyboard focus */
focus-visible:ring-2
focus-visible:ring-blue-500
focus-visible:ring-offset-2
```

### Screen Reader Text
```html
<span className="sr-only">
  Campo obrigatório: Tema da conversa
</span>
```

## Loading States (Future)

```
┌─────────────────────────────────────────────────────────┐
│ Tema da Conversa *                                      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🤖 Gerando tema...                                  │ │
│ │                                                     │ │
│ │ [████████░░░░░░░░░░] 60%                           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Error States (Future)

```
┌─────────────────────────────────────────────────────────┐
│ Tema da Conversa *                                      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │ ← border-red-400
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚠️ O tema não pode estar vazio                          │ ← text-red-400
└─────────────────────────────────────────────────────────┘
```

---

## Visual Hierarchy

1. **Title** (Largest, Bold) → Detalhes do Episódio
2. **Section Labels** (Medium, Bold) → Tema da Conversa, Temporada...
3. **Toggle Buttons** (Prominent) → Aica Auto / Manual
4. **Auto Theme Display** (Highlighted Box) → Generated theme
5. **Form Inputs** (Standard) → Season, Location, Date/Time
6. **Info Box** (Subtle) → Tip with 💡
7. **Action Buttons** (Bottom) → Voltar / Completar

---

## Interactive Prototype Flow

```
User lands on Step 3
   ↓
Sees "Aica Auto" selected (default)
   ↓
Auto theme is displayed immediately
   ↓
User can:
   A) Keep auto theme → Fill season/location → Complete
   B) Switch to manual → Type custom theme → Fill fields → Complete
   C) Click "Voltar" → Go back to previous step
```

---

This visual specification ensures designers, developers, and QA have a clear reference for the component's appearance and behavior.
