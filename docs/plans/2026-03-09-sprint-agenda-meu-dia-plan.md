# Sprint "Meu Dia" — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the monolithic Agenda page into a modular temporal platform with calendar_events persistence, cross-module timeline, recurrence editing, time blocking, and routine templates.

**Architecture:** Three-layer temporal model: work_items (user-created) + calendar_events (external sync) + timeline (aggregation). Atlas remains the intelligence layer; new Agenda module owns all UI, calendar, and sync logic. Tab renamed from AGENDA to MEU DIA.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + RLS), @dnd-kit, framer-motion, Tailwind CSS (Ceramic tokens), Vitest

**Design Doc:** `docs/plans/2026-03-09-sprint-agenda-meu-dia-design.md`

---

## Dependency Graph

```
Task 1 (types/structure)
  ├→ Task 2 (migrate components)  ─┐
  └→ Task 3 (migrate hooks/services) ─┤
                                       ├→ Task 4 (decompose AgendaView)
                                       │    ├→ Task 6 (rename tab)
                                       │    ├→ Task 7 (enhanced TaskCard)
                                       │    ├→ Task 9 (recurrence editor) → Task 13 (templates)
                                       │    └─┐
Task 5 (calendar_events table) ────────┴→ Task 8 (useTimeline)
                                              ├→ Task 10 (time blocking)
                                              ├→ Task 11 (Google sync adapter)
                                              └→ Task 12 (cross-module providers)
```

## Phase 1 — Foundation

---

### Task 1: Create `src/modules/agenda/` structure + types

**Files:**
- Create: `src/modules/agenda/types/index.ts`
- Create: `src/modules/agenda/providers/types.ts`
- Create: `src/modules/agenda/index.ts`

**Step 1: Create types file**

```typescript
// src/modules/agenda/types/index.ts
import type { Task, Quadrant } from '@/types';

export type AgendaMode = 'agenda' | 'list' | 'kanban' | 'matrix' | 'calendar';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;        // ISO timestamptz
  end_time?: string | null;
  all_day: boolean;
  timezone: string;
  recurrence_rule?: string | null;
  source: 'manual' | 'google' | 'apple' | 'outlook' | 'flux' | 'finance' | 'studio';
  external_id?: string | null;
  external_url?: string | null;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at?: string | null;
  color?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  start: string;             // ISO timestamptz
  end?: string | null;
  allDay?: boolean;
  source: string;            // 'work_item' | 'calendar_event' | 'flux' | 'finance' | 'studio'
  sourceId: string;          // Original entity ID
  color?: string;
  icon?: string;
  isReadOnly?: boolean;      // true for external sync events
  metadata?: Record<string, unknown>;
}

export interface TimeBlock {
  taskId: string;
  scheduledTime: string;
  duration: number;          // minutes
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type { Task, Quadrant };
```

**Step 2: Create provider types**

```typescript
// src/modules/agenda/providers/types.ts
import type { TimelineEvent, DateRange } from '../types';

export interface TimelineProvider {
  source: string;
  getEvents(userId: string, range: DateRange): Promise<TimelineEvent[]>;
}
```

**Step 3: Create barrel export**

```typescript
// src/modules/agenda/index.ts
export * from './types';
export type { TimelineProvider } from './providers/types';
```

**Step 4: Verify build**

Run: `npm run typecheck`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/modules/agenda/
git commit -m "feat(agenda): create module structure with types and provider interface"
```

---

### Task 2: Migrate components to `agenda/components/`

**Files:**
- Move: `src/components/domain/TaskListView.tsx` → `src/modules/agenda/components/views/ListView.tsx`
- Move: `src/components/domain/TaskKanbanView.tsx` → `src/modules/agenda/components/views/KanbanView.tsx`
- Move: `src/components/domain/PriorityMatrix.tsx` → `src/modules/agenda/components/views/MatrixView.tsx`
- Move: `src/components/domain/SwipeableTaskCard.tsx` → `src/modules/agenda/components/cards/TaskCard.tsx`
- Move: `src/components/domain/AgendaModeToggle.tsx` → `src/modules/agenda/components/shared/ModeToggle.tsx`
- Move: `src/components/domain/TaskFilterBar.tsx` → `src/modules/agenda/components/shared/FilterBar.tsx`
- Move: `src/components/domain/CompletedTasksSection.tsx` → `src/modules/agenda/components/shared/CompletedSection.tsx`
- Move: `src/components/domain/TaskEditModal.tsx` → `src/modules/agenda/components/editors/TaskEditModal.tsx`
- Move: `src/components/domain/TaskCreationQuickAdd.tsx` → `src/modules/agenda/components/editors/QuickAdd.tsx`
- Move: `src/components/features/AgendaTimeline.tsx` → `src/modules/agenda/components/calendar/AgendaTimeline.tsx`
- Move: `src/components/features/DailyTimeline.tsx` → `src/modules/agenda/components/calendar/DailyTimeline.tsx`
- Move: `src/components/features/visualizations/CalendarGrid.tsx` → `src/modules/agenda/components/calendar/MonthGrid.tsx`
- Move: `src/components/features/WeeklyCalendarView.tsx` → `src/modules/agenda/components/calendar/WeekView.tsx`
- Create: barrel exports for each subdirectory

**Strategy:** Git move (preserves history) + update imports. Use search-and-replace for import paths.

**Step 1: Create directory structure**

```bash
mkdir -p src/modules/agenda/components/{views,cards,editors,calendar,shared}
```

**Step 2: Move files with git mv**

Move each file using `git mv`, then update internal imports. Start with leaf components (cards, shared) that have fewer dependents, then views.

**Step 3: Create barrel exports for each subdirectory**

```typescript
// src/modules/agenda/components/views/index.ts
export { default as ListView } from './ListView';
export { default as KanbanView } from './KanbanView';
export { default as MatrixView } from './MatrixView';
// CalendarView and TimelineView created in Task 4

// src/modules/agenda/components/cards/index.ts
export { default as TaskCard } from './TaskCard';

// src/modules/agenda/components/editors/index.ts
export { default as TaskEditModal } from './TaskEditModal';
export { default as QuickAdd } from './QuickAdd';

// src/modules/agenda/components/calendar/index.ts
export { AgendaTimeline } from './AgendaTimeline';
export { DailyTimeline } from './DailyTimeline';
export { default as MonthGrid } from './MonthGrid';
export { default as WeekView } from './WeekView';

// src/modules/agenda/components/shared/index.ts
export { default as ModeToggle } from './ModeToggle';
export { default as FilterBar } from './FilterBar';
export { default as CompletedSection } from './CompletedSection';
```

**Step 4: Update old barrel exports to re-export from new locations**

Keep backward compatibility in `src/components/domain/index.ts` and `src/components/features/index.ts` temporarily (re-export from new paths). This prevents breaking all consumers at once.

**Step 5: Verify build**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(agenda): migrate domain/feature components to agenda module"
```

---

### Task 3: Migrate hooks + services to agenda module

**Files:**
- Move: `src/hooks/useTaskFilters.ts` → `src/modules/agenda/hooks/useTaskFilters.ts`
- Move: `src/hooks/useTaskCompletion.ts` → `src/modules/agenda/hooks/useTaskCompletion.ts`
- Move: `src/hooks/useCalendarSync.ts` → `src/modules/agenda/hooks/useCalendarSync.ts`
- Move: `src/hooks/useGoogleCalendarEvents.ts` → `src/modules/agenda/hooks/useGoogleCalendarEvents.ts`
- Move: `src/services/calendarSyncService.ts` → `src/modules/agenda/services/calendarSyncService.ts`
- Move: `src/services/taskRecurrenceService.ts` → `src/modules/agenda/services/taskRecurrenceService.ts`
- Move: `src/services/googleCalendarService.ts` → `src/modules/agenda/services/googleCalendarService.ts`
- Move: `src/services/calendarSyncTransforms.ts` → `src/modules/agenda/services/calendarSyncTransforms.ts`
- Create: `src/modules/agenda/hooks/index.ts`
- Create: `src/modules/agenda/services/index.ts`

**Step 1: Move hooks with git mv**

```bash
git mv src/hooks/useTaskFilters.ts src/modules/agenda/hooks/
git mv src/hooks/useTaskCompletion.ts src/modules/agenda/hooks/
git mv src/hooks/useCalendarSync.ts src/modules/agenda/hooks/
git mv src/hooks/useGoogleCalendarEvents.ts src/modules/agenda/hooks/
```

**Step 2: Move services with git mv**

```bash
git mv src/services/calendarSyncService.ts src/modules/agenda/services/
git mv src/services/taskRecurrenceService.ts src/modules/agenda/services/
git mv src/services/googleCalendarService.ts src/modules/agenda/services/
git mv src/services/calendarSyncTransforms.ts src/modules/agenda/services/
```

**Step 3: Create barrel exports**

```typescript
// src/modules/agenda/hooks/index.ts
export { useTaskFilters } from './useTaskFilters';
export { useTaskCompletion } from './useTaskCompletion';
export { useCalendarSync } from './useCalendarSync';
export { useGoogleCalendarEvents } from './useGoogleCalendarEvents';

// src/modules/agenda/services/index.ts
export * from './calendarSyncService';
export * from './taskRecurrenceService';
export * from './googleCalendarService';
export * from './calendarSyncTransforms';
```

**Step 4: Update imports across codebase**

Search for all imports from old paths and update to `@/modules/agenda/hooks/` and `@/modules/agenda/services/`. Add re-exports at old locations for backward compatibility if needed.

**Step 5: Verify build**

Run: `npm run build && npm run typecheck`
Expected: 0 errors

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(agenda): migrate hooks and services to agenda module"
```

---

### Task 4: Decompose AgendaView.tsx into AgendaPageShell + view components

**Files:**
- Modify: `src/views/AgendaView.tsx` → becomes thin shell (~200 lines)
- Create: `src/modules/agenda/components/views/TimelineView.tsx` (extracted from AgendaView agenda mode)
- Create: `src/modules/agenda/components/views/CalendarView.tsx` (extracted from AgendaView calendar mode)
- Create: `src/modules/agenda/components/views/AgendaPageShell.tsx` (new orchestrator)

**Step 1: Extract TimelineView**

Extract the "agenda" mode rendering from AgendaView (DailyTimeline + AgendaTimeline + NextEventHero) into its own component.

```typescript
// src/modules/agenda/components/views/TimelineView.tsx
interface TimelineViewProps {
  userId: string;
  tasks: Task[];
  calendarEvents: TimelineEvent[];
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
}
```

**Step 2: Extract CalendarView**

Extract the "calendar" mode rendering (CalendarGrid + month navigation) into its own component.

```typescript
// src/modules/agenda/components/views/CalendarView.tsx
interface CalendarViewProps {
  tasks: Task[];
  calendarEvents: TimelineEvent[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}
```

**Step 3: Create AgendaPageShell**

The thin orchestrator that:
- Manages AgendaMode state
- Calls useTimeline (or individual hooks until Task 8)
- Renders ModeToggle, QuickAdd, FilterBar
- Renders active view component
- Handles DnD context
- Handles swipe gestures (mobile)

Target: ~200 lines. All view logic lives in child components.

**Step 4: Update AgendaView.tsx to use AgendaPageShell**

```typescript
// src/views/AgendaView.tsx (now thin wrapper)
import { AgendaPageShell } from '@/modules/agenda/components/views/AgendaPageShell';

export const AgendaView: React.FC<AgendaViewProps> = (props) => {
  return <AgendaPageShell {...props} />;
};
```

**Step 5: Verify build + manual test**

Run: `npm run build && npm run typecheck`
Run: `npm run dev` → verify all 5 modes work, swipe works, DnD works
Expected: Identical behavior to before

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(agenda): decompose AgendaView into AgendaPageShell + view components"
```

---

### Task 5: Create `calendar_events` table + RLS migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_calendar_events_table.sql`
- Create: `src/modules/agenda/services/calendarEventService.ts`
- Test: `src/modules/agenda/services/__tests__/calendarEventService.test.ts`

**Step 1: Write the migration**

```sql
-- Create calendar_events table for AICA's own calendar system
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description TEXT CHECK (char_length(description) <= 5000),
  location TEXT,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  recurrence_rule TEXT,

  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'google', 'apple', 'outlook', 'flux', 'finance', 'studio')),
  external_id TEXT,
  external_url TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('synced', 'pending', 'conflict')),
  last_synced_at TIMESTAMPTZ,

  color TEXT,
  category TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_source ON public.calendar_events(source);
CREATE INDEX idx_calendar_events_external_id ON public.calendar_events(external_id);
CREATE UNIQUE INDEX idx_calendar_events_user_external ON public.calendar_events(user_id, source, external_id)
  WHERE external_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own calendar events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Write calendarEventService.ts**

```typescript
// src/modules/agenda/services/calendarEventService.ts
import { supabase } from '@/services/supabaseClient';
import type { CalendarEvent, DateRange } from '../types';

export async function fetchCalendarEvents(
  userId: string,
  range: DateRange
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', range.start.toISOString())
    .lte('start_time', range.end.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function upsertExternalEvent(
  userId: string,
  source: string,
  externalId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .upsert(
      { ...event, user_id: userId, source, external_id: externalId },
      { onConflict: 'user_id,source,external_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Step 3: Write test**

```typescript
// src/modules/agenda/services/__tests__/calendarEventService.test.ts
import { describe, it, expect, vi } from 'vitest';
// Test the service's data transformation logic
// DB calls are mocked via supabase mock
```

**Step 4: Apply migration locally**

Run: `npx supabase db push`
Verify: Check that table exists and RLS works via Dashboard

**Step 5: Commit**

```bash
git add supabase/migrations/ src/modules/agenda/services/calendarEventService.ts
git commit -m "feat(agenda): create calendar_events table with RLS + CRUD service"
```

---

### Task 6: Rename tab AGENDA → MEU DIA

**Files:**
- Modify: `src/components/layout/BottomNav.tsx` (line 19)

**Step 1: Change label**

```typescript
// Before:
{ view: 'agenda', icon: Calendar, label: 'Agenda' },
// After:
{ view: 'agenda', icon: Calendar, label: 'Meu Dia' },
```

**Step 2: Verify build + visual check**

Run: `npm run build && npm run typecheck`
Run: `npm run dev` → verify bottom nav shows "MEU DIA"

**Step 3: Commit**

```bash
git add src/components/layout/BottomNav.tsx
git commit -m "feat(agenda): rename tab AGENDA to MEU DIA"
```

---

## Phase 2 — Features

---

### Task 7: Enhanced TaskCard with category, badges, duration

**Files:**
- Modify: `src/modules/agenda/components/cards/TaskCard.tsx` (ex-SwipeableTaskCard, 317 lines)
- Reference: `src/types/index.ts` (Task interface — has `estimated_duration`, `recurrence_rule`, `checklist`, `tags`)

**Step 1: Write failing test for badge rendering**

Test that TaskCard renders duration badge when `estimated_duration` is set, recurrence chip when `recurrence_rule` is set, and subtask count when `checklist` has items.

**Step 2: Add category color/icon**

Fetch task category from `task_categories` table. Display colored dot + category name as chip below title.

**Step 3: Add duration badge**

```tsx
{task.estimated_duration && (
  <span className="text-xs text-ceramic-text-secondary flex items-center gap-1">
    <Clock className="w-3 h-3" />
    {task.estimated_duration}min
  </span>
)}
```

**Step 4: Add recurrence chip**

Use `describeRRuleInPortuguese()` from `taskRecurrenceService` to show human-readable recurrence.

```tsx
{task.recurrence_rule && (
  <span className="text-xs bg-ceramic-cool px-2 py-0.5 rounded-full flex items-center gap-1">
    <Repeat className="w-3 h-3" />
    {describeRRuleInPortuguese(task.recurrence_rule)}
  </span>
)}
```

**Step 5: Add subtask count**

```tsx
{task.checklist && task.checklist.length > 0 && (
  <span className="text-xs text-ceramic-text-secondary">
    {task.checklist.filter(i => i.done).length}/{task.checklist.length} subtarefas
  </span>
)}
```

**Step 6: Verify build + visual check**

Run: `npm run build && npm run typecheck`
Expected: Cards show badges for tasks with durations, recurrence, subtasks

**Step 7: Commit**

```bash
git add src/modules/agenda/components/cards/
git commit -m "feat(agenda): enhanced TaskCard with category, duration, recurrence badges"
```

---

### Task 8: `useTimeline` hook — aggregate all temporal sources

**Files:**
- Create: `src/modules/agenda/hooks/useTimeline.ts`
- Create: `src/modules/agenda/providers/registry.ts`
- Test: `src/modules/agenda/hooks/__tests__/useTimeline.test.ts`

**Step 1: Write failing test**

Test that useTimeline merges work_items, calendar_events, and provider events into a single sorted array.

**Step 2: Create provider registry**

```typescript
// src/modules/agenda/providers/registry.ts
import type { TimelineProvider } from './types';

const providers: TimelineProvider[] = [];

export function registerTimelineProvider(provider: TimelineProvider): void {
  const existing = providers.findIndex(p => p.source === provider.source);
  if (existing >= 0) providers[existing] = provider;
  else providers.push(provider);
}

export function getTimelineProviders(): TimelineProvider[] {
  return [...providers];
}
```

**Step 3: Implement useTimeline**

```typescript
// src/modules/agenda/hooks/useTimeline.ts
import { useState, useEffect, useMemo } from 'react';
import type { TimelineEvent, DateRange } from '../types';
import { fetchCalendarEvents } from '../services/calendarEventService';
import { getTimelineProviders } from '../providers/registry';
import { supabase } from '@/services/supabaseClient';

export function useTimeline(userId: string, range: DateRange) {
  // 1. Fetch work_items with scheduled_time in range
  // 2. Fetch calendar_events in range
  // 3. Fetch from all registered providers
  // 4. Merge + sort chronologically
  // 5. Return { events: TimelineEvent[], isLoading, error, refresh }
}
```

**Step 4: Run test, make it pass**

**Step 5: Integrate into AgendaPageShell**

Replace individual data fetching with `useTimeline()` in the timeline/calendar views.

**Step 6: Verify build**

Run: `npm run build && npm run typecheck`

**Step 7: Commit**

```bash
git add src/modules/agenda/hooks/useTimeline.ts src/modules/agenda/providers/
git commit -m "feat(agenda): useTimeline hook with provider registry for temporal aggregation"
```

---

### Task 9: RecurrenceEditor component + useRecurrence hook

**Files:**
- Create: `src/modules/agenda/components/editors/RecurrenceEditor.tsx`
- Create: `src/modules/agenda/hooks/useRecurrence.ts`
- Reference: `src/modules/agenda/services/taskRecurrenceService.ts` (has `RRULE_PRESETS`, `patternToRRuleString`, `describeRRuleInPortuguese`)

**Step 1: Write failing test**

Test that RecurrenceEditor generates correct RRULE strings for presets and custom rules.

**Step 2: Create useRecurrence hook**

Manages recurrence state: frequency, interval, days, endCondition. Outputs RRULE string and Portuguese description.

**Step 3: Build RecurrenceEditor UI**

- Preset buttons: Diário, Semanal, Mensal, Dias úteis, Personalizado
- Custom mode: frequency select, interval input, day checkboxes, end condition
- Preview text using `describeRRuleInPortuguese()`
- Ceramic styling

**Step 4: Integrate into TaskEditModal**

Add RecurrenceEditor section to the existing task edit modal, bound to `recurrence_rule` field.

**Step 5: Verify build + visual check**

Run: `npm run build && npm run typecheck`

**Step 6: Commit**

```bash
git add src/modules/agenda/components/editors/RecurrenceEditor.tsx src/modules/agenda/hooks/useRecurrence.ts
git commit -m "feat(agenda): recurrence editor with RRULE presets and custom mode"
```

---

### Task 10: Time Blocking UI + useTimeBlocking hook

**Files:**
- Create: `src/modules/agenda/components/calendar/TimeBlockSlot.tsx`
- Create: `src/modules/agenda/hooks/useTimeBlocking.ts`
- Modify: `src/modules/agenda/components/views/TimelineView.tsx`

**Step 1: Write failing test**

Test that dragging a task onto a time slot creates a TimeBlock (sets scheduled_time + estimated_duration).

**Step 2: Create useTimeBlocking hook**

Manages drag-to-schedule: snaps to 15-min slots, updates work_item, visual feedback.

**Step 3: Build TimeBlockSlot component**

Visual block in the DailyTimeline. Shows task title, duration, color-coded by source (user task vs external event).

**Step 4: Integrate DnD into TimelineView**

- Tasks from sidebar can be dragged onto timeline slots
- Drop creates scheduled_time + estimated_duration on the work_item
- External calendar_events are read-only (distinct visual: dashed border, muted color)

**Step 5: Verify build + manual test**

Run: `npm run build && npm run typecheck`
Test: drag a task onto the timeline, verify it gets scheduled

**Step 6: Commit**

```bash
git add src/modules/agenda/components/calendar/TimeBlockSlot.tsx src/modules/agenda/hooks/useTimeBlocking.ts
git commit -m "feat(agenda): time blocking UI with drag-to-schedule"
```

---

### Task 11: Google Calendar → calendar_events sync adapter

**Files:**
- Create: `src/modules/agenda/services/syncAdapters/types.ts`
- Create: `src/modules/agenda/services/syncAdapters/googleCalendarAdapter.ts`
- Modify: `src/modules/agenda/hooks/useGoogleCalendarEvents.ts`

**Step 1: Write failing test**

Test that Google Calendar events are persisted to calendar_events table with `source: 'google'`.

**Step 2: Create CalendarSyncAdapter interface**

```typescript
// src/modules/agenda/services/syncAdapters/types.ts
import type { CalendarEvent } from '../../types';

export interface CalendarSyncAdapter {
  source: string;
  fetchAndSync(userId: string): Promise<CalendarEvent[]>;
  pushToExternal?(event: CalendarEvent): Promise<void>;
}
```

**Step 3: Implement googleCalendarAdapter**

Wraps existing `googleCalendarService.ts`. On sync:
1. Fetch events from Google Calendar API
2. Upsert into `calendar_events` table (source: 'google', external_id: Google event ID)
3. Return persisted events

**Step 4: Update useGoogleCalendarEvents**

Instead of returning in-memory Google events, sync to DB first then query from `calendar_events`.

**Step 5: Verify build + test sync flow**

Run: `npm run build && npm run typecheck`
Manual: Connect Google Calendar, verify events appear in calendar_events table

**Step 6: Commit**

```bash
git add src/modules/agenda/services/syncAdapters/
git commit -m "feat(agenda): Google Calendar sync adapter persisting to calendar_events"
```

---

### Task 12: Cross-module timeline providers (Flux, Finance, Studio)

**Files:**
- Create: `src/modules/agenda/providers/fluxProvider.ts`
- Create: `src/modules/agenda/providers/financeProvider.ts`
- Create: `src/modules/agenda/providers/studioProvider.ts`
- Modify: App initialization to register providers

**Step 1: Write failing tests for each provider**

Test that each provider transforms module data into TimelineEvent[] correctly.

**Step 2: Implement fluxProvider**

Wraps existing `useFluxAgendaEvents` logic as a TimelineProvider. Fetches workout_blocks and transforms to TimelineEvent[].

**Step 3: Implement financeProvider**

Queries `finance_transactions` WHERE `due_date` in range. Transforms to timeline reminder events.

**Step 4: Implement studioProvider**

Queries `podcast_episodes` WHERE `scheduled_date` in range. Transforms to timeline recording/editing events.

**Step 5: Register providers at app startup**

```typescript
// In app initialization (e.g., App.tsx or agenda module init)
import { registerTimelineProvider } from '@/modules/agenda/providers/registry';
import { fluxProvider } from '@/modules/agenda/providers/fluxProvider';
import { financeProvider } from '@/modules/agenda/providers/financeProvider';
import { studioProvider } from '@/modules/agenda/providers/studioProvider';

registerTimelineProvider(fluxProvider);
registerTimelineProvider(financeProvider);
registerTimelineProvider(studioProvider);
```

**Step 6: Verify build + timeline shows cross-module events**

Run: `npm run build && npm run typecheck`

**Step 7: Commit**

```bash
git add src/modules/agenda/providers/
git commit -m "feat(agenda): cross-module timeline providers for Flux, Finance, Studio"
```

---

### Task 13: Routine Templates system

**Files:**
- Create: `src/modules/agenda/components/editors/TemplateSelector.tsx`
- Create: `src/modules/agenda/services/templateService.ts`
- Create: `src/modules/agenda/hooks/useTemplates.ts`

**Step 1: Write failing test**

Test that applying a template creates work_items with correct recurrence rules.

**Step 2: Define template structure**

```typescript
interface RoutineTemplate {
  id: string;
  name: string;
  icon: string;
  items: Array<{
    title: string;
    scheduledTime: string;       // "07:00"
    estimatedDuration: number;   // minutes
    recurrenceRule: string;      // RRULE
    category?: string;
  }>;
  isSystem: boolean;
}
```

**Step 3: Implement templateService**

- `getSystemTemplates()` — returns built-in templates (Rotina Matinal, Dia de Trabalho)
- `getUserTemplates(userId)` — returns custom templates (stored in user_preferences or dedicated table)
- `applyTemplate(userId, templateId)` — creates work_items with recurrence

**Step 4: Build TemplateSelector UI**

Ceramic-styled modal/sheet showing available templates. Each template shows name, icon, list of items. "Aplicar" button creates all work_items.

**Step 5: Integrate into AgendaPageShell**

Add "Templates" button/access point in the Agenda page (e.g., in QuickAdd or as a fab action).

**Step 6: Verify build**

Run: `npm run build && npm run typecheck`

**Step 7: Commit**

```bash
git add src/modules/agenda/components/editors/TemplateSelector.tsx src/modules/agenda/services/templateService.ts
git commit -m "feat(agenda): routine templates with presets and custom creation"
```

---

## Verification Checkpoint

After all tasks complete:

```bash
npm run build        # Must pass with 0 errors
npm run typecheck    # Must pass with 0 errors
npm run test         # Must pass with 0 failures
npm run dev          # Manual: verify all 5 modes, DnD, sync, providers
```

## Sprint Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Foundation (1-6) | Module structure, migration, decomposition, DB, tab rename | Zero new features, identical behavior |
| Features (7-13) | Enhanced cards, timeline, recurrence, time blocking, sync, providers, templates | New functionality |

**Total:** 13 tasks across 2 phases.
**Estimated sessions:** 3-5 (depending on complexity of DnD/sync work).
