/**
 * WeeklyGrid - 7-column grid (Monday to Sunday) with Framer Motion DnD
 *
 * Ceramic Renaissance design: magnetic snap, spring physics, generous spacing.
 * Supports external template drops + internal reorder between days.
 * Displays Google Calendar busy slots as overlay blocks.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, type PanInfo } from 'framer-motion';
import { Plus, Calendar, GripVertical } from 'lucide-react';
import {
  springElevation,
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

interface WeeklyGridProps {
  weekNumber: number;
  workouts: WeekWorkout[];
  calendarEvents?: BusySlot[];
  onWorkoutClick?: (workoutId: string) => void;
  onDropWorkout?: (dayOfWeek: number, templateData: string) => void;
  onReorderWorkout?: (workoutId: string, fromDay: number, toDay: number) => void;
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

const MODALITY_BORDER_COLORS: Record<WeekWorkout['modality'], string> = {
  swimming: 'border-l-blue-400',
  running: 'border-l-orange-400',
  cycling: 'border-l-emerald-400',
  strength: 'border-l-purple-400',
};

const INTENSITY_DOTS: Record<WeekWorkout['intensity'], string> = {
  low: 'bg-[#6B7B5C]',       // ceramic-success / sage
  medium: 'bg-amber-500',     // amber
  high: 'bg-[#9B4D3A]',      // ceramic-error / terracotta
};

const PHASE_LABEL = (weekNumber: number): string => {
  if (weekNumber <= 4) return 'Base Aerobica';
  if (weekNumber <= 8) return 'Intensidade Moderada';
  return 'Alta Performance';
};

// ============================================
// Loading Skeleton
// ============================================

const WeeklyGridSkeleton: React.FC = () => (
  <div className="flex-1 flex flex-col h-full bg-ceramic-base">
    <div className="p-6 border-b border-ceramic-text-secondary/10">
      <div className="h-6 w-48 bg-ceramic-text-secondary/10 rounded-lg animate-pulse" />
    </div>
    <div className="flex-1 flex gap-4 p-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex flex-col w-48 gap-3">
          <div className="h-14 bg-ceramic-text-secondary/8 rounded-[20px] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="flex-1 min-h-[300px] bg-ceramic-text-secondary/5 rounded-[20px] animate-pulse" style={{ animationDelay: `${i * 60 + 30}ms` }} />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// BusySlot Display Components
// ============================================

interface BusySlotBlockProps {
  slot: BusySlot;
}

const BusySlotBlock: React.FC<BusySlotBlockProps> = ({ slot }) => {
  const isCoach = slot.source === 'coach';

  if (slot.isAllDay) {
    return (
      <div
        className={`px-2 py-1 rounded-lg text-[10px] font-medium truncate ${
          isCoach
            ? 'bg-[#7B8FA2]/10 text-[#5F7185] border border-[#7B8FA2]/20'
            : 'bg-[#C4883A]/10 text-[#A06B2E] border border-[#C4883A]/20'
        }`}
      >
        {slot.title}
      </div>
    );
  }

  return (
    <div
      className={`relative px-2 py-1.5 rounded-lg text-[10px] overflow-hidden ${
        isCoach
          ? 'bg-[#7B8FA2]/8 border border-[#7B8FA2]/15'
          : 'bg-[#C4883A]/8 border border-[#C4883A]/15'
      }`}
      style={{
        backgroundImage: `repeating-linear-gradient(
          135deg,
          transparent,
          transparent 4px,
          ${isCoach ? 'rgba(123,143,162,0.06)' : 'rgba(196,136,58,0.06)'} 4px,
          ${isCoach ? 'rgba(123,143,162,0.06)' : 'rgba(196,136,58,0.06)'} 8px
        )`,
      }}
    >
      <span className={`font-medium ${isCoach ? 'text-[#5F7185]' : 'text-[#A06B2E]'}`}>
        {slot.startTime}–{slot.endTime}
      </span>
      <p className="text-ceramic-text-secondary truncate mt-0.5">{slot.title}</p>
    </div>
  );
};

// ============================================
// Workout Card with Framer Motion
// ============================================

interface WorkoutCardProps {
  workout: WeekWorkout;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (info: PanInfo) => void;
  isDragging?: boolean;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  return (
    <motion.div
      layout
      layoutId={`workout-${workout.id}`}
      drag
      dragSnapToOrigin
      dragElastic={0.15}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={(_e, info) => {
        onDragEnd?.(info);
      }}
      onClick={(e) => {
        // Only fire click if not dragging
        if (Math.abs(dragX.get()) < 5 && Math.abs(dragY.get()) < 5) {
          onClick?.();
        }
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        scale: 1,
        zIndex: isDragging ? 50 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02, transition: springHover }}
      whileDrag={{
        scale: 1.05,
        boxShadow: '6px 6px 20px rgba(163, 158, 145, 0.3), -4px -4px 16px rgba(255, 255, 255, 0.9)',
        cursor: 'grabbing',
        zIndex: 50,
      }}
      transition={springElevation}
      className={`group relative flex flex-col gap-1.5 rounded-[16px] border-l-[3px] ${MODALITY_BORDER_COLORS[workout.modality]} bg-ceramic-base p-3 cursor-grab active:cursor-grabbing`}
      style={{
        boxShadow: '3px 3px 8px rgba(163, 158, 145, 0.15), -3px -3px 8px rgba(255, 255, 255, 0.9)',
        x: dragX,
        y: dragY,
      }}
    >
      {/* Grip + Type */}
      <div className="flex items-center justify-between">
        {workout.type && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-ceramic-text-tertiary">
            {workout.type}
          </span>
        )}
        <GripVertical
          size={12}
          className="text-ceramic-text-tertiary/40 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Name */}
      <h5 className="text-xs font-semibold text-ceramic-text-primary leading-tight line-clamp-2">
        {workout.name}
      </h5>

      {/* Duration + Intensity dot */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ceramic-text-secondary font-medium">
          {workout.duration} min
        </span>
        <span className={`w-2 h-2 rounded-full ${INTENSITY_DOTS[workout.intensity]}`} />
      </div>
    </motion.div>
  );
};

// ============================================
// Day Column with Drop Zone
// ============================================

interface DayColumnProps {
  day: typeof WEEKDAYS[number];
  date: string;
  workouts: WeekWorkout[];
  busySlots: BusySlot[];
  totalDuration: number;
  highlightedDay: number | null;
  onWorkoutClick?: (workoutId: string) => void;
  onDrop: (templateData: string) => void;
  onReorder: (workoutId: string, targetDay: number) => void;
  onDragOverDay: (dayNumber: number) => void;
  onDragLeaveDay: () => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  day,
  date,
  workouts,
  busySlots,
  totalDuration,
  highlightedDay,
  onWorkoutClick,
  onDrop,
  onReorder,
  onDragOverDay,
  onDragLeaveDay,
}) => {
  const isHighlighted = highlightedDay === day.number;

  // HTML5 DnD handlers for external template drops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    onDragOverDay(day.number);
  };

  const handleDragLeave = () => {
    onDragLeaveDay();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeaveDay();
    const templateData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('templateId');
    if (templateData) {
      onDrop(templateData);
    }
  };

  const allDaySlots = busySlots.filter((s) => s.isAllDay);
  const timedSlots = busySlots.filter((s) => !s.isAllDay);

  return (
    <div
      className="flex flex-col w-52 flex-shrink-0"
      data-day={day.number}
    >
      {/* Day Header */}
      <motion.div
        className="rounded-[16px] p-3 mb-3"
        style={{
          boxShadow: '3px 3px 8px rgba(163, 158, 145, 0.12), -3px -3px 8px rgba(255, 255, 255, 0.9)',
          background: '#F0EFE9',
        }}
        variants={staggerItem}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-ceramic-text-primary">{day.short}</span>
          {date && (
            <span className="text-[10px] text-ceramic-text-secondary font-medium">{date}</span>
          )}
        </div>
        {totalDuration > 0 && (
          <div className="text-[11px] text-ceramic-text-secondary font-medium">
            {totalDuration} min total
          </div>
        )}
      </motion.div>

      {/* All-day events banner */}
      {allDaySlots.length > 0 && (
        <div className="space-y-1 mb-2">
          {allDaySlots.map((slot, idx) => (
            <BusySlotBlock key={`allday-${idx}`} slot={slot} />
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 min-h-[360px] rounded-[20px] border-2 transition-all duration-300 ${
          isHighlighted
            ? 'border-[#7B8FA2]/40 bg-[#7B8FA2]/5 border-dashed'
            : workouts.length === 0
            ? 'border-ceramic-text-secondary/10 border-dashed bg-ceramic-text-secondary/3'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="p-2 space-y-2">
          {/* Timed calendar busy slots */}
          {timedSlots.map((slot, idx) => (
            <BusySlotBlock key={`timed-${idx}`} slot={slot} />
          ))}

          {/* Workouts */}
          <AnimatePresence mode="popLayout">
            {workouts.length === 0 && timedSlots.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-28 text-center"
              >
                <Plus className="w-5 h-5 text-ceramic-text-tertiary/40 mb-1" />
                <p className="text-[10px] text-ceramic-text-tertiary font-medium">
                  Arraste um treino
                </p>
              </motion.div>
            ) : (
              workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onClick={() => onWorkoutClick?.(workout.id)}
                  onDragEnd={(info) => {
                    // The parent handles determining which column this was dropped on
                    onReorder(workout.id, day.number);
                  }}
                />
              ))
            )}
          </AnimatePresence>
        </div>
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
  onDropWorkout,
  onReorderWorkout,
  startDate,
  isLoading = false,
}) => {
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);

  const getDayDate = useCallback(
    (dayOfWeek: number): string => {
      if (!startDate) return '';
      const date = new Date(startDate);
      date.setDate(date.getDate() + (dayOfWeek - 1));
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    },
    [startDate]
  );

  // Group calendar events by day
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
        className="p-5 border-b border-ceramic-text-secondary/10"
        style={{ background: '#F0EFE9' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-[14px]"
            style={{
              boxShadow: 'inset 3px 3px 6px rgba(163, 158, 145, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
            }}
          >
            <Calendar className="w-5 h-5 text-[#7B8FA2]" />
          </div>
          <div>
            <p className="text-[11px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Semana {weekNumber}
            </p>
            <h2 className="text-xl font-bold text-ceramic-text-primary">
              {PHASE_LABEL(weekNumber)}
            </h2>
          </div>
        </div>
      </div>

      {/* 7-Column Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <motion.div
          className="flex gap-4 p-6 min-w-max"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {WEEKDAYS.map((day) => {
            const dayWorkouts = workouts.filter((w) => w.day_of_week === day.number);
            const dayEvents = eventsByDay[day.number] || [];
            const totalDuration = dayWorkouts.reduce((sum, w) => sum + w.duration, 0);

            return (
              <DayColumn
                key={day.number}
                day={day}
                date={getDayDate(day.number)}
                workouts={dayWorkouts}
                busySlots={dayEvents}
                totalDuration={totalDuration}
                highlightedDay={highlightedDay}
                onWorkoutClick={onWorkoutClick}
                onDrop={(templateData) => onDropWorkout?.(day.number, templateData)}
                onReorder={(workoutId, fromDay) => {
                  // For Framer Motion drag, we need to determine target from pointer position
                  // The parent's pointer tracking handles this
                  onReorderWorkout?.(workoutId, fromDay, day.number);
                }}
                onDragOverDay={setHighlightedDay}
                onDragLeaveDay={() => setHighlightedDay(null)}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Footer Stats */}
      <motion.div
        className="p-5 border-t border-ceramic-text-secondary/10"
        style={{ background: '#F0EFE9' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="text-ceramic-text-secondary font-medium">
            {workouts.length} treino(s) na semana
          </span>
          <span className="text-ceramic-text-secondary">
            Volume total:{' '}
            <span className="font-bold text-ceramic-text-primary">{totalVolume} min</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
};
