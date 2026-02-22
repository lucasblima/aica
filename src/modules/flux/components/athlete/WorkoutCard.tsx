/**
 * WorkoutCard — Expandable accordion card for a single workout slot
 *
 * Collapsed: clean row with completion toggle, emoji, name, duration, chevron.
 * Expanded: exercise structure, coach notes, schedule editor, actions, feedback form.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  CheckCircle,
  Circle,
  Clock,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { MODALITY_CONFIG } from '../../types';
import { ZONE_CONFIGS } from '../../types/series';
import type {
  ExerciseStructureV2,
  WorkoutSeries,
  IntensityZone,
} from '../../types/series';
import { ScheduleEditor } from './ScheduleEditor';

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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onToggleComplete: (slotId: string, currentlyCompleted: boolean) => void;
  onSubmitFeedback: (slotId: string, data: FeedbackData) => void;
  onReschedule: (slotId: string, newDay: number, newTime: string) => void;
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
// RPE helpers
// ────────────────────────────────────────────

function getRpeLabel(rpe: number): string {
  if (rpe <= 3) return 'Leve';
  if (rpe <= 6) return 'Moderado';
  if (rpe <= 8) return 'Intenso';
  return 'Maximo';
}

function getRpeColorClass(rpe: number): string {
  if (rpe <= 3) return 'bg-green-500/20 text-green-600';
  if (rpe <= 6) return 'bg-amber-500/20 text-amber-600';
  if (rpe <= 8) return 'bg-orange-500/20 text-orange-600';
  return 'bg-red-500/20 text-red-600';
}

// ────────────────────────────────────────────
// WorkoutCard
// ────────────────────────────────────────────

export function WorkoutCard({
  slot,
  isExpanded: isExpandedProp,
  onToggleExpand: onToggleExpandProp,
  onToggleComplete,
  onSubmitFeedback,
  onReschedule,
  onViewFeedback,
  isUpdating,
  modality,
}: WorkoutCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = isExpandedProp ?? internalExpanded;
  const onToggleExpand = onToggleExpandProp ?? (() => setInternalExpanded((p) => !p));
  const [showFeedback, setShowFeedback] = useState(false);
  const [rpe, setRpe] = useState<number>(
    slot.completion_data?.rpe_actual ?? slot.rpe ?? 5
  );
  const [duration, setDuration] = useState<number>(
    slot.completion_data?.duration_actual ?? slot.custom_duration ?? slot.template.duration ?? 0
  );
  const [notes, setNotes] = useState<string>(
    slot.completion_data?.notes ?? slot.athlete_feedback ?? ''
  );

  const modalityConfig = MODALITY_CONFIG[modality as keyof typeof MODALITY_CONFIG];
  const emoji = modalityConfig?.icon || '🏋️';
  const prescribedDuration = slot.custom_duration || slot.template.duration;
  const durationDelta = duration - prescribedDuration;

  const structure = slot.exercise_structure
    ? (slot.exercise_structure as unknown as ExerciseStructureV2)
    : null;
  const hasStructure =
    structure && (structure.series?.length > 0 || structure.warmup || structure.cooldown);

  return (
    <div
      className={`bg-ceramic-base rounded-2xl shadow-sm transition-all ${
        slot.is_completed ? 'opacity-60' : ''
      }`}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-4">
        {/* Completion toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(slot.id, slot.is_completed);
          }}
          disabled={isUpdating}
          className="flex-shrink-0"
        >
          {isUpdating ? (
            <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin" />
          ) : slot.is_completed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-ceramic-text-secondary/40" />
          )}
        </button>

        {/* Emoji */}
        <span className="text-base flex-shrink-0">{emoji}</span>

        {/* Name (tappable for expand) */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 text-left"
        >
          <p
            className={`text-sm font-bold truncate ${
              slot.is_completed
                ? 'text-ceramic-text-secondary line-through'
                : 'text-ceramic-text-primary'
            }`}
          >
            {slot.template.name}
          </p>
        </button>

        {/* Time badge */}
        {slot.time_of_day && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {slot.time_of_day.slice(0, 5)}
          </span>
        )}

        {/* Duration pill */}
        <span className="text-[11px] text-ceramic-text-secondary bg-ceramic-cool px-2 py-0.5 rounded-full flex-shrink-0">
          {prescribedDuration}min
        </span>

        {/* Chevron */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-shrink-0 p-1"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
          </motion.div>
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-0">
              {/* Exercise structure */}
              {hasStructure && (
                <div className="border-t border-ceramic-border/50 pt-3 mt-0">
                  <ExerciseStructureDisplay structure={structure!} />
                </div>
              )}

              {/* Coach notes */}
              {slot.custom_notes && (
                <div className="border-t border-ceramic-border/50 pt-3 mt-3">
                  <p className="text-xs text-ceramic-text-secondary italic border-l-2 border-amber-400 pl-3">
                    {slot.custom_notes}
                  </p>
                </div>
              )}

              {/* Schedule editor */}
              <div className="border-t border-ceramic-border/50 pt-3 mt-3">
                <ScheduleEditor
                  currentDay={slot.day_of_week}
                  currentTime={slot.time_of_day}
                  onSave={(newDay, newTime) =>
                    onReschedule(slot.id, newDay, newTime)
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Actions */}
              <div className="border-t border-ceramic-border/50 pt-3 mt-3 flex items-center gap-2">
                {!slot.is_completed ? (
                  <button
                    type="button"
                    onClick={() =>
                      onToggleComplete(slot.id, slot.is_completed)
                    }
                    disabled={isUpdating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Concluir treino
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium">
                      Treino concluido ✓
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onToggleComplete(slot.id, slot.is_completed)
                      }
                      disabled={isUpdating}
                      className="text-xs text-ceramic-text-secondary underline hover:text-ceramic-text-primary"
                    >
                      Desfazer
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowFeedback((prev) => !prev)}
                  className={`flex items-center gap-1 px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                    showFeedback || slot.athlete_feedback
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Feedback
                </button>
              </div>

              {/* Feedback form */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-ceramic-border/50 pt-3 mt-3 space-y-3">
                      {/* RPE slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-ceramic-text-primary">
                            Esforco percebido (RPE)
                          </label>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRpeColorClass(rpe)}`}
                          >
                            {rpe}/10 — {getRpeLabel(rpe)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={rpe}
                          onChange={(e) => setRpe(Number(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                          style={{
                            background:
                              'linear-gradient(to right, #22c55e 0%, #22c55e 22%, #f59e0b 44%, #f59e0b 55%, #ef4444 77%, #ef4444 100%)',
                          }}
                        />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-ceramic-text-secondary">
                            Leve
                          </span>
                          <span className="text-[10px] text-ceramic-text-secondary">
                            Moderado
                          </span>
                          <span className="text-[10px] text-ceramic-text-secondary">
                            Intenso
                          </span>
                          <span className="text-[10px] text-ceramic-text-secondary">
                            Maximo
                          </span>
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-primary mb-1 block">
                          Duracao real
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={duration || ''}
                            onChange={(e) =>
                              setDuration(Number(e.target.value))
                            }
                            placeholder={String(prescribedDuration)}
                            className="w-20 ceramic-inset px-3 py-1.5 rounded-lg text-sm text-ceramic-text-primary text-center focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                          />
                          <span className="text-xs text-ceramic-text-secondary">
                            min
                          </span>
                          {duration > 0 && durationDelta !== 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                durationDelta > 0
                                  ? 'bg-blue-500/15 text-blue-600'
                                  : 'bg-amber-500/15 text-amber-600'
                              }`}
                            >
                              {durationDelta > 0 ? '+' : ''}
                              {durationDelta}min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Como foi o treino? Sensacoes, dificuldades..."
                        className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                        rows={2}
                      />

                      {/* Save / Cancel */}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFeedback(false)}
                          className="px-3 py-1.5 text-xs text-ceramic-text-secondary hover:bg-ceramic-cool rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSubmitFeedback(slot.id, { rpe, duration, notes });
                            setShowFeedback(false);
                          }}
                          disabled={isUpdating}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
