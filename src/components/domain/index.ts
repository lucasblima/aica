/**
 * Domain-Specific Components - Business logic components
 *
 * Components that implement specific business domain logic (task management,
 * priority matrix, etc.) that could be used across modules but are tightly
 * coupled to specific business domains.
 *
 * NOTE: Agenda-related components have been migrated to src/modules/agenda/components/.
 * Re-exports below maintain backward compatibility.
 */

// --- Migrated to @/modules/agenda/components/ (re-exports for backward compat) ---
export { AgendaModeToggle } from '@/modules/agenda/components/shared/ModeToggle';
export type { AgendaMode } from '@/modules/agenda/components/shared/ModeToggle';
export { PriorityMatrix } from '@/modules/agenda/components/views/MatrixView';
export { SwipeableTaskCard } from '@/modules/agenda/components/cards/TaskCard';
export { TaskCreationQuickAdd } from '@/modules/agenda/components/editors/QuickAdd';
export { TaskEditModal } from '@/modules/agenda/components/editors/TaskEditModal';
export { CompletedTasksSection } from '@/modules/agenda/components/shared/CompletedSection';
export { TaskListView } from '@/modules/agenda/components/views/ListView';
export { TaskKanbanView } from '@/modules/agenda/components/views/KanbanView';
export { TaskFilterBar } from '@/modules/agenda/components/shared/FilterBar';

// --- Still in this directory ---
export { EmptyQuadrantState } from './EmptyQuadrantState';
export { TaskBottomSheet } from './TaskBottomSheet';
export { TaskEditDrawer } from './TaskEditDrawer';
export { RecurrenceChip } from './RecurrenceChip';
