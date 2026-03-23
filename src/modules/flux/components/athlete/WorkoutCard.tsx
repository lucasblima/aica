/**
 * WorkoutCard — Minimalist workout slot card (Jony Ive style)
 *
 * All info visible at a glance: emoji, name, duration,
 * exercise structure, coach notes. No accordion, no inline feedback.
 * Completion toggle removed — treinos cumpridos counts past days.
 */

import {
  Loader2,
} from 'lucide-react';
import { MODALITY_CONFIG } from '../../types';
import { ZONE_CONFIGS } from '../../types/series';
import type {
  ExerciseStructureV2,
  WorkoutSeries,
  IntensityZone,
} from '../../types/series';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface FeedbackData {
  rpe: number;
  duration: number;
  notes: string;
}

export interface WorkoutSlot {
  id: string;
  day_of_week: number;
  week_number: number;
  time_of_day: string | null;
  is_completed: boolean;
  completed_at: string | null;
  athlete_feedback: string | null;
  custom_duration: number | null;
  custom_notes: string | null;
  exercise_structure: Record<string, unknown> | null;
  template: {
    id: string;
    name: string;
    category: string;
    duration: number;
    intensity: string;
  };
  rpe?: number | null;
  completion_data?: {
    rpe_actual?: number;
    duration_actual?: number;
    notes?: string;
  } | null;
}

export interface WorkoutCardProps {
  slot: WorkoutSlot;
  /** @deprecated No longer used — card is always expanded */
  isExpanded?: boolean;
  /** @deprecated No longer used */
  onToggleExpand?: () => void;
  /** @deprecated Completion toggle removed — treinos cumpridos counts past days only */
  onToggleComplete?: (slotId: string, currentlyCompleted: boolean) => void;
  /** @deprecated Feedback handled via AthleteFeedbackView */
  onSubmitFeedback?: (slotId: string, data: FeedbackData) => void;
  /** @deprecated Schedule editing removed from athlete portal */
  onReschedule?: (slotId: string, newDay: number, newTime: string) => void;
  onViewFeedback?: (slotId: string) => void;
  isUpdating: boolean;
  modality: string;
}

// ────────────────────────────────────────────
// Exercise structure helpers
// ────────────────────────────────────────────

function SeriesLine({ series }: { series: WorkoutSeries }) {
  const reps = series.repetitions ?? 1;
  const repsStr = reps > 1 ? `${reps}x` : '';
  const zone =
    'zone' in series ? (series as { zone: IntensityZone }).zone : null;
  const zoneConfig = zone ? ZONE_CONFIGS[zone] : null;

  let workStr = '';
  if ('distance_meters' in series && series.distance_meters) {
    workStr = `${series.distance_meters}m`;
  } else if ('work_value' in series && series.work_value) {
    if (series.work_unit === 'minutes') workStr = `${series.work_value}min`;
    else if (series.work_unit === 'seconds') workStr = `${series.work_value}s`;
    else workStr = `${series.work_value}m`;
  } else if ('reps' in series && series.reps) {
    const load = (series as { load_kg?: number }).load_kg;
    workStr = `${series.reps} rep${load ? ` @ ${load}kg` : ''}`;
  }

  const restMin = series.rest_minutes ?? 0;
  const restSec = series.rest_seconds ?? 0;
  const hasRest = restMin > 0 || restSec > 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      {zone && zoneConfig && (
        <span
          className={`inline-block w-2 h-2 rounded-full ${zoneConfig.bgColor}`}
        />
      )}
      <span className="text-ceramic-text-primary font-medium">
        {repsStr}
        {workStr}
      </span>
      {zone && <span className="text-ceramic-text-secondary">{zone}</span>}
      {hasRest && (
        <span className="text-ceramic-text-secondary">
          (int. {restMin > 0 ? `${restMin}min` : ''}
          {restSec > 0 ? `${restSec}s` : ''})
        </span>
      )}
    </div>
  );
}

function ExerciseStructureDisplay({
  structure,
}: {
  structure: ExerciseStructureV2;
}) {
  if (!structure?.series?.length && !structure?.warmup && !structure?.cooldown) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {structure.warmup && (
        <p className="text-[11px] text-ceramic-text-secondary italic flex items-center gap-1">
          <span>🔥</span> Aq: {structure.warmup}
        </p>
      )}
      {structure.series?.map((s, i) => (
        <SeriesLine key={s.id || i} series={s} />
      ))}
      {structure.cooldown && (
        <p className="text-[11px] text-ceramic-text-secondary italic flex items-center gap-1">
          <span>❄️</span> Des: {structure.cooldown}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// WorkoutCard
// ────────────────────────────────────────────

export function WorkoutCard({
  slot,
  isUpdating,
  modality,
}: WorkoutCardProps) {
  const modalityConfig = MODALITY_CONFIG[modality as keyof typeof MODALITY_CONFIG];
  const emoji = modalityConfig?.icon || '🏋️';
  const structure = slot.exercise_structure
    ? (slot.exercise_structure as unknown as ExerciseStructureV2)
    : null;
  const hasStructure =
    structure && (structure.series?.length > 0 || structure.warmup || structure.cooldown);

  const existingRpe = slot.completion_data?.rpe_actual ?? slot.rpe;

  return (
    <div className="bg-ceramic-base rounded-2xl shadow-sm">
      {/* Header: emoji + name + duration */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        {isUpdating ? (
          <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin flex-shrink-0" />
        ) : (
          <span className="text-base flex-shrink-0">{emoji}</span>
        )}

        <p className="flex-1 min-w-0 text-sm font-semibold truncate text-ceramic-text-primary">
          {slot.template.name}
        </p>

        {existingRpe != null && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              existingRpe <= 3
                ? 'bg-green-500/15 text-green-600'
                : existingRpe <= 6
                ? 'bg-amber-500/15 text-amber-600'
                : existingRpe <= 8
                ? 'bg-orange-500/15 text-orange-600'
                : 'bg-red-500/15 text-red-600'
            }`}
          >
            RPE {existingRpe}
          </span>
        )}
      </div>

      {/* Body: exercise structure (always visible) */}
      {hasStructure && (
        <div className="px-5 pb-3">
          <ExerciseStructureDisplay structure={structure!} />
        </div>
      )}

      {/* Coach notes (always visible) */}
      {slot.custom_notes && (
        <div className="px-5 pb-5">
          <p className="text-xs text-ceramic-text-secondary italic border-l-2 border-amber-400 pl-3">
            {slot.custom_notes}
          </p>
        </div>
      )}

      {/* Bottom padding when no notes/structure */}
      {!hasStructure && !slot.custom_notes && <div className="pb-2" />}
    </div>
  );
}
