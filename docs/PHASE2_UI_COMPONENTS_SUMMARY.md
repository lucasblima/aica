# Phase 2 UI Components - Visual Summary

**Date:** January 9, 2026
**Status:** ✅ Complete

---

## Component Hierarchy

```
UnifiedTimelineView (Main Container)
├── TimelineFilter (Filter Bar)
│   ├── Source Toggles (7 buttons)
│   ├── Date Range Selector (4 options)
│   └── Control Buttons (Select All, Clear, Reset)
│
├── Stats Summary Bar
│   ├── Total Event Count
│   └── Refresh Button
│
└── Timeline Content
    ├── Day Group 1 (e.g., "Hoje")
    │   ├── Day Header
    │   │   ├── Label ("Hoje")
    │   │   └── Event Count Badge
    │   └── Events
    │       ├── TimelineEventCard (Event 1)
    │       ├── TimelineEventCard (Event 2)
    │       └── TimelineEventCard (Event 3)
    │
    ├── Day Group 2 (e.g., "Ontem")
    │   └── ...
    │
    └── Load More Button
```

---

## Visual Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  FILTROS                                    [Limpar] [Ocultar]│
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Período: [Últimos 7 dias ▼]  4/7 fontes              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🕐 42 eventos                           [🔄] Atualizar      │
└─────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━ HOJE (5) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│  ┌─────────────────────────────────────────────────────────┐
│  │  💬  WhatsApp recebido              Hoje às 14:23  [▼] │
│  │  Mensagem do João sobre o projeto...                   │
│  │  😊 Positivo  #trabalho  #projeto                       │
│  └─────────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────────┐
│  │  📝  Momento capturado              Hoje às 12:15  [▼] │
│  │  Reflexão sobre a reunião de hoje...                   │
│  │  😐 Neutro  🤔  #trabalho  #reunião  +2 mais            │
│  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━ ONTEM (3) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│  ┌─────────────────────────────────────────────────────────┐
│  │  ✓  Tarefa concluída                Ontem às 18:30 [▼] │
│  │  Finalizar relatório trimestral                        │
│  │  Prioridade: Alta  Categoria: Trabalho                 │
│  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━ 2 DIAS ATRÁS (2) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│  ...

┌─────────────────────────────────────────────────────────────┐
│                 [Carregar Mais (15/42)]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Filter Panel (Expanded View)

```
┌─────────────────────────────────────────────────────────────┐
│  FILTROS                                    [Limpar] [Ocultar]│
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Período                                              │  │
│  │  [Últimos 7]  [Últimos 30]  [Últimos 90]  [Tudo]     │  │
│  │                                                        │  │
│  │  Fontes (4/7)                      Todas | Nenhuma   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│  │
│  │  │💬 WhatsApp│ │📝 Momentos│ │✓ Tarefas │ │✅ Aprov. ││  │
│  │  │    12     │ │    28     │ │    5     │ │    0     ││  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │📊 Ativ.   │ │📋 Pergunt.│ │📈 Resumos│             │  │
│  │  │    8      │ │    3      │ │    1     │             │  │
│  │  └──────────┘ └──────────┘ └──────────┘             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Event Card States

### Collapsed State
```
┌─────────────────────────────────────────────────────────────┐
│  💬  WhatsApp recebido                  Hoje às 14:23  [▼] │
│  Mensagem do João sobre o projeto...                       │
│  😊 Positivo  #trabalho  #projeto                           │
└─────────────────────────────────────────────────────────────┘
```

### Expanded State (WhatsApp)
```
┌─────────────────────────────────────────────────────────────┐
│  💬  WhatsApp recebido                  Hoje às 14:23  [▲] │
│  Mensagem do João sobre o projeto...                       │
│  😊 Positivo  #trabalho  #projeto                           │
│  ─────────────────────────────────────────────────────────  │
│  Mensagem:                                                  │
│  Oi! Vi que você finalizou o relatório. Ficou ótimo!       │
│  Podemos marcar uma reunião amanhã para discutir?          │
│                                                             │
│  Contato: João Silva                                        │
└─────────────────────────────────────────────────────────────┘
```

### Expanded State (Moment)
```
┌─────────────────────────────────────────────────────────────┐
│  📝  Momento capturado                  Hoje às 12:15  [▲] │
│  Reflexão sobre a reunião de hoje...                       │
│  😐 Neutro  🤔  #trabalho  #reunião  +2 mais                │
│  ─────────────────────────────────────────────────────────  │
│  A reunião foi produtiva, mas ficamos muito tempo          │
│  discutindo detalhes que poderiam ter sido resolvidos      │
│  por email. Preciso ser mais assertivo em sugerir          │
│  alternativas de comunicação.                               │
│                                                             │
│  Áudio: [▶ ────────────── 0:45]                            │
│                                                             │
│  #trabalho  #reunião  #produtividade  #comunicação          │
└─────────────────────────────────────────────────────────────┘
```

---

## Color Coding by Event Type

| Event Type | Icon | Color | Example Title |
|------------|------|-------|---------------|
| WhatsApp In | 💬 | Green (#10b981) | "WhatsApp recebido" |
| WhatsApp Out | 💬 | Blue (#3b82f6) | "WhatsApp enviado" |
| Moment | 📝 | Amber (#f59e0b) | "Momento capturado" |
| Task | ✓ | Blue (#3b82f6) | "Tarefa concluída" |
| Approval | ✅ | Purple (#8b5cf6) | "Aprovação concedida" |
| Activity | 📊 | Pink (#ec4899) | "Atividade registrada" |
| Question | 📋 | Cyan (#06b6d4) | "Pergunta respondida" |
| Summary | 📈 | Orange (#f97316) | "Resumo semanal" |

---

## Sentiment Indicators

| Sentiment | Emoji | Color | Label |
|-----------|-------|-------|-------|
| Positive | 😊 | Green (#10b981) | "Positivo" |
| Neutral | 😐 | Gray (#94a3b8) | "Neutro" |
| Negative | 😞 | Red (#ef4444) | "Negativo" |

---

## Loading States

### Initial Load
```
┌─────────────────────────────────────────────────────────────┐
│  ████████████████                          [Expandir]        │
└─────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━ ████ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│  ┌─────────────────────────────────────────────────────────┐
│  │  ████  ██████████                      ██████  [▼]      │
│  │  ████████████████████████████████                       │
│  │  ████  ████  ████                                       │
│  └─────────────────────────────────────────────────────────┘
```

### Loading More
```
┌─────────────────────────────────────────────────────────────┐
│                 [🔄 Carregando...]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Empty States

### No Events (No Filters)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          ✨                                 │
│                                                             │
│              Sua timeline está vazia                        │
│                                                             │
│  Comece a registrar momentos, completar tarefas e          │
│  interagir para ver sua linha do tempo crescer.            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### No Events (With Filters)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          ✨                                 │
│                                                             │
│            Nenhum evento encontrado                         │
│                                                             │
│     Tente ajustar os filtros para ver mais eventos.        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Error State

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          ⚠                                  │
│                                                             │
│            Erro ao carregar timeline                        │
│                                                             │
│  Network request failed: Unable to fetch events from server │
│                                                             │
│                  [Tentar Novamente]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile Layout (375px)

```
┌─────────────────────────┐
│ FILTROS       [Expandir]│
│ Período: [Últimos 30▼]  │
│ 4/7 fontes              │
└─────────────────────────┘

┌─────────────────────────┐
│ 🕐 42    [🔄]           │
└─────────────────────────┘

━━━━ HOJE (5) ━━━━━━━━━━━

│ ┌─────────────────────┐
│ │ 💬 WhatsApp  14:23 │
│ │ Mensagem do João.. │
│ │ 😊 #trabalho       │
│ └─────────────────────┘

━━━━ ONTEM (3) ━━━━━━━━━

│ ┌─────────────────────┐
│ │ ✓ Tarefa    18:30  │
│ │ Finalizar relatór..│
│ │ Alta  Trabalho     │
│ └─────────────────────┘

┌─────────────────────────┐
│  [Carregar Mais (15/42)]│
└─────────────────────────┘
```

---

## Interaction Flows

### 1. Filtering by Source

```
User clicks [WhatsApp] toggle
  ↓
TimelineFilter updates filter state
  ↓
onFilterChange({ sources: ['whatsapp'] })
  ↓
UnifiedTimelineView receives new filters
  ↓
useUnifiedTimeline hook refetches events
  ↓
Timeline re-renders with filtered events
```

### 2. Changing Date Range

```
User selects "Últimos 7 dias"
  ↓
TimelineFilter updates dateRange
  ↓
onFilterChange({ dateRange: 'last7' })
  ↓
useUnifiedTimeline applies date filter
  ↓
Timeline shows only last 7 days
```

### 3. Expanding Event

```
User clicks event card
  ↓
TimelineEventCard toggles isExpanded state
  ↓
AnimatePresence triggers expand animation
  ↓
renderExpandedContent() shows full details
  ↓
Card height animates from auto to full
```

### 4. Loading More Events

```
User clicks "Carregar Mais"
  ↓
UnifiedTimelineView calls loadMore()
  ↓
useUnifiedTimeline increments offset
  ↓
Service fetches next page
  ↓
New events appended to existing list
  ↓
Timeline re-renders with stagger animation
```

---

## Animation Timeline

```
Page Load
  ↓ 0ms
Filter Bar: opacity 0→1, y -10→0
  ↓ 50ms
Stats Bar: opacity 0→1, y -10→0
  ↓ 100ms
Day Group 1 Header: fade in
  ↓ 150ms
Day Group 1 Event 1: slide in from left
  ↓ 180ms
Day Group 1 Event 2: slide in from left
  ↓ 210ms
Day Group 1 Event 3: slide in from left
  ↓ 260ms
Day Group 2 Header: fade in
  ↓ 310ms
Day Group 2 Event 1: slide in from left
  ...
```

---

## Responsive Breakpoints

| Screen Size | Filter Grid | Event Cards | Other Changes |
|-------------|-------------|-------------|---------------|
| < 640px | 2 columns | Full width | Stacked layout, compact filter |
| 640-1024px | 3 columns | Full width | Horizontal filter bar |
| > 1024px | 4 columns | Max 4xl | Desktop layout, expanded filter |

---

## File Structure

```
src/modules/journey/components/timeline/
├── index.ts                      # Barrel exports
├── MomentCard.tsx                # Legacy (existing)
├── TimelineEventCard.tsx         # ✨ NEW - Event display
├── TimelineFilter.tsx            # ✨ NEW - Filter controls
└── UnifiedTimelineView.tsx       # ✨ NEW - Main container
```

---

## Props API

### TimelineEventCard

```typescript
interface TimelineEventCardProps {
  event: UnifiedEvent              // Event data
  onClick?: (event: UnifiedEvent) => void  // Optional click handler
}
```

### TimelineFilter

```typescript
interface TimelineFilterProps {
  filters: TimelineFilter          // Current filter state
  onFilterChange: (filters: Partial<TimelineFilter>) => void
  stats?: {                        // Optional event counts
    whatsapp: number
    moment: number
    task: number
    approval: number
    activity: number
    question: number
    summary: number
  }
}
```

### UnifiedTimelineView

```typescript
interface UnifiedTimelineViewProps {
  userId?: string                  // Optional user ID (defaults to current)
  onEventClick?: (event: UnifiedEvent) => void  // Optional click handler
}
```

---

**Document Version:** 1.0
**Created:** January 9, 2026
**Author:** UX Design Guardian (Claude Sonnet 4.5)
