/**
 * WeeklyGrid - 7-column grid (Monday to Sunday)
 *
 * Phase 1: Visual mockup (drop zones visual, onDrop with console.log)
 * Displays workout blocks in weekly calendar format.
 */

import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import type { DayData } from '../../types';

export interface WeekWorkout {
  id: string;
  day_of_week: number; // 1 (Segunda) a 7 (Domingo)
  name: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  modality: 'swimming' | 'running' | 'cycling' | 'strength';
  type?: string; // ex: "RUN", "SWIM"
}

interface WeeklyGridProps {
  weekNumber: number;
  workouts: WeekWorkout[];
  onWorkoutClick?: (workoutId: string) => void;
  onDropWorkout?: (dayOfWeek: number, templateId: string) => void;
  startDate?: Date; // Optional: calculate actual dates
}

const WEEKDAYS = [
  { number: 1, short: 'SEG', full: 'Segunda' },
  { number: 2, short: 'TER', full: 'Terça' },
  { number: 3, short: 'QUA', full: 'Quarta' },
  { number: 4, short: 'QUI', full: 'Quinta' },
  { number: 5, short: 'SEX', full: 'Sexta' },
  { number: 6, short: 'SAB', full: 'Sábado' },
  { number: 7, short: 'DOM', full: 'Domingo' },
];

export const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  weekNumber,
  workouts,
  onWorkoutClick,
  onDropWorkout,
  startDate,
}) => {
  // Calculate date for each day if startDate provided
  const getDayDate = (dayOfWeek: number): string => {
    if (!startDate) return '';
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayOfWeek - 1));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-ceramic-base">
      {/* Week Header */}
      <div className="p-4 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="ceramic-inset p-2">
            <Calendar className="w-5 h-5 text-ceramic-info" />
          </div>
          <div>
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Semana {weekNumber}
            </p>
            <h2 className="text-xl font-bold text-ceramic-text-primary">
              {weekNumber <= 4
                ? 'Base Aeróbica'
                : weekNumber <= 8
                ? 'Intensidade Moderada'
                : 'Alta Performance'}
            </h2>
          </div>
        </div>
      </div>

      {/* 7-Column Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-3 p-4 min-w-max">
          {WEEKDAYS.map((day) => {
            const dayWorkouts = workouts.filter((w) => w.day_of_week === day.number);
            const totalDuration = dayWorkouts.reduce((sum, w) => sum + w.duration, 0);

            return (
              <DayColumn
                key={day.number}
                day={day}
                date={getDayDate(day.number)}
                workouts={dayWorkouts}
                totalDuration={totalDuration}
                onWorkoutClick={onWorkoutClick}
                onDrop={(templateId) => onDropWorkout?.(day.number, templateId)}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-stone-200 bg-white">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ceramic-text-secondary font-medium">
            {workouts.length} treino(s) na semana
          </span>
          <span className="text-ceramic-text-secondary">
            Volume total:{' '}
            <span className="font-bold text-ceramic-text-primary">
              {workouts.reduce((sum, w) => sum + w.duration, 0)} min
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Day Column Component
// ============================================

interface DayColumnProps {
  day: { number: number; short: string; full: string };
  date: string;
  workouts: WeekWorkout[];
  totalDuration: number;
  onWorkoutClick?: (workoutId: string) => void;
  onDrop: (templateId: string) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({
  day,
  date,
  workouts,
  totalDuration,
  onWorkoutClick,
  onDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const templateId = e.dataTransfer.getData('templateId');
    if (templateId) {
      console.log(`Dropped template ${templateId} on ${day.full}`);
      onDrop(templateId);
    }
  };

  return (
    <div className="flex flex-col w-56 flex-shrink-0">
      {/* Day Header */}
      <div className="ceramic-card p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-ceramic-text-primary">{day.short}</span>
          {date && <span className="text-[10px] text-ceramic-text-secondary">{date}</span>}
        </div>
        {totalDuration > 0 && (
          <div className="text-xs text-ceramic-text-secondary">
            {totalDuration} min total
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 min-h-[400px] rounded-xl border-2 transition-all ${
          isDragOver
            ? 'border-ceramic-info bg-ceramic-info/5 border-dashed'
            : workouts.length === 0
            ? 'border-stone-200 border-dashed bg-stone-50/50'
            : 'border-transparent bg-transparent'
        }`}
      >
        {/* Workouts List */}
        <div className="p-2 space-y-2">
          {workouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Plus className="w-6 h-6 text-stone-300 mb-1" />
              <p className="text-[10px] text-stone-400 font-medium">
                Arraste um treino
              </p>
            </div>
          ) : (
            workouts.map((workout) => (
              <WorkoutMiniCard
                key={workout.id}
                workout={workout}
                onClick={() => onWorkoutClick?.(workout.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Workout Mini Card (in grid)
// ============================================

interface WorkoutMiniCardProps {
  workout: WeekWorkout;
  onClick: () => void;
}

const MODALITY_COLORS = {
  swimming: 'bg-blue-400',
  running: 'bg-orange-400',
  cycling: 'bg-emerald-400',
  strength: 'bg-purple-400',
};

const WorkoutMiniCard: React.FC<WorkoutMiniCardProps> = ({ workout, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="relative flex flex-col gap-1.5 rounded-lg border border-stone-200 bg-white p-2.5 shadow-sm transition-all hover:border-stone-300 hover:shadow-md cursor-pointer"
    >
      {/* Type Badge */}
      {workout.type && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
          {workout.type}
        </span>
      )}

      {/* Name */}
      <h5 className="text-xs font-semibold text-stone-900 leading-tight line-clamp-2">
        {workout.name}
      </h5>

      {/* Duration */}
      <span className="text-[10px] text-stone-500">{workout.duration} min</span>

      {/* Accent Line (modality color) */}
      <div
        className={`absolute left-0 top-1.5 h-8 w-1 rounded-r ${MODALITY_COLORS[workout.modality]}`}
        style={{ opacity: 0.8 }}
      />
    </div>
  );
};
