# Sprint Agenda "Meu Dia" — Design Document

**Session:** `sprint-agenda-atlas-review`
**Date:** 2026-03-09
**Status:** Approved

## Context

The Agenda page is AICA's highest-value interaction point, connecting tasks, calendar, and cross-module data. Currently:
- `src/modules/agenda/` does NOT exist — components scattered across `components/domain/`, `components/features/`, `hooks/`, `services/`
- `AgendaView.tsx` is a 2500+ line monolith
- Google Calendar events exist only in memory (no persistence)
- No `calendar_events` table
- Atlas module has 8 cognitive science formulas with partial UI integration
- Multiple auth providers planned — AICA needs its own calendar system

## Architecture Decision

### Three-Layer Temporal Model

```
┌─────────────────────────────────────────────────┐
│  TIMELINE (read-only, aggregated)               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │  work_items   │  │calendar_events│  │modules ││
│  │  (user)       │  │ (external)    │  │(publish)│
│  └──────────────┘  └──────────────┘  └────────┘│
└─────────────────────────────────────────────────┘
         ▲
    Atlas Intelligence (scores work_items)
```

- **`work_items`** — Everything the user CREATES (tasks, manual events, time blocks). The view determines presentation.
- **`calendar_events`** (NEW table) — Everything from EXTERNAL sync (Google, Apple, Outlook). Read-only in AICA.
- **Timeline** — Aggregation of work_items + calendar_events + module providers (Flux, Finance, Studio)

### Module Boundaries

- **Atlas** = Intelligence Layer (unchanged) — scoring, cognitive science, AI, flow detection
- **Agenda** = Temporal Platform (NEW) — all UI, calendar, sync, timeline aggregation
- Atlas scores `work_items`; uses `calendar_events` as context ("2h free between meetings")

### Tab Rename

Bottom nav: `AGENDA` → `MEU DIA`

## Data Layer

### New Table: `calendar_events`

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  recurrence_rule TEXT,
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual'|'google'|'apple'|'outlook'|'flux'|'finance'|'studio'
  external_id TEXT,
  external_url TEXT,
  sync_status TEXT DEFAULT 'synced',  -- 'synced'|'pending'|'conflict'
  last_synced_at TIMESTAMPTZ,
  color TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: Standard user_id policies (SELECT, INSERT, UPDATE, DELETE).

### Timeline Provider Interface

```typescript
interface TimelineProvider {
  source: string;
  getEvents(userId: string, range: DateRange): Promise<TimelineEvent[]>;
}
```

Each module implements a provider. Timeline hook aggregates all sources.

## Module Structure

```
src/modules/agenda/
├── components/
│   ├── views/
│   │   ├── AgendaPageShell.tsx      ← Orchestrator (~200 lines, replaces AgendaView.tsx)
│   │   ├── ListView.tsx
│   │   ├── KanbanView.tsx
│   │   ├── MatrixView.tsx
│   │   ├── CalendarView.tsx
│   │   └── TimelineView.tsx
│   ├── cards/
│   │   ├── TaskCard.tsx             ← Enhanced (category, badges, duration, recurrence)
│   │   ├── EventCard.tsx            ← For calendar_events
│   │   └── TimeBlockCard.tsx
│   ├── editors/
│   │   ├── TaskEditModal.tsx
│   │   ├── QuickAdd.tsx
│   │   └── RecurrenceEditor.tsx     ← NEW
│   ├── calendar/
│   │   ├── MonthGrid.tsx
│   │   ├── WeekView.tsx             ← NEW
│   │   ├── DailyTimeline.tsx
│   │   └── TimeBlockSlot.tsx        ← NEW
│   └── shared/
│       ├── ModeToggle.tsx
│       ├── FilterBar.tsx
│       └── CompletedSection.tsx
├── hooks/
│   ├── useTimeline.ts              ← Aggregates all temporal sources
│   ├── useTaskFilters.ts
│   ├── useTaskCompletion.ts
│   ├── useCalendarSync.ts
│   ├── useRecurrence.ts            ← NEW
│   └── useTimeBlocking.ts          ← NEW
├── services/
│   ├── timelineService.ts
│   ├── calendarEventService.ts
│   ├── taskRecurrenceService.ts
│   └── syncAdapters/
│       ├── types.ts
│       ├── googleCalendarAdapter.ts
│       └── (future: apple, outlook)
├── providers/
│   ├── types.ts                    ← TimelineProvider interface
│   ├── fluxProvider.ts
│   ├── financeProvider.ts          ← NEW
│   └── studioProvider.ts           ← NEW
├── types/
│   └── index.ts
└── index.ts
```

## Features

### UX — Enhanced TaskCard

Shows: category with color/icon, duration badge, recurrence chip, subtask count, Atlas intelligence overlay (optional toggle).

### Recurrence Editor

RRULE-based editor with presets (daily, weekly, monthly, weekdays) and custom mode (frequency, interval, day selection, end condition). Preview text: "Toda terça e quinta, sem fim".

### Time Blocking

In Calendar/Timeline views, drag tasks from list to create time blocks. Sets `scheduled_time` + `estimated_duration` on work_items. Calendar events (external sync) are read-only with distinct visual style.

### Cross-Module Providers

| Provider | Source Table | Publishes |
|----------|-------------|-----------|
| Flux | `workout_blocks` | Scheduled workouts with duration |
| Finance | `finance_transactions` (due_date) | Bill reminders |
| Studio | `podcast_episodes` (scheduled_date) | Recording/editing sessions |
| Connections | WhatsApp extracted meetings | Detected appointments |

### Routine Templates

Pre-defined and custom templates that generate work_items with recurrence rules. Examples: "Rotina Matinal", "Dia de Trabalho".

## Sprint Strategy

**Foundation First:**
- Phase 1 (Foundation): Create module, migrate components, calendar_events table, rename tab
- Phase 2 (Features): Enhanced UX, timeline providers, recurrence, time blocking, sync adapters, templates, integrations

## Non-Goals (This Sprint)

- Apple/Outlook calendar sync (adapter interface only, implementation later)
- Notification system for events
- Collaborative calendars (multi-user)
- AI-powered scheduling suggestions (Atlas can suggest, but auto-scheduling is future)
