/**
 * MicrocycleGrid - 4-week overview component for the Flux Canvas
 *
 * Displays 4 weeks in compact horizontal strips with 7 mini-columns each.
 * Workouts shown as small pills colored by modality.
 * Calendar busy slots shown as striped blocks (same pattern as WeeklyGrid).
 * Ceramic Renaissance design with Framer Motion animations.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import {
  springHover,
  staggerContainer,
  staggerItem,
} from '@/lib/animations/ceramic-motion';

// ============================================
// Types
// ============================================

export interface WeekWorkout {
  id: string;
  day_of_week: number; // 1 (Monday) to 7 (Sunday)
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

interface MicrocycleGridProps {
  microcycle: {
    id: string;
    title: string;
    start_date: string;
    focus: string;
  };
  workoutsByWeek: Record<number, WeekWorkout[]>; // week 1-4 -> workouts
  calendarEvents?: BusySlot[];
  currentWeek: number; // Which week is "active" (1-4)
  startWeekOffset?: number; // Absolute week number of first week (for periodization labels)
  onWorkoutClick?: (workoutId: string) => void;
  onDropWorkout?: (weekNumber: number, dayOfWeek: number, templateData: string) => void;
  onWeekClick?: (weekNumber: number) => void;
  isLoading?: boolean;
}

// ============================================
// Constants
// ============================================

const WEEKDAYS_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;

const MODALITY_ICONS: Record<string, string> = {
  swimming: '\u{1F3CA}',
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  strength: '\u{1F4AA}',
};

/**
 * Periodization context helper.
 * Business rules: Microciclo = 1 week, Mesociclo = 4 weeks, Macrociclo = 12 weeks
 * Given an absolute week number (1-based from training start), returns context labels.
 */
function getPeriodizationLabel(absoluteWeek: number): string {
  const mesocycleNum = Math.ceil(absoluteWeek / 4);
  const weekInMesocycle = ((absoluteWeek - 1) % 4) + 1;
  const macrocycleNum = Math.ceil(absoluteWeek / 12);
  return `Semana ${weekInMesocycle} / Mesociclo ${mesocycleNum}`;
}

const MODALITY_PILL_STYLES: Record<WeekWorkout['modality'], { bg: string; text: string }> = {
  swimming: { bg: 'rgba(96,165,250,0.15)', text: '#1e3a5f' },
  running: { bg: 'rgba(251,146,60,0.15)', text: '#7c2d12' },
  cycling: { bg: 'rgba(52,211,153,0.15)', text: '#064e3b' },
  strength: { bg: 'rgba(192,132,252,0.15)', text: '#581c87' },
};

// ============================================
// Loading Skeleton
// ============================================

const MicrocycleGridSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="h-28 bg-ceramic-text-secondary/8 rounded-[20px] animate-pulse"
        style={{ animationDelay: `${i * 60}ms` }}
      />
    ))}
    <p className="text-ceramic-text-secondary text-sm font-light text-center mt-4">
      Preparando os treinos...
    </p>
  </div>
);

// ============================================
// Mini Busy Slot (compact version)
// ============================================

interface MiniBusySlotProps {
  slot: BusySlot;
}

const MiniBusySlot: React.FC<MiniBusySlotProps> = ({ slot }) => {
  const isCoach = slot.source === 'coach';

  return (
    <div
      className={`h-1.5 w-full rounded-full ${
        isCoach ? 'bg-[#7B8FA2]/25' : 'bg-[#C4883A]/25'
      }`}
      title={`${slot.title} (${slot.startTime}–${slot.endTime})`}
      style={{
        backgroundImage: `repeating-linear-gradient(
          90deg,
          transparent 0px,
          transparent 3px,
          ${isCoach ? 'rgba(123,143,162,0.15)' : 'rgba(196,136,58,0.15)'} 3px,
          ${isCoach ? 'rgba(123,143,162,0.15)' : 'rgba(196,136,58,0.15)'} 6px
        )`,
      }}
    />
  );
};

// ============================================
// Workout Pill (compact card for microcycle view)
// ============================================

interface WorkoutPillProps {
  workout: WeekWorkout;
  onClick?: () => void;
}

const WorkoutPill: React.FC<WorkoutPillProps> = ({ workout, onClick }) => {
  const style = MODALITY_PILL_STYLES[workout.modality];
  const icon = MODALITY_ICONS[workout.modality] || '\u{1F3CB}\u{FE0F}';

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left px-1.5 py-1 rounded-lg text-[9px] font-semibold truncate"
      whileHover={{ scale: 1.03, transition: springHover }}
      title={`${workout.name} - ${workout.duration}min`}
      style={{
        background: style.bg,
        color: style.text,
      }}
    >
      {icon} {workout.name} <span className="opacity-70">{workout.duration}&prime;</span>
    </motion.button>
  );
};

// ============================================
// Mini Day Cell (single day within a week strip)
// ============================================

interface MiniDayCellProps {
  dayOfWeek: number;
  workouts: WeekWorkout[];
  busySlots: BusySlot[];
  weekNumber: number;
  onWorkoutClick?: (workoutId: string) => void;
  onDrop?: (templateData: string) => void;
}

const MiniDayCell: React.FC<MiniDayCellProps> = ({
  workouts,
  busySlots,
  onWorkoutClick,
  onDrop,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const templateData =
      e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('templateId');
    if (templateData) {
      onDrop?.(templateData);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex-1 min-w-0 rounded-xl p-1 space-y-0.5 transition-colors duration-200 ${
        workouts.length === 0 && busySlots.length === 0
          ? 'bg-ceramic-text-secondary/3'
          : 'bg-transparent'
      }`}
      style={{
        boxShadow:
          workouts.length === 0 && busySlots.length === 0
            ? 'inset 2px 2px 4px rgba(163, 158, 145, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.8)'
            : 'none',
      }}
    >
      {/* Busy slots */}
      {busySlots.map((slot, idx) => (
        <MiniBusySlot key={`busy-${idx}`} slot={slot} />
      ))}

      {/* Workout pills */}
      {workouts.map((workout) => (
        <WorkoutPill
          key={workout.id}
          workout={workout}
          onClick={() => onWorkoutClick?.(workout.id)}
        />
      ))}
    </div>
  );
};

// ============================================
// Week Strip (single week row in the microcycle)
// ============================================

interface WeekStripProps {
  weekNumber: number;
  absoluteWeek?: number; // Absolute week number for periodization labels
  workouts: WeekWorkout[];
  calendarEvents: BusySlot[];
  isCurrent: boolean;
  onWorkoutClick?: (workoutId: string) => void;
  onDropWorkout?: (dayOfWeek: number, templateData: string) => void;
  onWeekClick?: () => void;
}

const WeekStrip: React.FC<WeekStripProps> = ({
  weekNumber,
  absoluteWeek,
  workouts,
  calendarEvents,
  isCurrent,
  onWorkoutClick,
  onDropWorkout,
  onWeekClick,
}) => {
  const workoutsByDay = useMemo(() => {
    const map: Record<number, WeekWorkout[]> = {};
    for (let d = 1; d <= 7; d++) map[d] = [];
    for (const w of workouts) {
      if (map[w.day_of_week]) {
        map[w.day_of_week].push(w);
      }
    }
    return map;
  }, [workouts]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, BusySlot[]> = {};
    for (let d = 1; d <= 7; d++) map[d] = [];
    for (const evt of calendarEvents) {
      if (map[evt.dayOfWeek]) {
        map[evt.dayOfWeek].push(evt);
      }
    }
    return map;
  }, [calendarEvents]);

  const totalDuration = useMemo(
    () => workouts.reduce((sum, w) => sum + w.duration, 0),
    [workouts]
  );

  return (
    <motion.div
      variants={staggerItem}
      className={`group rounded-[20px] p-4 transition-all duration-300 cursor-pointer ${
        isCurrent
          ? 'ring-2 ring-[#7B8FA2]/40 ring-offset-2 ring-offset-ceramic-base'
          : ''
      }`}
      style={{
        background: '#F0EFE9',
        boxShadow:
          '4px 4px 10px rgba(163, 158, 145, 0.15), -4px -4px 10px rgba(255, 255, 255, 0.9)',
      }}
      onClick={onWeekClick}
      whileHover={{ scale: 1.01, transition: springHover }}
    >
      {/* Week Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Semana {weekNumber}
          </h3>
          {absoluteWeek && (
            <span className="text-[9px] font-medium text-ceramic-text-tertiary">
              ({getPeriodizationLabel(absoluteWeek)})
            </span>
          )}
          {isCurrent && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#7B8FA2]/15 text-[9px] font-bold text-[#5F7185] uppercase">
              Atual
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-ceramic-text-secondary font-medium">
            {workouts.length} treino(s) | {totalDuration} min
          </span>
          <span className="text-[10px] text-ceramic-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Eye size={10} />
            Ver semana
          </span>
        </div>
      </div>

      {/* Day Headers */}
      <div className="flex gap-1.5 mb-1.5">
        {WEEKDAYS_SHORT.map((label, idx) => (
          <div key={idx} className="flex-1 min-w-0 text-center">
            <span className="text-[9px] font-bold text-ceramic-text-tertiary uppercase">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="flex gap-1.5 min-h-[48px]">
        {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => (
          <MiniDayCell
            key={dayNum}
            dayOfWeek={dayNum}
            weekNumber={weekNumber}
            workouts={workoutsByDay[dayNum]}
            busySlots={eventsByDay[dayNum]}
            onWorkoutClick={onWorkoutClick}
            onDrop={(data) => onDropWorkout?.(dayNum, data)}
          />
        ))}
      </div>
    </motion.div>
  );
};

// ============================================
// Main MicrocycleGrid Component
// ============================================

export const MicrocycleGrid: React.FC<MicrocycleGridProps> = ({
  microcycle,
  workoutsByWeek,
  calendarEvents = [],
  currentWeek,
  startWeekOffset = 1,
  onWorkoutClick,
  onDropWorkout,
  onWeekClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return <MicrocycleGridSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Microcycle Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
            Resumo do Mes
          </p>
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            {microcycle.title}
          </h2>
          {microcycle.focus && (
            <p className="text-xs text-ceramic-text-tertiary mt-0.5">
              Foco: {microcycle.focus}
            </p>
          )}
        </div>
      </div>

      {/* 4 Week Strips */}
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {[1, 2, 3, 4].map((weekNum) => (
          <WeekStrip
            key={weekNum}
            weekNumber={weekNum}
            absoluteWeek={startWeekOffset + weekNum - 1}
            workouts={workoutsByWeek[weekNum] || []}
            calendarEvents={calendarEvents}
            isCurrent={weekNum === currentWeek}
            onWorkoutClick={onWorkoutClick}
            onDropWorkout={(dayOfWeek, templateData) =>
              onDropWorkout?.(weekNum, dayOfWeek, templateData)
            }
            onWeekClick={() => onWeekClick?.(weekNum)}
          />
        ))}
      </motion.div>
    </div>
  );
};
