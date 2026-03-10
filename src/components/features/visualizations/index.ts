/**
 * Visualizations — Shared data visualization components
 *
 * Reusable chart and visualization components used across AICA modules.
 * These components match the landing page demo style for consistency
 * between marketing and in-app experiences.
 */

export { WeeklyBlocks } from './WeeklyBlocks';
export type { WeeklyDay, WeeklyExercise, WeeklyBlocksProps } from './WeeklyBlocks';

export { HorizontalTimeline } from './HorizontalTimeline';
export type { TimelinePhase, TimelinePhaseStatus, HorizontalTimelineProps } from './HorizontalTimeline';

export { CircularScore } from './CircularScore';

export { HeatmapGrid } from './HeatmapGrid';
export type { HeatmapDay } from './HeatmapGrid';

// Migrated to @/modules/agenda/components/calendar/ (re-export for backward compat)
export { CalendarGrid } from '@/modules/agenda/components/calendar/MonthGrid';
export type { CalendarEvent } from '@/modules/agenda/components/calendar/MonthGrid';

export { BarChartSimple } from './BarChartSimple';
export type { BarGroup } from './BarChartSimple';

export { NetworkGraph } from './NetworkGraph';
export type { GraphNode, GraphLink } from './NetworkGraph';

export { EisenhowerMatrix } from './EisenhowerMatrix';
export type { MatrixTask } from './EisenhowerMatrix';
