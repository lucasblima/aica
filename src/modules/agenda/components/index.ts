/**
 * Agenda Module Components — Barrel Export
 *
 * All agenda-related components organized by concern:
 * - views/: List, Kanban, Matrix view modes
 * - cards/: Task card components
 * - shared/: Mode toggle, filter bar, completed section
 * - editors/: Task creation and editing
 * - calendar/: Timeline, daily, weekly, monthly views
 */

// Views
export { TaskListView, TaskKanbanView, PriorityMatrix, AgendaPageShell, TimelineView, CalendarView } from './views';
export type { AgendaPageShellProps, TimelineViewProps, CalendarViewProps } from './views';

// Cards
export { SwipeableTaskCard } from './cards';

// Shared
export { AgendaModeToggle, TaskFilterBar, CompletedTasksSection } from './shared';
export type { AgendaMode } from './shared';

// Editors
export { TaskEditModal, TaskCreationQuickAdd } from './editors';

// Calendar
export { AgendaTimeline, DailyTimeline, CalendarGrid, WeeklyCalendarView } from './calendar';
// NOTE: CalendarEvent type NOT re-exported here to avoid conflict with
// the domain CalendarEvent from types/. Import from ./calendar directly.
