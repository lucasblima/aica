/**
 * WeeklyGrid - Time-based 7-column grid (Monday to Sunday)
 *
 * Ceramic Renaissance design with hourly rows (05:00–23:00).
 * Cards positioned by start_time and sized by duration.
 * Supports drag-and-drop between time slots and days.
 * Google Calendar busy slots shown as overlay blocks.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, GripVertical, Plus, Trash2 } from 'lucide-react';
import { springHover } from '@/lib/animations/ceramic-motion';

// ============================================
// Types
// ============================================

export interface WeekWorkout {
  id: string;
  day_of_week: number; // 1 (Monday) to 7 (Sunday)
  start_time?: string; // "HH:MM" e.g. "09:00"
  name: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  modality: 'swimming' | 'running' | 'cycling' | 'strength';
  type?: string;
  templateId?: string;
}

export interface BusySlot {
  dayOfWeek: number; // 1-7 (Mon-Sun)
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  title: string;
  source: 'coach' | 'athlete';
  isAllDay: boolean;
}

interface WeeklyGridProps {
  weekNumber: number;
  workouts: WeekWorkout[];
  calendarEvents?: BusySlot[];
  onWorkoutClick?: (workoutId: string) => void;
  onWorkoutDelete?: (workoutId: string) => void;
  onEmptySlotClick?: (dayOfWeek: number, startTime: string) => void;
  onDropWorkout?: (dayOfWeek: number, startTime: string, templateData: string) => void;
  onReorderWorkout?: (workoutId: string, fromDay: number, toDay: number, toTime: string) => void;
  startDate?: Date;
  isLoading?: boolean;
}

// ============================================
// Constants
// ============================================

const WEEKDAYS = [
  { number: 1, short: 'SEG', full: 'Segunda' },
  { number: 2, short: 'TER', full: 'Terça' },
  { number: 3, short: 'QUA', full: 'Quarta' },
  { number: 4, short: 'QUI', full: 'Quinta' },
  { number: 5, short: 'SEX', full: 'Sexta' },
  { number: 6, short: 'SAB', full: 'Sabado' },
  { number: 7, short: 'DOM', full: 'Domingo' },
] as const;

const START_HOUR = 5;
const END_HOUR = 23;
const HOUR_HEIGHT = 56; // px per hour
const SNAP_MINUTES = 30;
const MIN_CARD_HEIGHT = 28;
const TIME_COL_WIDTH = 52;

const MODALITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  swimming: { bg: 'rgba(96,165,250,0.12)', border: 'rgb(96,165,250)', text: '#1e3a5f' },
  running:  { bg: 'rgba(251,146,60,0.12)', border: 'rgb(251,146,60)', text: '#7c2d12' },
  cycling:  { bg: 'rgba(52,211,153,0.12)', border: 'rgb(52,211,153)', text: '#064e3b' },
  strength: { bg: 'rgba(192,132,252,0.12)', border: 'rgb(192,132,252)', text: '#581c87' },
};

const INTENSITY_DOTS: Record<string, string> = {
  low: 'bg-[#6B7B5C]',
  medium: 'bg-amber-500',
  high: 'bg-[#9B4D3A]',
};

const INTENSITY_LABELS: Record<string, string> = {
  low: 'Leve',
  medium: 'Moderado',
  high: 'Intenso',
};

const MODALITY_ICONS: Record<string, string> = {
  swimming: '\u{1F3CA}',
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  strength: '\u{1F4AA}',
};

// ============================================
// Time Helpers
// ============================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToY(time: string): number {
  const mins = timeToMinutes(time);
  return ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function yToTime(y: number): string {
  const totalMinutes = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
  const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  const clamped = Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60 + 30, snapped));
  return minutesToTime(clamped);
}

function durationToHeight(duration: number): number {
  return Math.max(MIN_CARD_HEIGHT, (duration / 60) * HOUR_HEIGHT);
}

function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

// ============================================
// Hour labels
// ============================================

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
  const h = START_HOUR + i;
  return `${h.toString().padStart(2, '0')}:00`;
});

const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

// ============================================
// Loading Skeleton
// ============================================

const WeeklyGridSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col h-full bg-ceramic-base">
    <div className="p-6 border-b border-ceramic-text-secondary/10">
      <div className="h-6 w-48 bg-ceramic-text-secondary/10 rounded-lg animate-pulse" />
    </div>
    <div className="flex-1 p-6">
      <div className="h-[500px] bg-ceramic-text-secondary/5 rounded-[20px] animate-pulse" />
    </div>
  </div>
);

// ============================================
// Positioned Workout Card
// ============================================

interface PositionedWorkoutCardProps {
  workout: WeekWorkout;
  onClick?: () => void;
  onDelete?: () => void;
}

const PositionedWorkoutCard = React.forwardRef<HTMLDivElement, PositionedWorkoutCardProps>(
  ({ workout, onClick, onDelete }, ref) => {
  const colors = MODALITY_COLORS[workout.modality] || MODALITY_COLORS.running;
  const icon = MODALITY_ICONS[workout.modality] || '\u{1F3CB}\u{FE0F}';
  const top = workout.start_time ? timeToY(workout.start_time) : 0;
  const height = durationToHeight(workout.duration);
  const endTime = workout.start_time ? addMinutesToTime(workout.start_time, workout.duration) : '';

  return (
    <motion.div
      ref={ref}
      layout
      layoutId={`workout-${workout.id}`}
      data-workout-card
      draggable
      onDragStart={(e: MouseEvent | TouchEvent | PointerEvent) => {
        // Store workout ID for reorder (native HTML5 drag via draggable attr)
        const de = e as unknown as DragEvent;
        if (de.dataTransfer) {
          de.dataTransfer.effectAllowed = 'move';
          de.dataTransfer.setData('workoutReorder', JSON.stringify({
            id: workout.id,
            fromDay: workout.day_of_week,
          }));
        }
      }}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      whileHover={{ scale: 1.01, transition: springHover }}
      className="absolute left-1 right-1 z-10 group rounded-xl border-l-[3px] cursor-grab active:cursor-grabbing overflow-hidden"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        minHeight: `${MIN_CARD_HEIGHT}px`,
        borderLeftColor: colors.border,
        background: colors.bg,
        boxShadow: '2px 2px 6px rgba(163,158,145,0.12), -2px -2px 6px rgba(255,255,255,0.85)',
      }}
    >
      <div className="flex flex-col justify-between h-full px-2 py-1.5">
        <div className="flex items-start justify-between gap-1">
          <h5
            className="text-[11px] font-semibold leading-tight line-clamp-2"
            style={{ color: colors.text }}
          >
            {icon} {workout.name}
          </h5>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-ceramic-error/20"
                title="Remover treino"
              >
                <Trash2 size={9} className="text-ceramic-error" />
              </button>
            )}
            <GripVertical
              size={10}
              className="text-ceramic-text-tertiary/30 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {workout.start_time && (
            <span className="text-[9px] font-medium text-ceramic-text-secondary">
              {workout.start_time}–{endTime}
            </span>
          )}
          <span className="text-[9px] text-ceramic-text-tertiary">{workout.duration}min</span>
          <span className={`w-1.5 h-1.5 rounded-full ${INTENSITY_DOTS[workout.intensity] || ''}`} />
          <span className="text-[8px] font-medium text-ceramic-text-secondary">
            {INTENSITY_LABELS[workout.intensity] || ''}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

PositionedWorkoutCard.displayName = 'PositionedWorkoutCard';

// ============================================
// Positioned Busy Slot
// ============================================

interface PositionedBusySlotProps {
  slot: BusySlot;
}

const PositionedBusySlot: React.FC<PositionedBusySlotProps> = ({ slot }) => {
  if (slot.isAllDay) return null; // All-day handled separately
  const isCoach = slot.source === 'coach';
  const top = timeToY(slot.startTime);
  const startMins = timeToMinutes(slot.startTime);
  const endMins = timeToMinutes(slot.endTime);
  const height = Math.max(MIN_CARD_HEIGHT, ((endMins - startMins) / 60) * HOUR_HEIGHT);

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg text-[9px] overflow-hidden px-1.5 py-1 ${
        isCoach
          ? 'bg-[#7B8FA2]/8 border border-[#7B8FA2]/15'
          : 'bg-[#C4883A]/8 border border-[#C4883A]/15'
      }`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 3px, ${
          isCoach ? 'rgba(123,143,162,0.05)' : 'rgba(196,136,58,0.05)'
        } 3px, ${isCoach ? 'rgba(123,143,162,0.05)' : 'rgba(196,136,58,0.05)'} 6px)`,
      }}
    >
      <span className={`font-medium ${isCoach ? 'text-[#5F7185]' : 'text-[#A06B2E]'}`}>
        {slot.startTime}–{slot.endTime}
      </span>
      <p className="text-ceramic-text-secondary truncate">{slot.title}</p>
    </div>
  );
};

// ============================================
// Day Column (time-based)
// ============================================

interface DayColumnProps {
  dayNumber: number;
  dayLabel: string;
  date: string;
  workouts: WeekWorkout[];
  busySlots: BusySlot[];
  highlightSlot: string | null; // "HH:MM" of highlighted slot
  onDrop: (startTime: string, templateData: string) => void;
  onReorder: (workoutId: string, fromDay: number, startTime: string) => void;
  onWorkoutClick?: (workoutId: string) => void;
  onWorkoutDelete?: (workoutId: string) => void;
  onEmptySlotClick?: (startTime: string) => void;
  onHighlight: (time: string | null) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  dayNumber,
  dayLabel,
  date,
  workouts,
  busySlots,
  highlightSlot,
  onDrop,
  onReorder,
  onWorkoutClick,
  onWorkoutDelete,
  onEmptySlotClick,
  onHighlight,
}) => {
  const columnRef = useRef<HTMLDivElement>(null);

  const getTimeFromEvent = useCallback((e: { clientY: number }): string => {
    if (!columnRef.current) return '09:00';
    const rect = columnRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + columnRef.current.scrollTop;
    return yToTime(Math.max(0, y));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('workoutreorder') ? 'move' : 'copy';
    const time = getTimeFromEvent(e);
    onHighlight(time);
  };

  const handleDragLeave = () => {
    onHighlight(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHighlight(null);
    const time = getTimeFromEvent(e);

    // Check if this is a reorder (internal drag)
    const reorderData = e.dataTransfer.getData('workoutReorder');
    if (reorderData) {
      try {
        const { id, fromDay } = JSON.parse(reorderData);
        onReorder(id, fromDay, time);
        return;
      } catch { /* not reorder */ }
    }

    // External template drop
    const textPlain = e.dataTransfer.getData('text/plain');
    const templateId = e.dataTransfer.getData('templateId');
    const templateData = textPlain || templateId;
    if (templateData) {
      onDrop(time, templateData);
    }
  };

  const allDaySlots = busySlots.filter((s) => s.isAllDay);
  const timedSlots = busySlots.filter((s) => !s.isAllDay);
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);

  return (
    <div className="flex flex-col flex-1 min-w-[120px]">
      {/* Day Header (sticky) */}
      <div
        className="sticky top-0 z-20 rounded-t-xl px-2 py-2 border-b border-ceramic-text-secondary/10"
        style={{ background: '#F0EFE9' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ceramic-text-primary">{dayLabel}</span>
          <span className="text-[9px] text-ceramic-text-secondary font-medium">{date}</span>
        </div>
        {totalDuration > 0 && (
          <span className="text-[9px] text-ceramic-text-tertiary">{totalDuration} min</span>
        )}
        {/* All-day banners */}
        {allDaySlots.map((slot, idx) => (
          <div
            key={`allday-${idx}`}
            className={`mt-1 px-1.5 py-0.5 rounded text-[8px] font-medium truncate ${
              slot.source === 'coach'
                ? 'bg-[#7B8FA2]/10 text-[#5F7185]'
                : 'bg-[#C4883A]/10 text-[#A06B2E]'
            }`}
          >
            {slot.title}
          </div>
        ))}
      </div>

      {/* Time slots area */}
      <div
        ref={columnRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDoubleClick={(e) => {
          // Only trigger if clicking empty space (not on a workout card)
          if ((e.target as HTMLElement).closest('[data-workout-card]')) return;
          const time = getTimeFromEvent(e);
          onEmptySlotClick?.(time);
        }}
        className="relative border-r border-ceramic-text-secondary/5"
        style={{ height: `${TOTAL_HEIGHT}px` }}
      >
        {/* Hour grid lines */}
        {HOURS.map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-ceramic-text-secondary/5"
            style={{ top: `${i * HOUR_HEIGHT}px` }}
          />
        ))}

        {/* Half-hour dashed lines */}
        {HOURS.map((_, i) => (
          <div
            key={`half-${i}`}
            className="absolute left-0 right-0 border-t border-dashed border-ceramic-text-secondary/3"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
          />
        ))}

        {/* Drop highlight */}
        {highlightSlot && (
          <div
            className="absolute left-0 right-0 bg-[#7B8FA2]/10 border border-dashed border-[#7B8FA2]/30 rounded-lg z-5 pointer-events-none"
            style={{
              top: `${timeToY(highlightSlot)}px`,
              height: `${HOUR_HEIGHT}px`,
            }}
          >
            <span className="absolute top-1 left-1.5 text-[9px] font-bold text-[#5F7185]">
              {highlightSlot}
            </span>
          </div>
        )}

        {/* Busy slots */}
        {timedSlots.map((slot, idx) => (
          <PositionedBusySlot key={`busy-${idx}`} slot={slot} />
        ))}

        {/* Workout cards */}
        <AnimatePresence mode="popLayout">
          {workouts.map((workout) => (
            <PositionedWorkoutCard
              key={workout.id}
              workout={workout}
              onClick={() => onWorkoutClick?.(workout.id)}
              onDelete={onWorkoutDelete ? () => onWorkoutDelete(workout.id) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// Main WeeklyGrid Component
// ============================================

export const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  weekNumber,
  workouts,
  calendarEvents = [],
  onWorkoutClick,
  onWorkoutDelete,
  onEmptySlotClick,
  onDropWorkout,
  onReorderWorkout,
  startDate,
  isLoading = false,
}) => {
  const [highlightedSlots, setHighlightedSlots] = useState<Record<number, string | null>>({});

  const getDayDate = useCallback(
    (dayOfWeek: number): string => {
      if (!startDate) return '';
      const date = new Date(startDate);
      date.setDate(date.getDate() + (dayOfWeek - 1));
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    },
    [startDate]
  );

  const eventsByDay = useMemo(() => {
    const map: Record<number, BusySlot[]> = {};
    for (const evt of calendarEvents) {
      if (!map[evt.dayOfWeek]) map[evt.dayOfWeek] = [];
      map[evt.dayOfWeek].push(evt);
    }
    return map;
  }, [calendarEvents]);

  const totalVolume = useMemo(
    () => workouts.reduce((sum, w) => sum + w.duration, 0),
    [workouts]
  );

  if (isLoading) {
    return <WeeklyGridSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-ceramic-base">
      {/* Week Header */}
      <div
        className="px-5 py-3 border-b border-ceramic-text-secondary/10 flex-shrink-0"
        style={{ background: '#F0EFE9' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-[12px]"
              style={{
                boxShadow: 'inset 2px 2px 5px rgba(163,158,145,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)',
              }}
            >
              <Calendar className="w-4 h-4 text-[#7B8FA2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ceramic-text-primary">
                Semana {weekNumber}
                {startDate && (() => {
                  const end = new Date(startDate);
                  end.setDate(end.getDate() + 6);
                  const fmt = (d: Date) =>
                    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  return (
                    <span className="ml-2 text-sm font-medium text-ceramic-text-secondary">
                      {fmt(startDate)} - {fmt(end)}
                    </span>
                  );
                })()}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary">
            <span>{workouts.length} treino(s)</span>
            <span>
              Volume: <span className="font-bold text-ceramic-text-primary">{totalVolume} min</span>
            </span>
          </div>
        </div>
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[800px]">
          {/* Time Ruler */}
          <div
            className="flex-shrink-0 sticky left-0 z-30 bg-ceramic-base border-r border-ceramic-text-secondary/10"
            style={{ width: `${TIME_COL_WIDTH}px` }}
          >
            {/* Spacer for day headers */}
            <div className="sticky top-0 z-30 bg-ceramic-base border-b border-ceramic-text-secondary/10" style={{ height: '48px' }} />
            {/* Hour labels */}
            <div className="relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute right-2 text-[10px] font-medium text-ceramic-text-tertiary -translate-y-1/2"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {hour}
                </div>
              ))}
            </div>
          </div>

          {/* Day Columns */}
          {WEEKDAYS.map((day) => {
            const dayWorkouts = workouts.filter((w) => w.day_of_week === day.number);
            const dayEvents = eventsByDay[day.number] || [];

            return (
              <DayColumn
                key={day.number}
                dayNumber={day.number}
                dayLabel={day.short}
                date={getDayDate(day.number)}
                workouts={dayWorkouts}
                busySlots={dayEvents}
                highlightSlot={highlightedSlots[day.number] || null}
                onDrop={(startTime, templateData) => onDropWorkout?.(day.number, startTime, templateData)}
                onReorder={(workoutId, fromDay, startTime) =>
                  onReorderWorkout?.(workoutId, fromDay, day.number, startTime)
                }
                onWorkoutClick={onWorkoutClick}
                onWorkoutDelete={onWorkoutDelete}
                onEmptySlotClick={onEmptySlotClick ? (time) => onEmptySlotClick(day.number, time) : undefined}
                onHighlight={(time) =>
                  setHighlightedSlots((prev) => ({ ...prev, [day.number]: time }))
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
